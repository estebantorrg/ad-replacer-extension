chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "replace_ads") {
      const adSelectors = [
        '.ad',
        '[id^="ad"]',
        '[class^="ad"]',
        'ins.adsbygoogle',
        '[id*="google_ads"]'
      ];

      const selectorString = adSelectors.join(', ');
      const adElements = document.querySelectorAll(selectorString);

    
      const dogImageURL = chrome.runtime.getURL('dog.jpg');

      adElements.forEach(adElement => {
     
        adElement.innerHTML = '';

      
        const dogImage = document.createElement('img');
        dogImage.src = dogImageURL;

    
        dogImage.style.width = '100%';
        dogImage.style.height = '100%';
        dogImage.style.objectFit = 'cover';

        adElement.appendChild(dogImage);
      });

    
      sendResponse({ count: adElements.length });
    }
  }
);