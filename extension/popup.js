// Save options and inject script on active tab
document.getElementById('inject-btn').addEventListener('click', async () => {
  const serverUrl = document.getElementById('server-url').value;
  const apiKey = document.getElementById('api-key').value;
  const statusText = document.getElementById('status-text');

  statusText.textContent = 'Injecting...';

  // Save config to extension storage
  chrome.storage.local.set({ serverUrl, apiKey }, async () => {
    // Get active browser tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      statusText.textContent = 'Error: Active tab not found.';
      return;
    }

    // Execute content script injection
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      statusText.textContent = 'Builder active on page!';
      setTimeout(() => window.close(), 1000);
    });
  });
});

// Restore saved settings on popup load
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['serverUrl', 'apiKey'], (data) => {
    if (data.serverUrl) document.getElementById('server-url').value = data.serverUrl;
    if (data.apiKey) document.getElementById('api-key').value = data.apiKey;
  });
});
