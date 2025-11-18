/**
 * YouTube Studio Content Script
 * Extracts data from YouTube Studio DOM and sends to background script
 */

console.log('🎬 Sia YouTube Studio Extension: Content script loaded');

// Configuration
const CONFIG = {
  EXTRACT_INTERVAL: 30000, // Extract data every 30 seconds
  SELECTORS: {
    // Dashboard selectors
    channelName: 'ytcp-chip-bar tp-yt-paper-tab[role="tab"]',
    subscriberCount: '#subscriber-count',

    // Video analytics selectors (Analytics page)
    videoTitle: 'h1.video-title, ytcp-video-title',
    views: '[data-e2e-channel-header-metadata-views]',
    watchTime: '[data-e2e-channel-header-metadata-watch-time]',

    // Recent videos table
    videoRows: 'ytcp-video-row',

    // Analytics cards
    analyticsCards: '.analytics-card, ytcp-analytics-card',

    // Comments section
    comments: 'ytcp-comment-thread',

    // Revenue data (if available)
    revenue: '[data-e2e-revenue]',
  }
};

// Data extraction state
let extractionInterval = null;
let lastExtractedData = null;

/**
 * Extract dashboard overview data
 */
function extractDashboardData() {
  const data = {
    type: 'dashboard',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    channelName: null,
    metrics: {}
  };

  // Extract channel name
  const channelElement = document.querySelector(CONFIG.SELECTORS.channelName);
  if (channelElement) {
    data.channelName = channelElement.textContent.trim();
  }

  // Extract metrics from cards
  const cards = document.querySelectorAll(CONFIG.SELECTORS.analyticsCards);
  cards.forEach(card => {
    try {
      const label = card.querySelector('.label, .metric-label')?.textContent.trim();
      const value = card.querySelector('.value, .metric-value')?.textContent.trim();
      if (label && value) {
        data.metrics[label] = value;
      }
    } catch (e) {
      console.warn('Error extracting card data:', e);
    }
  });

  return data;
}

/**
 * Extract video list data from content page
 */
function extractVideoListData() {
  const data = {
    type: 'video_list',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    videos: []
  };

  const videoRows = document.querySelectorAll(CONFIG.SELECTORS.videoRows);

  videoRows.forEach((row, index) => {
    try {
      const video = {
        position: index + 1,
        title: row.querySelector('a[id^="video-title"]')?.textContent.trim() || null,
        url: row.querySelector('a[id^="video-title"]')?.href || null,
        visibility: row.querySelector('[aria-label*="visibility"]')?.textContent.trim() || null,
        views: row.querySelector('[aria-label*="views"]')?.textContent.trim() || null,
        date: row.querySelector('[aria-label*="date"]')?.textContent.trim() || null,
        comments: row.querySelector('[aria-label*="comments"]')?.textContent.trim() || null,
        likes: row.querySelector('[aria-label*="likes"]')?.textContent.trim() || null,
      };

      // Extract video ID from URL
      if (video.url) {
        const match = video.url.match(/video\/([^/]+)/);
        video.videoId = match ? match[1] : null;
      }

      data.videos.push(video);
    } catch (e) {
      console.warn('Error extracting video row:', e);
    }
  });

  return data;
}

/**
 * Extract analytics page data
 */
function extractAnalyticsData() {
  const data = {
    type: 'analytics',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    metrics: {},
    charts: []
  };

  // Try to extract various metric cards
  const metricCards = document.querySelectorAll('[class*="metric"], [class*="stat"]');
  metricCards.forEach(card => {
    try {
      const label = card.querySelector('[class*="label"]')?.textContent.trim();
      const value = card.querySelector('[class*="value"]')?.textContent.trim();
      if (label && value) {
        data.metrics[label] = value;
      }
    } catch (e) {
      console.warn('Error extracting metric:', e);
    }
  });

  // Extract text from all visible elements that might contain metrics
  const allText = document.body.innerText;
  const metricPatterns = [
    /Views:\s*([\d,]+)/i,
    /Watch time \(hours\):\s*([\d,]+)/i,
    /Subscribers:\s*([\d,]+)/i,
    /Revenue:\s*\$([\d,.]+)/i,
    /Impressions:\s*([\d,]+)/i,
    /Click-through rate:\s*([\d.]+)%/i,
  ];

  metricPatterns.forEach(pattern => {
    const match = allText.match(pattern);
    if (match) {
      const key = pattern.source.split(':')[0].replace(/\\/g, '');
      data.metrics[key] = match[1];
    }
  });

  return data;
}

