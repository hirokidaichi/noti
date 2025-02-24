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
  schema: NotionDatabaseSchema;
  batchSize?: number;
}

export interface NotionClient {
  getDatabaseSchema(databaseId: string): Promise<NotionDatabaseSchema>;
  createPage(databaseId: string, properties: Record<string, unknown>): Promise<void>;
  createPages(databaseId: string, pages: Record<string, unknown>[]): Promise<void>;
} 