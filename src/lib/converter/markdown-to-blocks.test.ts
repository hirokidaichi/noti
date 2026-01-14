import { describe, it, expect } from 'vitest';
import { MarkdownToBlocks } from './markdown-to-blocks.js';
import { NotionCodeBlock, NotionParagraphBlock } from './types.js';

describe('MarkdownToBlocks', () => {
  it('パラグラフの変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = 'これはテストです。';
    const result = converter.convert(markdown);

    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].type).toBe('paragraph');
    expect(
      (result.blocks[0] as NotionParagraphBlock).paragraph.rich_text[0].text
        .content
    ).toBe('これはテストです。');
  });

  it('見出しの変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = '# 見出し1\n## 見出し2\n### 見出し3';
    const result = converter.convert(markdown);

    expect(result.blocks.length).toBe(3);
    expect(result.blocks[0].type).toBe('heading_1');
    expect(result.blocks[1].type).toBe('heading_2');
    expect(result.blocks[2].type).toBe('heading_3');
  });

  it('リストの変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = '- 箇条書き1\n1. 番号付き1';
    const result = converter.convert(markdown);

    expect(result.blocks.length).toBe(2);
    expect(result.blocks[0].type).toBe('bulleted_list_item');
    expect(result.blocks[1].type).toBe('numbered_list_item');
  });

  it('コードブロックの変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = '```typescript\nconst x = 1;\n```';
    const result = converter.convert(markdown);

    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].type).toBe('code');
    expect((result.blocks[0] as NotionCodeBlock).code.language).toBe(
      'typescript'
    );
  });

  it('引用の変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = '> これは引用です';
    const result = converter.convert(markdown);

    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].type).toBe('quote');
  });

  it('複合的なMarkdownの変換', () => {
    const converter = new MarkdownToBlocks();
    const markdown = `# タイトル

これは本文です。

## セクション1
- リスト1
- リスト2

\`\`\`typescript
console.log("Hello");
\`\`\`

> 引用文`;

    const result = converter.convert(markdown);
    expect(result.errors).toBeUndefined();
    expect(result.blocks.length).toBeGreaterThan(0);
  });
});
