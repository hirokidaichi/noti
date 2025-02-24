import { assertEquals } from '@std/assert';
import { NotionImporter } from './notion-importer.ts';
import { NotionClient, NotionImportConfig } from './notion-types.ts';
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
    _pages: Record<string, unknown>[],
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

Deno.test({
  name: 'NotionImporter Tests',
  fn: async (t) => {
    await t.step('マッピング生成', async () => {
      const importer = new NotionImporter(
        MOCK_CSV_CONTENT,
        MOCK_API_KEY,
        MOCK_NOTION_CONFIG,
        MockNotionClient,
      );
      const mapping = await importer.generateMappingFromSchema();

      assertEquals(mapping, [
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

    await t.step('インポート処理', async () => {
      const importer = new NotionImporter(
        MOCK_CSV_CONTENT,
        MOCK_API_KEY,
        MOCK_NOTION_CONFIG,
        MockNotionClient,
      );
      const result = await importer.import();

      assertEquals(result.success, true);
      assertEquals(result.importedCount, 2);
      assertEquals(result.errors.length, 0);
    });
  },
});
