// Background service worker for M365 Links

// Initialize side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

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
  if (mode === 'sidepanel') {
    // Disable popup, enable side panel on click
    chrome.action.setPopup({ popup: '' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    // Enable popup, disable side panel on click
    chrome.action.setPopup({ popup: 'popup.html' });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
}
