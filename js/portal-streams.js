(() => {
  'use strict';

  const grid = document.querySelector('#streamListGrid');
  const home = document.querySelector('#streamGrid');
  const streamGrid = grid || home;
  if (!streamGrid) return;

  // The same live monitoring API as ADYGTA2; no duplicate polling Worker/cron here.
  // The monitoring source must be configured separately to cover the current ADD:ON participants.
  const API = 'https://api.adygta2.jp/streams';
  const MAX_AGE_MS = 30 * 60 * 1000;
  const HOME_STREAM_LIMIT = 8;
  const CARD_REVEAL_STEP_MS = 20;
  const counter = document.querySelector('#liveTotal');
  const viewersTotal = document.querySelector('#totalViewers');
  const checked = document.querySelector('#checkedAt');
  const refresh = document.querySelector('#refreshStreams');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const roleFilter = grid ? document.querySelector('#streamRoleFilter') : null;
  const filterMenu = grid ? document.querySelector('#streamFilterMenu') : null;
  const filterToggle = grid ? document.querySelector('#streamFilterToggle') : null;
  const filterPanel = grid ? document.querySelector('#streamFilterPanel') : null;
  const filterCount = grid ? document.querySelector('#streamFilterCount') : null;
  const filterReset = grid ? document.querySelector('#streamFilterReset') : null;
  const directoryLink = document.querySelector('#streamDirectoryLink');
  const controls = document.querySelector('#streamControls');
  const previous = document.querySelector('#streamPrevious');
  const next = document.querySelector('#streamNext');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let streams = [];
  let activeFilter = 'all';
  let activeRole = '';
  let errorMessage = '';
  let inFlight = false;
  // 職業情報は既存 /streams API の各配信レコード roles[] を利用する。
  const jobRolesOf = (stream) => Array.isArray(stream?.roles)
    ? [...new Set(stream.roles.filter(role => typeof role === 'string').map(role => role.trim()).filter(Boolean))].slice(0, 15)
    : [];
  const roleDisplayName = role => role === '非正規メカニック' ? '非正規メカ' : role;

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

  const card = (s, index) => {
    const url = safeUrl(s.url);
    const img = safeUrl(s.image);
    const platform = platformOf(s);
    const name = esc(s.name || s.channel || '配信中');
    const title = esc(s.title || '');
    const viewers = number(s.viewers).toLocaleString('ja-JP');
    const delay = Math.min(index, 12) * CARD_REVEAL_STEP_MS;
    const thumb = img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : '';
    const roles = jobRolesOf(s);
    const jobLabels = roles.map(role => `<span class="stream-role" title="職業: ${esc(role)}">${esc(roleDisplayName(role))}</span>`).join('');
    const inner = `<div class="stream-image">${thumb}<span class="stream-live">LIVE</span></div>` +
      `<div class="stream-info"><div class="stream-meta"><span class="stream-platform">${platform === 'youtube' ? 'YOUTUBE' : 'TWITCH'}</span>${jobLabels}</div>` +
      `<h3>${name}</h3><p>${title}</p><small>${viewers}人が視聴中</small></div>`;
    const cardClass = `stream-card stream-card--${platform}`;
    return url
      ? `<a class="${cardClass}" style="--stream-delay: ${delay}ms" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
      : `<article class="${cardClass}" style="--stream-delay: ${delay}ms">${inner}</article>`;
  };
  const message = (msg, error = false) => `<div class="empty-state" role="status">` +
    `<span class="status-dot ${error ? 'inactive' : ''}" aria-hidden="true"></span><p>${esc(msg)}</p></div>`;

  function updateHomeControls() {
    const max = home.scrollWidth - home.clientWidth;
    controls.hidden = max <= 1;
    previous.setAttribute('aria-disabled', String(home.scrollLeft <= 1));
    next.setAttribute('aria-disabled', String(home.scrollLeft >= max - 1));
  }

  function scrollHome(button, direction) {
    if (button.getAttribute('aria-disabled') === 'true') return;
    const [first, second] = home.children;
    const step = second.offsetLeft - first.offsetLeft;
    home.scrollBy({
      left: direction * step,
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  if (home) {
    previous.addEventListener('click', () => scrollHome(previous, -1));
    next.addEventListener('click', () => scrollHome(next, 1));
    home.addEventListener('scroll', updateHomeControls, { passive: true });
    window.addEventListener('resize', updateHomeControls);
  }

  const revealObserver = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      if (!streamGrid.classList.contains('stream-reveal-pending')) return;
      streamGrid.classList.remove('stream-reveal-pending');
      streamGrid.classList.add('stream-revealing');
      revealObserver.unobserve(streamGrid);
    }, {rootMargin: '0px 0px -18px'})
    : null;
  let renderedMarkup = '';
  let hadCards = false;

  function renderCards(markup, hasCards, replay = false) {
    if (markup === renderedMarkup) return;
    const pending = streamGrid.classList.contains('stream-reveal-pending');
    const reveal = hasCards && !reducedMotion.matches && (!hadCards || pending || replay);
    revealObserver?.unobserve(streamGrid);
    streamGrid.classList.remove('stream-reveal-pending', 'stream-revealing');

    const position = home?.scrollLeft;
    home?.classList.toggle('has-streams', hasCards);
    streamGrid.innerHTML = markup;
    if (home) home.scrollLeft = position;
    renderedMarkup = markup;
    hadCards = hasCards;

    if (reveal && revealObserver) {
      streamGrid.classList.add('stream-reveal-pending');
      revealObserver.observe(streamGrid);
    } else if (reveal) {
      streamGrid.classList.add('stream-revealing');
    }
  }

  function renderHome(live) {
    const showMore = live.length >= HOME_STREAM_LIMIT;
    let markup = live.length
      ? live.slice(0, HOME_STREAM_LIMIT).map(card).join('')
      : message(errorMessage || '現在配信中のメンバーはいません。', !!errorMessage);
    if (showMore) {
      markup += `<a class="stream-more" style="--stream-delay: ${HOME_STREAM_LIMIT * CARD_REVEAL_STEP_MS}ms" href="streams.html" aria-label="配信一覧をもっと見る">もっと見る</a>`;
    }

    renderCards(markup, live.length > 0);
    directoryLink.hidden = showMore;
    updateHomeControls();
  }

  function updateFilterIndicator() {
    if (!filterToggle) return;
    const count = Number(activeFilter !== 'all') + Number(Boolean(activeRole));
    filterToggle.classList.toggle('has-active-filters', count > 0);
    filterToggle.setAttribute('aria-label', count
      ? `フィルター（適用中の条件 ${count}件）`
      : 'フィルター');
    if (filterCount) {
      filterCount.textContent = String(count);
      filterCount.hidden = count === 0;
    }
  }

  function setFilterPanelOpen(open, focusTrigger = false) {
    if (!filterPanel || !filterToggle) return;
    filterPanel.hidden = !open;
    filterToggle.setAttribute('aria-expanded', String(open));
    filterMenu?.classList.toggle('is-open', open);
    if (!open && focusTrigger) filterToggle.focus();
  }

  function syncRoleFilter(allRows) {
    if (!roleFilter) return; // トップページには職業フィルタを設けない
    const roles = [...new Set(allRows.filter(platformOf).flatMap(jobRolesOf))]
      .sort((a, b) => a.localeCompare(b, 'ja'));
    const existing = [...roleFilter.options].slice(1).map(option => option.value);
    if (existing.length === roles.length && existing.every((role, index) => role === roles[index])) return;

    const previous = roleFilter.value;
    roleFilter.replaceChildren(
      new Option('すべての職業', ''),
      ...roles.map(role => new Option(roleDisplayName(role), role))
    );
    roleFilter.value = roles.includes(previous) ? previous : '';
    activeRole = roleFilter.value;
    updateFilterIndicator();
  }

  function render(replay = false) {
    const live = streams.filter(s => isLive(s) && platformOf(s));
    const filtered = live.filter(s =>
      (activeFilter === 'all' || platformOf(s) === activeFilter) &&
      (!activeRole || jobRolesOf(s).includes(activeRole))
    );
    if (counter) counter.textContent = String(live.length);
    if (viewersTotal) viewersTotal.textContent = live.reduce((sum, s) => sum + number(s.viewers), 0).toLocaleString('ja-JP');
    const empty = errorMessage || (activeRole
      ? `${activeRole}に該当する配信は現在ありません。`
      : activeFilter === 'all'
        ? '現在配信中のメンバーはいません。'
        : `${activeFilter === 'youtube' ? 'YouTube' : 'Twitch'}で現在配信中のメンバーはいません。`);
    if (grid) {
      renderCards(filtered.length ? filtered.map(card).join('') : message(empty, !!errorMessage), filtered.length > 0, replay);
    }
    if (home) renderHome(live);
  }

  roleFilter?.addEventListener('change', () => {
    activeRole = roleFilter.value;
    updateFilterIndicator();
    render(true);
  });

  buttons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    const changed = activeFilter !== filter;
    activeFilter = filter;
    buttons.forEach(b => {
      const selected = b === button;
      b.classList.toggle('is-active', selected);
      b.setAttribute('aria-pressed', String(selected));
    });
    updateFilterIndicator();
    render(changed);
  }));

  filterToggle?.addEventListener('click', () => {
    setFilterPanelOpen(filterPanel?.hidden);
  });
  filterReset?.addEventListener('click', () => {
    activeFilter = 'all';
    activeRole = '';
    if (roleFilter) roleFilter.value = '';
    buttons.forEach(b => {
      const isAll = b.dataset.filter === 'all';
      b.classList.toggle('is-active', isAll);
      b.setAttribute('aria-pressed', String(isAll));
    });
    updateFilterIndicator();
    render(true);
  });
  if (filterMenu) {
    document.addEventListener('pointerdown', event => {
      if (!filterMenu.contains(event.target)) setFilterPanelOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !filterPanel.hidden) {
        setFilterPanelOpen(false, true);
      }
    });
  }
  updateFilterIndicator();

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
      syncRoleFilter(rows);
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


  refresh?.addEventListener('click', () => { void update(); });
  void update();
  setInterval(() => {
    if (!document.hidden) void update();
  }, 90000);
})();
