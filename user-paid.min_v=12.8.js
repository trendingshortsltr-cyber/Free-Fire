document.addEventListener("DOMContentLoaded", function () {

  // ─── READ DYNAMIC CONFIG ───────────────────────────────────────────────────
  function getConfig() {
    return (window.VoltConfig && window.VoltConfig.get)
      ? window.VoltConfig.get()
      : {
          whatsappNumber: "918087361230",
          modes: [{ name: "Squad", available: true }],
          times: ["03:00 PM"],
          amounts: [{ amount: 50, available: true }, { amount: 100, available: false }]
        };
  }

  var cfg = getConfig();
  var WA_NUMBER = cfg.whatsappNumber || "918087361230";

  // Build schedule object from config
  function buildScheduleFromConfig(c) {
    var sch = {};
    var times = c.times || ["03:00 PM"];
    var rawAmts = c.amounts || [{ amount: 50, available: true }, { amount: 100, available: false }];
    var amts = rawAmts.filter(function(a) {
      var val = typeof a === "object" ? a.amount : a;
      return val === 50 || val === 100;
    });
    if (amts.length === 0) {
      amts = [{ amount: 50, available: true }, { amount: 100, available: false }];
    }
    times.forEach(function (tItem) {
      var tStr = typeof tItem === "object" ? tItem.time : tItem;
      var status = typeof tItem === "object" ? (tItem.status || "available") : "available";
      sch[tStr] = {
        amounts: amts,
        status: status
      };
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

  // ─── MATCH DATE HELPERS ───────────────────────────────────────────────────
  function getMatchDateInfo() {
    var mDate = cfg.matchDate || "today";
    var now = new Date();

    if (mDate === "today" || mDate === "tuesday") {
      var todStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return { text: "Today (" + todStr + ")", isFuture: false, fullDate: todStr };
    } else if (mDate === "tomorrow") {
      var tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      var tomStr = tom.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      return { text: "Tomorrow (" + tomStr + ")", isFuture: true, fullDate: tomStr };
    } else {
      // Custom date string
      return { text: mDate, isFuture: true, fullDate: mDate };
    }
  }

  function renderMatchDateBadge() {
    var labelEl = document.getElementById("match-date-label");
    if (labelEl) {
      var info = getMatchDateInfo();
      labelEl.textContent = "Tournament Date: " + info.text;
    }
  }

  function isPast(t) {
    var dateInfo = getMatchDateInfo();
    if (dateInfo.isFuture) return false; // Future dates are never past!

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
      var slotData = schedule[t] || {};
      var status = slotData.status || "available";
      var past = isPast(t) || status === "expired";
      var isFull = status === "full";
      var isSel = t === selected.time;
      var btn = document.createElement("button");

      if (past) {
        btn.disabled = true;
        btn.className = "selection-card flex-row justify-center items-center p-3 text-sm font-bold opacity-40 cursor-not-allowed bg-[#111] border-white/5 rounded-xl border-2";
        btn.innerHTML = '<div class="flex flex-col items-center"><span class="text-gray-400">' + t + '</span><span class="text-[9px] text-yellow-500 font-bold uppercase mt-0.5">Expired</span></div>';
        btn.addEventListener("click", function() {
          showUnavailableToast("This lobby (" + t + ") has EXPIRED.");
        });
      } else if (isFull) {
        btn.className = "selection-card flex-row justify-center items-center p-3 text-sm font-bold opacity-75 cursor-not-allowed bg-red-950/20 border-red-500/30 rounded-xl border-2";
        btn.innerHTML = '<div class="flex flex-col items-center"><span class="text-gray-300">' + t + '</span><span class="text-[9px] text-red-400 font-extrabold uppercase mt-0.5 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> FULL</span></div>';
        btn.addEventListener("click", function() {
          showUnavailableToast("This lobby (" + t + ") is FULL! Please select another time.");
        });
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

    var slotObj = schedule[selected.time];
    var amounts = Array.isArray(slotObj) ? slotObj : (slotObj ? slotObj.amounts || [] : []);
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
            if (teamSection) teamSection.classList.remove("hidden");
            validateForm();
          };
        })(amt));
      }
      amtSelector.appendChild(btn);
    });

    if (selected.amount && teamSection) {
      teamSection.classList.remove("hidden");
    }
    validateForm();
  }

  // ─── TEAM & PLAYER INPUT REFS & VALIDATION ─────────────────────────────────
  var teamSection    = document.getElementById("team-details-section");
  var teamNameInput  = document.getElementById("input-team-name");
  var p1Input        = document.getElementById("input-player-1");
  var p2Input        = document.getElementById("input-player-2");
  var p3Input        = document.getElementById("input-player-3");
  var p4Input        = document.getElementById("input-player-4");
  var bookBtnHelper  = document.getElementById("book-btn-helper");

  function validateForm() {
    if (!bookBtn) return;
    
    var hasTime = !!selected.time;
    var hasAmt  = !!selected.amount;
    var tName   = teamNameInput  ? teamNameInput.value.trim()  : "";
    var p1      = p1Input        ? p1Input.value.trim()        : "";
    var p2      = p2Input        ? p2Input.value.trim()        : "";
    var p3      = p3Input        ? p3Input.value.trim()        : "";
    var p4      = p4Input        ? p4Input.value.trim()        : "";

    var allValid = hasTime && hasAmt && tName && p1 && p2 && p3 && p4;

    if (allValid) {
      bookBtn.disabled = false;
      bookBtn.className = "w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/40 transition-all font-display tracking-wider text-xl uppercase animate-pulse cursor-pointer";
      if (bookBtnHelper) {
        bookBtnHelper.textContent = "✅ All details complete! Click below to send WhatsApp booking.";
        bookBtnHelper.className = "text-xs text-green-400 font-bold text-center mt-2";
      }
    } else {
      bookBtn.disabled = true;
      bookBtn.className = "w-full bg-gray-800 text-gray-500 border border-white/5 font-bold py-4 rounded-xl cursor-not-allowed font-display tracking-wider text-xl uppercase";
      if (bookBtnHelper) {
        if (!hasTime) {
          bookBtnHelper.textContent = "⚠️ Step 1: Please select a Lobby Time above.";
        } else if (!hasAmt) {
          bookBtnHelper.textContent = "⚠️ Step 2: Please select an Entry Fee amount above.";
        } else {
          bookBtnHelper.textContent = "⚠️ Step 3: Please enter Team Name and all 4 player names below.";
        }
        bookBtnHelper.className = "text-xs text-yellow-400 font-semibold text-center mt-2";
      }
    }
  }

  [teamNameInput, p1Input, p2Input, p3Input, p4Input].forEach(function(inp) {
    if (inp) {
      inp.addEventListener("input", validateForm);
      inp.addEventListener("change", validateForm);
    }
  });

  // ─── BOOK SLOT BUTTON ──────────────────────────────────────────────────────
  if (bookBtn) {
    bookBtn.addEventListener("click", function () {
      var tName = teamNameInput ? teamNameInput.value.trim() : "";
      var p1    = p1Input       ? p1Input.value.trim()       : "";
      var p2    = p2Input       ? p2Input.value.trim()       : "";
      var p3    = p3Input       ? p3Input.value.trim()       : "";
      var p4    = p4Input       ? p4Input.value.trim()       : "";

      if (!selected.time) {
        alert("Please select a lobby time first.");
        return;
      }
      if (!selected.amount) {
        alert("Please select an entry fee amount first.");
        return;
      }
      if (!tName || !p1 || !p2 || !p3 || !p4) {
        alert("Please fill in Team Name and all 4 player names before booking.");
        return;
      }

      var targetNum = (cfg.whatsappNumber || WA_NUMBER || "918087361230").replace(/\D/g, "");
      var dateInfo  = getMatchDateInfo();
      var safeDate  = (dateInfo.fullDate || "today").replace(/[^a-zA-Z0-9]/g, "_");
      var safeTime  = (selected.time || "slot").replace(/[^a-zA-Z0-9]/g, "_");
      var slotKey   = "volt_slot_count_" + safeDate + "_" + safeTime;

      var initialOffset = (typeof cfg.initialSlotOffset === "number" && !isNaN(cfg.initialSlotOffset)) ? cfg.initialSlotOffset : 8;
      var storedVal = localStorage.getItem(slotKey);
      var currentVal = storedVal !== null ? parseInt(storedVal, 10) : 0;
      var currentSlot = Math.max(currentVal, initialOffset) + 1;
      localStorage.setItem(slotKey, currentSlot);

      function sendWhatsAppBooking() {
        var msg =
          "slot\n\n" +
          "🛡️ Team Name: "   + tName           + "\n" +
          "👤 Leader (P1): " + p1              + "\n" +
          "👤 Player 2: "    + p2              + "\n" +
          "👤 Player 3: "    + p3              + "\n" +
          "👤 Player 4: "    + p4;

        window.location.href = "https://wa.me/" + targetNum + "?text=" + encodeURIComponent(msg);
      }

      var firestore = window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
      if (firestore) {
        var docRef = firestore.collection("slot_counters").doc(slotKey);
        firestore.runTransaction(function(transaction) {
          return transaction.get(docRef).then(function(doc) {
            var newCount = initialOffset + 1;
            if (doc.exists && doc.data() && typeof doc.data().count !== "undefined") {
              var existingCount = parseInt(doc.data().count, 10);
              newCount = Math.max(isNaN(existingCount) ? 0 : existingCount, initialOffset) + 1;
            }
            transaction.set(docRef, { count: newCount, updatedAt: Date.now() }, { merge: true });
            return newCount;
          });
        }).then(function(assignedSlot) {
          localStorage.setItem(slotKey, assignedSlot);
          sendWhatsAppBooking(assignedSlot);
        }).catch(function(err) {
          console.warn("[SlotCounter] Transaction fallback:", err);
          sendWhatsAppBooking(currentSlot);
        });
      } else {
        sendWhatsAppBooking(currentSlot);
      }
    });
  }

  function updateChannelLink() {
    var channelEl = document.getElementById("bottom-nav-wa-channel");
    if (channelEl && cfg.whatsappChannel) {
      channelEl.href = cfg.whatsappChannel;
    }
  }

  // ─── INITIALISE ────────────────────────────────────────────────────────────
  renderMatchDateBadge();
  renderModes();
  renderTimes();
  renderAmounts();
  updateChannelLink();

  // Listen for admin config updates in real-time
  window.addEventListener("voltConfigUpdated", function (e) {
    cfg = e.detail;
    WA_NUMBER = cfg.whatsappNumber || "918087361230";
    schedule = buildScheduleFromConfig(cfg);
    renderMatchDateBadge();
    renderModes();
    renderTimes();
    renderAmounts();
    updateChannelLink();
  });

});