import { describe, it, expect, beforeEach } from 'vitest';
import { AliasManager } from './aliases.js';

describe('AliasManager', () => {
  let manager: AliasManager;

  beforeEach(() => {
    manager = new AliasManager();
  });

  describe('get', () => {
    it('should return undefined for non-existent alias', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });

    it('should return page id for existing alias', () => {
      manager.set('mypage', 'page-123');
      expect(manager.get('mypage')).toBe('page-123');
    });
  });

  describe('set', () => {
    it('should set a new alias', () => {
      manager.set('test', 'page-456');
      expect(manager.get('test')).toBe('page-456');
    });

    it('should overwrite existing alias', () => {
      manager.set('test', 'page-old');
      manager.set('test', 'page-new');
      expect(manager.get('test')).toBe('page-new');
    });

    it('should handle URL as value', () => {
      const url = 'https://notion.so/page-789';
      manager.set('url-alias', url);
      expect(manager.get('url-alias')).toBe(url);
    });
  });

  describe('remove', () => {
    it('should remove existing alias', () => {
      manager.set('toremove', 'page-123');
      manager.remove('toremove');
      expect(manager.get('toremove')).toBeUndefined();
    });

    it('should not throw when removing non-existent alias', () => {
      expect(() => manager.remove('nonexistent')).not.toThrow();
    });
  });

  describe('getAll', () => {
    it('should return empty object for new manager', () => {
      expect(manager.getAll()).toEqual({});
    });

    it('should return all aliases', () => {
      manager.set('alias1', 'page-1');
      manager.set('alias2', 'page-2');
      manager.set('alias3', 'page-3');

      const all = manager.getAll();

      expect(all).toEqual({
        alias1: 'page-1',
        alias2: 'page-2',
        alias3: 'page-3',
      });
    });

    it('should return a copy (not reference)', () => {
      manager.set('test', 'page-123');
      const all = manager.getAll();
      all['test'] = 'modified';

      // 元のマネージャーは変更されていないはず
      expect(manager.get('test')).toBe('page-123');
    });
  });

  describe('constructor with initial aliases', () => {
    it('should initialize with provided aliases', () => {
      const initial = {
        home: 'page-home',
        work: 'page-work',
      };
      const mgr = new AliasManager(initial);

      expect(mgr.get('home')).toBe('page-home');
      expect(mgr.get('work')).toBe('page-work');
    });
  });
});
