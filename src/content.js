// YouTube Extension Content Script
// Shows likes/views ratio on main video + incrementing index on sidebar thumbnails

console.log('[YT Ratio] Extension loaded');

(function() {
  'use strict';

  function extractNumber(text) {
    if (!text) return 0;
    const match = text.match(/[\d,]+/);
    if (!match) return 0;
    return parseInt(match[0].replace(/,/g, ''));
  }

  function getRatioColor(ratio) {
    if (ratio >= 5) return '#0f9d58';
    if (ratio >= 3) return '#f9a825';
    return '#db4437';
  }

  function updateRatio() {
    const likeButton = document.querySelector('#actions #menu .ytLikeButtonViewModelHost button') ||
                       document.querySelector('button[aria-label*="like this video"]') ||
                       document.querySelector('#actions button[aria-label*="like"]');

    if (!likeButton) return;

    const likes = extractNumber(likeButton.getAttribute('aria-label'));

    let viewsElement = document.querySelector('#info ytd-video-view-count-renderer') ||
                       document.querySelector('ytd-video-view-count-renderer');

    if (!viewsElement) {
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        const text = el.innerText || el.textContent;
        if (text && text.match(/[\d,.]+\s*views/i)) {
          viewsElement = el;
          break;
        }
      }
    }

    const views = viewsElement ? extractNumber(viewsElement.innerText || viewsElement.textContent) : 0;
    const ratio = views > 0 ? (likes / views) * 100 : 0;
    const ratioFormatted = ratio.toFixed(1) + '%';
    const ratioColor = getRatioColor(ratio);

    let ratioDisplay = document.querySelector('.yt-ratio-display');
    if (!ratioDisplay) {
      ratioDisplay = document.createElement('div');
      ratioDisplay.className = 'yt-ratio-display';
      ratioDisplay.style.display = 'inline-flex';
      ratioDisplay.style.alignItems = 'center';
      ratioDisplay.style.height = '36px';
      ratioDisplay.style.padding = '0px 8px';
      ratioDisplay.style.borderRadius = '20px';
      ratioDisplay.style.fontSize = '14px';
      ratioDisplay.style.fontWeight = '500';
      ratioDisplay.style.marginRight = '6px';

      if (likeButton.parentNode) {
        likeButton.parentNode.insertBefore(ratioDisplay, likeButton);
      }
    }

    const btnStyle = window.getComputedStyle(likeButton);
    ratioDisplay.style.backgroundColor = btnStyle.backgroundColor;
    ratioDisplay.style.color = ratioColor;
    ratioDisplay.textContent = ratioFormatted;
  }

  function updateThumbnailNumbers() {
    const unnumbered = document.querySelectorAll('yt-lockup-view-model:not([data-yt-index])');
    if (unnumbered.length === 0) return;

    const alreadyNumbered = document.querySelectorAll('yt-lockup-view-model[data-yt-index]');
    let counter = alreadyNumbered.length + 1;

    unnumbered.forEach(item => {
      const rows = item.querySelectorAll('.ytContentMetadataViewModelMetadataRow');
      if (rows.length < 2) return;

      const viewsRow = rows[1];
      const badge = document.createElement('span');
      badge.className = 'yt-thumb-index';
      badge.setAttribute('aria-hidden', 'true');
      badge.style.marginLeft = '6px';
      badge.style.color = '#aaa';
      badge.style.fontSize = '12px';
      badge.textContent = `#${counter}`;

      viewsRow.appendChild(badge);
      item.setAttribute('data-yt-index', counter);
      counter++;
    });
  }

  function update() {
    updateRatio();
    updateThumbnailNumbers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }

  const observer = new MutationObserver(() => {
    if (observer._timeout) return;
    observer._timeout = setTimeout(() => {
      observer._timeout = null;
      update();
    }, 500);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
