import { marked, Token, Tokens } from "https://esm.sh/marked@9.1.6";
import {
  NotionBlocks,
  NotionRichText,
  ConversionResult,
  NotionHeading1Block,
  NotionHeading2Block,
  NotionHeading3Block,
  NotionBulletedListItemBlock,
  NotionNumberedListItemBlock,
} from "./types.ts";

export class MarkdownToBlocks {
  private tokens: Token[] = [];

  constructor() {
    marked.use({ gfm: true });
  }

  /**
   * Markdownテキストを解析してNotionブロックに変換
   */
  public convert(markdown: string): ConversionResult {
    this.tokens = marked.lexer(markdown);
    const blocks: NotionBlocks[] = [];
    const errors: string[] = [];

    for (const token of this.tokens) {
      try {
        const block = this.convertToken(token);
        if (block) {
          blocks.push(block);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to convert token: ${message}`);
      }
    }

    return { blocks, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * 単一のトークンをNotionブロックに変換
   */
  private convertToken(token: Token): NotionBlocks | null {
    switch (token.type) {
      case "paragraph":
        return this.convertParagraph(token as Tokens.Paragraph);
      case "heading":
        return this.convertHeading(token as Tokens.Heading);
      case "list":
        return this.convertList(token as Tokens.List);
      case "code":
        return this.convertCode(token as Tokens.Code);
      case "blockquote":
        return this.convertBlockquote(token as Tokens.Blockquote);
      case "image":
        return this.convertImage(token as Tokens.Image);
      default:
        return null;
    }
  }

  /**
   * テキストをリッチテキストに変換
   */
  private convertToRichText(text: string): NotionRichText[] {
    return [{
      type: "text",
      text: {
        content: text,
      },
    }];
  }

  /**
   * パラグラフの変換
   */
  private convertParagraph(token: Tokens.Paragraph): NotionBlocks {
    return {
      type: "paragraph",
      paragraph: {
        rich_text: this.convertToRichText(token.text),
      },
    };
  }

  /**
   * 見出しの変換
   */
  private convertHeading(token: Tokens.Heading): NotionBlocks {
    switch (token.depth) {
      case 1:
        return {
          type: "heading_1",
          heading_1: {
            rich_text: this.convertToRichText(token.text),
          },
        } as NotionHeading1Block;
      case 2:
        return {
          type: "heading_2",
          heading_2: {
            rich_text: this.convertToRichText(token.text),
          },
        } as NotionHeading2Block;
      case 3:
        return {
          type: "heading_3",
          heading_3: {
            rich_text: this.convertToRichText(token.text),
          },
        } as NotionHeading3Block;
      default:
        // 見出しレベル4以上は段落として扱う
        return {
          type: "paragraph",
          paragraph: {
            rich_text: this.convertToRichText(token.text),
          },
        };
    }
  }

  /**
   * リストの変換
   */
  private convertList(token: Tokens.List): NotionBlocks {
    const firstItem = token.items[0];
    if (token.ordered) {
      return {
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: this.convertToRichText(firstItem.text),
        },
      } as NotionNumberedListItemBlock;
    } else {
      return {
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: this.convertToRichText(firstItem.text),
        },
      } as NotionBulletedListItemBlock;
    }
  }

  /**
   * コードブロックの変換
   */
  private convertCode(token: Tokens.Code): NotionBlocks {
    return {
      type: "code",
      code: {
        rich_text: this.convertToRichText(token.text),
        language: token.lang || "plain text",
      },
    };
  }

  /**
   * 引用の変換
   */
  private convertBlockquote(token: Tokens.Blockquote): NotionBlocks {
    return {
      type: "quote",
      quote: {
        rich_text: this.convertToRichText(token.text),
      },
    };
  }

  /**
   * 画像の変換
   */
  private convertImage(token: Tokens.Image): NotionBlocks {
    return {
      type: "image",
      image: {
        type: "external",
        external: {
          url: token.href,
        },
      },
    };
  }
}