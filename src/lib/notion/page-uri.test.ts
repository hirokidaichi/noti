import { assert, assertEquals, assertNotEquals } from '@std/assert';
import { NotionPageId } from './page-uri.ts';

Deno.test('NotionPageId', async (t) => {
  // テストケースで使用する定数
  const VALID_SHORT_ID = '19875fb73edc813a9a5bc09f2616cd60';
  const VALID_LONG_ID = '19875fb7-3edc-813a-9a5b-c09f2616cd60';
  const VALID_NOTION_URL =
    'https://www.notion.so/OpenAI-AI-o3-GPT-5-GPT-5-o3-ChatGPT-API-Plus-Pro--19875fb73edc813a9a5bc09f2616cd60';
  const VALID_NOTION_URL_WITH_LONG_ID =
    'https://www.notion.so/OpenAI-AI-o3-GPT-5-GPT-5-o3-ChatGPT-API-Plus-Pro--19875fb7-3edc-813a-9a5b-c09f2616cd60';
  const VALID_NOTION_URL_WITH_QUERY =
    'https://www.notion.so/19875fb73edc813a9a5bc09f2616cd60?v=18a75fb73edc80aeab63000c8710e500';
  const VALID_NOTION_URL_WITH_QUERY_AND_TITLE =
    'https://www.notion.so/My-Page-19875fb73edc813a9a5bc09f2616cd60?v=18a75fb73edc80aeab63000c8710e500';

  await t.step('fromString - 有効なShortIDからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(VALID_SHORT_ID);
    assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
    assertEquals(pageId?.toLongId(), VALID_LONG_ID);
  });

  await t.step('fromString - 有効なLongIDからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(VALID_LONG_ID);
    assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
    assertEquals(pageId?.toLongId(), VALID_LONG_ID);
  });

  await t.step(
    'fromString - 有効なURLからインスタンスを生成（ShortID）',
    () => {
      const pageId = NotionPageId.fromString(VALID_NOTION_URL);
      assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
      assertEquals(pageId?.toLongId(), VALID_LONG_ID);
    },
  );

  await t.step('fromString - 有効なURLからインスタンスを生成（LongID）', () => {
    const pageId = NotionPageId.fromString(VALID_NOTION_URL_WITH_LONG_ID);
    assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
    assertEquals(pageId?.toLongId(), VALID_LONG_ID);
  });

  await t.step(
    'fromString - クエリパラメータ付きURLからインスタンスを生成',
    () => {
      const pageId = NotionPageId.fromString(VALID_NOTION_URL_WITH_QUERY);
      assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
      assertEquals(pageId?.toLongId(), VALID_LONG_ID);
    },
  );

  await t.step(
    'fromString - タイトルとクエリパラメータ付きURLからインスタンスを生成',
    () => {
      const pageId = NotionPageId.fromString(
        VALID_NOTION_URL_WITH_QUERY_AND_TITLE,
      );
      assertEquals(pageId?.toShortId(), VALID_SHORT_ID);
      assertEquals(pageId?.toLongId(), VALID_LONG_ID);
    },
  );

  await t.step('fromString - 無効な入力に対してnullを返す', () => {
    // 無効なケース
    const invalidCases = [
      '', // 空文字列
      'invalid', // 無効な文字列
      '12345', // 短すぎるID
      'g'.repeat(32), // 無効な16進数
      'https://www.notion.so/invalid-page', // IDを含まないURL
      VALID_SHORT_ID.slice(1), // 31文字（1文字足りない）
      VALID_SHORT_ID + '0', // 33文字（1文字多い）
    ];

    for (const invalidInput of invalidCases) {
      const pageId = NotionPageId.fromString(invalidInput);
      assert(pageId === null, `入力: "${invalidInput}" はnullを返すべきです`);
    }
  });

  await t.step('getFormats - 両方の形式を正しく返す', () => {
    const pageId = NotionPageId.fromString(VALID_SHORT_ID);
    const formats = pageId?.getFormats();
    assertEquals(formats, {
      shortId: VALID_SHORT_ID,
      longId: VALID_LONG_ID,
    });
  });

  await t.step('toString - ShortIDを返す', () => {
    const pageId = NotionPageId.fromString(VALID_LONG_ID);
    assertEquals(pageId?.toString(), VALID_SHORT_ID);
  });

  await t.step('大文字小文字の正規化', () => {
    const upperShortId = VALID_SHORT_ID.toUpperCase();
    const upperLongId = VALID_LONG_ID.toUpperCase();

    const pageId1 = NotionPageId.fromString(upperShortId);
    const pageId2 = NotionPageId.fromString(upperLongId);

    // 入力が大文字でも、小文字に正規化されることを確認
    assertNotEquals(pageId1?.toShortId(), upperShortId);
    assertEquals(pageId1?.toShortId(), VALID_SHORT_ID);
    assertEquals(pageId2?.toShortId(), VALID_SHORT_ID);
  });
});
