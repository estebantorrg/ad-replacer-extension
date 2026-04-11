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

const ytAdSelectors = [
  'ytd-companion-slot-renderer',
  'ytd-action-companion-ad-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-ad-slot-renderer',
  'ytd-banner-promo-renderer',
  'ytd-statement-banner-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  'ytd-promoted-video-renderer',
  '#player-ads',
  '#panels ytd-ad-slot-renderer'
];

let observer = null;
let isAutoReplacing = false;
let ytAdInterval = null;
const dogImageURL = chrome.runtime.getURL('dog.png');

function handleYouTubeAds() {
  if (!window.location.hostname.includes('youtube.com')) return 0;
  
  const player = document.querySelector('.html5-video-player') || document.getElementById('movie_player');
  if (!player) return 0;
  
  const adModule = player.querySelector('.video-ads');
  const isAdPlaying = player.classList.contains('ad-showing') || 
                      player.classList.contains('ad-interrupting') || 
                      (adModule && adModule.children.length > 0);
                      
  let dogOverlay = document.getElementById('ad-replacer-yt-overlay');
  let newlyReplaced = 0;

  if (isAdPlaying) {
    if (!dogOverlay) {
      dogOverlay = document.createElement('img');
      dogOverlay.id = 'ad-replacer-yt-overlay';
      dogOverlay.src = dogImageURL;
      dogOverlay.style.position = 'absolute';
      dogOverlay.style.top = '0';
      dogOverlay.style.left = '0';
      dogOverlay.style.width = '100%';
      dogOverlay.style.height = '100%';
      dogOverlay.style.objectFit = 'cover';
      dogOverlay.style.zIndex = '35'; // 35 is above the video container (10) but below controls (61+) and skip buttons (100+)
      dogOverlay.style.pointerEvents = 'none'; // Pass clicks through
      
      player.appendChild(dogOverlay);
      newlyReplaced++;
    }
    
    // Aggressive mute function
    const enforceMute = () => {
      const videos = player.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.muted || video.volume > 0) {
          video.dataset.dogMuted = 'true';
          video.muted = true;
          video.volume = 0;
        }
      });
    };
    
    // Run mute immediately so there is zero sound bleed delay
    enforceMute();
    
    // Setup interval to enforce muting rapidly and auto-click skip button
    if (!ytAdInterval) {
      ytAdInterval = setInterval(() => {
        enforceMute();
        
        // Auto-click skip button if present and visible
        const skipSelectors = [
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          '.ytp-skip-ad-button',
          '.videoAdUiSkipButton',
          'button[class*="skip-ad"]',
          'button[class*="ad-skip"]'
        ];
        
        for (let selector of skipSelectors) {
          const skipButton = document.querySelector(selector);
          if (skipButton && skipButton.offsetWidth > 0 && skipButton.offsetHeight > 0) { 
            skipButton.click();
            const innerSpan = skipButton.querySelector('span');
            if (innerSpan) innerSpan.click();
            break;
          }
        }
      }, 100); 
    }
  } else {
    // Ad finished or not playing, clean up
    if (dogOverlay) {
      dogOverlay.remove();
    }
    if (ytAdInterval) {
      clearInterval(ytAdInterval);
      ytAdInterval = null;
    }
    // Restore sound
    const videos = player.querySelectorAll('video');
    videos.forEach(video => {
      if (video.dataset.dogMuted === 'true') {
        video.muted = false;
        video.volume = 1;
        video.dataset.dogMuted = 'false';
      }
    });
  }
  
  return newlyReplaced;
}

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

  // YouTube sidebar thumbnail replacements (image graphics ONLY)
  ytAdSelectors.forEach(selector => {
    // Replace image element sources unconditionally if they don't match our dog
    const imgs = document.querySelectorAll(`${selector} img`);
    imgs.forEach(img => {
      // Only swap if it's not already the dog image and actually has a source
      if (img.src !== dogImageURL && img.src !== '') {
        img.src = dogImageURL;
        img.removeAttribute('srcset'); // Break responsive overriding
        img.style.objectFit = 'cover';
        replacedCount++;
      }
    });
    
    // Some thumbnails are divs with background images
    const bgDivs = document.querySelectorAll(`${selector} #img, ${selector} .yt-core-image`);
    bgDivs.forEach(div => {
      if (div.tagName.toLowerCase() !== 'img') {
        const bg = div.style.backgroundImage;
        if (!bg.includes('dog.png') && bg !== '') {
          div.style.backgroundImage = `url("${dogImageURL}")`;
          div.style.backgroundSize = 'cover';
          replacedCount++;
        }
      }
    });
  });

  replacedCount += handleYouTubeAds();

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
      if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
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
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
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