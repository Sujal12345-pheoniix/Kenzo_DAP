// Inject Kenzo SDK and initialize in Builder Mode
(function() {
  // Check if SDK already loaded
  if (window.Kenzo) {
    console.log('[Kenzo Extension] SDK already loaded on page. Toggling builder...');
    // If builder exists, trigger activation
    const query = new URLSearchParams(window.location.search);
    query.set('kenzo_builder', 'true');
    window.location.search = query.toString();
    return;
  }

  // Load configuration from storage
  chrome.storage.local.get(['serverUrl', 'apiKey'], (data) => {
    const serverUrl = data.serverUrl || 'http://localhost:3000';
    const apiKey = data.apiKey || 'kenzo_project_dev_api_key_2026';

    console.log('[Kenzo Extension] Injecting SDK from server:', serverUrl);

    // Injects the main compiled SDK script
    const scriptEl = document.createElement('script');
    scriptEl.src = `${serverUrl}/sdk.js`;
    scriptEl.onload = async () => {
      console.log('[Kenzo Extension] SDK Script loaded. Initializing...');
      
      if (typeof window.Kenzo !== 'undefined') {
        try {
          await window.Kenzo.init({
            apiKey: apiKey,
            apiBaseUrl: `${serverUrl}/api/v1`,
            debug: true
          });

          // Toggle builder directly on the window object/overlay
          // Trigger hotkey code simulation or let page reload with query parameter
          const url = new URL(window.location.href);
          if (url.searchParams.get('kenzo_builder') !== 'true') {
            url.searchParams.set('kenzo_builder', 'true');
            window.location.href = url.toString();
          }
        } catch (e) {
          console.error('[Kenzo Extension] Init failed:', e);
        }
      }
    };

    document.body.appendChild(scriptEl);
  });
})();
