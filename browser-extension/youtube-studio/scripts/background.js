/**
 * YouTube Studio Extension - Background Service Worker
 * Processes data from content script and sends to Sia backend
 */

console.log('🔧 Sia YouTube Studio Extension: Background service worker loaded');

// Configuration
const CONFIG = {
  DEFAULT_API_URL: 'https://your-supabase-project.supabase.co',
  BATCH_SIZE: 10,
  BATCH_INTERVAL: 60000, // Send batched data every 60 seconds
};

// Data queue for batching
let dataQueue = [];
let batchInterval = null;

/**
 * Send data to Sia backend
 */
async function sendToSiaBackend(data) {
  try {
    // Get configuration from storage
    const config = await chrome.storage.sync.get(['siaApiUrl', 'siaUserId', 'siaApiKey']);

    if (!config.siaApiUrl || !config.siaUserId) {
      console.error('❌ Sia configuration missing');
      return {
        success: false,
        error: 'Configuration missing. Please set up Sia credentials in extension popup.'
      };
    }

    // Prepare payload
    const payload = {
      user_id: config.siaUserId,
      data: data,
      source: 'youtube_studio_extension',
      version: chrome.runtime.getManifest().version
    };

    // Send to Sia Edge Function
    const url = `${config.siaApiUrl}/functions/v1/youtube-studio-ingest`;

    console.log('📤 Sending data to Sia:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.siaApiKey || ''}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Data sent successfully:', result);

    // Update stats
    updateStats('success');

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('❌ Error sending to Sia:', error);

    // Update stats
    updateStats('error');

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add data to batch queue
 */
function queueData(data) {
  dataQueue.push({
    ...data,
    queuedAt: new Date().toISOString()
  });

  console.log(`📦 Data queued. Queue size: ${dataQueue.length}`);

  // If queue is full, send immediately
  if (dataQueue.length >= CONFIG.BATCH_SIZE) {
    sendBatch();
  }
}

/**
 * Send batched data
 */
async function sendBatch() {
  if (dataQueue.length === 0) {
    return;
  }

  console.log(`📮 Sending batch of ${dataQueue.length} items`);

  const batch = [...dataQueue];
  dataQueue = [];

  try {
    const result = await sendToSiaBackend({
      type: 'batch',
      items: batch,
      count: batch.length
    });

    if (!result.success) {
      // Re-queue failed items
      console.warn('⚠️ Batch failed, re-queueing items');
      dataQueue = [...batch, ...dataQueue];
    }
  } catch (error) {
    console.error('❌ Batch send error:', error);
    // Re-queue on error
    dataQueue = [...batch, ...dataQueue];
  }
}

/**
 * Start batch processing
 */
function startBatchProcessing() {
  if (batchInterval) {
    clearInterval(batchInterval);
  }

  batchInterval = setInterval(() => {
    sendBatch();
  }, CONFIG.BATCH_INTERVAL);

  console.log('⏰ Batch processing started');
}

/**
 * Update extension statistics
 */
async function updateStats(type) {
  const stats = await chrome.storage.local.get(['stats']) || { stats: {} };

  if (!stats.stats) {
    stats.stats = {
      totalExtractions: 0,
      successfulSends: 0,
      failedSends: 0,
      lastUpdate: null
    };
  }

  if (type === 'extract') {
    stats.stats.totalExtractions++;
  } else if (type === 'success') {
    stats.stats.successfulSends++;
  } else if (type === 'error') {
    stats.stats.failedSends++;
  }

  stats.stats.lastUpdate = new Date().toISOString();

  await chrome.storage.local.set({ stats: stats.stats });
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message.action);

  if (message.action === 'STUDIO_DATA_EXTRACTED') {
    // Update stats
    updateStats('extract');

    // Get batching preference
    chrome.storage.sync.get(['enableBatching'], async (config) => {
      if (config.enableBatching !== false) {
        // Add to queue
        queueData(message.data);
        sendResponse({ success: true, queued: true });
      } else {
        // Send immediately
        const result = await sendToSiaBackend(message.data);
        sendResponse(result);
      }
    });

    return true; // Keep channel open for async response
  }

  if (message.action === 'GET_STATS') {
    chrome.storage.local.get(['stats'], (result) => {
      sendResponse(result.stats || {});
    });
    return true;
  }

  if (message.action === 'CLEAR_STATS') {
    chrome.storage.local.set({
      stats: {
        totalExtractions: 0,
        successfulSends: 0,
        failedSends: 0,
        lastUpdate: null
      }
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'GET_QUEUE_SIZE') {
    sendResponse({ size: dataQueue.length });
    return true;
  }

  if (message.action === 'FLUSH_QUEUE') {
    sendBatch().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🎉 Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Set default configuration
    chrome.storage.sync.set({
      siaApiUrl: CONFIG.DEFAULT_API_URL,
      autoExtract: true,
      enableBatching: true
    });

    // Open options page
    chrome.runtime.openOptionsPage();
  }
});

/**
 * Initialize background service
 */
function init() {
  console.log('🚀 Background service initialized');
  startBatchProcessing();
}

// Initialize
init();
