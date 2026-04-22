

const BOOK_COLORS = [
  '#6e56cf', '#7c6ae0', '#5b4ba8', '#4a9eff', '#3b82f6', '#2563eb',
  '#10b981', '#059669', '#047857', '#f59e0b', '#d97706', '#b45309',
  '#ef4444', '#dc2626', '#b91c1c', '#8b5cf6', '#7c3aed', '#6d28d9'
];

function bookColor(bookId) {
  let hash = 0;
  for (const c of bookId) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffff;
  return BOOK_COLORS[Math.abs(hash) % BOOK_COLORS.length];
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

const AppState = {
  screen: {
    current: 'home',
  },
  book: {
    activeId: null,
    activePageId: null,
    reorderMode: false,
    draggingPageId: null,
    searchQuery: '',
    searchOpen: false,
  },
  search: {
    query: '',
    tagFilter: null,
    folderFilter: null,
  },
  highlight: {
    colorFilter: 'all',
    pendingSelection: null,
    pendingColor: null,
    editingColor: 'yellow',
  },
};

function openModal(id) {
  document.querySelector(`#${id} .modal-overlay`)?.classList.add('visible');
}

function closeModal(id) {
  document.querySelector(`#${id} .modal-overlay`)?.classList.remove('visible');
}

function showStorageError() {
  showToast('저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
}

function persistCollections(updates) {
  const backups = updates.map(({ collection }) => ({
    collection,
    data: DB.getAll(collection)
  }));
  const applied = [];

  for (const update of updates) {
    if (!DB.setAll(update.collection, update.data)) {
      [...applied].reverse().forEach((backup) => {
        DB.setAll(backup.collection, backup.data);
      });
      return false;
    }

    const backup = backups.find((item) => item.collection === update.collection);
    if (backup) applied.push(backup);
  }

  return true;
}

function renderEmptyState(options = {}) {
  const {
    title = '표시할 내용이 없습니다.',
    description = '',
    actionLabel = '',
    action = ''
  } = options;

  return `
    <div class="empty-state-card">
      <div class="empty-state-icon">+</div>
      <div class="empty-state-title">${escapeHtml(title)}</div>
      ${description ? `<div class="empty-state-description">${escapeHtml(description)}</div>` : ''}
      ${actionLabel && action ? `<button class="empty-state-action" type="button" onclick="${action}">${escapeHtml(actionLabel)}</button>` : ''}
    </div>
  `;
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  AppState.screen.current = name;
  window.scrollTo(0, 0);

  if (name === 'home') renderHome();
  if (name === 'search') renderSearch();
  if (name === 'highlights') renderHighlights();
}

function getFolderTabs() {
  const folders = DB.getAll('folders');
  return [{ id: null, name: '전체' }, ...folders];
}

function renderFolderTabs(books, folders) {
  const folderTabs = document.getElementById('home-folder-tabs');
  if (!folderTabs) return;
  folderTabs.innerHTML = folders.map((folder) => {
    const count = folder.id ? books.filter((book) => book.folderId === folder.id).length : books.length;
    const active = AppState.search.folderFilter === folder.id || (!AppState.search.folderFilter && !folder.id);
    return `
      <button class="folder-tab ${active ? 'active' : ''}" type="button" onclick="filterByFolder(${folder.id ? `'${escapeAttr(folder.id)}'` : 'null'})">
        <span>${escapeHtml(folder.name)}</span>
        <span class="folder-count">${count}</span>
      </button>
    `;
  }).join('');
}

function renderTagStrip(tags) {
  const tagStrip = document.getElementById('home-tag-strip');
  if (!tagStrip) return;
  tagStrip.innerHTML =
    `<button class="tag-chip ${!AppState.search.tagFilter ? 'active' : ''}" type="button" onclick="filterByTag(null)">전체</button>` +
    tags.map((tag) =>
      `<button class="tag-chip ${AppState.search.tagFilter === tag.id ? 'active' : ''}" type="button" onclick="filterByTag('${escapeAttr(tag.id)}')">${escapeHtml(tag.name)}</button>`
    ).join('');
}

function renderRecentSearches(searches, targetId = 'search-recent-searches') {
  const recentEl = document.getElementById(targetId);
  const supportWrap = targetId === 'search-recent-searches'
    ? document.getElementById('search-support')
    : null;
  if (!recentEl) return;
  if (supportWrap) supportWrap.style.display = searches.length ? 'block' : 'none';
  recentEl.innerHTML = searches.length
    ? `
      <button class="recent-clear-btn" type="button" onclick="clearAllRecentSearches()">전체 삭제</button>
      ${searches.slice(0, 10).map((query) => `
        <span class="recent-chip">
          <button class="recent-chip-label" type="button" onclick="applySearch('${escapeAttr(query)}')">${escapeHtml(query)}</button>
          <button class="recent-chip-delete" type="button" aria-label="최근 검색어 삭제" title="삭제" onclick="event.stopPropagation(); removeRecentSearch('${escapeAttr(query)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </span>
      `).join('')}
    `
    : renderEmptyState({
      title: '최근 검색어가 없습니다.',
      description: '검색을 시작하면 여기에 최근 검색어가 표시됩니다.',
      actionLabel: '검색하러 가기',
      action: "showScreen('search')"
    });
}

function syncHomeCardActionLabels() {
  document.querySelectorAll('.book-card-action-btn').forEach((button) => {
    if (button.classList.contains('danger')) {
      button.title = '책 삭제';
      button.setAttribute('aria-label', '책 삭제');
      return;
    }

    button.title = '책 편집';
    button.setAttribute('aria-label', '책 편집');
  });
}

function renderRecentActivity(recentViews, books) {
  const recentActivitySection = document.getElementById('recent-activity-section');
  const recentActivityEl = document.getElementById('home-recent-activity');
  if (!recentActivitySection || !recentActivityEl) return;

  const recentItems = recentViews
    .map((entry) => {
      const book = books.find((item) => item.id === entry.bookId);
      if (!book) return null;
      const page = entry.pageId ? DB.getById('pages', entry.pageId) : null;
      return { entry, book, page };
    })
    .filter(Boolean)
    .slice(0, 3);

  recentActivitySection.style.display = '';
  if (!recentItems.length) {
    recentActivityEl.innerHTML = renderEmptyState({
      title: '최근 본 항목이 없습니다.',
      description: '책 상세 화면을 열어보면 최근 본 항목이 여기에 쌓입니다.'
    });
  } else {
    recentActivityEl.innerHTML = recentItems.map(({ book, page }) => `
      <button class="recent-activity-item" type="button" onclick="openRecentItem('${escapeAttr(book.id)}', ${page ? `'${escapeAttr(page.id)}'` : 'null'})">
        <div class="recent-activity-title">${escapeHtml(book.title || '제목 없음')}</div>
        <div class="recent-activity-meta">
          ${escapeHtml(book.author || '저자 미상')}
          ${page ? ` · p.${page.pageNumber}` : ''}
        </div>
      </button>
    `).join('');
  }
}

function filterBooks(books) {
  let filtered = books;
  if (AppState.search.folderFilter) {
    filtered = filtered.filter((book) => book.folderId === AppState.search.folderFilter);
  }
  if (AppState.search.tagFilter) {
    filtered = filtered.filter((book) => Array.isArray(book.tagIds) && book.tagIds.includes(AppState.search.tagFilter));
  }
  return filtered;
}

function renderBookList(filteredBooks, folderMap, tagMap) {
  const bookList = document.getElementById('home-book-list');
  if (!bookList) return;

  if (!filteredBooks.length) {
    bookList.innerHTML = renderEmptyState({
      title: '책이 없습니다.',
      description: '아직 저장된 책이 없어요. 페이지 추가 버튼으로 첫 기록을 남겨보세요.',
      actionLabel: '책 추가하기',
      action: "openModal('modal-scan')"
    });
    return;
  }

  bookList.innerHTML = filteredBooks.map((book) => {
    const folder = folderMap.get(book.folderId);
    const firstTag = (book.tagIds || []).map((id) => tagMap.get(id)).filter(Boolean)[0];
    return `
      <div class="book-item">
        <button class="book-item-main" type="button" onclick="renderBookDetail('${escapeAttr(book.id)}')" aria-label="${escapeAttr(book.title || '제목 없음')} 상세 보기">
          <div class="book-spine" style="background:${bookColor(book.id)}20;color:${bookColor(book.id)}">책</div>
          <div class="book-info">
            <div class="book-title">${escapeHtml(book.title || '제목 없음')}</div>
            <div class="book-author">${escapeHtml(book.author || '저자 미상')}</div>
            <div class="book-meta-row">
              ${folder ? `<span class="folder-badge">${escapeHtml(folder.name)}</span>` : ''}
              ${firstTag ? `<span class="book-tag">${escapeHtml(firstTag.name)}</span>` : ''}
            </div>
          </div>
        </button>
        <div class="book-card-actions">
          <button class="book-card-action-btn" type="button" title="책 편집" aria-label="책 편집" onclick="openEditBookModal('${escapeAttr(book.id)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>
          <button class="book-card-action-btn danger" type="button" title="책 삭제" aria-label="책 삭제" onclick="deleteBook('${escapeAttr(book.id)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6M14 11v6"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHome() {
  const books = DB.getAll('books');
  const tags = DB.getAll('tags');
  const recentViews = DB.getAll('recentViews');
  const folders = getFolderTabs();
  const folderMap = new Map(DB.getAll('folders').map((folder) => [folder.id, folder]));
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  renderFolderTabs(books, folders);
  renderTagStrip(tags);
  renderRecentActivity(recentViews, books);
  renderBookList(filterBooks(books), folderMap, tagMap);
  syncHomeCardActionLabels();
}

function renderSearch() {
  const query = AppState.search.query;
  const container = document.getElementById('search-results-container');
  const meta = document.getElementById('search-meta');
  const searches = DB.getAll('recentSearches');
  if (!container) return;

  renderRecentSearches(searches);

  if (!query) {
    container.innerHTML = renderEmptyState({
      title: '검색어를 입력하세요.',
      description: '책 내용, 키워드, 문장을 입력하면 관련 페이지를 찾아드립니다.'
    });
    if (meta) meta.textContent = '';
    return;
  }

  const results = SearchEngine.search(query);
  if (meta) meta.textContent = `"${query}" 검색 결과 ${results.length}개`;

  if (!results.length) {
    container.innerHTML = renderEmptyState({
      title: '검색 결과가 없습니다.',
      description: '다른 키워드나 더 짧은 문장으로 다시 검색해보세요.',
      actionLabel: '검색어 지우기',
      action: "document.getElementById('search-input').value=''; AppState.search.query=''; renderSearch();"
    });
    return;
  }

  container.innerHTML = results.map((result) => `
    <button class="search-result-item" type="button" onclick="openSearchResult('${escapeAttr(result.book.id)}', '${escapeAttr(result.page.id)}')">
      <div class="result-book-label">
        <span class="result-book-name" style="color:${bookColor(result.book.id)}">${escapeHtml(result.book.title)}</span>
        <span class="result-page-num">p.${result.page.pageNumber}</span>
      </div>
      <div class="result-snippet">${SearchEngine.highlightSnippet(result.snippet, query)}</div>
    </button>
  `).join('');
}

function searchWithinBook(bookId, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  return DB.getAll('pages')
    .filter((page) => page.bookId === bookId)
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((page) => {
      const text = page.processedText || page.extractedText || '';
      const lowered = text.toLowerCase();
      const index = lowered.indexOf(q);
      if (index === -1) return null;

      const start = Math.max(0, index - 42);
      const end = Math.min(text.length, index + q.length + 68);
      const snippet = `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;

      return { page, snippet };
    })
    .filter(Boolean);
}

function highlightInlineMatch(text, query) {
  const escaped = escapeHtml(text || '');
  if (!query) return escaped;
  const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return escaped.replace(pattern, (match) => `<mark class="search-highlight">${match}</mark>`);
}

function normalizePageNumbers(bookId, orderedPageIds = null) {
  const allPages = DB.getAll('pages');
  const targetPages = allPages.filter((page) => page.bookId === bookId);
  const ordered = orderedPageIds
    ? orderedPageIds
      .map((id) => targetPages.find((page) => page.id === id))
      .filter(Boolean)
    : [...targetPages].sort((a, b) => a.pageNumber - b.pageNumber);

  const normalizedMap = new Map();
  ordered.forEach((page, index) => {
    normalizedMap.set(page.id, {
      ...page,
      pageNumber: index + 1
    });
  });

  const nextPages = allPages.map((page) => normalizedMap.get(page.id) || page);
  const nextBooks = DB.getAll('books').map((book) => (
    book.id === bookId ? { ...book, pageCount: ordered.length } : book
  ));

  if (!persistCollections([
    { collection: 'pages', data: nextPages },
    { collection: 'books', data: nextBooks }
  ])) {
    return null;
  }

  return ordered.map((page) => normalizedMap.get(page.id) || page);
}

function renderBookBasicInfo(book) {
  document.getElementById('book-detail-title').textContent = book.title || '제목 없음';
  document.getElementById('book-detail-author').textContent = book.author || '저자 미상';
}

function syncReorderButton() {
  const reorderBtn = document.getElementById('book-detail-reorder-toggle');
  if (!reorderBtn) return;
  reorderBtn.classList.toggle('active', AppState.book.reorderMode);
  reorderBtn.title = AppState.book.reorderMode ? '순서 변경 완료' : '페이지 순서 변경';
}

function renderBookDetailTags(book) {
  const tagMap = new Map(DB.getAll('tags').map((tag) => [tag.id, tag]));
  document.getElementById('book-detail-tags').innerHTML = (book.tagIds || [])
    .map((tagId) => tagMap.get(tagId))
    .filter(Boolean)
    .map((tag) => `<span class="book-tag">${escapeHtml(tag.name)}</span>`)
    .join('');
}

function renderBookInlineSearch(bookId) {
  const inlineSearchWrap = document.getElementById('book-inline-search');
  const inlineSearchInput = document.getElementById('book-search-input');
  const inlineSearchResults = document.getElementById('book-search-results');
  if (!inlineSearchWrap || !inlineSearchInput || !inlineSearchResults) return;

  inlineSearchWrap.style.display = AppState.book.searchOpen ? 'block' : 'none';
  inlineSearchInput.value = AppState.book.searchQuery;

  if (!AppState.book.searchOpen) {
    inlineSearchResults.innerHTML = '';
  } else if (!AppState.book.searchQuery.trim()) {
    inlineSearchResults.innerHTML = renderEmptyState({
      title: '책 내부 검색어를 입력하세요.',
      description: '현재 책의 페이지 안에서만 검색합니다.'
    });
  } else {
    const results = searchWithinBook(bookId, AppState.book.searchQuery);
    inlineSearchResults.innerHTML = results.length
      ? results.map((result) => `
        <button class="book-search-result-item" type="button" onclick="focusPageCard('${escapeAttr(result.page.id)}')">
          <div class="book-search-result-page">p.${result.page.pageNumber}</div>
          <div class="book-search-result-snippet">${highlightInlineMatch(result.snippet, AppState.book.searchQuery)}</div>
        </button>
      `).join('')
      : renderEmptyState({
        title: '이 책 안에서는 검색 결과가 없습니다.',
        description: '다른 단어나 더 짧은 문장으로 다시 검색해보세요.'
      });
  }
}

function renderBookPageList(pages) {
  const pageList = document.getElementById('page-list');
  if (!pageList) return;

  if (!pages.length) {
    pageList.innerHTML = renderEmptyState({
      title: '페이지가 없습니다.',
      description: '이 책에는 아직 저장된 페이지가 없어요.',
      actionLabel: '새 페이지 추가',
      action: "openModal('modal-scan')"
    });
    return;
  }

  const allHighlights = DB.getAll('highlights');
  pageList.innerHTML = pages.map((page) => {
    const highlights = allHighlights.filter((h) => h.pageId === page.id);
    return `
      <div
        class="page-card ${AppState.book.reorderMode ? 'reorder-mode' : ''}"
        id="page-${escapeAttr(page.id)}"
        data-page-id="${escapeAttr(page.id)}"
        draggable="${AppState.book.reorderMode ? 'true' : 'false'}"
      >
        <div class="page-card-header">
          <button class="page-drag-handle" type="button" title="드래그하여 순서 변경" aria-label="드래그하여 순서 변경">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"></path>
            </svg>
          </button>
          <span class="page-number-label">p.${page.pageNumber}</span>
          <div class="page-card-actions">
            <button class="page-action-btn" type="button" title="페이지 수정" aria-label="페이지 수정" onclick="event.stopPropagation(); openEditPageModal('${escapeAttr(page.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="page-card-body">
          <div class="page-text" data-page-id="${escapeAttr(page.id)}">${renderPageText(page, highlights)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function recordBookView(bookId, targetPageId) {
  AppState.book.activeId = bookId;
  AppState.book.activePageId = targetPageId;
  DB.addRecentView({
    bookId,
    pageId: targetPageId || null,
    viewedAt: new Date().toISOString()
  });
}

function renderBookDetail(bookId, targetPageId = null) {
  const book = DB.getById('books', bookId);
  if (!book) {
    showScreen('home');
    return;
  }

  const pages = DB.getAll('pages')
    .filter((page) => page.bookId === bookId)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  recordBookView(bookId, targetPageId);
  renderBookBasicInfo(book);
  syncReorderButton();
  renderBookDetailTags(book);
  renderBookInlineSearch(bookId);
  renderBookPageList(pages);

  showScreen('book-detail');

  if (targetPageId) {
    setTimeout(() => {
      focusPageCard(targetPageId);
    }, 250);
  }
}

function focusPageCard(pageId) {
  const pageCard = document.getElementById(`page-${pageId}`);
  if (!pageCard) return;

  pageCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  pageCard.classList.remove('page-card-focus');

  requestAnimationFrame(() => {
    pageCard.classList.add('page-card-focus');
    window.setTimeout(() => {
      pageCard.classList.remove('page-card-focus');
    }, 1800);
  });
}

function commitSearchQuery(query) {
  const normalized = (query || '').trim();
  if (!normalized) return true;
  return DB.addRecentSearch(normalized);
}

function openSearchResult(bookId, pageId) {
  commitSearchQuery(AppState.search.query);
  renderBookDetail(bookId, pageId);
}

function openHighlightSource(highlightId) {
  const highlight = DB.getById('highlights', highlightId);
  if (!highlight) return;

  const page = DB.getById('pages', highlight.pageId);
  if (!page) return;

  renderBookDetail(page.bookId, page.id);
}

function renderPageText(page, highlights) {
  const raw = page.processedText || page.extractedText || '';
  const valid = highlights.filter(
    (h) => h.textRange && typeof h.textRange.start === 'number' && typeof h.textRange.end === 'number'
  );
  if (!valid.length) return escapeHtml(raw);

  const sorted = [...valid].sort((a, b) => a.textRange.start - b.textRange.start);

  const merged = [];
  for (const h of sorted) {
    const s = Math.max(0, h.textRange.start);
    const e = Math.min(raw.length, h.textRange.end);
    if (s >= e) continue;
    if (merged.length && s < merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, e);
    } else {
      merged.push({ start: s, end: e, color: h.color });
    }
  }

  let result = '';
  let cursor = 0;
  for (const { start, end, color } of merged) {
    if (cursor < start) result += escapeHtml(raw.slice(cursor, start));
    result += `<span class="hl-${escapeAttr(color)}">${escapeHtml(raw.slice(start, end))}</span>`;
    cursor = end;
  }
  if (cursor < raw.length) result += escapeHtml(raw.slice(cursor));
  return result;
}

function normalizeBookTitle(title) {
  return (title || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w가-힣 ]/g, '').trim();
}

function findMatchingBooks(title) {
  const normalizedInput = normalizeBookTitle(title);
  if (!normalizedInput) return [];
  return DB.getAll('books').filter((book) => {
    const normalizedBookTitle = normalizeBookTitle(book.title);
    if (!normalizedBookTitle) return false;
    return normalizedBookTitle === normalizedInput ||
      normalizedBookTitle.includes(normalizedInput) ||
      normalizedInput.includes(normalizedBookTitle);
  });
}

function renderScanSaveChoices(matches, typedTitle) {
  const wrap = document.getElementById('scan-save-choice-wrap');
  const list = document.getElementById('scan-save-choice-list');
  if (!wrap || !list) return;

  wrap.style.display = 'block';
  list.innerHTML = `
    <label class="scan-save-choice-item">
      <input type="radio" name="scan-save-choice" value="new" checked>
      <div class="scan-save-choice-body">
        <div class="scan-save-choice-title">새 책으로 저장</div>
        <div class="scan-save-choice-desc">"${escapeHtml(typedTitle)}" 제목으로 새 책을 생성합니다.</div>
      </div>
    </label>
  ` + matches.map((book) => `
    <label class="scan-save-choice-item">
      <input type="radio" name="scan-save-choice" value="append:${escapeAttr(book.id)}">
      <div class="scan-save-choice-body">
        <div class="scan-save-choice-title">기존 책에 이어 저장</div>
        <div class="scan-save-choice-desc">${escapeHtml(book.title)}</div>
        <div class="scan-save-choice-meta">${escapeHtml(book.author || '저자 미상')} · ${book.pageCount || 0}페이지</div>
      </div>
    </label>
  `).join('');
}

function resetScanSaveChoices() {
  const wrap = document.getElementById('scan-save-choice-wrap');
  const list = document.getElementById('scan-save-choice-list');
  if (wrap) wrap.style.display = 'none';
  if (list) list.innerHTML = '';
}

function syncScanSaveChoices() {
  const title = document.getElementById('scan-book-title')?.value.trim() || '';
  if (!title) {
    resetScanSaveChoices();
    return [];
  }

  const matches = findMatchingBooks(title);
  if (matches.length > 0) {
    renderScanSaveChoices(matches, title);
  } else {
    resetScanSaveChoices();
  }
  return matches;
}

function appendPageToBook(bookId, pageData) {
  const pages = DB.getAll('pages').filter((page) => page.bookId === bookId);
  const nextPageNumber = pages.length + 1;
  const page = DB.add('pages', {
    bookId,
    pageNumber: nextPageNumber,
    extractedText: pageData.extractedText,
    processedText: pageData.processedText,
    createdAt: pageData.createdAt || new Date().toISOString()
  });
  if (!page) return null;

  if (!DB.update('books', bookId, { pageCount: nextPageNumber })) {
    DB.remove('pages', page.id);
    return null;
  }

  return page;
}

function addBookWithPage(bookData, pageData) {
  const book = DB.add('books', {
    title: bookData.title,
    author: bookData.author || '저자 미상',
    tagIds: bookData.tagIds || [],
    folderId: bookData.folderId || null,
    createdAt: bookData.createdAt || new Date().toISOString(),
    pageCount: 0
  });
  if (!book) return null;
  const page = DB.add('pages', {
    bookId: book.id,
    pageNumber: 1,
    extractedText: pageData.extractedText,
    processedText: pageData.processedText,
    createdAt: pageData.createdAt || new Date().toISOString()
  });

  if (!page) {
    DB.remove('books', book.id);
    return null;
  }

  if (!DB.update('books', book.id, { pageCount: 1 })) {
    DB.remove('pages', page.id);
    DB.remove('books', book.id);
    return null;
  }

  return { book, page };
}

function saveScannedPage() {
  const title = document.getElementById('scan-book-title')?.value.trim() || '';
  const author = document.getElementById('scan-book-author')?.value.trim() || '';
  const text = document.getElementById('page-entry-text')?.value.trim() || '';

  if (!title || !text) {
    showToast('책 제목과 페이지 내용을 입력해주세요.');
    return;
  }

  const matches = findMatchingBooks(title);
  const selectedChoice = document.querySelector('input[name="scan-save-choice"]:checked');

  if (matches.length > 0 && !selectedChoice) {
    showToast('저장 방식을 선택해주세요.');
    return;
  }

  const pageData = {
    extractedText: text,
    processedText: text,
    createdAt: new Date().toISOString()
  };

  if (selectedChoice && selectedChoice.value.startsWith('append:')) {
    const result = appendPageToBook(selectedChoice.value.slice(7), pageData);
    if (!result) {
      showStorageError();
      return;
    }
  } else {
    const result = addBookWithPage({
      title,
      author: author || '저자 미상',
      tagIds: [],
      folderId: null,
      createdAt: new Date().toISOString(),
      pageCount: 0
    }, pageData);

    if (!result) {
      showStorageError();
      return;
    }
  }

  closeModal('modal-scan');
  resetScanSaveChoices();
  document.getElementById('scan-book-title').value = '';
  document.getElementById('scan-book-author').value = '';
  document.getElementById('page-entry-text').value = '';
  document.getElementById('scan-image-input').value = '';
  document.getElementById('scan-preview-wrap').style.display = 'none';
  document.getElementById('scan-preview-img').src = '';
  showScreen('home');
  showToast('저장되었습니다.');
}

function renderEditBookOptions(book) {
  const tags = DB.getAll('tags');
  const folders = DB.getAll('folders');
  document.getElementById('edit-book-tags').innerHTML = tags.map((tag) => `
    <label class="edit-check-item">
      <input type="checkbox" name="edit-book-tag" value="${escapeAttr(tag.id)}" ${(book.tagIds || []).includes(tag.id) ? 'checked' : ''}>
      <span>${escapeHtml(tag.name)}</span>
    </label>
  `).join('');

  document.getElementById('edit-book-folders').innerHTML = `
    <label class="edit-radio-item">
      <input type="radio" name="edit-book-folder" value="" ${!book.folderId ? 'checked' : ''}>
      <span>폴더 없음</span>
    </label>
  ` + folders.map((folder) => `
    <label class="edit-radio-item">
      <input type="radio" name="edit-book-folder" value="${escapeAttr(folder.id)}" ${book.folderId === folder.id ? 'checked' : ''}>
      <span>${escapeHtml(folder.name)}</span>
    </label>
  `).join('');
}

function openEditBookModal(bookId) {
  const book = DB.getById('books', bookId);
  if (!book) return;
  document.getElementById('edit-book-id').value = book.id;
  document.getElementById('edit-book-title').value = book.title || '';
  document.getElementById('edit-book-author').value = book.author || '';
  renderEditBookOptions(book);
  openModal('modal-edit-book');
}

function closeEditBookModal() {
  closeModal('modal-edit-book');
}

function deleteBook(bookId) {
  const book = DB.getById('books', bookId);
  if (!book) return;
  if (!window.confirm(`"${book.title || '이 책'}"을(를) 삭제할까요? 책의 페이지와 하이라이트도 함께 삭제됩니다.`)) return;

  const pages = DB.getAll('pages').filter((page) => page.bookId === bookId);
  const pageIds = new Set(pages.map((page) => page.id));

  if (!persistCollections([
    { collection: 'books', data: DB.getAll('books').filter((item) => item.id !== bookId) },
    { collection: 'pages', data: DB.getAll('pages').filter((page) => page.bookId !== bookId) },
    { collection: 'highlights', data: DB.getAll('highlights').filter((highlight) => !pageIds.has(highlight.pageId)) },
    { collection: 'bookmarks', data: DB.getAll('bookmarks').filter((bookmark) => !pageIds.has(bookmark.pageId)) },
    { collection: 'recentViews', data: DB.getAll('recentViews').filter((entry) => entry.bookId !== bookId && !pageIds.has(entry.pageId)) }
  ])) {
    showStorageError();
    return;
  }

  closeEditBookModal();

  if (AppState.book.activeId === bookId) {
    AppState.book.activeId = null;
    AppState.book.activePageId = null;
    AppState.book.searchQuery = '';
    AppState.book.searchOpen = false;
    AppState.book.reorderMode = false;
    AppState.book.draggingPageId = null;
    showScreen('home');
  } else {
    renderHome();
    if (AppState.screen.current === 'highlights') renderHighlights();
  }

  showToast('책이 삭제되었습니다.');
}

function saveEditedBook() {
  const bookId = document.getElementById('edit-book-id').value;
  const title = document.getElementById('edit-book-title').value.trim();
  const author = document.getElementById('edit-book-author').value.trim();

  if (!bookId || !title) {
    showToast('책 제목을 입력해주세요.');
    return;
  }

  if (!DB.update('books', bookId, {
    title,
    author: author || '저자 미상',
    tagIds: Array.from(document.querySelectorAll('input[name="edit-book-tag"]:checked')).map((input) => input.value),
    folderId: document.querySelector('input[name="edit-book-folder"]:checked')?.value || null
  })) {
    showStorageError();
    return;
  }

  closeEditBookModal();
  renderHome();
  if (AppState.book.activeId === bookId && AppState.screen.current === 'book-detail') {
    renderBookDetail(bookId, AppState.book.activePageId);
  }
  showToast('책 정보가 수정되었습니다.');
}

function openEditPageModal(pageId) {
  const page = DB.getById('pages', pageId);
  if (!page) return;
  document.getElementById('edit-page-id').value = page.id;
  document.getElementById('edit-page-text').value = page.processedText || '';
  openModal('modal-edit-page');
}

function closeEditPageModal() {
  closeModal('modal-edit-page');
}

function deletePage(pageId) {
  const page = DB.getById('pages', pageId);
  if (!page) return;
  if (!window.confirm(`p.${page.pageNumber} 페이지를 삭제할까요? 이 페이지의 하이라이트도 함께 삭제됩니다.`)) return;

  const remainingPages = DB.getAll('pages').filter((item) => item.id !== pageId);
  const renumberedPages = remainingPages
    .filter((item) => item.bookId === page.bookId)
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((item, index) => ({ ...item, pageNumber: index + 1 }));
  const renumberMap = new Map(renumberedPages.map((item) => [item.id, item]));
  const nextPages = remainingPages.map((item) => renumberMap.get(item.id) || item);
  const nextBooks = DB.getAll('books').map((book) => (
    book.id === page.bookId ? { ...book, pageCount: renumberedPages.length } : book
  ));

  if (!persistCollections([
    { collection: 'pages', data: nextPages },
    { collection: 'books', data: nextBooks },
    { collection: 'highlights', data: DB.getAll('highlights').filter((highlight) => highlight.pageId !== pageId) },
    { collection: 'bookmarks', data: DB.getAll('bookmarks').filter((bookmark) => bookmark.pageId !== pageId) },
    { collection: 'recentViews', data: DB.getAll('recentViews').filter((entry) => entry.pageId !== pageId) }
  ])) {
    showStorageError();
    return;
  }

  closeEditPageModal();

  const nextActivePage = renumberedPages.find((item) => item.pageNumber >= page.pageNumber)
    || renumberedPages[renumberedPages.length - 1]
    || null;
  AppState.book.activePageId = nextActivePage?.id || null;

  if (AppState.screen.current === 'highlights') {
    renderHighlights();
  }

  renderBookDetail(page.bookId, AppState.book.activePageId);
  showToast('페이지가 삭제되었습니다.');
}

function saveEditedPage() {
  const pageId = document.getElementById('edit-page-id').value;
  const text = document.getElementById('edit-page-text').value;
  const page = DB.getById('pages', pageId);
  if (!page) return;
  if (!DB.update('pages', pageId, { processedText: text })) {
    showStorageError();
    return;
  }
  closeEditPageModal();
  renderBookDetail(page.bookId, pageId);
  showToast('페이지 텍스트가 수정되었습니다.');
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const pageText = range.startContainer?.parentElement?.closest('.page-text');
  if (!pageText) return;

  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  const offsets = getSelectionOffsets(pageText, range);
  if (!offsets) return;

  AppState.highlight.pendingSelection = {
    pageId: pageText.dataset.pageId,
    selectedText,
    start: offsets.start,
    end: offsets.end
  };
  AppState.highlight.pendingColor = null;

  const popup = document.getElementById('selection-popup');
  const rect = range.getBoundingClientRect();
  popup.classList.remove('expanded');
  popup.classList.add('visible');
  positionSelectionPopup(popup, rect);
  document.getElementById('selection-memo-input').value = '';
}

function positionSelectionPopup(popup, rect) {
  if (!popup || !rect) return;

  const margin = 12;
  const offset = 8;
  const previousVisibility = popup.style.visibility;
  const previousDisplay = popup.style.display;

  popup.style.visibility = 'hidden';
  popup.style.display = 'flex';

  const popupRect = popup.getBoundingClientRect();
  const maxLeft = window.innerWidth - popupRect.width - margin;
  const preferredLeft = rect.left + window.scrollX;
  const left = Math.min(Math.max(margin, preferredLeft), Math.max(margin, maxLeft + window.scrollX));

  const preferredTop = rect.bottom + window.scrollY + offset;
  const fitsBelow = rect.bottom + popupRect.height + offset + margin <= window.innerHeight;
  const top = fitsBelow
    ? preferredTop
    : Math.max(window.scrollY + margin, rect.top + window.scrollY - popupRect.height - offset);

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.visibility = previousVisibility;
  popup.style.display = previousDisplay;
}

function getSelectionOffsets(container, range) {
  if (!container.contains(range.commonAncestorContainer)) return null;

  try {
    const startRange = document.createRange();
    startRange.selectNodeContents(container);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = document.createRange();
    endRange.selectNodeContents(container);
    endRange.setEnd(range.endContainer, range.endOffset);

    const start = startRange.toString().length;
    const end = endRange.toString().length;
    return start < end ? { start, end } : null;
  } catch {
    return null;
  }
}

function chooseHighlightColor(color) {
  AppState.highlight.pendingColor = color;
  document.getElementById('selection-popup').classList.add('expanded');
  document.getElementById('selection-memo-input').focus();
}

function savePendingHighlight() {
  if (!AppState.highlight.pendingSelection || !AppState.highlight.pendingColor) return;
  const memo = document.getElementById('selection-memo-input').value.trim();
  const { pageId, selectedText, start, end } = AppState.highlight.pendingSelection;

  if (!DB.add('highlights', {
    pageId,
    selectedText,
    textRange: { start, end },
    color: AppState.highlight.pendingColor,
    memo: memo || null,
    createdAt: new Date().toISOString()
  })) {
    showStorageError();
    return;
  }

  const page = DB.getById('pages', pageId);
  hideSelectionPopup();
  if (page) renderBookDetail(page.bookId, pageId);
  showToast('하이라이트가 추가되었습니다.');
}

function hideSelectionPopup() {
  const popup = document.getElementById('selection-popup');
  popup.classList.remove('visible', 'expanded');
  popup.style.display = '';
  AppState.highlight.pendingSelection = null;
  AppState.highlight.pendingColor = null;
  document.getElementById('selection-memo-input').value = '';
  window.getSelection()?.removeAllRanges();
}

function openEditHighlightModal(id) {
  const highlight = DB.getById('highlights', id);
  if (!highlight) return;
  document.getElementById('edit-highlight-id').value = highlight.id;
  document.getElementById('edit-highlight-memo').value = highlight.memo || '';
  AppState.highlight.editingColor = highlight.color || 'yellow';
  updateEditHighlightColorButtons();
  openModal('modal-edit-highlight');
}

function closeEditHighlightModal() {
  closeModal('modal-edit-highlight');
}

function selectEditHighlightColor(color) {
  AppState.highlight.editingColor = color;
  updateEditHighlightColorButtons();
}

function updateEditHighlightColorButtons() {
  document.querySelectorAll('.edit-highlight-color-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.color === AppState.highlight.editingColor);
  });
}

function saveEditedHighlight() {
  const id = document.getElementById('edit-highlight-id').value;
  if (!id) return;
  if (!DB.update('highlights', id, {
    memo: document.getElementById('edit-highlight-memo').value.trim() || null,
    color: AppState.highlight.editingColor
  })) {
    showStorageError();
    return;
  }
  closeEditHighlightModal();
  renderHighlights();
  showToast('하이라이트가 수정되었습니다.');
}

function deleteHighlight(id) {
  if (!window.confirm('이 하이라이트를 삭제할까요?')) return;
  if (!DB.remove('highlights', id)) {
    showStorageError();
    return;
  }
  renderHighlights();
  if (AppState.book.activeId && AppState.screen.current === 'book-detail') {
    renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
  }
  showToast('하이라이트가 삭제되었습니다.');
}

function renderHighlights() {
  const container = document.getElementById('highlights-container');
  if (!container) return;
  const highlights = DB.getAll('highlights');
  const pages = DB.getAll('pages');
  const books = DB.getAll('books');
  const filtered = AppState.highlight.colorFilter === 'all'
    ? highlights
    : highlights.filter((highlight) => highlight.color === AppState.highlight.colorFilter);

  if (!filtered.length) {
    container.innerHTML = renderEmptyState({
      title: '하이라이트가 없습니다.',
      description: '책 페이지에서 문장을 선택해 하이라이트를 추가해보세요.',
      actionLabel: '책장으로 이동',
      action: "showScreen('home')"
    });
    return;
  }

  container.innerHTML = filtered.map((highlight) => {
    const page = pages.find((item) => item.id === highlight.pageId);
    const book = books.find((item) => item.id === page?.bookId);
    return `
      <div class="highlight-card" data-color="${escapeAttr(highlight.color)}">
        <div class="highlight-card-header">
          <div class="highlight-card-body">
            <div class="highlight-text">"${escapeHtml(highlight.selectedText || '')}"</div>
            ${highlight.memo ? `<div class="highlight-memo">${escapeHtml(highlight.memo)}</div>` : ''}
          </div>
          <div class="highlight-card-actions">
            <button class="highlight-action-btn" type="button" title="원문 보기" aria-label="원문 보기" onclick="event.stopPropagation(); openHighlightSource('${escapeAttr(highlight.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6v6"></path>
                <path d="M10 14 21 3"></path>
                <path d="M21 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              </svg>
            </button>
            <button class="highlight-action-btn" type="button" title="수정" aria-label="수정" onclick="event.stopPropagation(); openEditHighlightModal('${escapeAttr(highlight.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
              </svg>
            </button>
            <button class="highlight-action-btn" type="button" title="삭제" aria-label="삭제" onclick="event.stopPropagation(); deleteHighlight('${escapeAttr(highlight.id)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6M14 11v6"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="highlight-footer">
          <span class="highlight-source">${escapeHtml(book?.title || '알 수 없는 책')} p.${page?.pageNumber || 0}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterByTag(tagId) {
  AppState.search.tagFilter = tagId;
  renderHome();
}

function filterByFolder(folderId) {
  AppState.search.folderFilter = folderId;
  renderHome();
}

function applySearch(query) {
  AppState.search.query = query;
  const input = document.getElementById('search-input');
  if (input) input.value = query;
  commitSearchQuery(query);
  showScreen('search');
}

function openRecentItem(bookId, pageId = null) {
  renderBookDetail(bookId, pageId);
}

function toggleReorderMode() {
  AppState.book.reorderMode = !AppState.book.reorderMode;
  AppState.book.draggingPageId = null;
  if (AppState.book.activeId) {
    renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
    showToast(AppState.book.reorderMode ? '페이지 순서 변경 모드가 켜졌습니다.' : '페이지 순서 변경 모드를 종료했습니다.');
  }
}

function clearPageDropStates() {
  document.querySelectorAll('.page-card').forEach((card) => {
    card.classList.remove('dragging', 'drop-target');
  });
}

function handlePageDragStart(event) {
  if (!AppState.book.reorderMode) return;
  const card = event.target.closest('.page-card');
  if (!card) return;
  AppState.book.draggingPageId = card.dataset.pageId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', AppState.book.draggingPageId);
  card.classList.add('dragging');
}

function handlePageDragOver(event) {
  if (!AppState.book.reorderMode) return;
  const card = event.target.closest('.page-card');
  if (!card || card.dataset.pageId === AppState.book.draggingPageId) return;
  event.preventDefault();
  clearPageDropStates();
  card.classList.add('drop-target');
}

function handlePageDrop(event) {
  if (!AppState.book.reorderMode || !AppState.book.activeId) return;
  const targetCard = event.target.closest('.page-card');
  const pageList = document.getElementById('page-list');
  if (!targetCard || !pageList || !AppState.book.draggingPageId) return;
  event.preventDefault();

  const draggedCard = pageList.querySelector(`[data-page-id="${AppState.book.draggingPageId}"]`);
  if (!draggedCard || draggedCard === targetCard) {
    clearPageDropStates();
    return;
  }

  const cards = Array.from(pageList.querySelectorAll('.page-card'));
  const draggedIndex = cards.indexOf(draggedCard);
  const targetIndex = cards.indexOf(targetCard);

  if (draggedIndex < targetIndex) {
    targetCard.after(draggedCard);
  } else {
    targetCard.before(draggedCard);
  }

  const orderedIds = Array.from(pageList.querySelectorAll('.page-card')).map((card) => card.dataset.pageId);
  const normalized = normalizePageNumbers(AppState.book.activeId, orderedIds);
  AppState.book.draggingPageId = null;
  clearPageDropStates();
  if (!normalized) {
    showStorageError();
    renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
    return;
  }
  renderBookDetail(AppState.book.activeId);
  showToast('페이지 순서가 변경되었습니다.');
}

function handlePageDragEnd() {
  AppState.book.draggingPageId = null;
  clearPageDropStates();
}

function toggleBookSearch() {
  AppState.book.searchOpen = !AppState.book.searchOpen;
  if (!AppState.book.searchOpen) {
    AppState.book.searchQuery = '';
  }
  if (AppState.book.activeId) {
    renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
    if (AppState.book.searchOpen) {
      document.getElementById('book-search-input')?.focus();
    }
  }
}

function clearBookSearch() {
  AppState.book.searchQuery = '';
  if (AppState.book.activeId) {
    renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
    document.getElementById('book-search-input')?.focus();
  }
}

function removeRecentSearch(query) {
  if (!DB.removeRecentSearch(query)) {
    showStorageError();
    return;
  }
  if (AppState.screen.current === 'search') renderSearch();
  else renderHome();
  showToast('최근 검색어가 삭제되었습니다.');
}

function clearAllRecentSearches() {
  if (!DB.clearRecentSearches()) {
    showStorageError();
    return;
  }
  if (AppState.screen.current === 'search') renderSearch();
  else renderHome();
  showToast('최근 검색어를 모두 삭제했습니다.');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => toast.classList.remove('show'), 2000);
}

/* ─── Helper: 모달 닫기 버튼 + 오버레이 클릭을 한 번에 등록 ─── */
function bindModalClose(modalId, closeFn) {
  document.querySelector(`#${modalId} .modal-close`)?.addEventListener('click', closeFn);
  document.querySelector(`#${modalId} .modal-overlay`)?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeFn();
  });
}

/* ─── 네비게이션 & 화면 전환 ─────────────────────────────── */
function initNavEvents() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const screen = this.dataset.screen;
      if (screen === 'scan') openModal('modal-scan');
      else showScreen(screen);
    });
  });

  document.getElementById('home-search-input')?.addEventListener('click', () => showScreen('search'));
  document.querySelector('.back-btn')?.addEventListener('click', () => showScreen('home'));
  document.getElementById('book-detail-search-toggle')?.addEventListener('click', toggleBookSearch);
  document.getElementById('book-detail-reorder-toggle')?.addEventListener('click', toggleReorderMode);
}

