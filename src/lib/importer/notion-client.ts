import { Client } from '@notionhq/client';
import { NotionClient } from './notion-types.js';
import type {
  CreatePageParameters,
  DatabaseObjectResponse,
  DataSourceObjectResponse,
  GetDatabaseResponse,
  GetDataSourceResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

type _NotionPropertyValue =
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
      files: Array<{
        name: string;
        type: 'external';
        external: { url: string };
      }>;
    };

// 型ガード
function isDatabaseObjectResponse(
  response: GetDatabaseResponse
): response is DatabaseObjectResponse {
  return response.object === 'database' && 'data_sources' in response;
}

function isDataSourceObjectResponse(
  response: GetDataSourceResponse
): response is DataSourceObjectResponse {
  return response.object === 'data_source' && 'properties' in response;
}

export class NotionApiClient extends Client implements NotionClient {
  constructor(apiKey: string) {
    super({ auth: apiKey });
  }

  // データベースIDからdata_source_idを取得
  private async getDataSourceId(databaseId: string): Promise<string> {
    const database = await this.databases.retrieve({
      database_id: databaseId,
    });
    if (isDatabaseObjectResponse(database) && database.data_sources?.[0]) {
      return database.data_sources[0].id;
    }
    return databaseId;
  }

  async getDatabaseSchema(databaseId: string): Promise<{
    properties: Record<string, { type: string; name: string }>;
  }> {
    const dataSourceId = await this.getDataSourceId(databaseId);
    const response = await this.dataSources.retrieve({
      data_source_id: dataSourceId,
    });

    if (!isDataSourceObjectResponse(response)) {
      throw new Error('データソースの取得に失敗しました');
    }

    return {
      properties: Object.entries(response.properties).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            type: value.type,
            name: key.toLowerCase(),
          };
          return acc;
        },
        {} as Record<string, { type: string; name: string }>
      ),
    };
  }

  async createPages(
    databaseId: string,
    pages: Record<string, unknown>[]
  ): Promise<void> {
    const dataSourceId = await this.getDataSourceId(databaseId);
    for (const page of pages) {
      await this.pages.create({
        parent: { type: 'data_source_id', data_source_id: dataSourceId },
        properties: this.convertProperties(page),
      });
    }
  }

  private convertProperties(
    data: Record<string, unknown>
  ): CreatePageParameters['properties'] {
    const result: NonNullable<CreatePageParameters['properties']> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        result[key] = { rich_text: [{ text: { content: value } }] };
      } else if (typeof value === 'number') {
        result[key] = { number: value };
      } else if (typeof value === 'boolean') {
        result[key] = { checkbox: value };
      } else if (value instanceof Date) {
        result[key] = { date: { start: value.toISOString() } };
      } else if (Array.isArray(value)) {
        result[key] = {
          multi_select: value.map((v) => ({ name: String(v) })),
        };
      } else if (value === null || value === undefined) {
        result[key] = { rich_text: [] };
      } else {
        result[key] = { rich_text: [{ text: { content: String(value) } }] };
      }
    }
    return result;
  }
}
