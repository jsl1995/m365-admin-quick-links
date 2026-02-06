// Background service worker for M365 Links
// Compatible with Chrome and Microsoft Edge

// Check if sidePanel API is available (Edge 114+, Chrome 114+)
const isSidePanelSupported = typeof chrome.sidePanel !== 'undefined';

// Initialize side panel behavior (if supported)
if (isSidePanelSupported) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

// Detect first install and set walkthrough flag
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ showWalkthrough: true });
  }
});

// Listen for preference changes to switch modes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.displayMode) {
    applyDisplayMode(changes.displayMode.newValue);
  }
});

// Apply display mode on startup
chrome.storage.sync.get(['displayMode'], (result) => {
  applyDisplayMode(result.displayMode || 'popup');
});

function applyDisplayMode(mode) {
  if (mode === 'sidepanel' && isSidePanelSupported) {
    // Disable popup, enable side panel on click
    chrome.action.setPopup({ popup: '' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    // Enable popup, disable side panel on click
    chrome.action.setPopup({ popup: 'popup.html' });
    if (isSidePanelSupported) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
  }
}
