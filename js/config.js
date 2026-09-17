// =========================================================
// VOLT ESPORTS HUB - DYNAMIC CONFIGURATION SYSTEM
// =========================================================

(function () {
  'use strict';

  var DEFAULT_CONFIG = {
    whatsappNumber: "9172525945",
    whatsappChannel: "https://whatsapp.com/channel/0029Vb8ykqDLY6dB0OJ6Wv0T",
    adminPasscode: atob("dm9sdDEyMw=="),
    announcementText: "Welcome to Volt Esports Hub! Daily Scrims Open Now.",
    announcementActive: false,
    modes: [
      { name: "Solo", available: false },
      { name: "Duo", available: false },
      { name: "Squad", available: true }
    ],
    times: ["01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM", "10:00 PM"],
    amounts: [
      { amount: 25, available: true },
      { amount: 40, available: true }
    ],
    ruleBookImg: "/assets/rule-book.jpg",
    pointsTableImg: "/assets/points-table.jpg"
  };

  function loadConfig() {
    try {
      var saved = localStorage.getItem("volt_app_config");
      if (saved) {
        var parsed = JSON.parse(saved);
        var merged = Object.assign({}, DEFAULT_CONFIG, parsed);
        if (Array.isArray(merged.amounts)) {
          merged.amounts = merged.amounts.filter(function(a) {
            var val = typeof a === "object" ? a.amount : a;
            return val !== 50 && val !== 100;
          });
        }
        return merged;
      }
    } catch (e) {
      console.warn("[VoltConfig] Failed to load config from storage:", e);
    }
    return DEFAULT_CONFIG;
  }

  function saveConfig(newConfig) {
    try {
      localStorage.setItem("volt_app_config", JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: newConfig }));
      return true;
    } catch (e) {
      console.error("[VoltConfig] Failed to save config:", e);
      return false;
    }
  }

  function resetConfig() {
    localStorage.removeItem("volt_app_config");
    return DEFAULT_CONFIG;
  }

  // Listen for storage changes across tabs
  window.addEventListener("storage", function (e) {
    if (e.key === "volt_app_config") {
      var updatedConfig = loadConfig();
      window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: updatedConfig }));
    }
  });

  window.VoltConfig = {
    get: loadConfig,
    save: saveConfig,
    reset: resetConfig,
    defaults: DEFAULT_CONFIG
  };

})();
