import { Client, LogLevel } from '@notionhq/client';
import { Config } from '../config/config.js';
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
interface _BlockObject {
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

interface _CommentListResponse {
  object: 'list';
  results: NotionComment[];
  next_cursor: string | null;
  has_more: boolean;
}

// Notionのプロパティ型定義
interface _PageProperties {
  [key: string]: {
    type: string;
    [key: string]: unknown;
  };
}

// Notionのプロパティ値の型定義
type _PropertyValueType =
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
        'Notion APIトークンが設定されていません。`noti configure` を実行してください。'
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

  async getBlock(blockId: string) {
    return await this.client.blocks.retrieve({
      block_id: blockId,
    });
  }

  async updateBlock(
    blockId: string,
    content: Record<string, unknown>
  ): Promise<unknown> {
    return await this.client.blocks.update({
      block_id: blockId,
      ...content,
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

    const parent =
      parentType === 'database_id'
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

  async updatePage(
    pageId: string,
    properties: {
      title: Array<{
        text: {
          content: string;
        };
      }>;
    }
  ) {
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

  async createComment(pageId: string, text: string, discussionId?: string) {
    return await this.client.comments.create({
      parent: {
        page_id: pageId,
      },
      rich_text: [
        {
          type: 'text',
          text: {
            content: text,
          },
        },
      ],
      ...(discussionId && { discussion_id: discussionId }),
    });
  }

  updateComment(_commentId: string, _text: string) {
    // Notion APIでは現在コメントの更新がサポートされていないため
    // 削除して再作成する方法を実装
    throw new Error('コメントの更新はNotionのAPI仕様上サポートされていません');
  }

  deleteComment(_commentId: string) {
    // Notion APIでは現在コメントの削除がサポートされていないため
    throw new Error('コメントの削除はNotionのAPI仕様上サポートされていません');
  }

  async listDatabases(
    params: {
      page_size?: number;
      start_cursor?: string;
    } = {}
  ) {
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
    properties: CreatePageParameters['properties']
  ) {
    return await this.client.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
  }

  async updateDatabasePage(
    pageId: string,
    properties: CreatePageParameters['properties']
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
    properties: DatabasePropertyConfig
  ): Promise<UpdateDatabaseResponse> {
    return await this.updateDatabase({
      database_id: databaseId,
      properties,
    });
  }

  // インポート機能用のメソッド
  async getDatabaseSchema(databaseId: string): Promise<{
    properties: Record<
      string,
      { type: string; name?: string; required?: boolean }
    >;
  }> {
    const database = await this.getDatabase(databaseId);
    return {
      properties: Object.entries(database.properties).reduce(
        (acc, [key, property]) => {
          acc[key] = {
            type: property.type,
            name: key.toLowerCase(),
            required: key === 'Name' || key === 'title', // タイトルプロパティは必須
          };
          return acc;
        },
        {} as Record<
          string,
          { type: string; name?: string; required?: boolean }
        >
      ),
    };
  }

  async createPages(
    databaseId: string,
    pages: Record<string, unknown>[]
  ): Promise<void> {
    // バッチで処理するためのヘルパー関数
    const createPageBatch = async (batch: Record<string, unknown>[]) => {
      const promises = batch.map((page) => {
        const properties = this.convertToNotionProperties(page);
        return this.createDatabasePage(databaseId, properties);
      });

      await Promise.all(promises);
    };

    // バッチサイズは10件ずつ（APIレート制限を考慮）
    const batchSize = 10;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      await createPageBatch(batch);

      // APIレート制限対策の待機時間
      if (i + batchSize < pages.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private convertToNotionProperties(
    data: Record<string, unknown>
  ): CreatePageParameters['properties'] {
    const properties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // nullまたはundefinedの場合はスキップ
      if (value === null || value === undefined) continue;

      if (key === 'Name' || key === 'title') {
        properties[key] = {
          title: [
            {
              text: {
                content: String(value),
              },
            },
          ],
        };
        continue;
      }

      // 値の型に基づいてプロパティを設定
      switch (typeof value) {
        case 'string':
          properties[key] = { rich_text: [{ text: { content: value } }] };
          break;

        case 'number':
          properties[key] = { number: value };
          break;

        case 'boolean':
          properties[key] = { checkbox: value };
          break;

        case 'object':
          if (Array.isArray(value)) {
            // 配列の場合はマルチセレクトと仮定
            properties[key] = {
              multi_select: value.map((item) => ({ name: String(item) })),
            };
          } else if (value instanceof Date) {
            properties[key] = {
              date: {
                start: value.toISOString().split('T')[0],
              },
            };
          }
          break;
      }
    }

    return properties as CreatePageParameters['properties'];
  }

  // データベースページの移動/コピー
  async moveOrCopyDatabasePage(params: {
    page_id: string;
    target_database_id: string;
    operation: 'move' | 'copy';
    with_content?: boolean;
  }) {
    // 1. 元のページの情報を取得
    const sourcePage = (await this.getPage(
      params.page_id
    )) as PageObjectResponse;
    const sourceBlocks = params.with_content
      ? await this.getBlocks(params.page_id)
      : null;

    // 2. ターゲットデータベースのスキーマを取得
    const targetDatabase = (await this.client.databases.retrieve({
      database_id: params.target_database_id,
    })) as DatabaseObjectResponse;

    // 3. プロパティの互換性を確保
    const compatibleProperties = this.getCompatibleProperties(
      sourcePage,
      targetDatabase
    ) as CreatePageParameters['properties'];

    // タイトルプロパティを元ページからコピー
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceProperties = (sourcePage as any).properties;
    // タイトルプロパティを探す（通常は'Name'または'title'タイプのプロパティ）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceTitleEntry = Object.entries(sourceProperties).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ([, value]: [string, any]) => value.type === 'title'
    );
    if (sourceTitleEntry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [_titleKey, titleValue] = sourceTitleEntry as [string, any];
      // ターゲットDBのタイトルプロパティ名を探す
      const targetTitleKey = Object.entries(targetDatabase.properties).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ([, schema]: [string, any]) => schema.type === 'title'
      )?.[0];
      if (targetTitleKey && titleValue.title) {
        compatibleProperties[targetTitleKey] = {
          title: titleValue.title,
        };
      }
    }

    // タイトルプロパティが必須なので、存在しない場合はデフォルト値を追加
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasTitle = Object.values(compatibleProperties).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prop: any) => prop?.title !== undefined
    );
    if (!hasTitle) {
      const targetTitleKey = Object.entries(targetDatabase.properties).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ([, schema]: [string, any]) => schema.type === 'title'
      )?.[0];
      if (targetTitleKey) {
        compatibleProperties[targetTitleKey] = {
          title: [{ type: 'text', text: { content: 'Untitled' } }],
        };
      }
    }

    // 4. 新しいページを作成
    const newPage = await this.createDatabasePage(
      params.target_database_id,
      compatibleProperties
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
    targetDatabase: DatabaseObjectResponse
  ): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compatibleProperties: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceProperties = (sourcePage as any).properties;

    for (const [key, sourceValue] of Object.entries(sourceProperties)) {
      const schema = targetDatabase.properties[key];
      if (!schema) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedSourceValue = sourceValue as any;
      switch (typedSourceValue.type) {
        case 'select':
          if (
            typedSourceValue.select &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (schema as any).select.options.some(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (option: any) => option.name === typedSourceValue.select.name
            )
          ) {
            compatibleProperties[key] = typedSourceValue;
          }
          break;

        case 'multi_select': {
          // マルチセレクトオプションの互換性チェック
          const validOptions = typedSourceValue.multi_select.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (option: any) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (schema as any).multi_select.options.some(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (schemaOption: any) => schemaOption.name === option.name
              )
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
