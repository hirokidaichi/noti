import { assertEquals } from '@std/assert';
import { FuzzySearchEngine, SearchItem, SearchState } from './fuzzy-finder.ts';

const createTestItems = (): SearchItem[] => [
  { id: '1', title: 'テスト1', type: 'page' },
  { id: '2', title: 'テスト2', type: 'page' },
  { id: '3', title: 'サンプル3', type: 'page' },
];

Deno.test('FuzzySearchEngine', async (t) => {
  await t.step('空のクエリで全件返却', () => {
    const items = createTestItems();
    const engine = new FuzzySearchEngine(items);
    assertEquals(engine.search(''), items);
  });

  await t.step('部分一致で検索できる', () => {
    const items = createTestItems();
    const engine = new FuzzySearchEngine(items);
    const results = engine.search('テスト');
    assertEquals(results.length, 2);
    assertEquals(results[0].title, 'テスト1');
    assertEquals(results[1].title, 'テスト2');
  });

  await t.step('大文字小文字を区別せずに検索できる', () => {
    const items = createTestItems();
    const engine = new FuzzySearchEngine(items);
    const results = engine.search('テスト');
    assertEquals(results, engine.search('テスト'));
  });
});

Deno.test('SearchState', async (t) => {
  await t.step('初期状態の確認', () => {
    const items = createTestItems();
    const state = new SearchState('', 0, items, items);
    assertEquals(state.searchText, '');
    assertEquals(state.selectedIndex, 0);
    assertEquals(state.currentResults, items);
  });

  await t.step('検索状態の更新', () => {
    const items = createTestItems();
    const engine = new FuzzySearchEngine(items);
    const state = new SearchState('', 0, items, items);

    state.updateSearch(engine, 'テスト');
    assertEquals(state.searchText, 'テスト');
    assertEquals(state.currentResults.length, 2);
    assertEquals(state.selectedIndex, 0);
  });

  await t.step('選択の移動 - 上下', () => {
    const items = createTestItems();
    const state = new SearchState('', 0, items, items);

    state.moveSelection('down');
    assertEquals(state.selectedIndex, 1);

    state.moveSelection('down');
    assertEquals(state.selectedIndex, 2);

    state.moveSelection('up');
    assertEquals(state.selectedIndex, 1);
  });

  await t.step('選択の境界値チェック', () => {
    const items = createTestItems();
    const state = new SearchState('', 0, items, items);

    // 上限を超えない
    state.moveSelection('up');
    assertEquals(state.selectedIndex, 0);

    // 下限を超えない
    for (let i = 0; i < 5; i++) {
      state.moveSelection('down');
    }
    assertEquals(state.selectedIndex, items.length - 1);
  });

  await t.step('選択アイテムの取得', () => {
    const items = createTestItems();
    const state = new SearchState('', 1, items, items);
    const selected = state.getSelectedItem();
    assertEquals(selected, items[1]);
  });
});
