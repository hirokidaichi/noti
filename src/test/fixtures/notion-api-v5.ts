/**
 * Notion API v5 (2025-09-03) 対応のモックデータ
 * DataSource中心のAPI構造に対応
 */

import type {
  DatabaseObjectResponse,
  DataSourceObjectResponse,
  PageObjectResponse,
  QueryDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

// テスト用の固定ID
export const TEST_IDS = {
  DATABASE_ID: 'test-database-id-12345678',
  DATA_SOURCE_ID: 'test-data-source-id-12345678',
  PAGE_ID: 'test-page-id-12345678',
  USER_ID: 'test-user-id-12345678',
  WORKSPACE_ID: 'test-workspace-id-12345678',
} as const;

// DatabaseObjectResponse (新API: propertiesなし、data_sourcesあり)
export const mockDatabaseResponse: DatabaseObjectResponse = {
  object: 'database',
  id: TEST_IDS.DATABASE_ID,
  title: [
    {
      type: 'text',
      text: { content: 'Test Database', link: null },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
      plain_text: 'Test Database',
      href: null,
    },
  ],
  description: [],
  parent: {
    type: 'page_id',
    page_id: TEST_IDS.PAGE_ID,
  },
  is_inline: false,
  in_trash: false,
  is_locked: false,
  created_time: '2025-01-01T00:00:00.000Z',
  last_edited_time: '2025-01-01T00:00:00.000Z',
  data_sources: [
    {
      id: TEST_IDS.DATA_SOURCE_ID,
      name: 'Default',
    },
  ],
  icon: null,
  cover: null,
  url: `https://www.notion.so/${TEST_IDS.DATABASE_ID}`,
  public_url: null,
};

// DataSourceObjectResponse (新API: propertiesあり)
export const mockDataSourceResponse: DataSourceObjectResponse = {
  object: 'data_source',
  id: TEST_IDS.DATA_SOURCE_ID,
  title: [
    {
      type: 'text',
      text: { content: 'Default', link: null },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
      plain_text: 'Default',
      href: null,
    },
  ],
  description: [],
  parent: {
    type: 'database_id',
    database_id: TEST_IDS.DATABASE_ID,
  },
  database_parent: {
    type: 'page_id',
    page_id: TEST_IDS.PAGE_ID,
  },
  is_inline: false,
  archived: false,
  in_trash: false,
  created_time: '2025-01-01T00:00:00.000Z',
  last_edited_time: '2025-01-01T00:00:00.000Z',
  created_by: {
    object: 'user',
    id: TEST_IDS.USER_ID,
  },
  last_edited_by: {
    object: 'user',
    id: TEST_IDS.USER_ID,
  },
  properties: {
    Name: {
      id: 'title',
      name: 'Name',
      type: 'title',
      description: null,
      title: {},
    },
    Status: {
      id: 'status',
      name: 'Status',
      type: 'select',
      description: null,
      select: {
        options: [
          { id: 'opt1', name: 'Todo', color: 'gray', description: null },
          { id: 'opt2', name: 'In Progress', color: 'blue', description: null },
          { id: 'opt3', name: 'Done', color: 'green', description: null },
        ],
      },
    },
    Tags: {
      id: 'tags',
      name: 'Tags',
      type: 'multi_select',
      description: null,
      multi_select: {
        options: [
          { id: 'tag1', name: 'Feature', color: 'purple', description: null },
          { id: 'tag2', name: 'Bug', color: 'red', description: null },
        ],
      },
    },
    Priority: {
      id: 'priority',
      name: 'Priority',
      type: 'number',
      description: null,
      number: { format: 'number' },
    },
    Done: {
      id: 'done',
      name: 'Done',
      type: 'checkbox',
      description: null,
      checkbox: {},
    },
  },
  icon: null,
  cover: null,
  url: `https://www.notion.so/${TEST_IDS.DATA_SOURCE_ID}`,
  public_url: null,
};

// PageObjectResponse (データベースページ)
export const mockPageResponse: PageObjectResponse = {
  object: 'page',
  id: TEST_IDS.PAGE_ID,
  created_time: '2025-01-01T00:00:00.000Z',
  last_edited_time: '2025-01-01T00:00:00.000Z',
  archived: false,
  in_trash: false,
  is_locked: false,
  url: `https://www.notion.so/${TEST_IDS.PAGE_ID}`,
  public_url: null,
  parent: {
    type: 'data_source_id',
    data_source_id: TEST_IDS.DATA_SOURCE_ID,
    database_id: TEST_IDS.DATABASE_ID,
  },
  properties: {
    Name: {
      id: 'title',
      type: 'title',
      title: [
        {
          type: 'text',
          text: { content: 'Test Page', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          plain_text: 'Test Page',
          href: null,
        },
      ],
    },
    Status: {
      id: 'status',
      type: 'select',
      select: { id: 'opt1', name: 'Todo', color: 'gray' },
    },
  },
  icon: null,
  cover: null,
  created_by: {
    object: 'user',
    id: TEST_IDS.USER_ID,
  },
  last_edited_by: {
    object: 'user',
    id: TEST_IDS.USER_ID,
  },
};

// QueryDataSourceResponse
export const mockQueryResponse: QueryDataSourceResponse = {
  object: 'list',
  results: [mockPageResponse],
  next_cursor: null,
  has_more: false,
  type: 'page_or_data_source',
  page_or_data_source: {},
};

// 検索レスポンス
export const mockSearchResponse = {
  object: 'list',
  results: [mockPageResponse, mockDataSourceResponse],
  next_cursor: null,
  has_more: false,
  type: 'page_or_data_source',
  page_or_data_source: {},
  request_id: 'test-request-id',
};

// ユーザーレスポンス
export const mockUserResponse = {
  object: 'user',
  id: TEST_IDS.USER_ID,
  type: 'person',
  name: 'Test User',
  avatar_url: null,
  person: {
    email: 'test@example.com',
  },
};

// エラーレスポンス
export const mockNotFoundError = {
  object: 'error',
  status: 404,
  code: 'object_not_found',
  message: 'Could not find object with ID: not-found-id',
};

export const mockUnauthorizedError = {
  object: 'error',
  status: 401,
  code: 'unauthorized',
  message: 'API token is invalid.',
};
