/**
 * NotionのページIDに関する型定義
 */
export type NotionShortId = string; // 32文字の16進数
export type NotionLongId = string; // UUID形式（8-4-4-4-12）
export type NotionPageUri = string; // NotionのURL

export interface NotionIdFormats {
  shortId: NotionShortId;
  longId: NotionLongId;
}

export class NotionPageId {
  private constructor(private readonly shortId: NotionShortId) {}

  /**
   * 文字列（URL、ShortID、LongID）からNotionPageIdインスタンスを生成
   */
  static fromString(input: string): NotionPageId | null {
    const shortId = NotionPageId.extractNotionId(input);
    return shortId ? new NotionPageId(shortId) : null;
  }

  /**
   * NotionのID（ShortIDまたはLongID）を含む文字列から、
   * ハイフンなしの32文字ShortIDを抽出する
   */
  private static extractNotionId(input: string): NotionShortId | null {
    // URLからクエリパラメータを除去
    const urlWithoutQuery = input.split('?')[0];

    // NotionのURLパターン（末尾のスラッシュやクエリパラメータを考慮）
    const urlPattern = /notion\.so\/(?:[^/]*-)?([0-9a-fA-F]{32})\b/;
    const urlMatch = urlWithoutQuery.match(urlPattern);
    if (urlMatch) {
      return urlMatch[1].toLowerCase();
    }

    // 32文字の16進数またはUUID形式のみを抽出する正規表現
    const shortIdPattern = /\b[0-9a-fA-F]{32}\b/;
    const longIdPattern =
      /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;

    // まずLongID形式をチェック
    const longMatch = urlWithoutQuery.match(longIdPattern);
    if (longMatch) {
      return longMatch[0].replace(/-/g, '').toLowerCase();
    }

    // 次にShortID形式をチェック
    const shortMatch = urlWithoutQuery.match(shortIdPattern);
    if (shortMatch) {
      return shortMatch[0].toLowerCase();
    }

    return null;
  }

  /**
   * ハイフンなしのShortID（32文字）を、UUID形式のLongID（8-4-4-4-12）に変換
   */
  private formatLongId(): NotionLongId {
    if (this.shortId.length !== 32) {
      throw new Error(
        'Invalid Notion ID length. Expected 32 hexadecimal characters.'
      );
    }
    return `${this.shortId.slice(0, 8)}-${this.shortId.slice(8, 12)}-${this.shortId.slice(
      12,
      16
    )}-${this.shortId.slice(16, 20)}-${this.shortId.slice(20)}`;
  }

  /**
   * 両方の形式のIDを取得
   */
  public getFormats(): NotionIdFormats {
    return {
      shortId: this.shortId,
      longId: this.formatLongId(),
    };
  }

  /**
   * ShortID（32文字）を取得
   */
  public toShortId(): NotionShortId {
    return this.shortId;
  }

  /**
   * LongID（UUID形式）を取得
   */
  public toLongId(): NotionLongId {
    return this.formatLongId();
  }

  /**
   * 文字列表現を取得（デフォルトはShortID）
   */
  public toString(): string {
    return this.shortId;
  }
}

/**
 * NotionのページURLを生成する
 */
export function getPageUri(input: string): string {
  const pageId = NotionPageId.fromString(input);
  if (!pageId) {
    // 有効なNotionIDが見つからない場合は、入力をそのまま返す
    return input;
  }
  return `https://notion.so/${pageId.toShortId()}`;
}
