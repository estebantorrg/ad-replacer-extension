const adSelectors = [
  '.ad-container',
  '.ad-slot',
  '.advertisement',
  '[data-ad]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'ins.adsbygoogle',
  '.google-auto-placed'
];

let observer = null;
let isAutoReplacing = false;
const dogImageURL = chrome.runtime.getURL('dog.jpg');

function replaceAds() {
  const selectorString = adSelectors.map(s => `${s}:not([data-dog-toggled="true"])`).join(', ');
  const adElements = document.querySelectorAll(selectorString);
  let replacedCount = 0;

  adElements.forEach(adElement => {
    // Prevent re-replacing the same element to avoid infinite loops
    adElement.setAttribute('data-dog-toggled', 'true');
    adElement.innerHTML = '';

    const dogImage = document.createElement('img');
    dogImage.src = dogImageURL;
    dogImage.style.width = '100%';
    dogImage.style.height = '100%';
    dogImage.style.objectFit = 'cover';

    adElement.appendChild(dogImage);
    replacedCount++;
  });

  if (replacedCount > 0) {
    // Update stats counter
    chrome.storage.local.get(['dogsUnleashed'], function(result) {
      const currentCount = result.dogsUnleashed || 0;
      chrome.storage.local.set({ dogsUnleashed: currentCount + replacedCount });
    });
  }

  return replacedCount;
}

function startObserver() {
  if (observer) return;
  
  // Do an initial sweep
  replaceAds();

  observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldCheck = true;
        break;
      }
    }
    if (shouldCheck) {
      replaceAds();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Load initial auto-replace state
chrome.storage.local.get(['autoReplace'], function(result) {
  isAutoReplacing = result.autoReplace || false;
  if (isAutoReplacing) {
    startObserver();
  }
});

// Listen for storage changes from the popup
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.autoReplace) {
    isAutoReplacing = changes.autoReplace.newValue;
    if (isAutoReplacing) {
      startObserver();
    } else {
      stopObserver();
    }
  }
});

// Listen for manual trigger from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === "replace_ads") {
    const count = replaceAds();
    sendResponse({ count: count });
  }
  return true; 
});