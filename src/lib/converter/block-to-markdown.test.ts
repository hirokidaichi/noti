import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { BlockToMarkdown } from "./block-to-markdown.ts";
import { NotionBlocks } from "./types.ts";

Deno.test("BlockToMarkdown - パラグラフの変換", () => {
  const converter = new BlockToMarkdown();
  const block: NotionBlocks = {
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "これはテストです。",
          },
        },
      ],
    },
  };

  const result = converter.convert([block]);
  assertEquals(result, "これはテストです。\n\n");
});

Deno.test("BlockToMarkdown - 見出しの変換", () => {
  const converter = new BlockToMarkdown();
  const blocks: NotionBlocks[] = [
    {
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: "見出し1" } }],
      },
    },
    {
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "見出し2" } }],
      },
    },
    {
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "見出し3" } }],
      },
    },
  ];

  const result = converter.convert(blocks);
  assertEquals(result, "# 見出し1\n\n## 見出し2\n\n### 見出し3\n\n");
});

Deno.test("BlockToMarkdown - リストの変換", () => {
  const converter = new BlockToMarkdown();
  const blocks: NotionBlocks[] = [
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "箇条書き1" } }],
      },
    },
    {
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "番号付き1" } }],
      },
    },
  ];

  const result = converter.convert(blocks);
  assertEquals(result, "- 箇条書き1\n1. 番号付き1\n\n");
});

Deno.test("BlockToMarkdown - コードブロックの変換", () => {
  const converter = new BlockToMarkdown();
  const block: NotionBlocks = {
    type: "code",
    code: {
      language: "typescript",
      rich_text: [
        {
          type: "text",
          text: {
            content: "const x = 1;",
          },
        },
      ],
    },
  };

  const result = converter.convert([block]);
  assertEquals(result, "```typescript\nconst x = 1;\n```\n\n");
});

Deno.test("BlockToMarkdown - 引用の変換", () => {
  const converter = new BlockToMarkdown();
  const block: NotionBlocks = {
    type: "quote",
    quote: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "これは引用です",
          },
        },
      ],
    },
  };

  const result = converter.convert([block]);
  assertEquals(result, "> これは引用です\n\n");
});

Deno.test("BlockToMarkdown - 複合的なブロックの変換", () => {
  const converter = new BlockToMarkdown();
  const blocks: NotionBlocks[] = [
    {
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: "タイトル" } }],
      },
    },
    {
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "これは本文です。" } }],
      },
    },
    {
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "セクション1" } }],
      },
    },
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "リスト1" } }],
      },
    },
    {
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "リスト2" } }],
      },
    },
    {
      type: "code",
      code: {
        language: "typescript",
        rich_text: [{ type: "text", text: { content: 'console.log("Hello");' } }],
      },
    },
    {
      type: "quote",
      quote: {
        rich_text: [{ type: "text", text: { content: "引用文" } }],
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
  assertEquals(result, expected);
});