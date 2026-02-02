/**
 * Database List Command Integration Tests
 *
 * GitHub Issue #1: listDatabasesがdata_source_idを返す問題の修正テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { TEST_IDS } from '../fixtures/notion-api-v5.js';

describe('[Integration] Database List Command', () => {
  const NOTION_API_BASE = 'https://api.notion.com';

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('listDatabases returns correct database_id', () => {
    it('should extract database_id from parent when result is data_source', async () => {
      // data_sourceのモック: parentにdatabase_idを持つ
      const mockDataSourceWithParent = {
        object: 'data_source',
        id: TEST_IDS.DATA_SOURCE_ID,
        title: [
          {
            type: 'text',
            text: { content: 'Test Database', link: null },
            plain_text: 'Test Database',
          },
        ],
        parent: {
          type: 'database_id',
          database_id: TEST_IDS.DATABASE_ID, // これが正しいdatabase_id
        },
        url: `https://www.notion.so/${TEST_IDS.DATA_SOURCE_ID}`,
      };

      const mockSearchResponseWithDataSource = {
        object: 'list',
        results: [mockDataSourceWithParent],
        next_cursor: null,
        has_more: false,
        type: 'page_or_data_source',
        page_or_data_source: {},
      };

      nock(NOTION_API_BASE)
        .post('/v1/search', (body) => {
          return (
            body.filter?.property === 'object' &&
            body.filter?.value === 'data_source'
          );
        })
        .reply(200, mockSearchResponseWithDataSource);

      const config = new Config({ apiToken: 'test-token' });
      const client = new NotionClient(config);
      const result = await client.listDatabases();

      // list.tsのロジックをシミュレート
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = result.results.map((db: any) => {
        const databaseId =
          db.parent?.type === 'database_id' ? db.parent.database_id : db.id;
        return {
          id: databaseId,
          title: db.title?.[0]?.plain_text || 'Untitled',
          type: 'database',
          url: db.url,
        };
      });

      // 重要: data_source_idではなく、database_idが返される
      expect(items[0].id).toBe(TEST_IDS.DATABASE_ID);
      expect(items[0].id).not.toBe(TEST_IDS.DATA_SOURCE_ID);
      expect(items[0].title).toBe('Test Database');
    });

    it('should use db.id when parent is not database_id type', async () => {
      // parentがdatabase_idタイプでない場合は、idをそのまま使う
      const mockDatabaseResult = {
        object: 'database',
        id: TEST_IDS.DATABASE_ID,
        title: [
          {
            type: 'text',
            text: { content: 'Direct Database', link: null },
            plain_text: 'Direct Database',
          },
        ],
        parent: {
          type: 'page_id',
          page_id: 'some-page-id',
        },
        url: `https://www.notion.so/${TEST_IDS.DATABASE_ID}`,
      };

      const mockSearchResponseWithDatabase = {
        object: 'list',
        results: [mockDatabaseResult],
        next_cursor: null,
        has_more: false,
        type: 'page_or_data_source',
        page_or_data_source: {},
      };

      nock(NOTION_API_BASE)
        .post('/v1/search')
        .reply(200, mockSearchResponseWithDatabase);

      const config = new Config({ apiToken: 'test-token' });
      const client = new NotionClient(config);
      const result = await client.listDatabases();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = result.results.map((db: any) => {
        const databaseId =
          db.parent?.type === 'database_id' ? db.parent.database_id : db.id;
        return {
          id: databaseId,
          title: db.title?.[0]?.plain_text || 'Untitled',
        };
      });

      // parentがdatabase_idでない場合は、db.idを使う
      expect(items[0].id).toBe(TEST_IDS.DATABASE_ID);
      expect(items[0].title).toBe('Direct Database');
    });

    it('should handle mixed results with data_sources and databases', async () => {
      const mockDataSource = {
        object: 'data_source',
        id: 'ds-1111',
        title: [{ plain_text: 'Data Source Entry' }],
        parent: {
          type: 'database_id',
          database_id: 'db-from-parent',
        },
        url: 'https://notion.so/ds-1111',
      };

      const mockDatabase = {
        object: 'database',
        id: 'db-2222',
        title: [{ plain_text: 'Database Entry' }],
        parent: {
          type: 'page_id',
          page_id: 'page-1111',
        },
        url: 'https://notion.so/db-2222',
      };

      const mockMixedResponse = {
        object: 'list',
        results: [mockDataSource, mockDatabase],
        next_cursor: null,
        has_more: false,
        type: 'page_or_data_source',
        page_or_data_source: {},
      };

      nock(NOTION_API_BASE).post('/v1/search').reply(200, mockMixedResponse);

      const config = new Config({ apiToken: 'test-token' });
      const client = new NotionClient(config);
      const result = await client.listDatabases();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = result.results.map((db: any) => {
        const databaseId =
          db.parent?.type === 'database_id' ? db.parent.database_id : db.id;
        return { id: databaseId };
      });

      // data_sourceの場合: parentのdatabase_idを使用
      expect(items[0].id).toBe('db-from-parent');
      // databaseの場合: idを使用
      expect(items[1].id).toBe('db-2222');
    });
  });
});
