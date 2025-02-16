import { assertEquals, assertExists } from '@std/assert';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { NotionClient } from '../../src/lib/notion/client.ts';
import { loadTestConfig } from '../test-config.ts';
import { Config } from '../../src/lib/config/config.ts';

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

      assertExists(page.id);
      testPageId = page.id;

      const retrievedPage = await client.getPage(page.id);
      assertEquals(
        (retrievedPage as any).properties.title.title[0].text.content,
        'Test Page',
      );
    });

    it('should update page title', async () => {
      const updatedPage = await client.updatePage(testPageId, {
        title: [{ text: { content: 'Updated Test Page' } }],
      });

      assertEquals(
        (updatedPage as any).properties.title.title[0].text.content,
        'Updated Test Page',
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

      assertEquals(retrievedBlocks.results.length, 4);
      assertEquals(
        (retrievedBlocks.results[0] as any).heading_1.rich_text[0].text.content,
        'Test Heading',
      );
      assertEquals(
        (retrievedBlocks.results[1] as any).paragraph.rich_text[0].text.content,
        'Test Paragraph',
      );
    });

    it('should delete a block', async () => {
      const blocks = await client.getBlocks(testPageId);
      const blockToDelete = blocks.results[0];
      await client.deleteBlock(blockToDelete.id);

      const updatedBlocks = await client.getBlocks(testPageId);
      assertEquals(updatedBlocks.results.length, 3);
      assertEquals(
        (updatedBlocks.results[0] as any).paragraph.rich_text[0].text.content,
        'Test Paragraph',
      );
    });
  });

  describe('Page Comments', () => {
    it('should add and retrieve comments', async () => {
      // コメントを追加
      const comment = await client.createComment(testPageId, 'Test comment');
      assertExists(comment.id);

      // コメントを取得
      const comments = await client.getComments(testPageId);
      assertEquals(comments.results.length, 1);
      assertEquals(
        (comments.results[0] as any).rich_text[0].text.content,
        'Test comment',
      );
    });
  });

  describe('Error Cases', () => {
    it('should handle non-existent page access', async () => {
      try {
        await client.getPage('non-existent-page-id');
        throw new Error('Expected to throw an error for non-existent page');
      } catch (error: any) {
        assertEquals(
          error.message.includes('path.page_id should be a valid uuid'),
          true,
        );
      }
    });

    it('should handle invalid block operations', async () => {
      try {
        await client.appendBlocks('non-existent-page-id', [{
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Test' } }],
          },
        }]);
        throw new Error(
          'Expected to throw an error for invalid block operation',
        );
      } catch (error: any) {
        assertEquals(
          error.message.includes('path.block_id should be a valid uuid'),
          true,
        );
      }
    });

    it('should handle invalid uuid format', async () => {
      const invalidUuid = '12345678-invalid-uuid-format';
      try {
        await client.getPage(invalidUuid);
        throw new Error('Expected to throw an error for invalid UUID format');
      } catch (error: any) {
        assertEquals(
          error.message.includes('path.page_id should be a valid uuid'),
          true,
        );
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
