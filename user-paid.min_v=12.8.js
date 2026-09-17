document.addEventListener("DOMContentLoaded", function () {

  // ─── READ DYNAMIC CONFIG ───────────────────────────────────────────────────
  function getConfig() {
    return (window.VoltConfig && window.VoltConfig.get)
      ? window.VoltConfig.get()
      : {
          whatsappNumber: "919172525945",
          modes: [{ name: "Squad", available: true }],
          times: ["01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM", "10:00 PM"],
          amounts: [{ amount: 25, available: true }, { amount: 40, available: true }]
        };
  }

  var cfg = getConfig();
  var WA_NUMBER = cfg.whatsappNumber || "919172525945";

  // Build schedule object from config
  function buildScheduleFromConfig(c) {
    var sch = {};
    var times = c.times || ["01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM", "10:00 PM"];
    var amts = c.amounts || [{ amount: 25, available: true }, { amount: 40, available: true }];
    times.forEach(function (t) {
      sch[t] = amts;
    });
    return sch;
  }

  var schedule = buildScheduleFromConfig(cfg);
  var selected = { mode: "Squad", time: null, amount: null };

  // ─── DOM REFS ──────────────────────────────────────────────────────────────
  var clockEl      = document.getElementById("live-clock-container") &&
                     document.getElementById("live-clock-container").querySelector("p");
  var modeGrid     = document.querySelector("section:first-of-type .grid");
  var timeLoader   = document.getElementById("lobby-time-loader");
  var timeSelector = document.getElementById("lobby-time-selector");
  var amtSelector  = document.getElementById("lobby-amount-selector");
  var amtHelper    = document.getElementById("amount-helper-text");
  var bookBtn      = document.getElementById("book-slot-btn");

  // Remove legacy modal if present
  var oldModal = document.getElementById("team-name-modal");
  if (oldModal) oldModal.remove();

  // ─── LIVE CLOCK ────────────────────────────────────────────────────────────
  function updateClock() {
    if (!clockEl) return;
    clockEl.textContent = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: true
    }).replace(" at ", " | ");
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ─── TIME HELPERS ──────────────────────────────────────────────────────────
  function timeToMin(t) {
    try {
      var parts = t.trim().split(" ");
      var mer   = parts[1];
      var hm    = parts[0].split(":");
      var h     = parseInt(hm[0], 10);
      var m     = parseInt(hm[1], 10);
      if (mer === "PM" && h !== 12) h += 12;
      if (mer === "AM" && h === 12) h  = 0;
      if (h < 5) h += 24;
      return h * 60 + m;
    } catch (e) { return 0; }
  }

  function isPast(t) {
    var now = new Date();
    var cur = now.getHours() * 60 + now.getMinutes();
    return cur > timeToMin(t);
  }

  // ─── SELECTED STYLE HELPERS ────────────────────────────────────────────────
  var SEL   = "border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm selected";
  var UNSEL = "border-white/10 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 hover:border-white/30";
  var BASE  = "border-2 rounded-xl p-3 font-display font-bold text-lg uppercase tracking-wide transition-all ";

  // ─── TOAST NOTIFICATION FOR UNAVAILABLE ITEMS ──────────────────────────────
  function showUnavailableToast(msg) {
    var toast = document.getElementById("unavailable-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "unavailable-toast";
      toast.className = "fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-red-950/90 border border-red-500/40 text-red-200 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 opacity-0 pointer-events-none flex items-center gap-2";
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<i class="ri-error-warning-fill text-red-400 text-base"></i> <span>' + msg + '</span>';
    toast.classList.remove("opacity-0", "pointer-events-none");
    toast.classList.add("opacity-100");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove("opacity-100");
      toast.classList.add("opacity-0", "pointer-events-none");
    }, 2500);
  }

  // ─── RENDER MODE BUTTONS ───────────────────────────────────────────────────
  function renderModes() {
    if (!modeGrid) return;
    modeGrid.innerHTML = "";

    var activeModes = (cfg.modes || []).filter(function(m) { return m.available; });
    var modesToRender = activeModes.length > 0 ? activeModes : (cfg.modes || [{ name: "Squad", available: true }]);

    modesToRender.forEach(function (modeObj) {
      var isSel = modeObj.name === selected.mode;
      var btn = document.createElement("button");
      btn.className = "selection-card col-span-3 " + BASE + (isSel ? SEL : UNSEL) + " flex items-center justify-center py-3.5 shadow-lg shadow-blue-500/10";
      btn.innerHTML = '<span class="text-xl font-bold tracking-wider">' + modeObj.name + ' Mode</span>';
      btn.addEventListener("click", function () {
        selected.mode = modeObj.name;
        renderModes();
      });
      modeGrid.appendChild(btn);
    });
  }

  // ─── RENDER TIME BUTTONS ───────────────────────────────────────────────────
  function renderTimes() {
    if (timeLoader) timeLoader.classList.add("hidden");
    timeSelector.classList.remove("hidden");
    timeSelector.innerHTML = "";

    var times = Object.keys(schedule).sort(function (a, b) {
      return timeToMin(a) - timeToMin(b);
    });

    if (times.length === 0) {
      timeSelector.innerHTML = '<p class="col-span-3 text-center text-gray-500 text-sm py-4">No lobbies available today.</p>';
      return;
    }

    times.forEach(function (t) {
      var past  = isPast(t);
      var isSel = t === selected.time;
      var btn   = document.createElement("button");

      if (past) {
        btn.disabled  = true;
        btn.className = "selection-card flex-row justify-center items-center p-3 text-sm font-bold opacity-40 cursor-not-allowed bg-[#111] border-white/5 rounded-xl border-2";
        btn.innerHTML = '<div class="flex flex-col items-center"><span class="text-gray-400">' + t + '</span><span class="text-[9px] text-red-500 font-bold uppercase mt-0.5">Expired</span></div>';
      } else {
        btn.className = "selection-card flex-row justify-center items-center p-3 text-sm font-bold transition-all time-btn rounded-xl border-2 " + (isSel ? SEL : UNSEL);
        btn.innerHTML = "<span>" + t + "</span>";
        btn.addEventListener("click", (function (time) {
          return function () {
            selected.time   = time;
            selected.amount = null;
            renderTimes();
            renderAmounts();
          };
        })(t));
      }
      timeSelector.appendChild(btn);
    });
  }

  // ─── RENDER AMOUNT BUTTONS ─────────────────────────────────────────────────
  function renderAmounts() {
    amtSelector.innerHTML = "";

    if (!selected.time) {
      if (amtHelper) amtHelper.classList.remove("hidden");
      if (bookBtn) { bookBtn.disabled = true; bookBtn.textContent = "Book Your Slot"; }
      return;
    }
    if (amtHelper) amtHelper.classList.add("hidden");

    var amounts = schedule[selected.time] || [];
    if (amounts.length === 0) {
      amtSelector.innerHTML = '<p class="col-span-2 text-center text-gray-500 text-sm py-4">No amounts for this time.</p>';
      return;
    }

    amounts.forEach(function (raw) {
      var amt     = (typeof raw === "object" && raw !== null) ? raw.amount : raw;
      var isAvail = (typeof raw === "object" && raw !== null) ? raw.available !== false : true;
      var isSel   = amt === selected.amount;
      var btn     = document.createElement("button");

      if (!isAvail) {
        btn.className = "selection-card border-2 rounded-xl p-2.5 bg-[#121212] border-white/5 opacity-60 cursor-not-allowed flex flex-col items-center justify-center transition-all";
        btn.innerHTML = '<span class="font-extrabold text-base text-gray-400">&#8377;' + amt + '</span>' +
                        '<span class="text-[8px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded uppercase mt-0.5">Unavailable</span>';
        btn.addEventListener("click", function () {
          showUnavailableToast("₹" + amt + " lobby is currently unavailable.");
        });
      } else {
        btn.className = "selection-card " + BASE + (isSel ? SEL : UNSEL) + " flex flex-col items-center justify-center py-3";
        btn.innerHTML = '<span class="font-extrabold text-xl">&#8377;' + amt + '</span>';
        btn.addEventListener("click", (function (a) {
          return function () {
            selected.amount = a;
            renderAmounts();
            if (bookBtn) {
              bookBtn.disabled    = false;
              bookBtn.textContent = "Book Your Slot → WhatsApp";
            }
          };
        })(amt));
      }
      amtSelector.appendChild(btn);
    });

    if (!selected.amount && bookBtn) {
      bookBtn.disabled = true;
    }
  }

  // ─── BOOK SLOT BUTTON ──────────────────────────────────────────────────────
  if (bookBtn) {
    bookBtn.disabled = true;
    bookBtn.addEventListener("click", function () {
      if (!selected.time) {
        alert("Please select a lobby time first.");
        return;
      }
      if (!selected.amount) {
        alert("Please select an entry fee amount first.");
        return;
      }
      var targetNum = (cfg.whatsappNumber || WA_NUMBER || "919172525945").replace(/\D/g, "");
      var msg =
        "Hello Volt Esports Hub! I want to book a slot.\n\n" +
        "🎮 Mode: "       + selected.mode   + "\n" +
        "⏰ Time: "             + selected.time   + "\n" +
        "💰 Entry Fee: ₹" + selected.amount + "\n\n" +
        "Please confirm my slot booking.";
      window.location.href = "https://wa.me/" + targetNum + "?text=" + encodeURIComponent(msg);
    });
  }

  // ─── INITIALISE ────────────────────────────────────────────────────────────
  renderModes();
  renderTimes();
  renderAmounts();

  // Listen for admin config updates in real-time
  window.addEventListener("voltConfigUpdated", function (e) {
    cfg = e.detail;
    WA_NUMBER = cfg.whatsappNumber || "919172525945";
    schedule = buildScheduleFromConfig(cfg);
    renderModes();
    renderTimes();
    renderAmounts();
  });

});