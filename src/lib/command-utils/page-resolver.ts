import { AliasManager } from '../config/aliases.js';
import { NotionPageId } from '../notion/page-uri.js';

export class PageResolver {
  private constructor(private aliasManager: AliasManager) {}

  static async create(): Promise<PageResolver> {
    const aliasManager = await AliasManager.load();
    return new PageResolver(aliasManager);
  }

  resolvePageId(input: string): Promise<string> {
    const resolvedInput = this.aliasManager.get(input) || input;
    const pageId = NotionPageId.fromString(resolvedInput);

    if (!pageId) {
      return Promise.reject(
        new Error(
          '無効なページIDまたはURLです。32文字の16進数である必要があります。'
        )
      );
    }

    return Promise.resolve(pageId.toShortId());
  }

  resolveDatabaseId(input: string): Promise<string> {
    const resolvedInput = this.aliasManager.get(input) || input;
    const databaseId = NotionPageId.fromString(resolvedInput);

    if (!databaseId) {
      return Promise.reject(new Error('無効なデータベースIDまたはURLです'));
    }

    return Promise.resolve(databaseId.toShortId());
  }
}
