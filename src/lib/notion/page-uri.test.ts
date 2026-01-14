import { describe, it, expect } from 'vitest';
import { NotionPageId } from './page-uri.js';

describe('NotionPageId', () => {
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

  it('fromString - 有効なShortIDからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(VALID_SHORT_ID);
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - 有効なLongIDからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(VALID_LONG_ID);
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - 有効なURLからインスタンスを生成（ShortID）', () => {
    const pageId = NotionPageId.fromString(VALID_NOTION_URL);
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - 有効なURLからインスタンスを生成（LongID）', () => {
    const pageId = NotionPageId.fromString(VALID_NOTION_URL_WITH_LONG_ID);
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - クエリパラメータ付きURLからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(VALID_NOTION_URL_WITH_QUERY);
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - タイトルとクエリパラメータ付きURLからインスタンスを生成', () => {
    const pageId = NotionPageId.fromString(
      VALID_NOTION_URL_WITH_QUERY_AND_TITLE
    );
    expect(pageId?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId?.toLongId()).toBe(VALID_LONG_ID);
  });

  it('fromString - 無効な入力に対してnullを返す', () => {
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
      expect(pageId).toBeNull();
    }
  });

  it('getFormats - 両方の形式を正しく返す', () => {
    const pageId = NotionPageId.fromString(VALID_SHORT_ID);
    const formats = pageId?.getFormats();
    expect(formats).toEqual({
      shortId: VALID_SHORT_ID,
      longId: VALID_LONG_ID,
    });
  });

  it('toString - ShortIDを返す', () => {
    const pageId = NotionPageId.fromString(VALID_LONG_ID);
    expect(pageId?.toString()).toBe(VALID_SHORT_ID);
  });

  it('大文字小文字の正規化', () => {
    const upperShortId = VALID_SHORT_ID.toUpperCase();
    const upperLongId = VALID_LONG_ID.toUpperCase();

    const pageId1 = NotionPageId.fromString(upperShortId);
    const pageId2 = NotionPageId.fromString(upperLongId);

    // 入力が大文字でも、小文字に正規化されることを確認
    expect(pageId1?.toShortId()).not.toBe(upperShortId);
    expect(pageId1?.toShortId()).toBe(VALID_SHORT_ID);
    expect(pageId2?.toShortId()).toBe(VALID_SHORT_ID);
  });
});
