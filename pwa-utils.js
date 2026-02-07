/**
 * PWA Utils - Progressive Web App Utilities
 * Handles offline capabilities, notifications, storage management, and background sync
 */

const PWAUtils = (() => {
    let installPrompt = null;
    let isOnline = navigator.onLine;

    // ========== INITIALIZATION ==========
    function init() {
        setupInstallPrompt();
        setupNetworkListeners();
        setupStorageListener();
        setupNotifications();
        requestPersistentStorage();
    }

    // ========== INSTALL PROMPT ==========
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            installPrompt = e;
            showInstallPrompt();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            installPrompt = null;
            localStorage.setItem('pwa_installed', 'true');
        });
    }

    function showInstallPrompt() {
        // Create a subtle install banner (optional)
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4facfe, #00c6ff);
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(79, 172, 254, 0.3);
            z-index: 9998;
            font-weight: 600;
            display: flex;
            gap: 12px;
            align-items: center;
        `;

        const text = document.createElement('span');
        text.textContent = 'Install App';

        const btn = document.createElement('button');
        btn.textContent = 'Install';
        btn.style.cssText = `
            background: white;
            color: #4facfe;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s;
        `;
        btn.onclick = () => installPWA();

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: transparent;
            color: white;
            border: none;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
        `;
        closeBtn.onclick = () => banner.remove();

        banner.appendChild(text);
        banner.appendChild(btn);
        banner.appendChild(closeBtn);
        document.body.appendChild(banner);

        // Auto-remove after 8 seconds
        setTimeout(() => banner.remove(), 8000);
    }

    async function installPWA() {
        if (installPrompt) {
            installPrompt.prompt();
            const result = await installPrompt.userChoice;
            console.log(`User response: ${result.outcome}`);
            installPrompt = null;
        }
    }

    // ========== NETWORK STATUS ==========
    function setupNetworkListeners() {
        window.addEventListener('online', () => {
            isOnline = true;
            showNotification('Back Online', 'You are now connected');
            syncOfflineData();
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            showNotification('Offline Mode', 'You are offline. Data will be synced when online');
        });
    }

    function isConnected() {
        return isOnline;
    }

    // ========== NOTIFICATIONS ==========
    function setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't auto-request, but show UI element to request
            createNotificationPrompt();
        }
    }

    function createNotificationPrompt() {
        const prompt = document.createElement('div');
        prompt.id = 'notification-prompt';
        prompt.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 9997;
            display: none;
        `;
        prompt.innerHTML = `
            <div style="margin-bottom: 12px; font-weight: 600;">Enable Notifications?</div>
            <button id="notify-yes" style="
                background: #2563eb;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                margin-right: 8px;
                cursor: pointer;
            ">Yes</button>
            <button id="notify-no" style="
                background: #e2e8f0;
                color: #334155;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
            ">No</button>
        `;
        document.body.appendChild(prompt);

        document.getElementById('notify-yes')?.addEventListener('click', () => {
            Notification.requestPermission();
            prompt.remove();
        });

        document.getElementById('notify-no')?.addEventListener('click', () => {
            prompt.remove();
        });
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232563eb" width="100" height="100"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">🏏</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232563eb" width="100" height="100"/><text x="50%" y="50%" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">🏏</text></svg>',
                ...options
            });

            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });
        }
    }

    // ========== STORAGE MANAGEMENT ==========
    async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const persistent = await navigator.storage.persist();
            console.log(`Persistent storage: ${persistent}`);
        }
    }

    async function getStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                percentage: (estimate.usage / estimate.quota) * 100
            };
        }
        return null;
    }

    function setupStorageListener() {
        if ('storage' in navigator) {
            navigator.storage.addEventListener?.('change', (e) => {
                console.log('Storage changed:', e);
            });
        }
    }

    // ========== OFFLINE VIDEO/IMAGE STORAGE ==========
    const MediaDB = (() => {
        const DB_NAME = "cricketMediaDB";
        const STORES = {
            videos: "videos",
            images: "images",
            recordings: "recordings"
        };
        const VERSION = 2;
        let db = null;

        async function getDB() {
            if (db) return Promise.resolve(db);

            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, VERSION);

                req.onupgradeneeded = (e) => {
                    const database = e.target.result;
                    Object.values(STORES).forEach(store => {
                        if (!database.objectStoreNames.contains(store)) {
                            database.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
                        }
                    });
                };

                req.onsuccess = (e) => { db = e.target.result; resolve(db); };
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function saveVideo(blob, metadata = {}) {
            const database = await getDB();
            const timestamp = Date.now();
            const id = `vid_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;

            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.videos, "readwrite");
                const store = tx.objectStore(STORES.videos);
                const record = {
                    id,
                    blob,
                    timestamp,
                    size: blob.size,
                    type: blob.type,
                    ...metadata
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(id);
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function saveImage(blob, metadata = {}) {
            const database = await getDB();
            const timestamp = Date.now();
            const id = `img_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;

            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.images, "readwrite");
                const store = tx.objectStore(STORES.images);
                const record = {
                    id,
                    blob,
                    timestamp,
                    size: blob.size,
                    type: blob.type,
                    ...metadata
                };
                const req = store.put(record);
                req.onsuccess = () => resolve(id);
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function getVideo(id) {
            const database = await getDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.videos, "readonly");
                const store = tx.objectStore(STORES.videos);
                const req = store.get(id);
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function getAllVideos() {
            const database = await getDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.videos, "readonly");
                const store = tx.objectStore(STORES.videos);
                const req = store.getAll();
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function deleteVideo(id) {
            const database = await getDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.videos, "readwrite");
                const store = tx.objectStore(STORES.videos);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        }

        async function clearAllVideos() {
            const database = await getDB();
            return new Promise((resolve, reject) => {
                const tx = database.transaction(STORES.videos, "readwrite");
                const store = tx.objectStore(STORES.videos);
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        }

        return {
            saveVideo,
            saveImage,
            getVideo,
            getAllVideos,
            deleteVideo,
            clearAllVideos
        };
    })();

    // ========== OFFLINE DATA SYNC ==========
    async function syncOfflineData() {
        if (!isOnline) return;

        try {
            // Sync any pending videos or match data
            const videos = await MediaDB.getAllVideos();
            
            // Example: Send to server (implement your backend URL)
            if (videos.length > 0) {
                console.log(`Found ${videos.length} videos to sync`);
                // await uploadVideosToServer(videos);
            }

            showNotification('Data Synced', 'Your offline data has been synced');
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // ========== BACKGROUND SYNC ==========
    async function registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-match-data');
                console.log('Background sync registered');
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        }
    }

    // ========== EXPORT/IMPORT DATA ==========
    async function exportAllData() {
        const data = {
            timestamp: new Date().toISOString(),
            teams: {
                team1: localStorage.getItem('team1'),
                team2: localStorage.getItem('team2')
            },
            settings: {
                overs: localStorage.getItem('overs'),
                inning: localStorage.getItem('inning')
            },
            videos: await MediaDB.getAllVideos()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadFile(blob, `cricket-match-${Date.now()}.json`);
        
        return data;
    }

    async function importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Restore localStorage
                    if (data.teams) {
                        localStorage.setItem('team1', data.teams.team1);
                        localStorage.setItem('team2', data.teams.team2);
                    }
                    if (data.settings) {
                        if (data.settings.overs) localStorage.setItem('overs', data.settings.overs);
                        if (data.settings.inning) localStorage.setItem('inning', data.settings.inning);
                    }

                    showNotification('Data Imported', 'Match data restored successfully');
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ========== APP INFO ==========
    async function getAppInfo() {
        const storage = await getStorageQuota();
        return {
            isOnline,
            isInstalled: localStorage.getItem('pwa_installed') === 'true',
            notificationsEnabled: 'Notification' in window && Notification.permission === 'granted',
            storage,
            userAgent: navigator.userAgent
        };
    }

    // ========== PUBLIC API ==========
    return {
        init,
        installPWA,
        requestNotificationPermission,
        showNotification,
        isConnected,
        getStorageQuota,
        getAppInfo,
        MediaDB,
        syncOfflineData,
        registerBackgroundSync,
        exportAllData,
        importData
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWAUtils.init());
} else {
    PWAUtils.init();
}
