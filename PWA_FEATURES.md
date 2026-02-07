# PWA Features Guide - Cricket Game App

## Overview
Your cricket game now has full Progressive Web App (PWA) capabilities! This enables offline functionality, installability, and background syncing.

---

## 🚀 New PWA Features Added

### 1. **Installation & Home Screen**
- Users can install the app on their device
- Add to home screen on iOS & Android
- Standalone app mode (no browser UI)
- App icon and splash screen

```javascript
// Manually trigger install
PWAUtils.installPWA();
```

### 2. **Offline Functionality**
- App works completely offline
- Caches all HTML, CSS, JS files
- Service worker handles network failures
- Automatic sync when back online

### 3. **Video & Image Storage**
The new `PWAUtils.MediaDB` system stores videos and images locally:

```javascript
// Save video from recording
const videoBlob = await recorder.getBlob();
const videoId = await PWAUtils.MediaDB.saveVideo(videoBlob, {
  playerName: "Player X",
  ballNumber: 2,
  runs: 6
});

// Save captured image
const imageBlob = await canvas.toBlob();
const imageId = await PWAUtils.MediaDB.saveImage(imageBlob, {
  playerName: "Player Y",
  timestamp: Date.now()
});

// Retrieve video
const video = await PWAUtils.MediaDB.getVideo(videoId);

// Get all videos
const allVideos = await PWAUtils.MediaDB.getAllVideos();

// Delete video
await PWAUtils.MediaDB.deleteVideo(videoId);

// Clear all videos
await PWAUtils.MediaDB.clearAllVideos();
```

### 4. **Network Status Detection**
```javascript
// Check if online
if (PWAUtils.isConnected()) {
  console.log("Online - can sync data");
} else {
  console.log("Offline - data will be synced later");
}

// Listen for network changes (automatic)
// PWAUtils automatically shows notifications
```

### 5. **Notifications**
```javascript
// Request notification permission
PWAUtils.requestNotificationPermission();

// Send notification
PWAUtils.showNotification('Wicket!', {
  body: 'Batter out! Run rate: 8.5',
  tag: 'match-update'
});
```

### 6. **Storage Management**
```javascript
// Check storage quota
const quota = await PWAUtils.getStorageQuota();
console.log(`Using ${quota.percentage.toFixed(2)}% of storage`);
// { usage: 5242880, quota: 10737418240, percentage: 0.048... }

// Get full app info
const info = await PWAUtils.getAppInfo();
console.log(info);
// {
//   isOnline: true,
//   isInstalled: true,
//   notificationsEnabled: true,
//   storage: { ... },
//   userAgent: "..."
// }
```

### 7. **Data Export/Import**
```javascript
// Export all data (teams, settings, videos)
const data = await PWAUtils.exportAllData();
// Downloads as: cricket-match-{timestamp}.json

// Import data from backup
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.onchange = async (e) => {
  await PWAUtils.importData(e.target.files[0]);
};
fileInput.click();
```

### 8. **Background Sync**
```javascript
// Register background sync
await PWAUtils.registerBackgroundSync();

// When user goes offline after recording videos:
// 1. Videos are stored in IndexedDB
// 2. When back online, background sync automatically triggers
// 3. Data is synced to your backend server
```

---

## 📱 Integration Examples

### Example 1: Video Recording with PWA Storage

```javascript
// In your script.js - modify the video save logic

async function saveMatchVideo(videoBlob, metadata) {
  try {
    // Save to PWA storage
    const videoId = await PWAUtils.MediaDB.saveVideo(videoBlob, {
      ballNumber: metadata.ballNumber,
      playerName: metadata.playerName,
      ballType: metadata.ballType // (e.g., "6", "4", "wide", "no-ball")
    });
    
    // Also save ID to localStorage for match tracking
    const matchVideos = JSON.parse(localStorage.getItem('match_videos') || '[]');
    matchVideos.push({
      id: videoId,
      timestamp: Date.now(),
      ...metadata
    });
    localStorage.setItem('match_videos', JSON.stringify(matchVideos));
    
    // Show notification
    PWAUtils.showNotification('Video Saved', {
      body: `Ball ${metadata.ballNumber} recorded successfully`
    });
    
    return videoId;
  } catch (error) {
    console.error('Failed to save video:', error);
    PWAUtils.showNotification('Save Failed', {
      body: 'Could not save video. Will retry when online.'
    });
  }
}

// When syncing data (when back online)
async function syncMatchData() {
  if (!PWAUtils.isConnected()) return;
  
  const matchVideos = JSON.parse(localStorage.getItem('match_videos') || '[]');
  
  for (const video of matchVideos) {
    const videoBlob = await PWAUtils.MediaDB.getVideo(video.id);
    
    // Upload to server (your backend API)
    await uploadToServer(videoBlob, video.metadata);
    
    // Delete from local storage after successful upload
    await PWAUtils.MediaDB.deleteVideo(video.id);
  }
}
```

### Example 2: Player Image Capture

