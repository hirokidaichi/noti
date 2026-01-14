import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PageResolver } from './page-resolver.js';
import { AliasManager } from '../config/aliases.js';

// モックのAliasManagerを作成
class MockAliasManager implements Pick<AliasManager, 'get'> {
  private mockAliases: Record<string, string> = {
    'my-page': 'f1234567890123456789012345678901',
    'my-db': 'b1234567890123456789012345678901',
  };

  get(name: string): string | undefined {
    return this.mockAliases[name];
  }

  set(name: string, value: string): Promise<void> {
    this.mockAliases[name] = value;
    return Promise.resolve();
  }

  remove(name: string): Promise<void> {
    delete this.mockAliases[name];
    return Promise.resolve();
  }

  getAll(): Promise<Record<string, string>> {
    return Promise.resolve({ ...this.mockAliases });
  }

  update(aliases: Record<string, string>): Promise<void> {
    this.mockAliases = { ...aliases };
    return Promise.resolve();
  }

  static load(): Promise<MockAliasManager> {
    return Promise.resolve(new MockAliasManager());
  }
}

describe('PageResolver', () => {
  let originalLoad: typeof AliasManager.load;

  beforeAll(() => {
    originalLoad = AliasManager.load;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AliasManager.load = () => Promise.resolve(new MockAliasManager() as any);
  });

  afterAll(() => {
    AliasManager.load = originalLoad;
  });

  it('resolvePageId - 有効なページID', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolvePageId(
      'f1234567890123456789012345678901'
    );
    expect(result).toBe('f1234567890123456789012345678901');
  });

  it('resolvePageId - 有効なエイリアス', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolvePageId('my-page');
    expect(result).toBe('f1234567890123456789012345678901');
  });

  it('resolvePageId - 無効なページID', async () => {
    const resolver = await PageResolver.create();
    await expect(resolver.resolvePageId('invalid-id')).rejects.toThrow(
      '無効なページIDまたはURLです。32文字の16進数である必要があります。'
    );
  });

  it('resolveDatabaseId - 有効なデータベースID', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolveDatabaseId(
      'b1234567890123456789012345678901'
    );
    expect(result).toBe('b1234567890123456789012345678901');
  });

  it('resolveDatabaseId - 有効なエイリアス', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolveDatabaseId('my-db');
    expect(result).toBe('b1234567890123456789012345678901');
  });

  it('resolveDatabaseId - 無効なデータベースID', async () => {
    const resolver = await PageResolver.create();
    await expect(resolver.resolveDatabaseId('invalid-id')).rejects.toThrow(
      '無効なデータベースIDまたはURLです'
    );
  });
});
