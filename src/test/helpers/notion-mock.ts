/**
 * Notion API モックヘルパー
 * nockを使用してNotion APIをモック
 */

import nock from 'nock';
import {
  TEST_IDS,
  mockDatabaseResponse,
  mockDataSourceResponse,
  mockPageResponse,
  mockQueryResponse,
  mockSearchResponse,
  mockUserResponse,
  mockNotFoundError,
} from '../fixtures/notion-api-v5.js';

const NOTION_API_BASE = 'https://api.notion.com';

/**
 * Notion APIモックを初期化
 */
export function setupNotionMock(): void {
  nock.cleanAll();
}

/**
 * Notion APIモックをクリーンアップ
 */
export function cleanupNotionMock(): void {
  nock.cleanAll();
  nock.restore();
}

/**
 * すべてのリクエストが処理されたか確認
 */
export function verifyAllMocksUsed(): boolean {
  return nock.isDone();
}

/**
 * Database取得のモック
 */
export function mockGetDatabase(
  databaseId: string = TEST_IDS.DATABASE_ID,
  response = mockDatabaseResponse
): nock.Scope {
  return nock(NOTION_API_BASE)
    .get(`/v1/databases/${databaseId}`)
    .reply(200, response);
}

/**
 * DataSource取得のモック
 */
export function mockGetDataSource(
  dataSourceId: string = TEST_IDS.DATA_SOURCE_ID,
  response = mockDataSourceResponse
): nock.Scope {
  return nock(NOTION_API_BASE)
    .get(`/v1/data_sources/${dataSourceId}`)
    .reply(200, response);
}

/**
 * DataSourceクエリのモック
 */
export function mockQueryDataSource(
  dataSourceId: string = TEST_IDS.DATA_SOURCE_ID,
  response = mockQueryResponse
): nock.Scope {
  return nock(NOTION_API_BASE)
    .post(`/v1/data_sources/${dataSourceId}/query`)
    .reply(200, response);
}

/**
 * Page取得のモック
 */
export function mockGetPage(
  pageId: string = TEST_IDS.PAGE_ID,
  response = mockPageResponse
): nock.Scope {
  return nock(NOTION_API_BASE).get(`/v1/pages/${pageId}`).reply(200, response);
}

/**
 * Page作成のモック
 */
export function mockCreatePage(response = mockPageResponse): nock.Scope {
  return nock(NOTION_API_BASE).post('/v1/pages').reply(200, response);
}

/**
 * Page更新のモック
 */
export function mockUpdatePage(
  pageId: string = TEST_IDS.PAGE_ID,
  response = mockPageResponse
): nock.Scope {
  return nock(NOTION_API_BASE)
    .patch(`/v1/pages/${pageId}`)
    .reply(200, response);
}

/**
 * 検索のモック
 */
export function mockSearch(response = mockSearchResponse): nock.Scope {
  return nock(NOTION_API_BASE).post('/v1/search').reply(200, response);
}

/**
 * ユーザー取得のモック
 */
export function mockGetUser(
  userId: string = TEST_IDS.USER_ID,
  response = mockUserResponse
): nock.Scope {
  return nock(NOTION_API_BASE).get(`/v1/users/${userId}`).reply(200, response);
}

/**
 * 自分のユーザー情報取得のモック
 */
export function mockGetMe(response = mockUserResponse): nock.Scope {
  return nock(NOTION_API_BASE).get('/v1/users/me').reply(200, response);
}

/**
 * Database作成のモック
 */
export function mockCreateDatabase(
  response = mockDatabaseResponse
): nock.Scope {
  return nock(NOTION_API_BASE).post('/v1/databases').reply(200, response);
}

/**
 * 404エラーのモック
 */
export function mockNotFound(path: string): nock.Scope {
  return nock(NOTION_API_BASE).get(path).reply(404, mockNotFoundError);
}

/**
 * Database + DataSource を一緒にモック（よく使うパターン）
 */
export function mockDatabaseWithDataSource(
  databaseId: string = TEST_IDS.DATABASE_ID,
  dataSourceId: string = TEST_IDS.DATA_SOURCE_ID
): void {
  mockGetDatabase(databaseId);
  mockGetDataSource(dataSourceId);
}

/**
 * 完全なCRUD操作をモック
 */
export function mockFullCrudOperations(): void {
  mockGetDatabase();
  mockGetDataSource();
  mockQueryDataSource();
  mockCreatePage();
  mockGetPage();
  mockUpdatePage();
  mockSearch();
}

/**
 * APIレスポンスを記録するモード
 * 実際のAPIを呼び出して結果を記録
 */
export async function recordApiResponse(
  operation: () => Promise<unknown>
): Promise<{ response: unknown; duration: number }> {
  const startTime = Date.now();
  const response = await operation();
  const duration = Date.now() - startTime;
  return { response, duration };
}