/**
 * Extract comments data
 */
function extractCommentsData() {
  const data = {
    type: 'comments',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    comments: []
  };

  const commentElements = document.querySelectorAll(CONFIG.SELECTORS.comments);

  commentElements.forEach((element, index) => {
    try {
      const comment = {
        position: index + 1,
        author: element.querySelector('[id*="author"]')?.textContent.trim() || null,
        text: element.querySelector('[id*="comment-text"]')?.textContent.trim() || null,
        date: element.querySelector('[class*="date"]')?.textContent.trim() || null,
        likes: element.querySelector('[aria-label*="likes"]')?.textContent.trim() || null,
        replies: element.querySelector('[aria-label*="replies"]')?.textContent.trim() || null,
      };
      data.comments.push(comment);
    } catch (e) {
      console.warn('Error extracting comment:', e);
    }
  });

  return data;
}

/**
 * Main extraction function - determines page type and extracts appropriate data
 */
function extractData() {
  const url = window.location.href;
  let data = null;

  try {
    if (url.includes('/videos')) {
      data = extractVideoListData();
    } else if (url.includes('/analytics')) {
      data = extractAnalyticsData();
    } else if (url.includes('/comments')) {
      data = extractCommentsData();
    } else if (url.includes('/channel/')) {
      data = extractDashboardData();
    } else {
      // Default: try to extract dashboard data
      data = extractDashboardData();
    }

    // Add metadata
    if (data) {
      data.pageType = getPageType(url);
      data.extractedAt = new Date().toISOString();

      // Only send if data has changed
      if (JSON.stringify(data) !== JSON.stringify(lastExtractedData)) {
        lastExtractedData = data;
        sendDataToBackground(data);
      }
    }
  } catch (error) {
    console.error('❌ Error extracting data:', error);
    sendDataToBackground({
      type: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Determine page type from URL
 */
function getPageType(url) {
  if (url.includes('/videos')) return 'content';
  if (url.includes('/analytics')) return 'analytics';
  if (url.includes('/comments')) return 'comments';
  if (url.includes('/channel/')) return 'dashboard';
  return 'unknown';
}

/**
 * Send extracted data to background script
 */
function sendDataToBackground(data) {
  chrome.runtime.sendMessage({
    action: 'STUDIO_DATA_EXTRACTED',
    data: data
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error sending data:', chrome.runtime.lastError);
    } else {
      console.log('✅ Data sent to background:', response);
    }
  });
}

/**
 * Start automatic data extraction
 */
function startExtraction() {
  console.log('▶️ Starting automatic data extraction...');

  // Extract immediately
  extractData();

  // Then extract periodically
  if (extractionInterval) {
    clearInterval(extractionInterval);
  }

  extractionInterval = setInterval(() => {
    extractData();
  }, CONFIG.EXTRACT_INTERVAL);
}

/**
 * Stop automatic data extraction
 */
function stopExtraction() {
  console.log('⏸️ Stopping automatic data extraction...');
  if (extractionInterval) {
    clearInterval(extractionInterval);
    extractionInterval = null;
  }
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📩 Message received:', message);

  switch (message.action) {
    case 'EXTRACT_NOW':
      extractData();
      sendResponse({ success: true });
      break;

    case 'START_EXTRACTION':
      startExtraction();
      sendResponse({ success: true });
      break;

    case 'STOP_EXTRACTION':
      stopExtraction();
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      sendResponse({
        isRunning: extractionInterval !== null,
        lastExtraction: lastExtractedData?.timestamp || null
      });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }

  return true; // Keep channel open for async response
});

/**
 * Observe DOM changes for dynamic content
 */
const observer = new MutationObserver((mutations) => {
  // Debounce extraction on DOM changes
  if (extractionInterval) {
    clearTimeout(window.extractionDebounce);
    window.extractionDebounce = setTimeout(() => {
      extractData();
    }, 2000);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Initialize on page load
 */
function init() {
  console.log('🚀 YouTube Studio Extension initialized');

  // Check if user is logged in
  chrome.storage.sync.get(['siaApiUrl', 'siaUserId', 'autoExtract'], (result) => {
    if (result.siaApiUrl && result.siaUserId) {
      console.log('✅ Sia credentials found');

      if (result.autoExtract !== false) {
        startExtraction();
      }
    } else {
      console.warn('⚠️ Sia credentials not configured. Please configure in extension popup.');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
