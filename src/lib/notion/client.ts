import { Client, LogLevel } from '@notionhq/client';
import { Config } from '../config/config.ts';
import type {
  CreateDatabaseParameters,
  CreateDatabaseResponse,
  CreatePageParameters,
  DatabaseObjectResponse,
  PageObjectResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
  UpdateDatabaseParameters,
  UpdateDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

// Notionのブロック型定義
interface BlockObject {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

// Notionのコメント型定義
interface NotionComment {
  id: string;
  parent: {
    type: 'page_id' | 'block_id';
    page_id?: string;
    block_id?: string;
  };
  discussion_id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: 'user';
    id: string;
  };
  rich_text: Array<{
    type: 'text';
    text: {
      content: string;
      link: null | {
        url: string;
      };
    };
  }>;
}

interface CommentListResponse {
  object: 'list';
  results: NotionComment[];
  next_cursor: string | null;
  has_more: boolean;
}

// Notionのプロパティ型定義
interface PageProperties {
  [key: string]: {
    type: string;
    [key: string]: unknown;
  };
}

// Notionのプロパティ値の型定義
type PropertyValueType =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { number: number }
  | { select: { name: string } }
  | { multi_select: Array<{ name: string }> }
  | { date: { start: string; end?: string } }
  | { checkbox: boolean }
  | { url: string }
  | { email: string }
  | { phone_number: string }
  | { formula: { expression: string } }
  | { relation: Array<{ id: string }> }
  | { status: { name: string } };

// データベースプロパティの型定義
type DatabasePropertyConfigType = NonNullable<
  CreateDatabaseParameters['properties']
>;
type DatabasePropertyConfig = {
  [key: string]: DatabasePropertyConfigType[string];
};

export class NotionClient {
  private client: Client;

  constructor(config: Config) {
    if (!config.token) {
      throw new Error(
        'Notion APIトークンが設定されていません。`noti configure` を実行してください。',
      );
    }

    this.client = new Client({
      auth: config.token,
      logLevel: LogLevel.ERROR, // ログレベルをERRORに設定
    });
  }

  async validateToken() {
    try {
      await this.client.users.me({});
      return true;
    } catch (_error) {
      throw new Error('APIトークンが無効です。');
    }
  }

  async getMe() {
    return await this.client.users.me({});
  }

  async search(params: {
    query: string;
    page_size?: number;
    filter?: {
      property: 'object';
      value: 'page' | 'database';
    };
    start_cursor?: string;
  }) {
    return await this.client.search({
      query: params.query,
      page_size: params.page_size,
      filter: params.filter,
      start_cursor: params.start_cursor,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });
  }

  async getPage(pageId: string) {
    return await this.client.pages.retrieve({
      page_id: pageId,
    });
  }

  async getBlocks(pageId: string) {
    return await this.client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });
  }

  async appendBlocks(pageId: string, blocks: unknown[]) {
    return await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks as Parameters<
        typeof this.client.blocks.children.append
      >[0]['children'],
    });
  }

  async getDatabase(databaseId: string) {
    return await this.client.databases.retrieve({
      database_id: databaseId,
    });
  }

  async createPage(params: {
    parentId: string;
    title?: string;
    blocks?: unknown[];
  }) {
    const parentType = params.parentId.includes('-')
      ? 'database_id'
      : 'page_id';
    const properties = {
      ...(parentType === 'database_id'
        ? {
          Name: {
            type: 'title',
            title: params.title ? [{ text: { content: params.title } }] : [],
          },
        }
        : {
          title: {
            type: 'title',
            title: params.title ? [{ text: { content: params.title } }] : [],
          },
        }),
    } as Parameters<typeof this.client.pages.create>[0]['properties'];

    const parent = parentType === 'database_id'
      ? { database_id: params.parentId }
      : { page_id: params.parentId };

    return await this.client.pages.create({
      parent,
      properties,
      children: params.blocks as Parameters<
        typeof this.client.pages.create
      >[0]['children'],
    });
  }

  async removePage(pageId: string) {
    return await this.client.pages.update({
      page_id: pageId,
      archived: true, // Notionではアーカイブが削除に相当
    });
  }

  async deleteBlock(blockId: string) {
    return await this.client.blocks.delete({
      block_id: blockId,
    });
  }

  async updatePage(pageId: string, properties: {
    title: Array<{
      text: {
        content: string;
      };
    }>;
  }) {
    return await this.client.pages.update({
      page_id: pageId,
      properties: {
        title: {
          type: 'title',
          title: properties.title,
        },
      },
    });
  }

  async listUsers() {
    return await this.client.users.list({});
  }

  async getUser(userId: string) {
    return await this.client.users.retrieve({
      user_id: userId,
    });
  }

  async getComments(pageId: string) {
    return await this.client.comments.list({
      block_id: pageId,
    });
  }

  async createComment(pageId: string, text: string) {
    return await this.client.comments.create({
      parent: {
        page_id: pageId,
      },
      rich_text: [{
        type: 'text',
        text: {
          content: text,
        },
      }],
    });
  }

  async listDatabases(params: {
    page_size?: number;
    start_cursor?: string;
  } = {}) {
    return await this.client.search({
      filter: {
        property: 'object',
        value: 'database',
      },
      page_size: params.page_size,
      start_cursor: params.start_cursor,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    });
  }

  async createDatabasePage(
    databaseId: string,
    properties: CreatePageParameters['properties'],
  ) {
    return await this.client.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
  }

  async updateDatabasePage(
    pageId: string,
    properties: CreatePageParameters['properties'],
  ) {
    return await this.client.pages.update({
      page_id: pageId,
      properties,
    });
  }

  // データベースの作成
  async createDatabase(params: {
    parent: CreateDatabaseParameters['parent'];
    title: CreateDatabaseParameters['title'];
    properties: DatabasePropertyConfig;
  }): Promise<CreateDatabaseResponse> {
    return await this.client.databases.create(params);
  }

  // データベースの更新
  async updateDatabase(params: {
    database_id: string;
    title?: UpdateDatabaseParameters['title'];
    properties?: DatabasePropertyConfig;
  }): Promise<UpdateDatabaseResponse> {
    return await this.client.databases.update({
      database_id: params.database_id,
      ...(params.title && { title: params.title }),
      ...(params.properties && { properties: params.properties }),
    });
  }

  // データベースのプロパティ追加/更新
  async updateDatabaseProperties(
    databaseId: string,
    properties: DatabasePropertyConfig,
  ): Promise<UpdateDatabaseResponse> {
    return await this.updateDatabase({
      database_id: databaseId,
      properties,
    });
  }

  // データベースページの移動/コピー
  async moveOrCopyDatabasePage(params: {
    page_id: string;
    target_database_id: string;
    operation: 'move' | 'copy';
    with_content?: boolean;
  }) {
    // 1. 元のページの情報を取得
    const sourcePage = await this.getPage(params.page_id) as PageObjectResponse;
    const sourceBlocks = params.with_content
      ? await this.getBlocks(params.page_id)
      : null;

    // 2. ターゲットデータベースのスキーマを取得
    const targetDatabase = await this.client.databases.retrieve({
      database_id: params.target_database_id,
    }) as DatabaseObjectResponse;

    // 3. プロパティの互換性を確保
    const compatibleProperties = this.getCompatibleProperties(
      sourcePage,
      targetDatabase,
    ) as CreatePageParameters['properties'];

    // タイトルプロパティが必須なので、存在しない場合は追加
    const titleProperty = compatibleProperties.Name as {
      title?: Array<{ type: 'text'; text: { content: string } }>;
    };
    if (!titleProperty?.title) {
      compatibleProperties.Name = {
        type: 'title',
        title: [{ type: 'text', text: { content: 'Untitled' } }],
      };
    }

    // 4. 新しいページを作成
    const newPage = await this.createDatabasePage(
      params.target_database_id,
      compatibleProperties,
    );

    // 5. コンテンツをコピー（必要な場合）
    if (sourceBlocks && params.with_content) {
      await this.appendBlocks(newPage.id, sourceBlocks.results);
    }

    // 6. 元のページを削除（移動の場合）
    if (params.operation === 'move') {
      await this.client.pages.update({
        page_id: params.page_id,
        archived: true,
      });
    }

    return newPage;
  }

  // リレーションの設定
  async setPageRelation(params: {
    page_id: string;
    property_name: string;
    relation_ids: string[];
  }) {
    return await this.client.pages.update({
      page_id: params.page_id,
      properties: {
        [params.property_name]: {
          type: 'relation',
          relation: params.relation_ids.map((id) => ({ id })),
        },
      },
    });
  }

  // データベースのクエリ（拡張版）
  async queryDatabase(params: {
    database_id: string;
    filter?: QueryDatabaseParameters['filter'];
    sorts?: QueryDatabaseParameters['sorts'];
    page_size?: number;
    start_cursor?: string;
  }): Promise<QueryDatabaseResponse> {
    return await this.client.databases.query({
      database_id: params.database_id,
      filter: params.filter,
      sorts: params.sorts,
      page_size: params.page_size,
      start_cursor: params.start_cursor,
    });
  }

  private getCompatibleProperties(
    sourcePage: PageObjectResponse,
    targetDatabase: DatabaseObjectResponse,
  ): Record<string, unknown> {
    // deno-lint-ignore no-explicit-any
    const compatibleProperties: Record<string, any> = {};
    // deno-lint-ignore no-explicit-any
    const sourceProperties = (sourcePage as any).properties;

    for (const [key, sourceValue] of Object.entries(sourceProperties)) {
      const schema = targetDatabase.properties[key];
      if (!schema) continue;

      // deno-lint-ignore no-explicit-any
      const typedSourceValue = sourceValue as any;
      switch (typedSourceValue.type) {
        case 'select':
          if (
            typedSourceValue.select &&
            // deno-lint-ignore no-explicit-any
            (schema as any).select.options.some((option: any) =>
              option.name === typedSourceValue.select.name
            )
          ) {
            compatibleProperties[key] = typedSourceValue;
          }
          break;

        case 'multi_select': {
          // マルチセレクトオプションの互換性チェック
          const validOptions = typedSourceValue.multi_select.filter(
            // deno-lint-ignore no-explicit-any
            (option: any) =>
              // deno-lint-ignore no-explicit-any
              (schema as any).multi_select.options.some(
                // deno-lint-ignore no-explicit-any
                (schemaOption: any) => schemaOption.name === option.name,
              ),
          );
          if (validOptions.length > 0) {
            compatibleProperties[key] = {
              type: 'multi_select',
              multi_select: validOptions,
            };
          }
          break;
        }

        case 'relation':
          if (
            // deno-lint-ignore no-explicit-any
            (schema as any).relation.database_id ===
              typedSourceValue.relation[0]?.database_id
          ) {
            compatibleProperties[key] = typedSourceValue;
          }
          break;
      }
    }

    return compatibleProperties;
  }
}
