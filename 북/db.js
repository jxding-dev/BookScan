const DB = {
  init() {
    if (typeof DUMMY_DATA === 'undefined') return;

    Object.keys(DUMMY_DATA).forEach((key) => {
      try {
        if (!localStorage.getItem(`bs_${key}`)) {
          localStorage.setItem(`bs_${key}`, JSON.stringify(DUMMY_DATA[key]));
        }
      } catch {
        // Seed data is optional; continue even if localStorage is unavailable.
      }
    });
  },

  getAll(collection) {
    try {
      const raw = localStorage.getItem(`bs_${collection}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setAll(collection, data) {
    try {
      localStorage.setItem(`bs_${collection}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },

  getById(collection, id) {
    return this.getAll(collection).find((item) => item.id === id) || null;
  },

  add(collection, item) {
    const list = this.getAll(collection);
    if (!item.id) item.id = this._genId();
    list.push(item);
    return this.setAll(collection, list) ? item : null;
  },

  update(collection, id, changes) {
    const list = this.getAll(collection);
    const idx = list.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes };
    return this.setAll(collection, list) ? list[idx] : null;
  },

  remove(collection, id) {
    const list = this.getAll(collection).filter((item) => item.id !== id);
    return this.setAll(collection, list);
  },

  addRecentSearch(query) {
    let searches = this.getAll('recentSearches').filter((item) => item !== query);
    searches.unshift(query);
    if (searches.length > 10) searches = searches.slice(0, 10);
    return this.setAll('recentSearches', searches);
  },

  removeRecentSearch(query) {
    const searches = this.getAll('recentSearches').filter((item) => item !== query);
    return this.setAll('recentSearches', searches);
  },

  clearRecentSearches() {
    return this.setAll('recentSearches', []);
  },

  addRecentView(entry) {
    const list = this.getAll('recentViews');
    const next = list.filter((item) => !(item.bookId === entry.bookId && item.pageId === entry.pageId));
    next.unshift({
      bookId: entry.bookId,
      pageId: entry.pageId || null,
      viewedAt: entry.viewedAt || new Date().toISOString()
    });
    return this.setAll('recentViews', next.slice(0, 5));
  },

  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};
