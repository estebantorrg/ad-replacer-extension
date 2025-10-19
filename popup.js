document.addEventListener('DOMContentLoaded', function() {
  const replaceButton = document.getElementById('replace-button');
  const statusElement = document.getElementById('status');

  replaceButton.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, { message: "replace_ads" }, function(response) {
        if (chrome.runtime.lastError) {
          statusElement.textContent = 'Error replacing ads.';
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
});