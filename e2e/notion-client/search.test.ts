import { describe, it, expect, beforeAll } from 'vitest';
import { NotionClient } from '../../src/lib/notion/client.js';
import { loadTestConfig } from '../test-config.js';
import { Config } from '../../src/lib/config/config.js';

describe('Notion Client Search Operations', () => {
  let client: NotionClient;

  beforeAll(async () => {
    const testConfig = await loadTestConfig();
    const config = new Config({ apiToken: testConfig.NOTION_TOKEN });
    client = new NotionClient(config);
  });

  describe('Basic Search Operations', () => {
    it('should handle empty search results', async () => {
      const uniqueSearchTerm = 'NonExistentSearchTerm' + Date.now();
      const results = await client.search({
        query: uniqueSearchTerm,
        page_size: 10,
      });

      expect(results.results.length).toBe(0);
    });

    it('should return search results with correct structure', async () => {
      const results = await client.search({
        query: 'Test',
        page_size: 10,
      });

      expect(results.results).toBeDefined();
      expect(results.has_more).toBeDefined();
      expect(results.next_cursor).toBeDefined();
    });
  });

  describe('Search with Filters', () => {
    it('should filter search results by object type for pages', async () => {
      const results = await client.search({
        query: '',
        filter: {
          property: 'object',
          value: 'page',
        },
        page_size: 10,
      });

      expect(results.results).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.results.forEach((result: any) => {
        expect(result.object).toBe('page');
      });
    });

    it('should filter search results by object type for databases', async () => {
      const results = await client.search({
        query: '',
        filter: {
          property: 'object',
          value: 'database',
        },
        page_size: 10,
      });

      expect(results.results).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.results.forEach((result: any) => {
        expect(result.object).toBe('database');
      });
    });

    it('should handle pagination with page_size', async () => {
      const pageSize = 1;
      const firstPage = await client.search({
        query: '',
        page_size: pageSize,
      });

      expect(firstPage.results).toBeDefined();
      expect(firstPage.results.length <= pageSize).toBe(true);

      if (firstPage.has_more && firstPage.next_cursor) {
        const secondPage = await client.search({
          query: '',
          page_size: pageSize,
          start_cursor: firstPage.next_cursor,
        });
        expect(secondPage.results).toBeDefined();
        expect(secondPage.results.length <= pageSize).toBe(true);
      }
    });
  });
});
