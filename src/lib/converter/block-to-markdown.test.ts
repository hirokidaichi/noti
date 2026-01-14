import { describe, it, expect } from 'vitest';
import { BlockToMarkdown } from './block-to-markdown.js';
import { NotionBlocks } from './types.js';

describe('BlockToMarkdown', () => {
  it('パラグラフの変換', () => {
    const converter = new BlockToMarkdown();
    const block: NotionBlocks = {
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'これはテストです。',
            },
            plain_text: 'これはテストです。',
          },
        ],
      },
    };

    const result = converter.convert([block]);
    expect(result).toBe('これはテストです。\n\n');
  });

  it('見出しの変換', () => {
    const converter = new BlockToMarkdown();
    const blocks: NotionBlocks[] = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: { content: '見出し1' },
              plain_text: '見出し1',
            },
          ],
        },
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: '見出し2' },
              plain_text: '見出し2',
            },
          ],
        },
      },
      {
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: { content: '見出し3' },
              plain_text: '見出し3',
            },
          ],
        },
      },
    ];

    const result = converter.convert(blocks);
    expect(result).toBe('# 見出し1\n\n## 見出し2\n\n### 見出し3\n\n');
  });

  it('リストの変換', () => {
    const converter = new BlockToMarkdown();
    const blocks: NotionBlocks[] = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: '箇条書き1' },
              plain_text: '箇条書き1',
            },
          ],
        },
      },
      {
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: '番号付き1' },
              plain_text: '番号付き1',
            },
          ],
        },
      },
    ];

    const result = converter.convert(blocks);
    expect(result).toBe('- 箇条書き1\n1. 番号付き1\n\n');
  });

  it('コードブロックの変換', () => {
    const converter = new BlockToMarkdown();
    const block: NotionBlocks = {
      type: 'code',
      code: {
        language: 'typescript',
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'const x = 1;',
            },
            plain_text: 'const x = 1;',
          },
        ],
      },
    };

    const result = converter.convert([block]);
    expect(result).toBe('```typescript\nconst x = 1;\n```\n\n');
  });

  it('引用の変換', () => {
    const converter = new BlockToMarkdown();
    const block: NotionBlocks = {
      type: 'quote',
      quote: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'これは引用です',
            },
            plain_text: 'これは引用です',
          },
        ],
      },
    };

    const result = converter.convert([block]);
    expect(result).toBe('> これは引用です\n\n');
  });

  it('複合的なブロックの変換', () => {
    const converter = new BlockToMarkdown();
    const blocks: NotionBlocks[] = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'タイトル' },
              plain_text: 'タイトル',
            },
          ],
        },
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'これは本文です。' },
              plain_text: 'これは本文です。',
            },
          ],
        },
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'セクション1' },
              plain_text: 'セクション1',
            },
          ],
        },
      },
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'リスト1' },
              plain_text: 'リスト1',
            },
          ],
        },
      },
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'リスト2' },
              plain_text: 'リスト2',
            },
          ],
        },
      },
      {
        type: 'code',
        code: {
          language: 'typescript',
          rich_text: [
            {
              type: 'text',
              text: { content: 'console.log("Hello");' },
              plain_text: 'console.log("Hello");',
            },
          ],
        },
      },
      {
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: { content: '引用文' },
              plain_text: '引用文',
            },
          ],
        },
      },
    ];

    const expected = `# タイトル

これは本文です。

## セクション1

- リスト1
- リスト2

\`\`\`typescript
console.log("Hello");
\`\`\`

> 引用文

`;

    const result = converter.convert(blocks);
    expect(result).toBe(expected);
  });
});
