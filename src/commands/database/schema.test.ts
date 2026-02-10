import { describe, it, expect } from 'vitest';
import { formatSchema } from './schema.js';
import { mockDataSourceResponse } from '../../test/fixtures/notion-api-v5.js';

describe('formatSchema', () => {
  it('should format properties as table', () => {
    const result = formatSchema(mockDataSourceResponse.properties);

    expect(result).toContain('Name');
    expect(result).toContain('title');
    expect(result).toContain('Status');
    expect(result).toContain('select');
    expect(result).toContain('Tags');
    expect(result).toContain('multi_select');
    expect(result).toContain('Priority');
    expect(result).toContain('number');
    expect(result).toContain('Done');
    expect(result).toContain('checkbox');
  });

  it('should show select options', () => {
    const result = formatSchema(mockDataSourceResponse.properties);

    expect(result).toContain('[Todo, In Progress, Done]');
  });

  it('should show multi_select options', () => {
    const result = formatSchema(mockDataSourceResponse.properties);

    expect(result).toContain('[Feature, Bug]');
  });

  it('should show number format', () => {
    const result = formatSchema(mockDataSourceResponse.properties);

    expect(result).toContain('(number)');
  });

  it('should handle empty properties', () => {
    const result = formatSchema({});

    expect(result).toBe('プロパティがありません');
  });

  it('should include header and separator', () => {
    const result = formatSchema(mockDataSourceResponse.properties);
    const lines = result.split('\n');

    expect(lines[0]).toContain('Name');
    expect(lines[0]).toContain('Type');
    expect(lines[0]).toContain('Detail');
    expect(lines[1]).toContain('─');
  });
});
