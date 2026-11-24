(() => {
  'use strict';

  const grid = document.querySelector('#streamListGrid');
  const home = document.querySelector('#streamGrid');
  if (!grid && !home) return;

  // The same live monitoring API as ADYGTA2; no duplicate polling Worker/cron here.
  // The monitoring source must be configured separately to cover the current ADD:ON participants.
  const API = 'https://api.adygta2.jp/streams';
  const MAX_AGE_MS = 30 * 60 * 1000;
  const counter = document.querySelector('#liveTotal');
  const viewersTotal = document.querySelector('#totalViewers');
  const checked = document.querySelector('#checkedAt');
  const refresh = document.querySelector('#refreshStreams');
  const buttons = [...document.querySelectorAll('[data-filter]')];

  let streams = [];
  let activeFilter = 'all';
  let errorMessage = '';
  let inFlight = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const isLive = s => String(s?.status || '').toUpperCase() === 'LIVE';
  const platformOf = s => {
    const type = String(s?.platform || '').toLowerCase();
    return type === 'youtube' || type === 'twitch' ? type : null;
  };
  const number = x => Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : 0;
  const safeUrl = raw => {
    try {
      const u = new URL(String(raw));
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch { return ''; }
  };

  const card = s => {
    const url = safeUrl(s.url);
    const img = safeUrl(s.image);
    const platform = platformOf(s);
    const name = esc(s.name || s.channel || '配信中');
    const title = esc(s.title || '');
    const viewers = number(s.viewers).toLocaleString('ja-JP');
    const thumb = img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : '';
    const inner = `<div class="stream-image">${thumb}<span class="stream-live">LIVE</span></div>` +
      `<div class="stream-info"><span class="stream-platform">${platform === 'youtube' ? 'YOUTUBE' : 'TWITCH'}</span>` +
      `<h3>${name}</h3><p>${title}</p><small>${viewers}人が視聴中</small></div>`;
    return url
      ? `<a class="stream-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
      : `<article class="stream-card">${inner}</article>`;
  };
  const message = (msg, error = false) => `<div class="empty-state" role="status">` +
    `<span class="status-dot ${error ? 'inactive' : ''}" aria-hidden="true"></span><p>${esc(msg)}</p></div>`;

  function render() {
    const live = streams.filter(s => isLive(s) && platformOf(s));
    const filtered = live.filter(s => activeFilter === 'all' || platformOf(s) === activeFilter);
    if (counter) counter.textContent = String(live.length);
    if (viewersTotal) viewersTotal.textContent = live.reduce((sum, s) => sum + number(s.viewers), 0).toLocaleString('ja-JP');
    const empty = errorMessage || (activeFilter === 'all'
      ? '現在配信中のメンバーはいません。'
      : `${activeFilter === 'youtube' ? 'YouTube' : 'Twitch'}で現在配信中のメンバーはいません。`);
    if (grid) grid.innerHTML = filtered.length ? filtered.map(card).join('') : message(empty, !!errorMessage);
    if (home) home.innerHTML = live.length ? live.slice(0, 3).map(card).join('') : message(errorMessage || '現在配信中のメンバーはいません。', !!errorMessage);
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter || 'all';
    buttons.forEach(b => {
      const selected = b === button;
      b.classList.toggle('is-active', selected);
      b.setAttribute('aria-pressed', String(selected));
    });
    render();
  }));

  async function update() {
    if (inFlight) return;
    inFlight = true;
    if (refresh) refresh.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rows = Array.isArray(data) ? data : (Array.isArray(data?.streams) ? data.streams : null);
      if (!rows) throw new Error('Invalid streams payload');

      // Old monitoring responses expose updatedAt; don't show stale LIVE cards as current.
      const updatedAt = data && !Array.isArray(data) && data.updatedAt ? new Date(data.updatedAt) : null;
      const validTimestamp = updatedAt && !Number.isNaN(updatedAt.getTime());
      const ageMs = validTimestamp ? Date.now() - updatedAt.getTime() : 0;
      if (validTimestamp && ageMs > MAX_AGE_MS) {
        throw new Error('STALE_STREAMS');
      }
      streams = rows.filter(isLive).filter(platformOf).sort((a, b) => number(b.viewers) - number(a.viewers));
      errorMessage = '';
      if (checked) {
        const date = validTimestamp ? updatedAt : new Date();
        checked.textContent = `${validTimestamp ? '最終更新' : '取得確認'}：${date.toLocaleString('ja-JP')}`;
      }
    } catch (e) {
      streams = [];
      errorMessage = e?.message === 'STALE_STREAMS'
        ? '配信監視データが更新されていません。時間をおいて再度お試しください。'
        : '配信情報を取得できませんでした。時間をおいて再度お試しください。';
      if (checked) checked.textContent = errorMessage;
    } finally {
      clearTimeout(timeout);
      inFlight = false;
      if (refresh) refresh.disabled = false;
      render();
    }
  }

  refresh?.addEventListener('click', update);
  update();
  setInterval(() => { if (!document.hidden) update(); }, 90000);
})();
