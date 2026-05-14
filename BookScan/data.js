const DUMMY_DATA = {
  tags: [
    { id: 't1', name: '자기계발' },
    { id: 't2', name: '철학' },
    { id: 't3', name: '소설' },
    { id: 't4', name: '경영' },
    { id: 't5', name: '과학' },
    { id: 't6', name: '역사' }
  ],
  folders: [
    { id: 'f1', name: '읽는 중' },
    { id: 'f2', name: '완독' },
    { id: 'f3', name: '나중에' }
  ],
  books: [
    {
      id: 'b1',
      title: '아주 작은 습관의 힘',
      author: '제임스 클리어',
      tagIds: ['t1'],
      folderId: 'f2',
      createdAt: '2025-01-10T09:00:00Z',
      pageCount: 2
    },
    {
      id: 'b2',
      title: '사피엔스',
      author: '유발 하라리',
      tagIds: ['t5', 't6'],
      folderId: 'f1',
      createdAt: '2025-02-01T09:00:00Z',
      pageCount: 2
    }
  ],
  pages: [
    {
      id: 'p1',
      bookId: 'b1',
      pageNumber: 1,
      originalImage: null,
      extractedText: '작은 습관이 모여 큰 변화를 만든다.',
      processedText: '작은 습관이 모여 큰 변화를 만든다. 매일 반복되는 행동이 정체성을 만든다.',
      createdAt: '2025-01-10T09:10:00Z'
    },
    {
      id: 'p2',
      bookId: 'b1',
      pageNumber: 2,
      originalImage: null,
      extractedText: '시스템은 목표보다 오래간다.',
      processedText: '시스템은 목표보다 오래간다. 꾸준함을 만드는 환경 설계가 중요하다.',
      createdAt: '2025-01-10T09:20:00Z'
    },
    {
      id: 'p3',
      bookId: 'b2',
      pageNumber: 1,
      originalImage: null,
      extractedText: '인류는 협력으로 번성했다.',
      processedText: '인류는 협력으로 번성했다. 공통의 이야기를 믿는 능력이 문명을 만들었다.',
      createdAt: '2025-02-01T09:10:00Z'
    },
    {
      id: 'p4',
      bookId: 'b2',
      pageNumber: 2,
      originalImage: null,
      extractedText: '농업혁명은 편리함만 주지 않았다.',
      processedText: '농업혁명은 편리함만 주지 않았다. 더 많은 노동과 더 복잡한 사회를 가져왔다.',
      createdAt: '2025-02-01T09:20:00Z'
    }
  ],
  highlights: [
    {
      id: 'h1',
      pageId: 'p1',
      textRange: { start: 0, end: 18 },
      selectedText: '작은 습관이 모여 큰 변화를 만든다.',
      color: 'yellow',
      createdAt: '2025-01-10T09:30:00Z'
    },
    {
      id: 'h2',
      pageId: 'p3',
      textRange: { start: 0, end: 13 },
      selectedText: '인류는 협력으로 번성했다.',
      color: 'blue',
      createdAt: '2025-02-01T09:30:00Z'
    }
  ],
  bookmarks: [
    { id: 'bm1', pageId: 'p2', createdAt: '2025-01-10T09:40:00Z' },
    { id: 'bm2', pageId: 'p4', createdAt: '2025-02-01T09:40:00Z' }
  ],
  recentSearches: ['습관', '협력'],
  recentPages: ['p2', 'p4']
};
