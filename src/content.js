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

  function parseAbbreviatedNumber(text) {
    if (!text) return null;
    const clean = text.replace(/[ \s]/g, '');
    const m = clean.match(/^([\d.]+)([KMB]?)$/i);
    if (!m) return null;
    const multipliers = { K: 1e3, M: 1e6, B: 1e9 };
    return Math.round(parseFloat(m[1]) * (multipliers[m[2].toUpperCase()] || 1));
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

    const commentCount = getCommentCount();
    let cvrHtml = '';
    if (commentCount !== null && views > 0) {
      const cvr = ((commentCount / views) * 1000).toFixed(1);
      const cvrColor = getRatioColor(parseFloat(cvr));
      cvrHtml = `<span style="color:#aaa">&nbsp;-&nbsp;</span><span style="color:${cvrColor}">CVR ${cvr}%</span>`;
    }

    const btnStyle = window.getComputedStyle(likeButton);
    ratioDisplay.style.backgroundColor = btnStyle.backgroundColor;
    ratioDisplay.style.color = ratioColor;
    ratioDisplay.innerHTML = `<span style="color:${ratioColor}">LVR ${ratioFormatted}</span>${cvrHtml}`;
  }

  function getCommentCount() {
    const countEl = document.querySelector('ytd-comments-header-renderer #count');
    if (!countEl) return null;
    const count = extractNumber(countEl.textContent);
    return count > 0 ? count : null;
  }

  async function fetchVideoStats(videoId) {
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const text = await res.text();
      const likesMatch = text.match(/"likeCount":"(\d+)"/);
      const viewsMatch = text.match(/"viewCount":"(\d+)"/);
      const commentsMatch = text.match(/"engagement-panel-comments-section"[\s\S]{0,2000}?"contextualInfo":\{"runs":\[\{"text":"([^"]+)"\}/);
      return {
        likes: likesMatch ? parseInt(likesMatch[1]) : null,
        views: viewsMatch ? parseInt(viewsMatch[1]) : null,
        comments: commentsMatch ? parseAbbreviatedNumber(commentsMatch[1]) : null,
      };
    } catch {
      return { likes: null, views: null, comments: null };
    }
  }

  function updateThumbnailViews() {
    const unprocessed = document.querySelectorAll('yt-lockup-view-model:not([data-yt-processed])');
    if (unprocessed.length === 0) return;

    unprocessed.forEach(item => {
      const rows = item.querySelectorAll('.ytContentMetadataViewModelMetadataRow');
      if (rows.length < 1) return;

      const channelRow = rows[0];
      const link = item.querySelector('a[href*="/watch?v="]');
      if (!link) return;

      const videoId = new URL(link.href).searchParams.get('v');
      if (!videoId) return;

      item.setAttribute('data-yt-processed', 'true');

      const delimiter = document.createElement('span');
      delimiter.setAttribute('aria-hidden', 'true');
      delimiter.style.color = '#aaa';
      delimiter.style.margin = '0 4px';
      delimiter.textContent = '•';
      channelRow.appendChild(delimiter);

      const badge = document.createElement('span');
      badge.className = 'yt-thumb-ratio';
      badge.setAttribute('aria-hidden', 'true');
      badge.style.fontSize = '12px';
      badge.textContent = '…';
      channelRow.appendChild(badge);

      fetchVideoStats(videoId).then(({ likes, views, comments }) => {
        if (likes === null || views === null || views === 0) {
          badge.style.color = '#aaa';
          badge.textContent = '?';
          return;
        }
        const ratio = (likes / views) * 100;
        const lvrColor = getRatioColor(ratio);
        let html = `<span style="color:${lvrColor}">LVR ${ratio.toFixed(1)}%</span>`;
        if (comments !== null) {
          const cvr = ((comments / views) * 1000).toFixed(1);
          const cvrColor = getRatioColor(parseFloat(cvr));
          html += `<span style="color:#aaa">&nbsp;-&nbsp;</span><span style="color:${cvrColor}">CVR ${cvr}%</span>`;
        }
        badge.innerHTML = html;
      });
    });
  }

  function updateSearchThumbnails() {
    const unprocessed = document.querySelectorAll('ytd-video-renderer[is-search]:not([data-yt-processed])');
    if (unprocessed.length === 0) return;

    unprocessed.forEach(item => {
      const channelInfo = item.querySelector('#channel-info');
      if (!channelInfo) return;

      const link = item.querySelector('a#thumbnail[href*="/watch?v="]');
      if (!link) return;

      const videoId = new URL(link.href).searchParams.get('v');
      if (!videoId) return;

      item.setAttribute('data-yt-processed', 'true');

      const delimiter = document.createElement('span');
      delimiter.setAttribute('aria-hidden', 'true');
      delimiter.style.color = '#aaa';
      delimiter.style.margin = '0 4px';
      delimiter.textContent = '•';
      channelInfo.appendChild(delimiter);

      const badge = document.createElement('span');
      badge.className = 'yt-search-ratio';
      badge.setAttribute('aria-hidden', 'true');
      badge.style.fontSize = '1.2rem';
      badge.textContent = '…';
      channelInfo.appendChild(badge);

      fetchVideoStats(videoId).then(({ likes, views, comments }) => {
        if (likes === null || views === null || views === 0) {
          badge.style.color = '#aaa';
          badge.textContent = '?';
          return;
        }
        const ratio = (likes / views) * 100;
        const lvrColor = getRatioColor(ratio);
        let html = `<span style="color:${lvrColor}">LVR ${ratio.toFixed(1)}%</span>`;
        if (comments !== null) {
          const cvr = ((comments / views) * 1000).toFixed(1);
          const cvrColor = getRatioColor(parseFloat(cvr));
          html += `<span style="color:#aaa">&nbsp;-&nbsp;</span><span style="color:${cvrColor}">CVR ${cvr}%</span>`;
        }
        badge.innerHTML = html;
      });
    });
  }

  function update() {
    updateRatio();
    updateThumbnailViews();
    updateSearchThumbnails();
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
