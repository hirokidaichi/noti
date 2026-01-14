import { Client } from '@notionhq/client';

export type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'files';

export interface NotionProperty {
  type: NotionPropertyType;
  name: string;
  required?: boolean;
}

export interface NotionDatabaseSchema {
  properties: Record<string, NotionProperty>;
}

export interface NotionImportConfig {
  databaseId: string;
  schema: {
    properties: Record<string, {
      type: string;
      name?: string;
      required?: boolean;
    }>;
  };
  batchSize?: number;
  skipHeader?: boolean;
  delimiter?: string;
}

export interface NotionClient extends Client {
  getDatabaseSchema(databaseId: string): Promise<{
    properties: Record<
      string,
      { type: string; name?: string; required?: boolean }
    >;
  }>;
  createPages(
    databaseId: string,
    pages: Record<string, unknown>[],
  ): Promise<void>;
}
