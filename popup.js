document.addEventListener('DOMContentLoaded', function() {
  const replaceButton = document.getElementById('replace-button');
  const statusElement = document.getElementById('status');
  const toggleSwitch = document.getElementById('auto-replace-toggle');
  const totalStats = document.getElementById('total-stats');

  // Load state from storage
  chrome.storage.local.get(['autoReplace', 'dogsUnleashed'], function(result) {
    toggleSwitch.checked = result.autoReplace || false;
    totalStats.textContent = result.dogsUnleashed || 0;
  });

  // Listen to toggle changes
  toggleSwitch.addEventListener('change', function() {
    const isChecked = toggleSwitch.checked;
    chrome.storage.local.set({ autoReplace: isChecked });
  });

  // Manual replace button
  replaceButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { message: "replace_ads" }, function(response) {
        if (chrome.runtime.lastError) {
          statusElement.textContent = 'Error: Cannot modify this page.';
          console.log("Error:", chrome.runtime.lastError.message);
        } else {
          if (response) {
            statusElement.textContent = `Replaced ${response.count} ads!`;
          } else {
            statusElement.textContent = 'No ads found.';
          }
        }
      });
    });
  });

  // Listen for storage changes to update stats live
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.dogsUnleashed) {
      totalStats.textContent = changes.dogsUnleashed.newValue;
    }
  });
});