const SearchEngine = {
  _scoreResult(book, lowered, index, q) {
    let score = 10;

    if ((book.title || '').toLowerCase().includes(q)) score += 50;
    if ((book.author || '').toLowerCase().includes(q)) score += 20;

    if (index === 0) score += 20;
    else if (index < 100) score += 15;
    else if (index < 500) score += 8;

    const charBefore = index > 0 ? lowered[index - 1] : ' ';
    if (/[\s,."'!?()[\]{}]/.test(charBefore)) score += 15;

    let occurrences = 0;
    let pos = 0;
    while ((pos = lowered.indexOf(q, pos)) !== -1) { occurrences++; pos += q.length; }
    score += Math.min(occurrences - 1, 5) * 3;

    return score;
  },

  search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const pages = DB.getAll('pages');
    const bookMap = new Map(DB.getAll('books').map((b) => [b.id, b]));
    const results = [];

    pages.forEach((page) => {
      const text = page.processedText || page.extractedText || '';
      const lowered = text.toLowerCase();
      const index = lowered.indexOf(q);
      if (index === -1) return;

      const book = bookMap.get(page.bookId);
      if (!book) return;

      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + q.length + 80);
      const snippet = `${start > 0 ? '...' : ''}${text.slice(start, end)}${end < text.length ? '...' : ''}`;

      results.push({
        book,
        page,
        snippet,
        score: this._scoreResult(book, lowered, index, q),
      });
    });

    return results.sort((a, b) => b.score - a.score);
  },

  highlightSnippet(snippet, query) {
    if (!query || !snippet) return snippet;
    const escaped = snippet.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return escaped.replace(pattern, (match) => `<mark class="search-highlight">${match}</mark>`);
  }
};

const ImagePreviewHelper = {
  async loadPreview(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ success: true, previewUrl: reader.result });
      };
      reader.onerror = () => {
        resolve({ success: false, error: '파일 미리보기를 불러오지 못했습니다.' });
      };
      reader.readAsDataURL(file);
    });
  }
};
