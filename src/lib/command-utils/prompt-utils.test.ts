import { assertEquals } from '@std/assert';
import { assertSpyCall, spy } from '@std/testing/mock';
import { PromptUtils } from './prompt-utils.ts';
import { Confirm, Input, Select } from '@cliffy/prompt';

// モックのプロンプトを作成
const mockConfirm = spy((_message: string) => Promise.resolve(true));
const mockSelect = spy(
  (options: { message: string; options: string[]; default: string }) => {
    return Promise.resolve(options.default);
  },
);
const mockInput = spy(
  (options: { message: string; default?: string }) => {
    return Promise.resolve(options.default ?? 'input value');
  },
);

// オリジナルのプロンプトを保存
const originalConfirmPrompt = Confirm.prompt;
const originalSelectPrompt = Select.prompt;
const originalInputPrompt = Input.prompt;

Deno.test('PromptUtils', async (t) => {
  function setup() {
    // プロンプトをモックに置き換え
    Confirm.prompt = mockConfirm as unknown as typeof Confirm.prompt;
    Select.prompt = mockSelect as unknown as typeof Select.prompt;
    Input.prompt = mockInput as unknown as typeof Input.prompt;
  }

  function cleanup() {
    // オリジナルのプロンプトを復元
    Confirm.prompt = originalConfirmPrompt;
    Select.prompt = originalSelectPrompt;
    Input.prompt = originalInputPrompt;
    // モックのコールをリセット
    mockConfirm.calls.splice(0);
    mockSelect.calls.splice(0);
    mockInput.calls.splice(0);
  }

  await t.step('confirm - force オプションがtrueの場合', async () => {
    setup();
    const result = await PromptUtils.confirm('確認メッセージ', { force: true });
    assertEquals(result, true);
    assertEquals(mockConfirm.calls.length, 0);
    cleanup();
  });

  await t.step('confirm - 通常の確認', async () => {
    setup();
    const result = await PromptUtils.confirm('確認メッセージ');
    assertEquals(result, true);
    assertSpyCall(mockConfirm, 0, {
      args: ['確認メッセージ'],
    });
    cleanup();
  });

  await t.step('select - デフォルトオプションなし', async () => {
    setup();
    const options = ['option1', 'option2', 'option3'];
    const result = await PromptUtils.select('選択してください', options);
    assertEquals(result, 'option1');
    assertSpyCall(mockSelect, 0, {
      args: [{
        message: '選択してください',
        options,
        default: 'option1',
      }],
    });
    cleanup();
  });

  await t.step('select - デフォルトオプションあり', async () => {
    setup();
    const options = ['option1', 'option2', 'option3'];
    const defaultOption = 'option2';
    const result = await PromptUtils.select(
      '選択してください',
      options,
      defaultOption,
    );
    assertEquals(result, 'option2');
    assertSpyCall(mockSelect, 0, {
      args: [{
        message: '選択してください',
        options,
        default: 'option2',
      }],
    });
    cleanup();
  });

  await t.step('input - デフォルト値なし', async () => {
    setup();
    const result = await PromptUtils.input('入力してください');
    assertEquals(result, 'input value');
    assertSpyCall(mockInput, 0, {
      args: [{
        message: '入力してください',
        default: undefined,
      }],
    });
    cleanup();
  });

  await t.step('input - デフォルト値あり', async () => {
    setup();
    const defaultValue = 'default value';
    const result = await PromptUtils.input('入力してください', defaultValue);
    assertEquals(result, 'default value');
    assertSpyCall(mockInput, 0, {
      args: [{
        message: '入力してください',
        default: defaultValue,
      }],
    });
    cleanup();
  });
});
