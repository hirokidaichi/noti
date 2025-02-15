import { assertEquals, assertRejects } from '@std/assert';
import { PageResolver } from './page-resolver.ts';
import { AliasManager } from '../config/aliases.ts';

// モックのAliasManagerを作成
class MockAliasManager implements Pick<AliasManager, 'get'> {
  private mockAliases: Record<string, string> = {
    'my-page': 'f1234567890123456789012345678901',
    'my-db': 'b1234567890123456789012345678901',
  };

  get(name: string): string | undefined {
    return this.mockAliases[name];
  }
}

// テストスイート
Deno.test('PageResolver', async (t) => {
  // テスト用のPageResolverを作成
  const originalLoad = AliasManager.load;
  // deno-lint-ignore no-explicit-any
  AliasManager.load = () => Promise.resolve(new MockAliasManager() as any);

  await t.step('resolvePageId - 有効なページID', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolvePageId(
      'f1234567890123456789012345678901',
    );
    assertEquals(result, 'f1234567890123456789012345678901');
  });

  await t.step('resolvePageId - 有効なエイリアス', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolvePageId('my-page');
    assertEquals(result, 'f1234567890123456789012345678901');
  });

  await t.step('resolvePageId - 無効なページID', async () => {
    const resolver = await PageResolver.create();
    await assertRejects(
      () => resolver.resolvePageId('invalid-id'),
      Error,
      '無効なページIDまたはURLです',
    );
  });

  await t.step('resolveDatabaseId - 有効なデータベースID', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolveDatabaseId(
      'b1234567890123456789012345678901',
    );
    assertEquals(result, 'b1234567890123456789012345678901');
  });

  await t.step('resolveDatabaseId - 有効なエイリアス', async () => {
    const resolver = await PageResolver.create();
    const result = await resolver.resolveDatabaseId('my-db');
    assertEquals(result, 'b1234567890123456789012345678901');
  });

  await t.step('resolveDatabaseId - 無効なデータベースID', async () => {
    const resolver = await PageResolver.create();
    await assertRejects(
      () => resolver.resolveDatabaseId('invalid-id'),
      Error,
      '無効なデータベースIDまたはURLです',
    );
  });

  // テスト後のクリーンアップ
  AliasManager.load = originalLoad;
});
