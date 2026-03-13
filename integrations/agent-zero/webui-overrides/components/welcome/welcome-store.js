import { createStore } from "/js/AlpineStore.js";
import { store as chatsStore } from "/components/sidebar/chats/chats-store.js";
import { store as memoryStore } from "/components/modals/memory/memory-dashboard-store.js";
import { store as projectsStore } from "/components/projects/projects-store.js";
import { store as chatInputStore } from "/components/chat/input/input-store.js";
import {
  toastFrontendError,
  toastFrontendSuccess,
} from "/components/notifications/notification-store.js";
import * as API from "/js/api.js";
import {
  isProjectLaunchDisabled as shouldDisableProjectLaunch,
  selectWelcomeProjects,
} from "/components/welcome/welcome-projects.mjs";


const LAST_PROJECT_STORAGE_KEY = "business_factory:last_project";


const model = {
  banners: [],
  bannersLoading: false,
  lastBannerRefresh: 0,
  hasDismissedBanners: false,
  projectLaunchInFlight: "",
  projectListLoading: false,

  get isVisible() {
    return !chatsStore.selected;
  },

  get welcomeProjects() {
    return selectWelcomeProjects(projectsStore.projectList, {
      preferredProjectName: this.getRememberedProjectName(),
    });
  },

  init() {
    document.addEventListener("settings-updated", () => {
      this.refreshBanners(true);
    });
  },

  async onCreate() {
    if (!this.isVisible) return;
    await Promise.all([
      this.refreshBanners(),
      this.loadProjects(),
    ]);
  },

  getRememberedProjectName() {
    try {
      return localStorage.getItem(LAST_PROJECT_STORAGE_KEY) || "";
    } catch (_error) {
      return "";
    }
  },

  rememberProjectName(projectName) {
    try {
      if (projectName) {
        localStorage.setItem(LAST_PROJECT_STORAGE_KEY, projectName);
      } else {
        localStorage.removeItem(LAST_PROJECT_STORAGE_KEY);
      }
    } catch (_error) {
      // no-op
    }
  },

  async loadProjects(force = false) {
    if (this.projectListLoading) return;
    if (!force && Array.isArray(projectsStore.projectList) && projectsStore.projectList.length > 0) {
      return;
    }

    this.projectListLoading = true;
    try {
      await projectsStore.loadProjectsList();
    } finally {
      this.projectListLoading = false;
    }
  },

  async startProject(projectName) {
    if (!projectName || this.projectLaunchInFlight) return;

    this.projectLaunchInFlight = projectName;
    try {
      const createResponse = await API.callJsonApi("/chat_create", {
        current_context: chatsStore.selected || "",
      });
      if (!createResponse?.ok || !createResponse?.ctxid) {
        throw new Error(createResponse?.error || "Failed to create a new chat");
      }

      const contextId = createResponse.ctxid;
      const activateResponse = await API.callJsonApi("projects", {
        action: "activate",
        context_id: contextId,
        name: projectName,
      });
      if (!activateResponse?.ok) {
        throw new Error(activateResponse?.error || "Failed to activate the project");
      }

      this.rememberProjectName(projectName);
      await projectsStore.loadProjectsList();
      await chatsStore.selectChat(contextId);
      await toastFrontendSuccess(
        `Started a new project-scoped chat for ${projectName}.`,
        "Project ready",
        3,
        "welcome-project-launch",
      );
    } catch (error) {
      console.error("Failed to start project from welcome screen:", error);
      await toastFrontendError(
        `Failed to start project: ${error.message || error}`,
        "Project launch",
        5,
        "welcome-project-launch",
      );
    } finally {
      this.projectLaunchInFlight = "";
    }
  },

  isProjectLaunchDisabled(projectName) {
    return shouldDisableProjectLaunch(this.projectLaunchInFlight, projectName);
  },

  buildFrontendContext() {
    return {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
      browser: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  },

  runFrontendBannerChecks() {
    return [];
  },

  async runBackendBannerChecks(frontendBanners, frontendContext) {
    try {
      const response = await API.callJsonApi("/banners", {
        banners: frontendBanners,
        context: frontendContext,
      });
      return response?.banners || [];
    } catch (error) {
      console.error("Failed to fetch backend banners:", error);
      return [];
    }
  },

  getDismissedBannerIds() {
    const permanent = JSON.parse(localStorage.getItem("dismissed_banners") || "[]");
    const temporary = JSON.parse(sessionStorage.getItem("dismissed_banners") || "[]");
    return new Set([...permanent, ...temporary]);
  },

  mergeBanners(frontendBanners, backendBanners) {
    const dismissed = this.getDismissedBannerIds();
    const bannerMap = new Map();

    for (const banner of frontendBanners) {
      if (banner.id && (banner.dismissible === false || !dismissed.has(banner.id))) {
        bannerMap.set(banner.id, banner);
      }
    }
    for (const banner of backendBanners) {
      if (banner.id && (banner.dismissible === false || !dismissed.has(banner.id))) {
        bannerMap.set(banner.id, banner);
      }
    }

    return Array.from(bannerMap.values()).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );
  },

  async refreshBanners(force = false) {
    const now = Date.now();
    if (!force && now - this.lastBannerRefresh < 1000) return;
    this.lastBannerRefresh = now;
    this.bannersLoading = true;

    try {
      const frontendContext = this.buildFrontendContext();
      const frontendBanners = this.runFrontendBannerChecks();
      const backendBanners = await this.runBackendBannerChecks(
        frontendBanners,
        frontendContext,
      );

      const dismissed = this.getDismissedBannerIds();
      const loadIds = new Set(
        [...frontendBanners, ...backendBanners]
          .filter((banner) => banner?.id && banner.dismissible !== false)
          .map((banner) => banner.id),
      );
      this.hasDismissedBanners = Array.from(loadIds).some((id) =>
        dismissed.has(id),
      );

      this.banners = this.mergeBanners(frontendBanners, backendBanners);
    } catch (error) {
      console.error("Failed to refresh banners:", error);
      this.banners = this.runFrontendBannerChecks();
      this.hasDismissedBanners = false;
    } finally {
      this.bannersLoading = false;
    }
  },

  get sortedBanners() {
    return [...this.banners].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );
  },

  dismissBanner(bannerId, permanent = false) {
    this.banners = this.banners.filter((banner) => banner.id !== bannerId);

    const storage = permanent ? localStorage : sessionStorage;
    const dismissed = JSON.parse(storage.getItem("dismissed_banners") || "[]");
    if (!dismissed.includes(bannerId)) {
      dismissed.push(bannerId);
      storage.setItem("dismissed_banners", JSON.stringify(dismissed));
    }

    this.hasDismissedBanners = this.getDismissedBannerIds().size > 0;
  },

  undismissBanners() {
    localStorage.removeItem("dismissed_banners");
    sessionStorage.removeItem("dismissed_banners");
    this.hasDismissedBanners = false;
    this.refreshBanners(true);
  },

  getBannerClass(type) {
    const classes = {
      info: "banner-info",
      warning: "banner-warning",
      error: "banner-error",
    };
    return classes[type] || "banner-info";
  },

  getBannerIcon(type) {
    const icons = {
      info: "info",
      warning: "warning",
      error: "error",
    };
    return icons[type] || "info";
  },

  executeAction(actionId) {
    switch (actionId) {
      case "new-chat":
        chatsStore.newChat();
        break;
      case "scheduler":
        window.openModal("modals/scheduler/scheduler-modal.html");
        break;
      case "settings": {
        const settingsButton = document.getElementById("settings");
        if (settingsButton) {
          settingsButton.click();
        }
        break;
      }
      case "projects":
        projectsStore.openProjectsModal();
        break;
      case "memory":
        memoryStore.openModal();
        break;
      case "files":
        chatInputStore.browseFiles();
        break;
      case "website":
        window.open("https://agent-zero.ai", "_blank");
        break;
      case "github":
        window.open("https://github.com/agent0ai/agent-zero", "_blank");
        break;
    }
  },
};


const store = createStore("welcomeStore", model);
export { store };