```javascript
// Capture player photo (update index.js)

async function capturePlayerPhoto() {
  try {
    const video = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob
    const imageBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
    
    // Save with player metadata
    const imageId = await PWAUtils.MediaDB.saveImage(imageBlob, {
      playerName: document.getElementById('inp-name').value,
      captureTime: Date.now()
    });
    
    // Show preview
    const url = URL.createObjectURL(imageBlob);
    document.getElementById('photo-preview').src = url;
    
    return imageId;
  } catch (error) {
    console.error('Capture failed:', error);
  }
}
```

### Example 3: Offline Notification System

```javascript
// Add to script.js

// Listen for network changes
window.addEventListener('online', async () => {
  PWAUtils.showNotification('Back Online!', {
    body: 'Syncing your match data...',
    tag: 'sync-notification'
  });
  
  // Trigger sync
  await PWAUtils.syncOfflineData();
  
  PWAUtils.showNotification('Sync Complete', {
    body: 'All data synced successfully'
  });
});

window.addEventListener('offline', () => {
  PWAUtils.showNotification('You are Offline', {
    body: 'Your data is being saved locally',
    tag: 'offline-notification'
  });
});
```

---

## 🛠️ Configuration

### Update Service Worker (if needed)
Edit `sw.js` to add your API endpoints for syncing:

```javascript
// In sw.js - update the sync event
self.addEventListener('sync', event => {
  if (event.tag === 'sync-match-data') {
    event.waitUntil(
      fetch('/api/sync-match', {
        method: 'POST',
        body: JSON.stringify(/* your data */)
      })
    );
  }
});
```

### Modify Backend Integration
```javascript
// In pwa-utils.js - add your backend URLs
const BACKEND_URL = 'https://your-api.com';

async function syncOfflineData() {
  const videos = await MediaDB.getAllVideos();
  
  for (const video of videos) {
    const formData = new FormData();
    formData.append('video', video.blob);
    formData.append('metadata', JSON.stringify(video));
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/upload-video`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        await MediaDB.deleteVideo(video.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## 📊 Storage Limits

- **IndexedDB**: Typically 50MB - several GB (depends on device)
- **Cache Storage**: Typically 50MB - several GB
- **IndexedDB Auto-cleanup**: Browser may clear old data when quota exceeded

### Monitor Storage:
```javascript
const quota = await PWAUtils.getStorageQuota();
if (quota.percentage > 80) {
  console.warn('Storage almost full!');
  // Clean up old videos
  await PWAUtils.MediaDB.clearAllVideos();
}
```

---

## 🔔 Push Notifications (Backend Required)

### Server-side example (Node.js):
```javascript
const webpush = require('web-push');

// Store subscription from client
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  saveSubscription(subscription); // Save to DB
  res.sendStatus(201);
});

// Send notification when wicket happens
app.post('/api/notify-wicket', async (req, res) => {
  const subscriptions = getAllSubscriptions();
  
  for (const subscription of subscriptions) {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'Wicket!',
      body: 'Player out!',
      badge: '🏏'
    }));
  }
});
```

### Client-side (register subscription):
```javascript
// In your app
async function registerPushNotifications() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'YOUR_PUBLIC_KEY'
    });
    
    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

---

## ✅ Testing Checklist

- [ ] Install app on home screen
- [ ] Take video/photo captures offline
- [ ] Go offline - app still works
- [ ] Record match data offline
- [ ] Go online - data syncs automatically
- [ ] Check storage quota increasing
- [ ] Export/import match data
- [ ] Receive notifications (if enabled)
- [ ] App launch from home screen
- [ ] Dark mode respects system preferences

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| SW not registering | Check sw.js path is correct, verify no errors in console |
| Videos not saving | Check IndexedDB quota, ensure Blob is valid |
| Offline mode not working | Verify Cache Storage is not disabled, check HTTPS (required for PWA) |
| Notifications not showing | Request permission first, check notification permission settings |
| Sync not triggering | Ensure background sync is registered, check network status |

---

## 📚 API Reference

### PWAUtils Methods

```javascript
PWAUtils.init()                          // Initialize PWA
PWAUtils.installPWA()                    // Show install prompt
PWAUtils.requestNotificationPermission() // Request notifications
PWAUtils.showNotification(title, options) // Send notification
PWAUtils.isConnected()                   // Check if online
PWAUtils.getStorageQuota()               // Get storage stats
PWAUtils.getAppInfo()                    // Get app info
PWAUtils.syncOfflineData()               // Manual sync
PWAUtils.registerBackgroundSync()        // Register background sync
PWAUtils.exportAllData()                 // Export data
PWAUtils.importData(file)                // Import data

PWAUtils.MediaDB.saveVideo(blob, metadata)    // Save video
PWAUtils.MediaDB.saveImage(blob, metadata)    // Save image
PWAUtils.MediaDB.getVideo(id)                 // Get video
PWAUtils.MediaDB.getAllVideos()               // Get all videos
PWAUtils.MediaDB.deleteVideo(id)              // Delete video
PWAUtils.MediaDB.clearAllVideos()             // Clear all
```

---

## 🎯 Next Steps

1. Test the PWA on different devices
2. Integrate with your backend API for backend sync
3. Add push notifications from server
4. Monitor storage usage in production
5. Gather user feedback on offline experience

Happy cricket scoring! 🏏
