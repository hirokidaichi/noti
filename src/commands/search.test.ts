import { describe, it, expect } from 'vitest';

// テスト対象の型定義
interface NotionProperty {
  type: string;
  title?: {
    plain_text: string;
  }[];
}

interface NotionItem {
  id: string;
  object: string;
  parent: {
    type: string;
  };
  properties: Record<string, NotionProperty>;
  title?: { plain_text: string }[];
  url?: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  url?: string;
}

// テスト対象の関数（本体からエクスポートされるべき）
function formatNotionResults(results: NotionItem[]): SearchResult[] {
  return results.map((item: NotionItem) => {
    let title = 'Untitled';

    if (item.object === 'page') {
      if (item.parent.type === 'database_id') {
        for (const value of Object.values(item.properties)) {
          if (value.type === 'title') {
            title = value.title?.[0]?.plain_text || 'Untitled';
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      }
    } else if (item.object === 'database') {
      title = item.title?.[0]?.plain_text || 'Untitled Database';
    }

    // 改行をエスケープ
    title = title.replace(/\r?\n/g, '\\n');

    // タイトルを50文字で切り詰める
    if (title.length > 50) {
      title = title.slice(0, 50) + '...';
    }

    return {
      id: item.id,
      title,
      type: item.object,
      url: item.url,
    };
  });
}

describe('formatNotionResults', () => {
  describe('page items', () => {
    it('should format page from workspace', () => {
      const items: NotionItem[] = [
        {
          id: 'page-1',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {
            title: {
              type: 'title',
              title: [{ plain_text: 'My Page' }],
            },
          },
          url: 'https://notion.so/page-1',
        },
      ];

      const result = formatNotionResults(items);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'page-1',
        title: 'My Page',
        type: 'page',
        url: 'https://notion.so/page-1',
      });
    });

    it('should format page from database', () => {
      const items: NotionItem[] = [
        {
          id: 'page-2',
          object: 'page',
          parent: { type: 'database_id' },
          properties: {
            Name: {
              type: 'title',
              title: [{ plain_text: 'Database Entry' }],
            },
            Status: {
              type: 'select',
            },
          },
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe('Database Entry');
    });

    it('should handle untitled page', () => {
      const items: NotionItem[] = [
        {
          id: 'page-3',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {},
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe('Untitled');
    });
  });

  describe('database items', () => {
    it('should format database', () => {
      const items: NotionItem[] = [
        {
          id: 'db-1',
          object: 'database',
          parent: { type: 'page_id' },
          properties: {},
          title: [{ plain_text: 'My Database' }],
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0]).toEqual({
        id: 'db-1',
        title: 'My Database',
        type: 'database',
        url: undefined,
      });
    });

    it('should handle untitled database', () => {
      const items: NotionItem[] = [
        {
          id: 'db-2',
          object: 'database',
          parent: { type: 'page_id' },
          properties: {},
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe('Untitled Database');
    });
  });

  describe('title formatting', () => {
    it('should escape newlines', () => {
      const items: NotionItem[] = [
        {
          id: 'page-4',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {
            title: {
              type: 'title',
              title: [{ plain_text: 'Line 1\nLine 2' }],
            },
          },
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe('Line 1\\nLine 2');
    });

    it('should truncate long titles to 50 characters', () => {
      const longTitle = 'A'.repeat(60);
      const items: NotionItem[] = [
        {
          id: 'page-5',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {
            title: {
              type: 'title',
              title: [{ plain_text: longTitle }],
            },
          },
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe('A'.repeat(50) + '...');
      expect(result[0].title.length).toBe(53);
    });

    it('should not truncate titles exactly 50 characters', () => {
      const exactTitle = 'A'.repeat(50);
      const items: NotionItem[] = [
        {
          id: 'page-6',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {
            title: {
              type: 'title',
              title: [{ plain_text: exactTitle }],
            },
          },
        },
      ];

      const result = formatNotionResults(items);

      expect(result[0].title).toBe(exactTitle);
    });
  });

  describe('multiple items', () => {
    it('should format multiple items', () => {
      const items: NotionItem[] = [
        {
          id: 'page-1',
          object: 'page',
          parent: { type: 'workspace' },
          properties: {
            title: { type: 'title', title: [{ plain_text: 'Page 1' }] },
          },
        },
        {
          id: 'db-1',
          object: 'database',
          parent: { type: 'page_id' },
          properties: {},
          title: [{ plain_text: 'Database 1' }],
        },
      ];

      const result = formatNotionResults(items);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('page');
      expect(result[1].type).toBe('database');
    });
  });
});
