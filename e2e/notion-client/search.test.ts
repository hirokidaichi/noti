import { assertEquals, assertExists } from '@std/assert';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { NotionClient } from '../../src/lib/notion/client.ts';
import { loadTestConfig } from '../test-config.ts';
import { Config } from '../../src/lib/config/config.ts';

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

      assertEquals(results.results.length, 0);
    });

    it('should return search results with correct structure', async () => {
      const results = await client.search({
        query: 'Test',
        page_size: 10,
      });

      assertExists(results.results);
      assertExists(results.has_more);
      assertExists(results.next_cursor);
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

      assertExists(results.results);
      results.results.forEach((result: any) => {
        assertEquals(result.object, 'page');
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

      assertExists(results.results);
      results.results.forEach((result: any) => {
        assertEquals(result.object, 'database');
      });
    });

    it('should handle pagination with page_size', async () => {
      const pageSize = 1;
      const firstPage = await client.search({
        query: '',
        page_size: pageSize,
      });

      assertExists(firstPage.results);
      assertEquals(firstPage.results.length <= pageSize, true);

      if (firstPage.has_more && firstPage.next_cursor) {
        const secondPage = await client.search({
          query: '',
          page_size: pageSize,
          start_cursor: firstPage.next_cursor,
        });
        assertExists(secondPage.results);
        assertEquals(secondPage.results.length <= pageSize, true);
      }
    });
  });
});
