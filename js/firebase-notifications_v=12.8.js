// =========================================================
// FIREBASE NOTIFICATIONS HANDLER - Volt Esports Hub
// =========================================================
// FIREBASE NOTIFICATIONS HANDLER - Volt Esports Hub
// =========================================================
// Include this script on pages where you want notification support

(function () {
    'use strict';

    const FIREBASE_CONFIG = {
        apiKey: atob("QUl6YVN5Q2Fqc0pSSEpBMUpXQ0VxYzV5WFdDZzdSUVE4SnM2RHRR"),
        authDomain: "freefire-8d87b.firebaseapp.com",
        projectId: "freefire-8d87b",
        storageBucket: "freefire-8d87b.firebasestorage.app",
        messagingSenderId: "838166280757",
        appId: "1:838166280757:web:aa4f042abff7569b32cf7c",
        measurementId: "G-YBQ3RE6EVL"
    };

    const VAPID_KEY = atob("Qkp6YkkwQzdtQlRDMVBWZV9uLTdpSVJ2dTUtRlZjbXlYLXdUM2lIbG1rMUlOOF9RX3ZrcW1TS0lTU1hEeEg5U3pQejgxV3FBRzhaNXlSNUU5UTRGMHBROQ==");
    const API_URL = 'https://eagleesport.com/api/index.php';

    let messaging = null;
    let currentToken = null;

    function getAuthHeaders() {
        return { 'Content-Type': 'application/json' };
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================
    async function initFirebaseNotifications() {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.warn('[FCM] This browser does not support notifications');
            return false;
        }

        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.warn('[FCM] Service workers not supported');
            return false;
        }

        try {
            // Load Firebase scripts dynamically
            await loadFirebaseScripts();

            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            messaging = firebase.messaging();

            // FIX: Force update service worker for old devices with stale SW
            const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                updateViaCache: 'none' // Don't use cached SW
            });

            // Force check for updates
            swRegistration.update();

            console.log('[FCM] Service Worker registered:', swRegistration);

            // Handle foreground messages
            messaging.onMessage((payload) => {
                console.log('[FCM] Foreground message received:', payload);
                showForegroundNotification(payload);
            });

            return true;
        } catch (error) {
            console.error('[FCM] Initialization error:', error);
            return false;
        }
    }

    // =========================================================
    // LOAD FIREBASE SCRIPTS
    // =========================================================
    function loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                resolve();
                return;
            }

            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
            ];

            let loaded = 0;
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loaded++;
                    if (loaded === scripts.length) resolve();
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        });
    }

    // =========================================================
    // REQUEST PERMISSION AND GET TOKEN
    // =========================================================
    async function requestPermissionAndGetToken() {
        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.log('[FCM] Permission denied');
                return null;
            }

            console.log('[FCM] Permission granted');

            // Get FCM token
            const swRegistration = await navigator.serviceWorker.getRegistration();
            currentToken = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });

            if (currentToken) {
                console.log('[FCM] Token obtained:', currentToken.substring(0, 20) + '...');
                return currentToken;
            } else {
                console.log('[FCM] No token available');
                return null;
            }
        } catch (error) {
            console.error('[FCM] Error getting token:', error);
            return null;
        }
    }

    // =========================================================
    // SAVE TOKEN TO SERVER
    // =========================================================
    async function saveTokenToServer(phone) {
        if (!currentToken) {
            const token = await requestPermissionAndGetToken();
            if (!token) return false;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'saveFCMToken',
                    fcmToken: currentToken,
                    deviceInfo: navigator.userAgent.substring(0, 200)
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                console.log('[FCM] Token saved to server');
                localStorage.setItem('fcmTokenSaved', 'true');
                localStorage.setItem('fcmTokenPhone', phone);
                return true;
            } else {
                console.error('[FCM] Failed to save token:', data.message);
                return false;
            }
        } catch (error) {
            console.error('[FCM] Error saving token:', error);
            return false;
        }
    }

    // =========================================================
    // REMOVE TOKEN (ON LOGOUT)
    // =========================================================
    async function removeTokenFromServer() {
        const phone = localStorage.getItem('fcmTokenPhone');
        if (!phone || !currentToken) return;

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'removeFCMToken',
                    fcmToken: currentToken
                })
            });

            localStorage.removeItem('fcmTokenSaved');
            localStorage.removeItem('fcmTokenPhone');
            console.log('[FCM] Token removed');
        } catch (error) {
            console.error('[FCM] Error removing token:', error);
        }
    }

    // =========================================================
    // SHOW FOREGROUND NOTIFICATION (In-App Toast)
    // =========================================================
    function showForegroundNotification(payload) {
        // FIX: Read from data field first (we now send data-only messages)
        const data = payload.data || {};
        const title = data.title || payload.notification?.title || 'Volt Esports Hub';
        const body = data.body || payload.notification?.body || 'You have a new update!';

        // Remove any existing toast
        const existing = document.getElementById('eagle-fcm-toast');
        if (existing) existing.remove();

        // Create toast notification
        const toast = document.createElement('div');
        toast.id = 'eagle-fcm-toast';
        toast.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999;
                background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
                color: white;
                padding: 16px 24px;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: 90%;
                width: 400px;
                animation: slideDown 0.3s ease-out;
                cursor: pointer;
                border: 1px solid rgba(255,107,53,0.3);
            ">
                <div style="
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #FF6B35, #F7931E);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div id="eagle-fcm-toast-title" style="font-weight: 800; font-size: 14px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
                    <div id="eagle-fcm-toast-body" style="font-size: 12px; opacity: 0.9; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"></div>
                </div>
                <button id="eagle-fcm-toast-close" type="button" style="
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">✕</button>
            </div>
            <style>
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            </style>
        `;

        document.body.appendChild(toast);
        const titleEl = toast.querySelector('#eagle-fcm-toast-title');
        const bodyEl = toast.querySelector('#eagle-fcm-toast-body');
        const closeBtn = toast.querySelector('#eagle-fcm-toast-close');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = body;
        if (closeBtn) closeBtn.addEventListener('click', () => toast.remove());

        // Click to navigate
        toast.querySelector('div').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                if (data.lobbyTime) {
                    window.location.href = `/match-room.html?time=${encodeURIComponent(data.lobbyTime)}&amount=${data.amount || 0}&matchId=${data.matchId || 1}`;
                }
                toast.remove();
            }
        });

        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (document.getElementById('eagle-fcm-toast')) {
                toast.remove();
            }
        }, 8000);
    }

    // =========================================================
    // AUTO-INITIALIZE ON USER PAGES
    // =========================================================
    async function autoInitialize() {
        // Only run on user-facing pages
        const userPages = ['user-dashboard', 'user-paid', 'user-free', 'match-room', 'user-tournament'];
        const currentPage = window.location.pathname;

        const isUserPage = userPages.some(page => currentPage.includes(page));
        if (!isUserPage) {
            console.log('[FCM] Not a user page, skipping initialization');
            return;
        }

        // Check if user is logged in (FIXED: Use correct key 'playerSession')
        const playerSession = localStorage.getItem('playerSession');
        if (!playerSession) {
            console.log('[FCM] No player session found');
            return;
        }

        try {
            const session = JSON.parse(playerSession);

            // FIXED: Phone is inside player_data, not at root level
            const phone = session?.player_data?.phone;
            if (!phone) {
                console.log('[FCM] No phone in player session (checked player_data.phone)');
                return;
            }

            console.log('[FCM] Player logged in:', phone);

            // Initialize Firebase first
            const initialized = await initFirebaseNotifications();
            if (!initialized) {
                console.log('[FCM] Firebase initialization failed');
                // Still show the banner so user can retry
                checkAndRenderButton(phone);
                return;
            }

            // FIX: ALWAYS render the banner UI first (for both new and old devices)
            checkAndRenderButton(phone);

            // Check current permission state
            const permission = Notification.permission;
            console.log('[FCM] Current permission state:', permission);

            if (permission === 'granted') {
                // Permission already granted - get/refresh token and save to server
                console.log('[FCM] Permission already granted, refreshing token...');
                try {
                    const token = await requestPermissionAndGetToken();
                    if (token) {
                        console.log('[FCM] Got token, saving to server...');
                        const saved = await saveTokenToServer(phone);
                        if (saved) {
                            console.log('[FCM] Token refreshed and saved to server');
                        } else {
                            console.error('[FCM] Failed to save token to server');
                        }
                    } else {
                        console.error('[FCM] No token received, clearing localStorage to allow re-registration');
                        // FIX: Clear stale localStorage so user can re-register
                        localStorage.removeItem('fcmTokenSaved');
                        localStorage.removeItem('fcmTokenPhone');
                    }
                } catch (tokenError) {
                    console.error('[FCM] Token refresh error:', tokenError);
                    // FIX: Clear stale localStorage so user can re-register
                    localStorage.removeItem('fcmTokenSaved');
                    localStorage.removeItem('fcmTokenPhone');
                }
            } else if (permission === 'default') {
                // Not yet asked - for new users, they'll click the banner button
                console.log('[FCM] Permission not yet requested, waiting for user action');
            } else {
                // Permission denied
                console.log('[FCM] Permission was denied by user');
            }
        } catch (e) {
            console.error('[FCM] Auto-init error:', e);
        }
    }

    // =========================================================
    // RENDER MANUAL PERMISSION BUTTON (Mobile Fallback)
    // =========================================================
    // =========================================================
    // RENDER MANUAL PERMISSION BUTTON (Mobile Fallback)
    // =========================================================
    function checkAndRenderButton(phone) {
        const container = document.getElementById('notification-permission-container');
        if (!container) return;

        const infoModal = document.getElementById('notification-info-modal');
        const closeInfoModal = document.getElementById('close-notification-info');
        const modalAction = document.getElementById('notification-modal-action');

        // FIXED: Show PERMANENTLY (removed 'granted' check that hid it)
        container.classList.remove('hidden');

        function closeModal() {
            if (infoModal) infoModal.classList.add('hidden');
        }

        function openModal() {
            if (!infoModal) return;
            if (modalAction) {
                modalAction.textContent = Notification.permission === 'granted'
                    ? 'Refresh Notifications'
                    : 'Enable Notifications';
                modalAction.disabled = false;
            }
            infoModal.classList.remove('hidden');
            if (modalAction) modalAction.focus();
        }

        if (closeInfoModal) closeInfoModal.onclick = closeModal;
        if (infoModal) {
            infoModal.onclick = (event) => {
                if (event.target === infoModal) closeModal();
            };
        }

        // Initial Render
        renderBannerState();

        function renderBannerState() {
            container.innerHTML = `
                <button id="enable-notif-btn" type="button" class="notification-trigger"
                    aria-haspopup="dialog" aria-controls="notification-info-modal">
                    <i class="ri-notification-3-line" aria-hidden="true"></i>
                    <span>${Notification.permission === 'granted' ? 'Active' : 'Notify'}</span>
                </button>
            `;

            // Re-attach listener
            const btn = document.getElementById('enable-notif-btn');
            if (btn) {
                btn.onclick = openModal;
            }
        }

        async function handleClick() {
            if (!modalAction) return;
            modalAction.textContent = "Checking...";
            modalAction.disabled = true;

            const success = await saveTokenToServer(phone);
            if (success) {
                modalAction.textContent = "Notifications Active";
                modalAction.disabled = true;
                setTimeout(() => {
                    closeModal();
                    renderBannerState();
                }, 3000);
            } else {
                modalAction.textContent = "Retry";
                modalAction.disabled = false;
                alert("Permission denied. Reset permissions in browser settings.");
            }
        }

        if (modalAction) modalAction.onclick = handleClick;
    }

    // =========================================================
    // EXPOSE GLOBAL API
    // =========================================================
    window.EagleNotifications = {
        init: initFirebaseNotifications,
        requestPermission: requestPermissionAndGetToken,
        saveToken: saveTokenToServer,
        removeToken: removeTokenFromServer,
        getCurrentToken: () => currentToken,
        checkUI: () => {
            const ps = localStorage.getItem('playerSession');
            if (ps) {
                const s = JSON.parse(ps);
                if (s?.player_data?.phone) checkAndRenderButton(s.player_data.phone);
            }
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitialize);
    } else {
        autoInitialize();
    }

})();
