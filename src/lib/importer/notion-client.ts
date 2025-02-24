import { Client } from '@notionhq/client';
import {
  NotionClient,
  NotionDatabaseSchema,
  NotionPropertyType,
} from './notion-types.ts';

type NotionPropertyValue =
  | { type: 'title'; title: Array<{ text: { content: string } }> }
  | { type: 'rich_text'; rich_text: Array<{ text: { content: string } }> }
  | { type: 'number'; number: number }
  | { type: 'select'; select: { name: string } }
  | { type: 'multi_select'; multi_select: Array<{ name: string }> }
  | { type: 'date'; date: { start: string; end?: string } }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'url'; url: string }
  | { type: 'email'; email: string }
  | { type: 'phone_number'; phone_number: string }
  | {
    type: 'files';
    files: Array<{ name: string; type: 'external'; external: { url: string } }>;
  };

export class NotionApiClient implements NotionClient {
  private client: Client;
  private readonly DEFAULT_BATCH_SIZE = 100;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
  }

  async getDatabaseSchema(databaseId: string): Promise<NotionDatabaseSchema> {
    const response = await this.client.databases.retrieve({
      database_id: databaseId,
    });

    const properties: Record<
      string,
      { type: NotionPropertyType; name: string }
    > = {};
    for (const [key, prop] of Object.entries(response.properties)) {
      properties[key] = {
        type: prop.type as NotionPropertyType,
        name: prop.name,
      };
    }

    return { properties };
  }

  async createPage(
    databaseId: string,
    properties: Record<string, unknown>,
  ): Promise<void> {
    await this.client.pages.create({
      parent: { database_id: databaseId },
      properties: this.convertProperties(properties),
    });
  }

  async createPages(
    databaseId: string,
    pages: Record<string, unknown>[],
  ): Promise<void> {
    // バッチ処理でページを作成
    const batchSize = this.DEFAULT_BATCH_SIZE;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      await Promise.all(
        batch.map((page) => this.createPage(databaseId, page)),
      );
    }
  }

  private convertProperties(
    properties: Record<string, unknown>,
  ): Record<string, NotionPropertyValue> {
    const result: Record<string, NotionPropertyValue> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) {
        continue;
      }

      result[key] = this.convertProperty(value);
    }

    return result;
  }

  private convertProperty(value: unknown): NotionPropertyValue {
    if (value instanceof Date) {
      return {
        type: 'date',
        date: {
          start: value.toISOString(),
        },
      };
    }

    if (Array.isArray(value)) {
      return {
        type: 'multi_select',
        multi_select: value.map((item) => ({ name: String(item) })),
      };
    }

    if (typeof value === 'boolean') {
      return {
        type: 'checkbox',
        checkbox: value,
      };
    }

    if (typeof value === 'number') {
      return {
        type: 'number',
        number: value,
      };
    }

    const stringValue = String(value);

    // URLの判定
    if (stringValue.match(/^https?:\/\/.+/)) {
      return {
        type: 'url',
        url: stringValue,
      };
    }

    // メールアドレスの判定
    if (stringValue.match(/^[^@]+@[^@]+\.[^@]+$/)) {
      return {
        type: 'email',
        email: stringValue,
      };
    }

    // 電話番号の判定
    if (stringValue.match(/^\+?[\d\s-]+$/)) {
      return {
        type: 'phone_number',
        phone_number: stringValue,
      };
    }

    // デフォルトはリッチテキストとして扱う
    return {
      type: 'rich_text',
      rich_text: [{ text: { content: stringValue } }],
    };
  }
}
