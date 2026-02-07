/**
 * PRACTICAL PWA INTEGRATION GUIDE FOR script.js
 * 
 * This file shows how to modify your existing MediaRecorder code
 * in script.js to use PWA storage for videos.
 * 
 * Search for these sections in script.js and apply the modifications.
 */

// ============================================================================
// BEFORE: Original video save in script.js (around line 150-200 area)
// ============================================================================

/*
function recordVideo() {
    // Original code - saves to localStorage as base64
    const mediaConstraints = { audio: true, video: { facingMode: 'user' } };
    navigator.mediaDevices.getUserMedia(mediaConstraints).then(stream => {
        recorder = new MediaRecorder(stream);
        chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result;
                // Saving as base64 in localStorage - NOT IDEAL FOR LARGE VIDEOS
                lastBallVideoID = base64;
                overVideos.push(base64);
            };
            reader.readAsDataURL(blob);
        };
        recorder.start();
    });
}
*/

// ============================================================================
// AFTER: Modified code using PWA storage
// ============================================================================

async function recordVideo(metadata = {}) {
    try {
        const mediaConstraints = { audio: true, video: { facingMode: 'user' } };
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        recorder = new MediaRecorder(stream);
        chunks = [];
        
        recorder.ondataavailable = e => chunks.push(e.data);
        
        recorder.onstop = async () => {
            try {
                const blob = new Blob(chunks, { type: 'video/webm' });
                
                // ✨ NEW: Save to PWA storage instead of base64
                const videoId = await PWAVideoHelpers.saveRecordedVideo(blob, {
                    ballNumber: metadata.ballNumber || inning_score.balls,
                    playerName: metadata.playerName || strike.innerText,
                    ballType: metadata.ballType || 'regular',
                    runs: metadata.runs || 0,
                    matchTime: new Date().toISOString(),
                    over: inning_score.overs,
                    inning: inning
                });
                
                // Store ID for playback
                lastBallVideoID = videoId;
                overVideos.push(videoId); // Now stores IDs instead of base64
                
                // Show preview
                const videoUrl = await PWAVideoHelpers.getVideoURL(videoId);
                if (videoUrl && document.getElementById('previewVideos')) {
                    const preview = document.createElement('video');
                    preview.src = videoUrl;
                    preview.style.cssText = 'width: 120px; height: 80px; border-radius: 8px; background: #000;';
                    preview.controls = true;
                    document.getElementById('previewVideos').appendChild(preview);
                }
                
            } catch (error) {
                console.error('Video recording error:', error);
                PWAUtils.showNotification('Recording Failed', {
                    body: 'Could not save video. Please try again.'
                });
            }
        };
        
        recorder.start();
        isRecording = true;
        
    } catch (error) {
        console.error('Camera access error:', error);
        PWAUtils.showNotification('Camera Access Denied', {
            body: 'Please allow camera access to record videos'
        });
    }
}

// ============================================================================
// BEFORE: Stop recording original
// ============================================================================

/*
function stopRecording() {
    if (recorder && isRecording) {
        recorder.stop();
        isRecording = false;
        const stream = recorder.stream;
        stream.getTracks().forEach(track => track.stop());
    }
}
*/

// ============================================================================
// AFTER: Stop recording with PWA cleanup
// ============================================================================

function stopRecording() {
    if (recorder && isRecording) {
        recorder.stop();
        isRecording = false;
        
        // Stop all tracks to release camera
        const stream = recorder.stream;
        stream.getTracks().forEach(track => track.stop());
        
        // Log stats
        PWAVideoHelpers.getVideoStorageStats().then(stats => {
            console.log('Video Storage Stats:', stats);
        });
    }
}

// ============================================================================
// BEFORE: Play video original (around line 250-300)
// ============================================================================

/*
function playRecordedVideo(videoUrl) {
    const modal = document.getElementById('video-modal');
    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    // ... etc
}
*/

// ============================================================================
// AFTER: Play video with PWA storage
// ============================================================================

async function playRecordedVideo(videoIdOrUrl) {
    try {
        let videoUrl = videoIdOrUrl;
        
        // If it's a PWA storage ID, get the URL
        if (videoIdOrUrl.startsWith('vid_')) {
            videoUrl = await PWAVideoHelpers.getVideoURL(videoIdOrUrl);
            if (!videoUrl) {
                PWAUtils.showNotification('Video Not Found', {
                    body: 'The video could not be retrieved'
                });
                return;
            }
        }
        
        const modal = document.getElementById('video-modal');
        const wrapper = document.getElementById('modal-video-wrapper');
        
        const video = document.createElement('video');
        video.src = videoUrl;
        video.controls = true;
        video.autoplay = true;
        video.style.cssText = 'width: 100%; border-radius: 12px;';
        
        wrapper.innerHTML = '';
        wrapper.appendChild(video);
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Playback error:', error);
        PWAUtils.showNotification('Playback Failed', {
            body: 'Cannot play this video'
        });
    }
}

// ============================================================================
// NEW: Export all match videos (add to your code)
// ============================================================================

