import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MarkdownToBlocks } from "./markdown-to-blocks.ts";

Deno.test("MarkdownToBlocks - パラグラフの変換", () => {
  const converter = new MarkdownToBlocks();
  const markdown = "これはテストです。";
  const result = converter.convert(markdown);

  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].type, "paragraph");
  assertEquals(
    (result.blocks[0] as any).paragraph.rich_text[0].text.content,
    "これはテストです。"
  );
});

Deno.test("MarkdownToBlocks - 見出しの変換", () => {
  const converter = new MarkdownToBlocks();
  const markdown = "# 見出し1\n## 見出し2\n### 見出し3";
  const result = converter.convert(markdown);

  assertEquals(result.blocks.length, 3);
  assertEquals(result.blocks[0].type, "heading_1");
  assertEquals(result.blocks[1].type, "heading_2");
  assertEquals(result.blocks[2].type, "heading_3");
});

Deno.test("MarkdownToBlocks - リストの変換", () => {
  const converter = new MarkdownToBlocks();
  const markdown = "- 箇条書き1\n1. 番号付き1";
  const result = converter.convert(markdown);

  assertEquals(result.blocks.length, 2);
  assertEquals(result.blocks[0].type, "bulleted_list_item");
  assertEquals(result.blocks[1].type, "numbered_list_item");
});

Deno.test("MarkdownToBlocks - コードブロックの変換", () => {
  const converter = new MarkdownToBlocks();
  const markdown = "```typescript\nconst x = 1;\n```";
  const result = converter.convert(markdown);

  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].type, "code");
  assertEquals((result.blocks[0] as any).code.language, "typescript");
});

Deno.test("MarkdownToBlocks - 引用の変換", () => {
  const converter = new MarkdownToBlocks();
  const markdown = "> これは引用です";
  const result = converter.convert(markdown);

  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].type, "quote");
});

Deno.test("MarkdownToBlocks - 複合的なMarkdownの変換", () => {
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
  assertEquals(result.errors, undefined);
  assertEquals(result.blocks.length > 0, true);
});