(() => {
  const articles = JSON.parse(document.querySelector('#news-data').textContent);
  const byId = new Map(articles.map(article => [article.id, article]));
  const rows = [...document.querySelectorAll('.news-row')];
  const tabs = [...document.querySelectorAll('[data-channel]')];
  const panels = [...document.querySelectorAll('.channel-panel')];
  const input = document.querySelector('#news-query');
  const more = document.querySelector('#load-more');
  const empty = document.querySelector('#news-empty');
  const count = document.querySelector('#result-count');
  const newsPanel = document.querySelector('#panel-news');
  const featured = document.querySelector('#featured-stories');
  const heading = document.querySelector('#news-heading');
  const dialog = document.querySelector('#article-dialog');
  const channels = {
    featured: { panel: 'news', title: '最新要闻', market: null },
    flash: { panel: 'flash' },
    hk: { panel: 'news', title: '看香港', market: '港股' },
    us: { panel: 'news', title: '看美国', market: '美股' },
    calendar: { panel: 'calendar' },
  };
  let activeChannel = 'featured';
  let limit = 4;

  function filterArticles() {
    const channel = channels[activeChannel];
    const query = input.value.trim().toLocaleLowerCase();
    const matches = articles.filter(article => (!channel.market || article.market === channel.market)
      && [article.title, article.summary, article.market, article.label, ...article.body].join(' ').toLocaleLowerCase().includes(query));
    const visible = new Set(matches.slice(0, limit).map(article => article.id));
    rows.forEach(row => { row.hidden = !visible.has(row.dataset.article); });
    featured.hidden = activeChannel !== 'featured' || Boolean(query);
    heading.textContent = query ? (channel.market ? `${channel.market}搜索结果` : '搜索结果') : (channel.title || '最新要闻');
    empty.hidden = matches.length > 0;
    more.hidden = matches.length <= limit;
    count.textContent = `显示 ${Math.min(limit, matches.length)} 篇，共 ${matches.length} 篇`;
  }

  function setChannel(key) {
    if (!channels[key]) return;
    activeChannel = key;
    limit = 4;
    tabs.forEach(tab => {
      const active = tab.dataset.channel === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `panel-${channels[key].panel}`; });
    if (channels[key].panel === 'news') newsPanel.setAttribute('aria-labelledby', `channel-${key}`);
    filterArticles();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setChannel(tab.dataset.channel));
    tab.addEventListener('keydown', event => {
      const destinations = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      const next = tabs[destinations[event.key]];
      next.focus({ preventScroll: true });
      setChannel(next.dataset.channel);
    });
  });

  function search() {
    limit = 4;
    if (channels[activeChannel].panel !== 'news') setChannel('featured');
    else filterArticles();
  }
  input.addEventListener('input', search);
  document.querySelector('#news-search').addEventListener('submit', event => {
    event.preventDefault();
    search();
  });
  more.addEventListener('click', () => { limit += 4; filterArticles(); });
  document.querySelector('#reset-search').addEventListener('click', () => {
    input.value = '';
    search();
    input.focus({ preventScroll: true });
  });

  const flashRows = [...document.querySelectorAll('.flash-row')];
  const flashMore = document.querySelector('#flash-load-more');
  let flashLimit = 6;
  function renderFlashes() {
    flashRows.forEach((row, index) => {
      row.hidden = index >= flashLimit;
      row.classList.toggle('is-last-visible', index === Math.min(flashLimit, flashRows.length) - 1);
    });
    const complete = flashLimit >= flashRows.length;
    flashMore.disabled = complete;
    flashMore.textContent = complete ? '已加载全部' : '查看更多';
    document.querySelector('#flash-count').textContent = `已显示 ${Math.min(flashLimit, flashRows.length)} 条，共 ${flashRows.length} 条`;
  }
  flashMore.addEventListener('click', () => {
    flashLimit += 6;
    renderFlashes();
  });
  renderFlashes();

  const calendarTabs = [...document.querySelectorAll('[data-calendar-type]')];
  const presets = [...document.querySelectorAll('[data-range]')];
  const startDate = document.querySelector('#calendar-start');
  const endDate = document.querySelector('#calendar-end');
  const regionSelect = document.querySelector('#calendar-region');
  const importanceSelect = document.querySelector('#calendar-importance');
  const calendarResults = document.querySelector('#calendar-results');
  const dateError = document.querySelector('#calendar-error');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const calendarToday = new Date(`${today}T12:00:00Z`);
  function offsetDate(offset) {
    const date = new Date(calendarToday);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  }
  const calendarEvents = JSON.parse(document.querySelector('#calendar-data').textContent)
    .map(event => ({ ...event, date: offsetDate(event.offset) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  let calendarType = 'economic';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderCalendar() {
    const invalid = Boolean(startDate.value && endDate.value && startDate.value > endDate.value);
    dateError.hidden = !invalid;
    endDate.setAttribute('aria-invalid', String(invalid));
    calendarTabs.forEach(tab => {
      const selected = tab.dataset.calendarType === calendarType;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    calendarResults.setAttribute('aria-labelledby', `calendar-type-${calendarType}`);
    const matches = invalid ? [] : calendarEvents.filter(event => event.kind === calendarType
      && (!startDate.value || event.date >= startDate.value)
      && (!endDate.value || event.date <= endDate.value)
      && (regionSelect.value === 'all' || event.region === regionSelect.value)
      && (importanceSelect.value === 'all' || event.importance === Number(importanceSelect.value)));
    document.querySelector('#calendar-count').textContent = `共 ${matches.length} 条`;
    document.querySelector('#calendar-empty').hidden = invalid || matches.length > 0;
    const groups = new Map();
    matches.forEach(event => {
      if (!groups.has(event.date)) {
        const group = element('section', 'calendar-day');
        group.append(element('h3', '', event.date.replaceAll('-', '/')));
        groups.set(event.date, group);
      }
      const row = element('article', 'calendar-event');
      const time = element('time', '', event.time);
      time.dateTime = event.time === '全天' ? event.date : `${event.date}T${event.time}:00+08:00`;
      const content = element('div', 'calendar-event-content');
      content.append(element('h4', '', event.title));
      if (event.kind === 'economic') {
        const values = element('dl', 'calendar-values');
        [['前值', event.previous], ['预测值', event.forecast], ['公布值', event.actual]].forEach(([label, value]) => {
          const pair = element('div');
          pair.append(element('dt', '', label), element('dd', '', value));
          values.append(pair);
        });
        content.append(values);
      } else content.append(element('p', 'calendar-event-detail', event.detail));
      const metadata = element('div', 'calendar-event-meta');
      const stars = element('span', 'importance-stars');
      stars.setAttribute('aria-label', `重要性：${event.importance}星`);
      for (let index = 0; index < 3; index++) {
        const star = element('span', index < event.importance ? 'is-filled' : '', '★');
        star.setAttribute('aria-hidden', 'true');
        stars.append(star);
      }
      const region = element('span', 'calendar-region');
      const dot = element('span', `region-dot ${event.region}`);
      dot.setAttribute('aria-hidden', 'true');
      region.append(dot, document.createTextNode(event.region === 'hk' ? '中国香港' : '美国'));
      metadata.append(stars, region);
      content.append(metadata);
      row.append(time, content);
      groups.get(event.date).append(row);
    });
    calendarResults.replaceChildren(...groups.values());
  }

  function setDateRange(range) {
    const year = calendarToday.getUTCFullYear();
    const month = calendarToday.getUTCMonth();
    if (range === 'week') {
      startDate.value = offsetDate(-calendarToday.getUTCDay());
      endDate.value = offsetDate(6 - calendarToday.getUTCDay());
    } else if (range === 'month') {
      startDate.value = new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 10);
      endDate.value = new Date(Date.UTC(year, month + 1, 0, 12)).toISOString().slice(0, 10);
    } else {
      startDate.value = today;
      endDate.value = '';
    }
    presets.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.range === range)));
    renderCalendar();
  }

  calendarTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      calendarType = tab.dataset.calendarType;
      renderCalendar();
    });
    tab.addEventListener('keydown', event => {
      const destinations = { ArrowRight: (index + 1) % calendarTabs.length, ArrowLeft: (index - 1 + calendarTabs.length) % calendarTabs.length, Home: 0, End: calendarTabs.length - 1 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      const next = calendarTabs[destinations[event.key]];
      next.focus({ preventScroll: true });
      calendarType = next.dataset.calendarType;
      renderCalendar();
    });
  });
  presets.forEach(button => button.addEventListener('click', () => setDateRange(button.dataset.range)));
  [startDate, endDate].forEach(input => input.addEventListener('change', () => {
    presets.forEach(button => button.setAttribute('aria-pressed', 'false'));
    renderCalendar();
  }));
  [regionSelect, importanceSelect].forEach(select => select.addEventListener('change', renderCalendar));
  document.querySelector('#calendar-reset').addEventListener('click', () => {
    regionSelect.value = 'all';
    importanceSelect.value = 'all';
    setDateRange('upcoming');
  });
  setDateRange('upcoming');

  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    const article = byId.get(button.dataset.open);
    if (!article) return;
    document.querySelector('#dialog-label').textContent = `${article.market} / ${article.label}`;
    document.querySelector('#dialog-title').textContent = article.title;
    document.querySelector('#dialog-meta').textContent = `恒立财富 · 阅读示例 · ${article.minutes} 分钟阅读`;
    document.querySelector('#dialog-body').replaceChildren(...article.body.map(copy => {
      const paragraph = document.createElement('p');
      paragraph.textContent = copy;
      return paragraph;
    }));
    dialog.showModal();
    dialog.scrollTop = 0;
  }));
  document.querySelector('#close-article').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  setChannel('featured');
})();