async function exportMatchVideos() {
    try {
        const stats = await PWAVideoHelpers.getVideoStorageStats();
        console.log('Exporting videos...', stats);
        
        PWAUtils.showNotification('Exporting Videos', {
            body: `Exporting ${stats.videoCount} videos...`,
            tag: 'export-in-progress'
        });
        
        await PWAVideoHelpers.exportAllVideos(`cricket-match-${Date.now()}.json`);
        
    } catch (error) {
        console.error('Export error:', error);
    }
}

// ============================================================================
// NEW: Sync videos to backend (add to your code)
// ============================================================================

async function syncVideosToBackend() {
    // Replace with your actual backend API URL
    const API_URL = 'https://your-cricket-api.com/api/upload-video';
    
    // Only sync if online
    if (!PWAUtils.isConnected()) {
        PWAUtils.showNotification('Cannot Sync', {
            body: 'You are offline. Videos will sync when online.'
        });
        return;
    }
    
    // Show sync progress
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #2563eb;
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        z-index: 10000;
    `;
    
    document.body.appendChild(progressBar);
    
    await PWAVideoHelpers.syncVideosToServer(API_URL, (progress) => {
        progressBar.textContent = `Syncing: ${progress.percentage.toFixed(0)}% (${progress.current}/${progress.total})`;
    });
    
    setTimeout(() => progressBar.remove(), 3000);
}

// ============================================================================
// NEW: Get storage warnings (add to match settings panel)
// ============================================================================

async function showStorageWarning() {
    const stats = await PWAVideoHelpers.getVideoStorageStats();
    
    if (stats.storagePercentage > 50) {
        PWAUtils.showNotification('Storage Usage', {
            body: `Using ${stats.storagePercentage} - ${stats.videoCount} videos stored`,
            tag: 'storage-warning'
        });
    }
    
    console.log('📊 Storage Stats:', stats);
}

// ============================================================================
// NEW: Handle network changes for auto-sync (add to initialization)
// ============================================================================

function setupAutoSync() {
    window.addEventListener('online', async () => {
        console.log('Back online - starting auto-sync');
        PWAUtils.showNotification('Back Online', {
            body: 'Syncing match videos...'
        });
        
        // Auto-sync videos after 2 seconds
        setTimeout(() => {
            syncVideosToBackend();
        }, 2000);
    });
    
    window.addEventListener('offline', () => {
        console.log('Went offline - videos will sync later');
        PWAUtils.showNotification('Offline Mode', {
            body: 'Videos will sync when you go online'
        });
    });
}

// ============================================================================
// NEW: Manage video gallery UI (add to your display module)
// ============================================================================

async function displayVideoGallery(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const gallery = await PWAVideoHelpers.getVideoPreviewGallery();
    container.innerHTML = '';
    
    if (gallery.length === 0) {
        container.innerHTML = '<p style="color: #999;">No videos recorded yet</p>';
        return;
    }
    
    for (const video of gallery) {
        const card = PWAVideoHelpers.createVideoPreviewCard(video);
        
        card.addEventListener('click', () => {
            playRecordedVideo(video.url);
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '✕';
        deleteBtn.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            background: rgba(239, 68, 68, 0.8);
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        `;
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            PWAVideoHelpers.deleteRecordedVideo(video.id);
            card.remove();
        });
        
        card.style.position = 'relative';
        card.appendChild(deleteBtn);
        container.appendChild(card);
    }
}

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

/*
✅ STEPS TO INTEGRATE INTO YOUR script.js:

1. Add the initialization call (in your DOMContentLoaded or init function):
   - setupAutoSync();
   - PWAUtils.init();

2. Replace recordVideo() with the new version above

3. Replace stopRecording() with the new version above

4. Replace playRecordedVideo() with the new version above

5. In your match end handler, add:
   - syncVideosToBackend();
   - await PWAVideoHelpers.exportAllVideos();

6. Add buttons to your UI:
   - "Export Match" → exportMatchVideos()
   - "Sync to Cloud" → syncVideosToBackend()
   - "Storage Stats" → showStorageWarning()

7. Test offline:
   - Record videos offline
   - Go offline in DevTools (F12 → Network → Offline)
   - Record more videos
   - Check storage size
   - Go back online - should auto-sync

8. Monitor in console:
   - console.log(await PWAVideoHelpers.getVideoStorageStats());
   - console.log(await PWAUtils.getAppInfo());
*/

// ============================================================================
// SAMPLE UI BUTTON INTEGRATION
// ============================================================================

/*
// Add to your match.html body:

<div class="pwa-controls">
    <button onclick="showStorageWarning()" class="pwa-btn">
        📊 Storage
    </button>
    <button onclick="exportMatchVideos()" class="pwa-btn">
        💾 Export
    </button>
    <button onclick="syncVideosToBackend()" class="pwa-btn">
        ☁️ Sync
    </button>
</div>

<style>
.pwa-controls {
    display: flex;
    gap: 8px;
    margin: 12px 0;
}

.pwa-btn {
    padding: 8px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.pwa-btn:hover {
    background: #1e40af;
    transform: translateY(-2px);
}

.pwa-btn:active {
    transform: translateY(0);
}
</style>
*/
