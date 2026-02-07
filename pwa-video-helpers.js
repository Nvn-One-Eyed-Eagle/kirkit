/**
 * PWA Video Storage Integration Helper
 * 
 * This file shows how to integrate PWA storage with your existing
 * video recording functionality in script.js
 * 
 * Include this BEFORE script.js in match.html:
 * <script src="pwa-video-helpers.js"></script>
 */

const PWAVideoHelpers = (() => {
  /**
   * Save recorded video to PWA storage
   * @param {Blob} videoBlob - The video blob from MediaRecorder
   * @param {Object} metadata - Match metadata
   * @returns {Promise<string>} Video ID in storage
   */
  async function saveRecordedVideo(videoBlob, metadata = {}) {
    try {
      const videoId = await PWAUtils.MediaDB.saveVideo(videoBlob, {
        ballNumber: metadata.ballNumber,
        playerName: metadata.playerName,
        ballType: metadata.ballType,
        runs: metadata.runs,
        timestamp: Date.now(),
        matchTime: metadata.matchTime,
        over: metadata.over,
        inning: metadata.inning
      });

      // Save reference in localStorage
      const videoLog = JSON.parse(localStorage.getItem('pwa_video_log') || '[]');
      videoLog.push({
        id: videoId,
        timestamp: Date.now(),
        ballNumber: metadata.ballNumber,
        playerName: metadata.playerName,
        ballType: metadata.ballType,
        runs: metadata.runs
      });
      localStorage.setItem('pwa_video_log', JSON.stringify(videoLog));

      // Show success notification
      PWAUtils.showNotification('Video Saved', {
        body: `Ball ${metadata.ballNumber} (${metadata.ballType}) recorded`,
        tag: 'video-saved'
      });

      return videoId;
    } catch (error) {
      console.error('Failed to save video:', error);
      PWAUtils.showNotification('Video Save Failed', {
        body: 'Will retry when connection improves',
        tag: 'video-failed'
      });
      throw error;
    }
  }

  /**
   * Retrieve video for playback
   * @param {string} videoId - ID of video in storage
   * @returns {Promise<Blob>} Video blob
   */
  async function getRecordedVideo(videoId) {
    try {
      const record = await PWAUtils.MediaDB.getVideo(videoId);
      if (record && record.blob) {
        return record.blob;
      }
      throw new Error('Video not found');
    } catch (error) {
      console.error('Failed to retrieve video:', error);
      return null;
    }
  }

  /**
   * Get video URL for playback (creates object URL)
   * @param {string} videoId - ID of video in storage
   * @returns {Promise<string>} Object URL for video element
   */
  async function getVideoURL(videoId) {
    const blob = await getRecordedVideo(videoId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  }

  /**
   * Get all videos recorded in current match
   * @returns {Promise<Array>} Array of video records
   */
  async function getAllMatchVideos() {
    try {
      const videos = await PWAUtils.MediaDB.getAllVideos();
      return videos || [];
    } catch (error) {
      console.error('Failed to get videos:', error);
      return [];
    }
  }

  /**
   * Delete a recorded video
   * @param {string} videoId - ID of video to delete
   */
  async function deleteRecordedVideo(videoId) {
    try {
      await PWAUtils.MediaDB.deleteVideo(videoId);
      
      // Remove from log
      const videoLog = JSON.parse(localStorage.getItem('pwa_video_log') || '[]');
      const filtered = videoLog.filter(v => v.id !== videoId);
      localStorage.setItem('pwa_video_log', JSON.stringify(filtered));

      PWAUtils.showNotification('Video Deleted', {
        body: 'Video removed from storage',
        tag: 'video-deleted'
      });
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  }

  /**
   * Get storage stats for videos
   * @returns {Promise<Object>} Storage stats
   */
  async function getVideoStorageStats() {
    try {
      const videos = await getAllMatchVideos();
      const totalSize = videos.reduce((sum, v) => sum + (v.size || 0), 0);
      const quota = await PWAUtils.getStorageQuota();

      return {
        videoCount: videos.length,
        totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
        storagePercentage: quota.percentage.toFixed(2) + '%',
        storageStatus: quota.percentage > 80 ? 'WARNING: Storage full' : 'OK'
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Export all match videos
   * @param {string} filename - Optional filename for download
   */
  async function exportAllVideos(filename = null) {
    try {
      const videos = await getAllMatchVideos();
      
      if (videos.length === 0) {
        PWAUtils.showNotification('No Videos', {
          body: 'No videos to export',
          tag: 'export-failed'
        });
        return;
      }

      // Create zip or bundle (simple approach - list metadata)
      const exportData = {
        exportDate: new Date().toISOString(),
        videoCount: videos.length,
        videos: videos.map(v => ({
          id: v.id,
          timestamp: v.timestamp,
          size: v.size,
          type: v.type,
          metadata: v // Include all metadata
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], 
        { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `cricket-videos-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      PWAUtils.showNotification('Videos Exported', {
        body: `${videos.length} videos exported successfully`,
        tag: 'export-success'
      });
    } catch (error) {
      console.error('Export failed:', error);
      PWAUtils.showNotification('Export Failed', {
        body: 'Could not export videos',
        tag: 'export-failed'
      });
    }
  }

  /**
   * Clear all match videos (optional cleanup)
   * @param {boolean} confirm - Require confirmation
   */
  async function clearAllMatchVideos(confirm = true) {
    try {
      if (confirm && !window.confirm('Clear all match videos? This cannot be undone.')) {
        return;
      }

      await PWAUtils.MediaDB.clearAllVideos();
      localStorage.removeItem('pwa_video_log');

      PWAUtils.showNotification('Videos Cleared', {
        body: 'All match videos deleted',
        tag: 'clear-success'
      });
    } catch (error) {
      console.error('Clear failed:', error);
    }
  }

  /**
   * Get video playback URLs for preview/gallery
   * @returns {Promise<Array>} Array of {id, url, metadata}
   */
  async function getVideoPreviewGallery() {
    try {
      const videos = await getAllMatchVideos();
      const gallery = [];

      for (const video of videos) {
        const url = await getVideoURL(video.id);
        if (url) {
          gallery.push({
            id: video.id,
            url: url,
            timestamp: video.timestamp,
            size: video.size,
            metadata: video
          });
        }
      }

      return gallery;
    } catch (error) {
      console.error('Failed to get gallery:', error);
      return [];
    }
  }

  /**
   * Create preview card HTML for video display
   * @param {Object} video - Video record from getAllMatchVideos()
   * @returns {HTMLElement} Preview card element
   */
  function createVideoPreviewCard(video) {
    const card = document.createElement('div');
    card.style.cssText = `
      width: 120px;
      height: 80px;
      border-radius: 8px;
      background: #000;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    // Create video preview thumbnail
    const videoUrl = URL.createObjectURL(video.blob);
    const thumbnail = document.createElement('video');
    thumbnail.src = videoUrl;
    thumbnail.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    thumbnail.onloadedmetadata = () => {
      thumbnail.currentTime = 0.1; // Show first frame
    };

    // Add play icon
    const playIcon = document.createElement('div');
    playIcon.innerHTML = '▶';
    playIcon.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      color: white;
      opacity: 0.7;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;

    card.appendChild(thumbnail);
    card.appendChild(playIcon);

    // Add metadata tooltip
    card.title = `${video.ballType || 'Video'} - ${new Date(video.timestamp).toLocaleTimeString()}`;

    return card;
  }

  /**
   * Sync videos to server when online
   * @param {string} apiEndpoint - Backend API URL for upload
   * @param {Function} onProgress - Progress callback
   */
  async function syncVideosToServer(apiEndpoint, onProgress = null) {
    if (!PWAUtils.isConnected()) {
      PWAUtils.showNotification('Offline Mode', {
        body: 'Cannot sync while offline. Will try again when online.',
        tag: 'sync-offline'
      });
      return false;
    }

    try {
      const videos = await getAllMatchVideos();
      let uploaded = 0;

      for (const video of videos) {
        try {
          const formData = new FormData();
          formData.append('video', video.blob, `${video.id}.webm`);
          formData.append('metadata', JSON.stringify({
            id: video.id,
            timestamp: video.timestamp,
            ballType: video.ballType,
            playerName: video.playerName,
            ballNumber: video.ballNumber,
            runs: video.runs
          }));

          const response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            await deleteRecordedVideo(video.id);
            uploaded++;
            
            if (onProgress) {
              onProgress({
                current: uploaded,
                total: videos.length,
                percentage: (uploaded / videos.length) * 100
              });
            }
          }
        } catch (error) {
          console.error(`Failed to upload video ${video.id}:`, error);
        }
      }

      PWAUtils.showNotification('Sync Complete', {
        body: `${uploaded}/${videos.length} videos synced to server`,
        tag: 'sync-complete'
      });

      return uploaded === videos.length;
    } catch (error) {
      console.error('Sync failed:', error);
      PWAUtils.showNotification('Sync Failed', {
        body: 'Could not sync videos. Will retry later.',
        tag: 'sync-failed'
      });
      return false;
    }
  }

  /**
   * Compress video before saving (basic)
   * @param {Blob} blob - Original video blob
   * @returns {Promise<Blob>} Compressed blob (returns original if compression unavailable)
   */
  async function compressVideo(blob) {
    // Note: Actual compression requires additional libraries like ffmpeg.js
    // This is a placeholder that returns the original
    // For production, use: https://ffmpegwasm.netlify.app/
    console.log('Video compression requires ffmpeg.js library');
    return blob;
  }

  // Public API
  return {
    saveRecordedVideo,
    getRecordedVideo,
    getVideoURL,
    getAllMatchVideos,
    deleteRecordedVideo,
    getVideoStorageStats,
    exportAllVideos,
    clearAllMatchVideos,
    getVideoPreviewGallery,
    createVideoPreviewCard,
    syncVideosToServer,
    compressVideo
  };
})();
