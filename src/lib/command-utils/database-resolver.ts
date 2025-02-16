import { AliasManager } from '../config/aliases.ts';
import { NotionPageId } from '../notion/page-uri.ts';

export class DatabaseResolver {
  private constructor(private aliasManager: AliasManager) {}

  static async create(): Promise<DatabaseResolver> {
    const aliasManager = await AliasManager.load();
    return new DatabaseResolver(aliasManager);
  }

  resolveDatabaseId(input: string): Promise<string> {
    const resolvedInput = this.aliasManager.get(input) || input;
    const databaseId = NotionPageId.fromString(resolvedInput);
    
    if (!databaseId) {
      return Promise.reject(
        new Error('無効なデータベースIDまたはURLです'),
      );
    }
    
    return Promise.resolve(databaseId.toShortId());
  }
} 