/**
 * YouTube Studio Extension - Popup Script
 */

// Load configuration and statistics
async function loadData() {
  // Load configuration
  const config = await chrome.storage.sync.get([
    'siaApiUrl',
    'siaUserId',
    'siaApiKey',
    'autoExtract',
    'enableBatching'
  ]);

  document.getElementById('apiUrl').value = config.siaApiUrl || '';
  document.getElementById('userId').value = config.siaUserId || '';
  document.getElementById('apiKey').value = config.siaApiKey || '';
  document.getElementById('autoExtract').checked = config.autoExtract !== false;
  document.getElementById('enableBatching').checked = config.enableBatching !== false;

  // Update status
  updateStatus(config.siaApiUrl && config.siaUserId);

  // Load statistics
  loadStats();
}

// Update status indicator
function updateStatus(isConfigured) {
  const statusElement = document.getElementById('status');

  if (isConfigured) {
    statusElement.classList.remove('inactive');
    statusElement.querySelector('.status-text').textContent = 'Active';
  } else {
    statusElement.classList.add('inactive');
    statusElement.querySelector('.status-text').textContent = 'Not configured';
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATS' });

    document.getElementById('totalExtractions').textContent = response?.totalExtractions || 0;
    document.getElementById('successfulSends').textContent = response?.successfulSends || 0;
    document.getElementById('failedSends').textContent = response?.failedSends || 0;

    // Get queue size
    const queueResponse = await chrome.runtime.sendMessage({ action: 'GET_QUEUE_SIZE' });
    document.getElementById('queueSize').textContent = queueResponse?.size || 0;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Show message
function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `message ${type}`;

  setTimeout(() => {
    element.className = 'message';
  }, 3000);
}

// Save configuration
document.getElementById('saveConfig').addEventListener('click', async () => {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const userId = document.getElementById('userId').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiUrl || !userId) {
    showMessage('configMessage', 'Please fill in all required fields', 'error');
    return;
  }

  // Validate URL
  try {
    new URL(apiUrl);
  } catch (e) {
    showMessage('configMessage', 'Invalid API URL', 'error');
    return;
  }

  await chrome.storage.sync.set({
    siaApiUrl: apiUrl,
    siaUserId: userId,
    siaApiKey: apiKey
  });

  showMessage('configMessage', 'Configuration saved successfully!', 'success');
  updateStatus(true);
});

// Save options
document.getElementById('saveOptions').addEventListener('click', async () => {
  const autoExtract = document.getElementById('autoExtract').checked;
  const enableBatching = document.getElementById('enableBatching').checked;

  await chrome.storage.sync.set({
    autoExtract: autoExtract,
    enableBatching: enableBatching
  });

  showMessage('actionMessage', 'Options saved!', 'success');
});

// Extract now
document.getElementById('extractNow').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('studio.youtube.com')) {
      showMessage('actionMessage', 'Please navigate to YouTube Studio first', 'error');
      return;
    }

    await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_NOW' });
    showMessage('actionMessage', 'Data extraction started!', 'success');

    // Reload stats after a delay
    setTimeout(loadStats, 1000);
  } catch (error) {
    console.error('Error:', error);
    showMessage('actionMessage', 'Error: ' + error.message, 'error');
  }
});

// Flush queue
document.getElementById('flushQueue').addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({ action: 'FLUSH_QUEUE' });
    showMessage('actionMessage', 'Queued data sent!', 'success');

    // Reload stats after a delay
    setTimeout(loadStats, 1000);
  } catch (error) {
    console.error('Error:', error);
    showMessage('actionMessage', 'Error: ' + error.message, 'error');
  }
});

// Clear statistics
document.getElementById('clearStats').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all statistics?')) {
    await chrome.runtime.sendMessage({ action: 'CLEAR_STATS' });
    loadStats();
  }
});

// Auto-refresh stats every 5 seconds
setInterval(loadStats, 5000);

// Initialize
loadData();