/* ─── 검색 ───────────────────────────────────────────────── */
function initSearchEvents() {
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', (event) => {
    AppState.search.query = event.target.value;
    renderSearch();
  });
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    commitSearchQuery(event.target.value);
    renderSearch();
  });
  document.getElementById('search-clear-btn')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    AppState.search.query = '';
    renderSearch();
  });

  document.getElementById('book-search-input')?.addEventListener('input', (event) => {
    AppState.book.searchQuery = event.target.value;
    if (AppState.book.activeId) {
      renderBookDetail(AppState.book.activeId, AppState.book.activePageId);
    }
  });
  document.getElementById('book-search-clear-btn')?.addEventListener('click', clearBookSearch);
}

/* ─── 하이라이트 색상 필터 ───────────────────────────────── */
function initHighlightFilterEvents() {
  document.querySelectorAll('.color-filter-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.color-filter-btn').forEach((item) => item.classList.remove('active'));
      this.classList.add('active');
      AppState.highlight.colorFilter = this.dataset.color || 'all';
      renderHighlights();
    });
  });
}

/* ─── 텍스트 선택 & 하이라이트 생성 팝업 ────────────────── */
function initSelectionPopupEvents() {
  document.querySelectorAll('.hl-color-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      chooseHighlightColor(this.dataset.color);
    });
  });
  document.getElementById('selection-save-btn')?.addEventListener('click', savePendingHighlight);
  document.getElementById('selection-cancel-btn')?.addEventListener('click', hideSelectionPopup);

  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('mousedown', (event) => {
    const popup = document.getElementById('selection-popup');
    if (!popup.classList.contains('visible')) return;
    if (!popup.contains(event.target) && !event.target.closest('.page-text')) hideSelectionPopup();
  });
}

