import { Client } from '@notionhq/client';
import { NotionClient } from './notion-types.ts';
import { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';

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

export class NotionApiClient extends Client implements NotionClient {
  constructor(apiKey: string) {
    super({ auth: apiKey });
  }

  async getDatabaseSchema(databaseId: string): Promise<{
    properties: Record<string, { type: string; name: string }>;
  }> {
    const response = await this.databases.retrieve({
      database_id: databaseId,
    });
    return {
      properties: Object.entries(response.properties).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            type: value.type,
            name: key.toLowerCase(),
          };
          return acc;
        },
        {} as Record<string, { type: string; name: string }>,
      ),
    };
  }

  async createPages(
    databaseId: string,
    pages: Record<string, unknown>[],
  ): Promise<void> {
    for (const page of pages) {
      await this.pages.create({
        parent: { database_id: databaseId },
        properties: this.convertProperties(page),
      });
    }
  }

  private convertProperties(
    data: Record<string, unknown>,
  ): CreatePageParameters['properties'] {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = { rich_text: [{ text: { content: value } }] };
      } else if (typeof value === 'number') {
        acc[key] = { number: value };
      } else if (typeof value === 'boolean') {
        acc[key] = { checkbox: value };
      } else if (value instanceof Date) {
        acc[key] = { date: { start: value.toISOString() } };
      } else if (Array.isArray(value)) {
        acc[key] = {
          multi_select: value.map((v) => ({ name: String(v) })),
        };
      } else if (value === null || value === undefined) {
        acc[key] = { rich_text: [] };
      } else {
        acc[key] = { rich_text: [{ text: { content: String(value) } }] };
      }
      return acc;
    }, {} as CreatePageParameters['properties']);
  }
}
