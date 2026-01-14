import { describe, it, expect } from 'vitest';

// コメントの型定義
interface NotionComment {
  id: string;
  discussion_id: string;
  created_time: string;
  created_by: { id: string };
  rich_text: { plain_text?: string; text?: { content: string } }[];
}

// テスト対象の関数
function organizeCommentThreads(
  comments: NotionComment[]
): Record<string, NotionComment[]> {
  const threads: Record<string, NotionComment[]> = {};

  // コメントをスレッドごとに分類
  comments.forEach((comment) => {
    const discussionId = comment.discussion_id;
    if (!threads[discussionId]) {
      threads[discussionId] = [];
    }
    threads[discussionId].push(comment);
  });

  // 各スレッド内でコメントを時系列順にソート
  Object.values(threads).forEach((thread) => {
    thread.sort(
      (a, b) =>
        new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
    );
  });

  return threads;
}

describe('organizeCommentThreads', () => {
  describe('basic organization', () => {
    it('should group comments by discussion_id', () => {
      const comments: NotionComment[] = [
        {
          id: 'c1',
          discussion_id: 'thread-1',
          created_time: '2024-01-01T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'First comment' }],
        },
        {
          id: 'c2',
          discussion_id: 'thread-2',
          created_time: '2024-01-01T11:00:00Z',
          created_by: { id: 'user-2' },
          rich_text: [{ plain_text: 'Second thread' }],
        },
        {
          id: 'c3',
          discussion_id: 'thread-1',
          created_time: '2024-01-01T12:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'Reply to first' }],
        },
      ];

      const result = organizeCommentThreads(comments);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['thread-1']).toHaveLength(2);
      expect(result['thread-2']).toHaveLength(1);
    });

    it('should return empty object for empty comments', () => {
      const result = organizeCommentThreads([]);
      expect(result).toEqual({});
    });
  });

  describe('chronological sorting', () => {
    it('should sort comments within thread by created_time', () => {
      const comments: NotionComment[] = [
        {
          id: 'c3',
          discussion_id: 'thread-1',
          created_time: '2024-01-03T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'Third' }],
        },
        {
          id: 'c1',
          discussion_id: 'thread-1',
          created_time: '2024-01-01T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'First' }],
        },
        {
          id: 'c2',
          discussion_id: 'thread-1',
          created_time: '2024-01-02T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'Second' }],
        },
      ];

      const result = organizeCommentThreads(comments);

      expect(result['thread-1'][0].id).toBe('c1');
      expect(result['thread-1'][1].id).toBe('c2');
      expect(result['thread-1'][2].id).toBe('c3');
    });

    it('should handle comments with same timestamp', () => {
      const sameTime = '2024-01-01T10:00:00Z';
      const comments: NotionComment[] = [
        {
          id: 'c1',
          discussion_id: 'thread-1',
          created_time: sameTime,
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'First' }],
        },
        {
          id: 'c2',
          discussion_id: 'thread-1',
          created_time: sameTime,
          created_by: { id: 'user-2' },
          rich_text: [{ plain_text: 'Second' }],
        },
      ];

      const result = organizeCommentThreads(comments);

      // 同じタイムスタンプの場合は元の順序が維持される（安定ソート）
      expect(result['thread-1']).toHaveLength(2);
    });
  });

  describe('multiple threads', () => {
    it('should handle many threads independently', () => {
      const comments: NotionComment[] = [
        {
          id: 'c1',
          discussion_id: 'thread-a',
          created_time: '2024-01-02T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'A-2' }],
        },
        {
          id: 'c2',
          discussion_id: 'thread-b',
          created_time: '2024-01-01T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'B-1' }],
        },
        {
          id: 'c3',
          discussion_id: 'thread-a',
          created_time: '2024-01-01T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'A-1' }],
        },
        {
          id: 'c4',
          discussion_id: 'thread-c',
          created_time: '2024-01-03T10:00:00Z',
          created_by: { id: 'user-1' },
          rich_text: [{ plain_text: 'C-1' }],
        },
      ];

      const result = organizeCommentThreads(comments);

      expect(Object.keys(result)).toHaveLength(3);
      // thread-a は時系列順
      expect(result['thread-a'][0].id).toBe('c3'); // A-1
      expect(result['thread-a'][1].id).toBe('c1'); // A-2
    });

    it('should preserve all comment data', () => {
      const comment: NotionComment = {
        id: 'c1',
        discussion_id: 'thread-1',
        created_time: '2024-01-01T10:00:00Z',
        created_by: { id: 'user-123' },
        rich_text: [{ plain_text: 'Test comment' }],
      };

      const result = organizeCommentThreads([comment]);

      expect(result['thread-1'][0]).toEqual(comment);
    });
  });
});