/* ─── 모달: 페이지 추가 (스캔) ──────────────────────────── */
function initScanModalEvents() {
  const closeScanModal = () => { closeModal('modal-scan'); resetScanSaveChoices(); };
  bindModalClose('modal-scan', closeScanModal);

  document.getElementById('scan-book-title')?.addEventListener('input', syncScanSaveChoices);
  document.getElementById('scan-image-input')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await ImagePreviewHelper.loadPreview(file);
    if (result.previewUrl) {
      document.getElementById('scan-preview-wrap').style.display = 'block';
      document.getElementById('scan-preview-img').src = result.previewUrl;
    }
  });
  document.getElementById('scan-save-btn')?.addEventListener('click', saveScannedPage);
}

/* ─── 모달: 책 편집 ─────────────────────────────────────── */
function initEditBookModalEvents() {
  document.getElementById('edit-book-save-btn')?.addEventListener('click', saveEditedBook);
  document.getElementById('edit-book-delete-btn')?.addEventListener('click', () => {
    const bookId = document.getElementById('edit-book-id')?.value;
    if (bookId) deleteBook(bookId);
  });
  bindModalClose('modal-edit-book', closeEditBookModal);
}

/* ─── 모달: 페이지 편집 ─────────────────────────────────── */
function initEditPageModalEvents() {
  document.getElementById('edit-page-save-btn')?.addEventListener('click', saveEditedPage);
  document.getElementById('edit-page-delete-btn')?.addEventListener('click', () => {
    const pageId = document.getElementById('edit-page-id')?.value;
    if (pageId) deletePage(pageId);
  });
  bindModalClose('modal-edit-page', closeEditPageModal);
}

/* ─── 모달: 하이라이트 편집 ─────────────────────────────── */
function initEditHighlightModalEvents() {
  document.querySelectorAll('.edit-highlight-color-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      selectEditHighlightColor(this.dataset.color);
    });
  });
  document.getElementById('edit-highlight-save-btn')?.addEventListener('click', saveEditedHighlight);
  bindModalClose('modal-edit-highlight', closeEditHighlightModal);
}

/* ─── 드래그 앤 드롭 (페이지 순서 변경) ─────────────────── */
function initDragEvents() {
  const pageList = document.getElementById('page-list');
  pageList?.addEventListener('dragstart', handlePageDragStart);
  pageList?.addEventListener('dragover', handlePageDragOver);
  pageList?.addEventListener('drop', handlePageDrop);
  pageList?.addEventListener('dragend', handlePageDragEnd);
}

/* ─── 이벤트 초기화 진입점 ──────────────────────────────── */
function initEventListeners() {
  initNavEvents();
  initSearchEvents();
  initHighlightFilterEvents();
  initSelectionPopupEvents();
  initScanModalEvents();
  initEditBookModalEvents();
  initEditPageModalEvents();
  initEditHighlightModalEvents();
  initDragEvents();
}

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  initEventListeners();
  showScreen('home');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
