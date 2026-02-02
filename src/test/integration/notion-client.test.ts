/**
 * NotionClient Integration Tests
 *
 * nockを使用してNotion APIをモックし、
 * 実際のHTTPリクエストパターンをテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import {
  TEST_IDS,
  mockDatabaseResponse,
  mockDataSourceResponse,
  mockPageResponse,
  mockQueryResponse,
  mockSearchResponse,
} from '../fixtures/notion-api-v5.js';

describe('[Integration] NotionClient', () => {
  let client: NotionClient;
  const NOTION_API_BASE = 'https://api.notion.com';

  beforeEach(() => {
    // HTTPリクエストをブロック
    nock.disableNetConnect();

    // テスト用のクライアントを作成
    const config = new Config({ apiToken: 'test-token' });
    client = new NotionClient(config);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('getDatabase', () => {
    it('should retrieve database by ID', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      const result = await client.getDatabase(TEST_IDS.DATABASE_ID);

      expect(result.object).toBe('database');
      expect(result.id).toBe(TEST_IDS.DATABASE_ID);
    });

    it('should include data_sources in response', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      const result = await client.getDatabase(TEST_IDS.DATABASE_ID);

      expect(result).toHaveProperty('data_sources');
      if ('data_sources' in result) {
        expect(result.data_sources).toHaveLength(1);
        expect(result.data_sources[0].id).toBe(TEST_IDS.DATA_SOURCE_ID);
      }
    });
  });

  describe('getDataSourceId', () => {
    it('should extract data_source_id from database', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      const result = await client.getDataSourceId(TEST_IDS.DATABASE_ID);

      expect(result).toBe(TEST_IDS.DATA_SOURCE_ID);
    });

    it('should fallback to database_id if no data_sources', async () => {
      const dbWithoutDataSources = {
        ...mockDatabaseResponse,
        data_sources: [],
      };

      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, dbWithoutDataSources);

      const result = await client.getDataSourceId(TEST_IDS.DATABASE_ID);

      expect(result).toBe(TEST_IDS.DATABASE_ID);
    });
  });

  describe('getDataSourceWithProperties', () => {
    it('should retrieve data source with properties', async () => {
      // Database取得 → DataSource ID抽出 → DataSource取得
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      nock(NOTION_API_BASE)
        .get(`/v1/data_sources/${TEST_IDS.DATA_SOURCE_ID}`)
        .reply(200, mockDataSourceResponse);

      const result = await client.getDataSourceWithProperties(
        TEST_IDS.DATABASE_ID
      );

      expect(result.object).toBe('data_source');
      expect(result.properties).toBeDefined();
      expect(result.properties.Name).toBeDefined();
      expect(result.properties.Status).toBeDefined();
    });
  });

  describe('getDatabaseSchema', () => {
    it('should return schema from data source', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      nock(NOTION_API_BASE)
        .get(`/v1/data_sources/${TEST_IDS.DATA_SOURCE_ID}`)
        .reply(200, mockDataSourceResponse);

      const result = await client.getDatabaseSchema(TEST_IDS.DATABASE_ID);

      expect(result.properties).toBeDefined();
      expect(result.properties.Name.type).toBe('title');
      expect(result.properties.Status.type).toBe('select');
      expect(result.properties.Priority.type).toBe('number');
    });
  });

  describe('queryDatabase', () => {
    it('should query data source', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      nock(NOTION_API_BASE)
        .post(`/v1/data_sources/${TEST_IDS.DATA_SOURCE_ID}/query`)
        .reply(200, mockQueryResponse);

      const result = await client.queryDatabase({
        database_id: TEST_IDS.DATABASE_ID,
      });

      expect(result.object).toBe('list');
      expect(result.results).toHaveLength(1);
    });

    it('should pass filter to data source query', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      nock(NOTION_API_BASE)
        .post(`/v1/data_sources/${TEST_IDS.DATA_SOURCE_ID}/query`, (body) => {
          return body.filter !== undefined;
        })
        .reply(200, mockQueryResponse);

      const result = await client.queryDatabase({
        database_id: TEST_IDS.DATABASE_ID,
        filter: {
          property: 'Status',
          select: { equals: 'Todo' },
        },
      });

      expect(result.results).toBeDefined();
    });
  });

  describe('createDatabasePage', () => {
    it('should create page with data_source_id parent', async () => {
      nock(NOTION_API_BASE)
        .get(`/v1/databases/${TEST_IDS.DATABASE_ID}`)
        .reply(200, mockDatabaseResponse);

      nock(NOTION_API_BASE)
        .post('/v1/pages', (body) => {
          // 新API: parent.type === 'data_source_id' を確認
          return (
            body.parent?.type === 'data_source_id' &&
            body.parent?.data_source_id === TEST_IDS.DATA_SOURCE_ID
          );
        })
        .reply(200, mockPageResponse);

      const result = await client.createDatabasePage(TEST_IDS.DATABASE_ID, {
        Name: { title: [{ text: { content: 'New Page' } }] },
      });

      expect(result.id).toBe(TEST_IDS.PAGE_ID);
    });
  });

  describe('search', () => {
    it('should search with data_source filter', async () => {
      nock(NOTION_API_BASE)
        .post('/v1/search', (body) => {
          return (
            body.filter?.property === 'object' &&
            body.filter?.value === 'data_source'
          );
        })
        .reply(200, mockSearchResponse);

      const result = await client.search({
        query: 'test',
        filter: { property: 'object', value: 'data_source' },
      });

      expect(result.results).toBeDefined();
    });
  });

  describe('listDatabases', () => {
    it('should list data sources', async () => {
      nock(NOTION_API_BASE)
        .post('/v1/search', (body) => {
          return (
            body.filter?.property === 'object' &&
            body.filter?.value === 'data_source'
          );
        })
        .reply(200, mockSearchResponse);

      const result = await client.listDatabases();

      expect(result.results).toBeDefined();
    });
  });
});
