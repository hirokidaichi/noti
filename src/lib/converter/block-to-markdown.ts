import {
  NotionBlocks,
  NotionBulletedListItemBlock,
  NotionCodeBlock,
  NotionHeading1Block,
  NotionHeading2Block,
  NotionHeading3Block,
  NotionNumberedListItemBlock,
  NotionParagraphBlock,
  NotionQuoteBlock,
  NotionRichText,
  NotionTodoBlock,
} from './types.ts';

// Notionプロパティの型定義
interface NotionProperty {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  date?: { start: string };
  url?: string;
}

export class BlockToMarkdown {
  private convertRichText(richText: NotionRichText[]): string {
    return richText.map((text) => text.text.content).join('');
  }

  private convertParagraph(block: NotionParagraphBlock): string {
    return `${this.convertRichText(block.paragraph.rich_text)}\n\n`;
  }

  private convertHeading1(block: NotionHeading1Block): string {
    return `# ${this.convertRichText(block.heading_1.rich_text)}\n\n`;
  }

  private convertHeading2(block: NotionHeading2Block): string {
    return `## ${this.convertRichText(block.heading_2.rich_text)}\n\n`;
  }

  private convertHeading3(block: NotionHeading3Block): string {
    return `### ${this.convertRichText(block.heading_3.rich_text)}\n\n`;
  }

  private convertBulletedListItem(block: NotionBulletedListItemBlock): string {
    return `- ${this.convertRichText(block.bulleted_list_item.rich_text)}\n`;
  }

  private convertNumberedListItem(block: NotionNumberedListItemBlock): string {
    return `1. ${this.convertRichText(block.numbered_list_item.rich_text)}\n`;
  }

  private convertCode(block: NotionCodeBlock): string {
    const language = block.code.language;
    const content = this.convertRichText(block.code.rich_text);
    return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
  }

  private convertQuote(block: NotionQuoteBlock): string {
    return `> ${this.convertRichText(block.quote.rich_text)}\n\n`;
  }

  convert(blocks: NotionBlocks[]): string {
    let markdown = '';
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const nextBlock = blocks[i + 1];

      // 現在のブロックを変換
      const converted = this.convertBlock(block);

      // リストアイテムの場合、次のブロックがリストでなければ改行を追加
      if (
        (block.type === 'bulleted_list_item' ||
          block.type === 'numbered_list_item') &&
        (!nextBlock ||
          (nextBlock.type !== 'bulleted_list_item' &&
            nextBlock.type !== 'numbered_list_item'))
      ) {
        markdown += converted + '\n';
      } else {
        markdown += converted;
      }
    }
    return markdown;
  }

  convertProperties(properties: Record<string, NotionProperty>): string {
    let markdown = '';

    for (const [key, value] of Object.entries(properties)) {
      switch (value.type) {
        case 'title':
          markdown += `# ${value.title?.[0]?.plain_text || ''}\n\n`;
          break;
        case 'rich_text':
          markdown += `**${key}**: ${
            value.rich_text?.[0]?.plain_text || ''
          }\n\n`;
          break;
        case 'date':
          markdown += `**${key}**: ${value.date?.start || ''}\n\n`;
          break;
        case 'url':
          markdown += `**${key}**: [${value.url}](${value.url})\n\n`;
          break;
        default:
          // その他のプロパティタイプは無視
          break;
      }
    }

    return markdown;
  }

  private convertBlock(block: NotionBlocks): string {
    switch (block.type) {
      case 'paragraph':
        return this.convertParagraph(block);
      case 'heading_1':
        return this.convertHeading1(block);
      case 'heading_2':
        return this.convertHeading2(block);
      case 'heading_3':
        return this.convertHeading3(block);
      case 'bulleted_list_item':
        return this.convertBulletedListItem(block);
      case 'numbered_list_item':
        return this.convertNumberedListItem(block);
      case 'to_do':
        return this.convertTodo(block);
      case 'code':
        return this.convertCode(block);
      case 'quote':
        return this.convertQuote(block);
      default:
        return '';
    }
  }

  private convertTodo(block: NotionTodoBlock): string {
    const checked = block.to_do.checked ? 'x' : ' ';
    return `- [${checked}] ` + block.to_do.rich_text
      .map((text: NotionRichText) => text.plain_text)
      .join('') +
      '\n';
  }
}
