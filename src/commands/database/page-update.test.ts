import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatePageFromJson } from './page-update.js';
import { NotionClient } from '../../lib/notion/client.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import {
  mockPageResponse,
  mockDataSourceResponse,
  TEST_IDS,
} from '../../test/fixtures/notion-api-v5.js';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('updatePageFromJson', () => {
  let client: NotionClient;
  let outputHandler: OutputHandler;

  beforeEach(() => {
    vi.restoreAllMocks();

    client = {
      getPage: vi.fn().mockResolvedValue(mockPageResponse),
      getDataSourceWithProperties: vi
        .fn()
        .mockResolvedValue(mockDataSourceResponse),
      updateDatabasePage: vi.fn().mockResolvedValue({
        id: TEST_IDS.PAGE_ID,
        url: `https://www.notion.so/${TEST_IDS.PAGE_ID}`,
      }),
    } as unknown as NotionClient;

    outputHandler = new OutputHandler({ debug: false });
    vi.spyOn(outputHandler, 'handleOutput').mockResolvedValue();
    vi.spyOn(outputHandler, 'debug').mockImplementation(() => {});
    vi.spyOn(outputHandler, 'info').mockImplementation(() => {});
    vi.spyOn(outputHandler, 'success').mockImplementation(() => {});
  });

  it('should update page properties from JSON file', async () => {
    const jsonData = {
      properties: {
        Status: 'Done',
        Priority: 5,
      },
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(jsonData));

    await updatePageFromJson(
      client,
      TEST_IDS.PAGE_ID,
      'test.json',
      outputHandler
    );

    expect(client.getPage).toHaveBeenCalledWith(TEST_IDS.PAGE_ID);
    expect(client.getDataSourceWithProperties).toHaveBeenCalledWith(
      TEST_IDS.DATABASE_ID.replace(/-/g, '')
    );
    expect(client.updateDatabasePage).toHaveBeenCalledWith(TEST_IDS.PAGE_ID, {
      Status: { select: { name: 'Done' } },
      Priority: { number: 5 },
    });
  });

  it('should warn for unknown properties', async () => {
    const jsonData = {
      properties: {
        UnknownProp: 'value',
      },
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(jsonData));

    await updatePageFromJson(
      client,
      TEST_IDS.PAGE_ID,
      'test.json',
      outputHandler
    );

    expect(outputHandler.info).toHaveBeenCalledWith(
      '警告: プロパティ "UnknownProp" はデータベースに存在しません'
    );
  });

  it('should throw error for non-database pages', async () => {
    vi.mocked(client.getPage).mockResolvedValue({
      ...mockPageResponse,
      parent: { type: 'workspace', workspace: true },
    } as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ properties: {} })
    );

    await expect(
      updatePageFromJson(client, TEST_IDS.PAGE_ID, 'test.json', outputHandler)
    ).rejects.toThrow('このページはデータベースページではありません');
  });

  it('should handle multiple property types', async () => {
    const jsonData = {
      properties: {
        Name: 'Updated Title',
        Tags: ['Feature', 'Bug'],
        Done: true,
      },
    };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(jsonData));

    await updatePageFromJson(
      client,
      TEST_IDS.PAGE_ID,
      'test.json',
      outputHandler
    );

    expect(client.updateDatabasePage).toHaveBeenCalledWith(TEST_IDS.PAGE_ID, {
      Name: { title: [{ text: { content: 'Updated Title' } }] },
      Tags: {
        multi_select: [{ name: 'Feature' }, { name: 'Bug' }],
      },
      Done: { checkbox: true },
    });
  });
});
