/**
 * Background service worker for M365 Admin Quick Links extension
 * Manages display mode switching between popup and side panel
 * Compatible with Chrome and Microsoft Edge (version 114+)
 */

// Check if sidePanel API is available (Edge 114+, Chrome 114+)
const isSidePanelSupported = typeof chrome.sidePanel !== 'undefined';

// Initialize side panel behavior (if supported)
if (isSidePanelSupported) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

/**
 * Handle extension installation
 * Sets the showWalkthrough flag to display onboarding on first install
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ showWalkthrough: true });
  }
});

/**
 * Listen for preference changes in storage
 * Automatically applies display mode changes when user updates settings
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.displayMode) {
    applyDisplayMode(changes.displayMode.newValue);
  }
});

/**
 * Apply saved display mode on extension startup
 * Defaults to popup mode if no preference is saved
 */
chrome.storage.sync.get(['displayMode'], (result) => {
  applyDisplayMode(result.displayMode || 'popup');
});

/**
 * Apply the specified display mode (popup or side panel)
 * @param {string} mode - Either 'popup' or 'sidepanel'
 */
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
