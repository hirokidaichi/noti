import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PromptUtils } from './prompt-utils.js';

// @inquirer/promptsをモック
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
  input: vi.fn(),
}));

import { confirm, select, input } from '@inquirer/prompts';

const mockConfirm = confirm as ReturnType<typeof vi.fn>;
const mockSelect = select as ReturnType<typeof vi.fn>;
const mockInput = input as ReturnType<typeof vi.fn>;

describe('PromptUtils', () => {
  beforeEach(() => {
    mockConfirm.mockReset();
    mockSelect.mockReset();
    mockInput.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('confirm - force オプションがtrueの場合', async () => {
    const result = await PromptUtils.confirm('確認メッセージ', { force: true });
    expect(result).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('confirm - 通常の確認', async () => {
    mockConfirm.mockResolvedValue(true);
    const result = await PromptUtils.confirm('確認メッセージ');
    expect(result).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith({
      message: '確認メッセージ',
    });
  });

  it('select - デフォルトオプションなし', async () => {
    mockSelect.mockResolvedValue('option1');
    const options = ['option1', 'option2', 'option3'];
    const result = await PromptUtils.select('選択してください', options);
    expect(result).toBe('option1');
    expect(mockSelect).toHaveBeenCalledWith({
      message: '選択してください',
      choices: options.map((o) => ({ name: o, value: o })),
      default: 'option1',
    });
  });

  it('select - デフォルトオプションあり', async () => {
    mockSelect.mockResolvedValue('option2');
    const options = ['option1', 'option2', 'option3'];
    const defaultOption = 'option2';
    const result = await PromptUtils.select(
      '選択してください',
      options,
      defaultOption
    );
    expect(result).toBe('option2');
    expect(mockSelect).toHaveBeenCalledWith({
      message: '選択してください',
      choices: options.map((o) => ({ name: o, value: o })),
      default: 'option2',
    });
  });

  it('input - デフォルト値なし', async () => {
    mockInput.mockResolvedValue('input value');
    const result = await PromptUtils.input('入力してください');
    expect(result).toBe('input value');
    expect(mockInput).toHaveBeenCalledWith({
      message: '入力してください',
      default: undefined,
    });
  });

  it('input - デフォルト値あり', async () => {
    mockInput.mockResolvedValue('default value');
    const defaultValue = 'default value';
    const result = await PromptUtils.input('入力してください', defaultValue);
    expect(result).toBe('default value');
    expect(mockInput).toHaveBeenCalledWith({
      message: '入力してください',
      default: defaultValue,
    });
  });
});
