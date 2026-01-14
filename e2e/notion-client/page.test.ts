import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NotionClient } from '../../src/lib/notion/client.js';
import { loadTestConfig } from '../test-config.js';
import { Config } from '../../src/lib/config/config.js';

describe('Notion Client Page Operations', () => {
  let client: NotionClient;
  let testPageId: string;

  beforeAll(async () => {
    const testConfig = await loadTestConfig();
    const config = new Config({ apiToken: testConfig.NOTION_TOKEN });
    client = new NotionClient(config);
  });

  describe('Basic Page Operations', () => {
    it('should create a page with title', async () => {
      const testConfig = await loadTestConfig();
      const page = await client.createPage({
        parentId: testConfig.NOTION_ROOT_ID,
        title: 'Test Page',
      });

      expect(page.id).toBeDefined();
      testPageId = page.id;

      const retrievedPage = await client.getPage(page.id);
      expect(
        (retrievedPage as any).properties.title.title[0].text.content // eslint-disable-line @typescript-eslint/no-explicit-any
      ).toBe('Test Page');
    });

    it('should update page title', async () => {
      const updatedPage = await client.updatePage(testPageId, {
        title: [{ text: { content: 'Updated Test Page' } }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((updatedPage as any).properties.title.title[0].text.content).toBe(
        'Updated Test Page'
      );
    });
  });

  describe('Block Operations', () => {
    it('should append blocks to a page', async () => {
      const blocks = [
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: 'Test Heading' } }],
          },
        },
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Test Paragraph' } }],
          },
        },
        {
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: 'List Item 1' } }],
          },
        },
        {
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: 'List Item 2' } }],
          },
        },
      ];

      await client.appendBlocks(testPageId, blocks);
      const retrievedBlocks = await client.getBlocks(testPageId);

      expect(retrievedBlocks.results.length).toBe(4);
      expect(
        (retrievedBlocks.results[0] as any).heading_1.rich_text[0].text.content // eslint-disable-line @typescript-eslint/no-explicit-any
      ).toBe('Test Heading');
      expect(
        (retrievedBlocks.results[1] as any).paragraph.rich_text[0].text.content // eslint-disable-line @typescript-eslint/no-explicit-any
      ).toBe('Test Paragraph');
    });

    it('should delete a block', async () => {
      const blocks = await client.getBlocks(testPageId);
      const blockToDelete = blocks.results[0];
      await client.deleteBlock(blockToDelete.id);

      const updatedBlocks = await client.getBlocks(testPageId);
      expect(updatedBlocks.results.length).toBe(3);
      expect(
        (updatedBlocks.results[0] as any).paragraph.rich_text[0].text.content // eslint-disable-line @typescript-eslint/no-explicit-any
      ).toBe('Test Paragraph');
    });
  });

  describe('Page Comments', () => {
    it('should add and retrieve comments', async () => {
      // コメントを追加
      const comment = await client.createComment(testPageId, 'Test comment');
      expect(comment.id).toBeDefined();

      // コメントを取得
      const comments = await client.getComments(testPageId);
      expect(comments.results.length).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((comments.results[0] as any).rich_text[0].text.content).toBe(
        'Test comment'
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent page access', async () => {
      try {
        await client.getPage('non-existent-page-id');
        throw new Error('Expected to throw an error for non-existent page');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(
          error.message.includes('path.page_id should be a valid uuid')
        ).toBe(true);
      }
    });

    it('should handle invalid block operations', async () => {
      try {
        await client.appendBlocks('non-existent-page-id', [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: 'Test' } }],
            },
          },
        ]);
        throw new Error(
          'Expected to throw an error for invalid block operation'
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(
          error.message.includes('path.block_id should be a valid uuid')
        ).toBe(true);
      }
    });

    it('should handle invalid uuid format', async () => {
      const invalidUuid = '12345678-invalid-uuid-format';
      try {
        await client.getPage(invalidUuid);
        throw new Error('Expected to throw an error for invalid UUID format');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(
          error.message.includes('path.page_id should be a valid uuid')
        ).toBe(true);
      }
    });
  });

  // クリーンアップ
  afterAll(async () => {
    if (testPageId) {
      await client.removePage(testPageId);
    }
  });
});
