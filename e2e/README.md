# E2E テスト設定ガイド

## テスト専用ワークスペースのセットアップ

### 1. Notionインテグレーションの作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下の設定で作成:
   - Name: `noti-test` (任意)
   - Associated workspace: テスト専用ワークスペース
   - Capabilities:
     - Read content ✓
     - Update content ✓
     - Insert content ✓
     - Read comments ✓
     - Insert comments ✓
     - Read user information ✓

### 2. テスト用ページの作成

テスト専用ワークスペースに以下の構造を作成:

```
📄 noti-test-root (このページのIDをNOTION_ROOT_IDに設定)
├── 📊 Test Database (テスト用データベース)
│   └── Name (title), Status (select), Tags (multi_select)
├── 📄 Test Page (読み取りテスト用)
└── 📄 Sandbox (書き込みテスト用、テスト後に自動クリーンアップ)
```

### 3. 環境変数の設定

`.env.test` ファイルを作成:

```bash
# テスト専用トークン
NOTION_TOKEN=ntn_xxxxxxxxxxxxx
# または
NOTION_API_KEY=ntn_xxxxxxxxxxxxx

# テストルートページID
NOTION_ROOT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# オプション: テスト専用データベースID
NOTION_TEST_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 4. ページへのインテグレーション接続

1. `noti-test-root` ページを開く
2. 右上の「...」→「Connections」→ 作成したインテグレーションを追加
3. 「Confirm」をクリック

## テストの実行

### Unit テスト (モック使用、高速)
```bash
npm run test:unit
```

### Integration テスト (nockでAPIをモック)
```bash
npm run test:integration
```

### E2E テスト (実API使用)
```bash
# すべてのE2Eテスト
npm run e2e

# 読み取り専用テストのみ (安全)
npm run e2e:readonly
```

## テストレベルの説明

| レベル | 説明 | API使用 | 速度 |
|--------|------|---------|------|
| Unit | 純粋なロジックテスト | モック | 最速 |
| Integration | HTTPリクエストパターンテスト | nock | 速い |
| E2E | 実際のAPI呼び出しテスト | 実API | 遅い |

## CI/CDでの実行

GitHub Actionsで実行する場合、以下のSecretsを設定:

- `NOTION_API_KEY`: テスト用インテグレーショントークン
- `NOTION_ROOT_ID`: テストルートページID

```yaml
env:
  NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
  NOTION_ROOT_ID: ${{ secrets.NOTION_ROOT_ID }}
```

## 注意事項

- テスト専用ワークスペースを使用し、本番データに影響を与えないようにする
- 書き込みテストは `Sandbox` ページ配下で実行し、テスト後にクリーンアップする
- API レート制限に注意 (3 requests/second)
- E2Eテストは並列実行を避ける
