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
    times: ["09:00 PM"],
    amounts: [
      { amount: 50, available: true },
      { amount: 100, available: true }
    ],
    matchDate: "tuesday",
    ruleBookImg: "/assets/rule-book.jpg",
    pointsTableImg: "/assets/points-table.jpg"
  };

  var bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel("volt_config_channel") : null;

  function sanitizeConfig(cfg) {
    if (!cfg) cfg = {};
    cfg.matchDate = "tuesday";
    cfg.times = ["09:00 PM"];

    var validAmounts = [
      { amount: 50, available: true },
      { amount: 100, available: true }
    ];

    if (!cfg.amounts || !Array.isArray(cfg.amounts)) {
      cfg.amounts = validAmounts;
    } else {
      var currentValues = cfg.amounts.map(function(a) { return typeof a === "object" ? a.amount : a; });
      var isExactMatch = currentValues.length === 2 && currentValues.includes(50) && currentValues.includes(100);
      if (!isExactMatch) {
        cfg.amounts = validAmounts;
      }
    }
    return cfg;
  }

  function loadConfig() {
    try {
      var saved = localStorage.getItem("volt_app_config");
      if (saved) {
        var parsed = JSON.parse(saved);
        var merged = Object.assign({}, DEFAULT_CONFIG, parsed);
        merged = sanitizeConfig(merged);
        merged.lastUpdated = Date.now();
        localStorage.setItem("volt_app_config", JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn("[VoltConfig] Failed to load config from storage:", e);
    }
    return sanitizeConfig(Object.assign({}, DEFAULT_CONFIG));
  }

  function saveConfig(newConfig) {
    try {
      newConfig = sanitizeConfig(newConfig);
      newConfig.lastUpdated = Date.now();
      localStorage.setItem("volt_app_config", JSON.stringify(newConfig));
      window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: newConfig }));
      if (bc) {
        try { bc.postMessage({ type: "voltConfigUpdated", detail: newConfig }); } catch(err) {}
      }
      
      // Real-time Cloud Sync with Firebase Firestore if initialized
      if (window.db || (window.firebase && window.firebase.firestore)) {
        var firestore = window.db || window.firebase.firestore();
        firestore.collection("system_settings").doc("app_config").set(newConfig)
          .then(function() { console.log("[VoltConfig] Synced to Firebase Cloud (t=" + newConfig.lastUpdated + ")"); })
          .catch(function(err) { console.warn("[VoltConfig] Firebase Cloud Sync Error:", err); });
      }
      return true;
    } catch (e) {
      console.error("[VoltConfig] Failed to save config:", e);
      return false;
    }
  }

  function resetConfig() {
    localStorage.removeItem("volt_app_config");
    return sanitizeConfig(Object.assign({}, DEFAULT_CONFIG));
  }

  var isCloudSyncInitialized = false;

  // Real-time Listener for Firebase Cloud Updates with Conflict Resolution
  function initCloudSync() {
    if (isCloudSyncInitialized) return;

    var attempts = 0;
    var maxAttempts = 30;

    function attemptSync() {
      attempts++;
      try {
        var firestore = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
        if (firestore) {
          isCloudSyncInitialized = true;
          console.log("[VoltConfig] Subscribing to Firestore system_settings/app_config...");
          
          firestore.collection("system_settings").doc("app_config")
            .onSnapshot(function(doc) {
              var localConfig = loadConfig();
              var localTime = localConfig.lastUpdated || 0;

              if (doc.exists) {
                var cloudData = doc.data();
                if (cloudData) {
                  var cloudTime = cloudData.lastUpdated || 0;

                  if (localTime > cloudTime) {
                    console.log("[VoltConfig] Local data is newer than Cloud (" + localTime + " > " + cloudTime + "). Syncing Local -> Cloud...");
                    firestore.collection("system_settings").doc("app_config").set(localConfig)
                      .catch(function(e) { console.warn("[VoltConfig] Self-heal cloud set error:", e); });
                  } else {
                    var merged = Object.assign({}, DEFAULT_CONFIG, cloudData);
                    merged = sanitizeConfig(merged);
                    localStorage.setItem("volt_app_config", JSON.stringify(merged));
                    
                    var cloudAmounts = cloudData.amounts ? cloudData.amounts.map(function(a){return typeof a==='object'?a.amount:a;}) : [];
                    if (cloudAmounts.includes(40) || cloudAmounts.includes(25) || cloudAmounts.length !== 2) {
                      firestore.collection("system_settings").doc("app_config").set(merged)
                        .catch(function(e) { console.warn("[VoltConfig] Cloud cleanup update error:", e); });
                    }

                    window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: merged }));
                  }
                }
              } else {
                // Initial creation of cloud config document using local or default config
                var initialPayload = Object.assign({ lastUpdated: Date.now() }, localConfig);
                firestore.collection("system_settings").doc("app_config").set(initialPayload)
                  .catch(function(e) { console.warn("[VoltConfig] Init cloud doc error:", e); });
              }
            }, function(err) {
              console.warn("[VoltConfig] Firestore Listener Warning:", err);
            });
          return;
        }
      } catch(e) {
        console.warn("[VoltConfig] Cloud sync attempt failed:", e);
      }

      if (attempts < maxAttempts) {
        setTimeout(attemptSync, 200);
      }
    }

    attemptSync();
  }

  // Listen for storage changes across tabs
  window.addEventListener("storage", function (e) {
    if (e.key === "volt_app_config") {
      var updatedConfig = loadConfig();
      window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: updatedConfig }));
    }
  });

  if (bc) {
    bc.onmessage = function(e) {
      if (e.data && e.data.type === "voltConfigUpdated" && e.data.detail) {
        localStorage.setItem("volt_app_config", JSON.stringify(e.data.detail));
        window.dispatchEvent(new CustomEvent("voltConfigUpdated", { detail: e.data.detail }));
      }
    };
  }

  // Init cloud sync when DOM is ready or immediately
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCloudSync);
  } else {
    initCloudSync();
  }

  window.VoltConfig = {
    get: loadConfig,
    save: saveConfig,
    reset: resetConfig,
    initCloudSync: initCloudSync,
    subscribe: function(cb) {
      if (typeof cb === "function") {
        cb(loadConfig());
        window.addEventListener("voltConfigUpdated", function(e) {
          cb(e.detail);
        });
      }
    },
    defaults: DEFAULT_CONFIG
  };

})();

