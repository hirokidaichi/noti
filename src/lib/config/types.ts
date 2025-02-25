/**
 * notiの設定ファイルの型定義
 */
export interface Config {
  /**
   * Notion APIのアクセストークン
   * https://www.notion.so/my-integrations から取得できます
   */
  apiToken: string;
}

/**
 * エイリアスの型定義
 */
export interface Aliases {
  [key: string]: string;
}
