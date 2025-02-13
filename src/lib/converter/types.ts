// Notionのブロックタイプの定義
export type NotionBlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "quote"
  | "code"
  | "image";

// Notionのリッチテキスト要素の定義
export interface NotionRichText {
  type: "text";
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
}

// Notionのブロック要素の基本インターフェース
export interface NotionBlock {
  type: NotionBlockType;
}

// パラグラフブロック
export interface NotionParagraphBlock extends NotionBlock {
  type: "paragraph";
  paragraph: {
    rich_text: NotionRichText[];
  };
}

// 見出しブロック
export interface NotionHeading1Block extends NotionBlock {
  type: "heading_1";
  heading_1: {
    rich_text: NotionRichText[];
  };
}

export interface NotionHeading2Block extends NotionBlock {
  type: "heading_2";
  heading_2: {
    rich_text: NotionRichText[];
  };
}

export interface NotionHeading3Block extends NotionBlock {
  type: "heading_3";
  heading_3: {
    rich_text: NotionRichText[];
  };
}

// リストアイテムブロック
export interface NotionBulletedListItemBlock extends NotionBlock {
  type: "bulleted_list_item";
  bulleted_list_item: {
    rich_text: NotionRichText[];
  };
}

export interface NotionNumberedListItemBlock extends NotionBlock {
  type: "numbered_list_item";
  numbered_list_item: {
    rich_text: NotionRichText[];
  };
}

// コードブロック
export interface NotionCodeBlock extends NotionBlock {
  type: "code";
  code: {
    rich_text: NotionRichText[];
    language: string;
  };
}

// 引用ブロック
export interface NotionQuoteBlock extends NotionBlock {
  type: "quote";
  quote: {
    rich_text: NotionRichText[];
  };
}

// TODOブロック
export interface NotionTodoBlock extends NotionBlock {
  type: "to_do";
  to_do: {
    rich_text: NotionRichText[];
    checked: boolean;
  };
}

// 画像ブロック
export interface NotionImageBlock extends NotionBlock {
  type: "image";
  image: {
    type: "external";
    external: {
      url: string;
    };
  };
}

// すべてのブロック型の統合型
export type NotionBlocks =
  | NotionParagraphBlock
  | NotionHeading1Block
  | NotionHeading2Block
  | NotionHeading3Block
  | NotionBulletedListItemBlock
  | NotionNumberedListItemBlock
  | NotionCodeBlock
  | NotionQuoteBlock
  | NotionTodoBlock
  | NotionImageBlock;

// 変換結果の型
export interface ConversionResult {
  blocks: NotionBlocks[];
  errors?: string[];
}