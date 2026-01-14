import { describe, it, expect } from 'vitest';
import { NotionImporter } from './notion-importer.js';
import { NotionClient, NotionImportConfig } from './notion-types.js';
import { Client } from '@notionhq/client';

// モックデータ
const MOCK_CSV_CONTENT = `name,age,email,tags
John Doe,30,john@example.com,"tag1,tag2"
Jane Smith,25,jane@example.com,"tag3,tag4"`;

const MOCK_NOTION_CONFIG: NotionImportConfig = {
  databaseId: 'test-database-id',
  schema: {
    properties: {
      Name: { type: 'title', name: 'name' },
      Age: { type: 'number', name: 'age', required: true },
      Email: { type: 'email', name: 'email' },
      Tags: { type: 'multi_select', name: 'tags' },
    },
  },
};

// テスト用のAPIキー
const MOCK_API_KEY = 'test-api-key';

// Notionクライアントのモック
class MockNotionClient extends Client implements NotionClient {
  constructor(apiKey: string) {
    super({ auth: apiKey });
  }

  createPages(
    _databaseId: string,
    _pages: Record<string, unknown>[]
  ): Promise<void> {
    return Promise.resolve();
  }

  getDatabaseSchema(_databaseId: string) {
    return Promise.resolve({
      properties: {
        name: { type: 'title' },
        age: { type: 'number' },
        email: { type: 'email' },
      },
    });
  }
}

describe('NotionImporter', () => {
  it('マッピング生成', async () => {
    const importer = new NotionImporter(
      MOCK_CSV_CONTENT,
      MOCK_API_KEY,
      MOCK_NOTION_CONFIG,
      MockNotionClient
    );
    const mapping = await importer.generateMappingFromSchema();

    expect(mapping).toEqual([
      {
        sourceField: 'name',
        targetField: 'Name',
        required: undefined,
        dataType: 'string',
      },
      {
        sourceField: 'age',
        targetField: 'Age',
        required: true,
        dataType: 'number',
      },
      {
        sourceField: 'email',
        targetField: 'Email',
        required: undefined,
        dataType: 'string',
      },
      {
        sourceField: 'tags',
        targetField: 'Tags',
        required: undefined,
        dataType: 'array',
      },
    ]);
  });

  it('インポート処理', async () => {
    const importer = new NotionImporter(
      MOCK_CSV_CONTENT,
      MOCK_API_KEY,
      MOCK_NOTION_CONFIG,
      MockNotionClient
    );
    const result = await importer.import();

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.errors.length).toBe(0);
  });
});
