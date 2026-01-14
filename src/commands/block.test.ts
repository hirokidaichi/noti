import { describe, it, expect } from 'vitest';
import { extractBlockText, BlockObject } from './block.js';

describe('extractBlockText', () => {
  const createBlock = (
    type: string,
    content: Record<string, unknown>
  ): BlockObject => ({
    id: 'test-id',
    type,
    has_children: false,
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    [type]: content,
  });

  it('should extract text from paragraph block', () => {
    const block = createBlock('paragraph', {
      rich_text: [{ plain_text: 'Hello' }, { plain_text: ' World' }],
    });
    expect(extractBlockText(block)).toBe('Hello World');
  });

  it('should extract text from heading_1 block', () => {
    const block = createBlock('heading_1', {
      rich_text: [{ plain_text: 'Main Title' }],
    });
    expect(extractBlockText(block)).toBe('Main Title');
  });

  it('should extract text from heading_2 block', () => {
    const block = createBlock('heading_2', {
      rich_text: [{ plain_text: 'Sub Title' }],
    });
    expect(extractBlockText(block)).toBe('Sub Title');
  });

  it('should extract text from heading_3 block', () => {
    const block = createBlock('heading_3', {
      rich_text: [{ plain_text: 'Section Title' }],
    });
    expect(extractBlockText(block)).toBe('Section Title');
  });

  it('should extract text from bulleted_list_item block', () => {
    const block = createBlock('bulleted_list_item', {
      rich_text: [{ plain_text: 'List item' }],
    });
    expect(extractBlockText(block)).toBe('List item');
  });

  it('should extract text from numbered_list_item block', () => {
    const block = createBlock('numbered_list_item', {
      rich_text: [{ plain_text: 'Numbered item' }],
    });
    expect(extractBlockText(block)).toBe('Numbered item');
  });

  it('should extract text from to_do block', () => {
    const block = createBlock('to_do', {
      rich_text: [{ plain_text: 'Task item' }],
      checked: false,
    });
    expect(extractBlockText(block)).toBe('Task item');
  });

  it('should extract text from toggle block', () => {
    const block = createBlock('toggle', {
      rich_text: [{ plain_text: 'Toggle content' }],
    });
    expect(extractBlockText(block)).toBe('Toggle content');
  });

  it('should extract text from quote block', () => {
    const block = createBlock('quote', {
      rich_text: [{ plain_text: 'Quote text' }],
    });
    expect(extractBlockText(block)).toBe('Quote text');
  });

  it('should extract text from callout block', () => {
    const block = createBlock('callout', {
      rich_text: [{ plain_text: 'Callout message' }],
    });
    expect(extractBlockText(block)).toBe('Callout message');
  });

  it('should return empty string for block without rich_text', () => {
    const block = createBlock('divider', {});
    expect(extractBlockText(block)).toBe('');
  });

  it('should return empty string for block with empty rich_text', () => {
    const block = createBlock('paragraph', {
      rich_text: [],
    });
    expect(extractBlockText(block)).toBe('');
  });

  it('should handle code block', () => {
    const block = createBlock('code', {
      rich_text: [{ plain_text: 'console.log("hello")' }],
      language: 'javascript',
    });
    expect(extractBlockText(block)).toBe('console.log("hello")');
  });
});
