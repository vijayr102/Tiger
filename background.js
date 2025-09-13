// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Handle communication between content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'elementSelected') {
    // Forward the selected element to the side panel
    chrome.runtime.sendMessage(request);
  }
});