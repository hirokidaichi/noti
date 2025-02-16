# noti - Notion CLI Tool

NotionのページやデータベースをCLIから操作するためのツールです。

## 特徴

- 🔍 高速な検索機能（fuzzy検索対応）
- 📝 ページの作成・編集・取得
- 🗃️ データベースの操作
- 🔐 安全なAPI Token管理
- 📊 Markdownインポート/エクスポート対応

## インストール

### 方法1: Denoを使用してソースからインストール

```bash
# リポジトリのクローン
git clone https://github.com/hirokidaichi/noti.git
cd noti

# 依存関係のインストール
deno add @std/assert
deno add @std/path
deno add @std/testing
deno add @std/dotenv
deno add @std/fs
deno add @cliffy/command
deno add @cliffy/prompt
deno add @notionhq/client

# インストール
deno task install
```

### 方法2: URLから直接インストール

```bash
deno install --global -A -f -n noti --import-map https://raw.githubusercontent.com/hirokidaichi/noti/main/deno.json https://raw.githubusercontent.com/hirokidaichi/noti/main/src/main.ts
```

### 開発者向け

```bash
# ソースからコンパイル
git clone https://github.com/hirokidaichi/noti.git
cd noti

# 現在のプラットフォーム用にコンパイル
deno task compile

# 全プラットフォーム用にコンパイル
deno task compile:all

# 開発モードで実行
deno task dev

# テストの実行
deno task test
```

## 設定

初回実行時に、Notion Integration Tokenの設定が必要です。
トークンは[Notion Integrations](https://www.notion.so/my-integrations)から取得できます。

```bash
noti configure
```

設定したトークンは`~/.config/noti/config.json`に安全に保存されます。

## 基本的な使い方

### ページ操作

#### ページの取得

```bash
# Markdownとして取得
noti page get <page_id_or_url>

# JSON形式で取得
noti page get <page_id_or_url> --format json

# ファイルに出力
noti page get <page_id_or_url> -o output.md
```

#### ページの作成

```bash
# 親ページの下に新規ページを作成
noti page create <parent_id_or_url> <input_file.md>

# タイトルを指定して作成
noti page create <parent_id_or_url> <input_file.md> -t "ページタイトル"
```

タイトルを指定しない場合：

1. 入力ファイルの最初の見出し1（# ）をタイトルとして使用
2. 見出しがない場合は、ファイル名（拡張子なし）をタイトルとして使用

#### ページへのコンテンツ追加

```bash
# 既存ページに新しいコンテンツを追加
noti page append <page_id_or_url> <input_file.md>
```

#### ページの更新

```bash
# ページの内容を更新
noti page update <page_id_or_url> <input_file.md>

# タイトルを変更
noti page update <page_id_or_url> <input_file.md> -t "新しいタイトル"

# 確認なしで更新
noti page update <page_id_or_url> <input_file.md> -f
```

#### ページのコメント

```bash
# コメントの取得
noti page comment get <page_id_or_url>

# JSON形式でコメントを取得
noti page comment get <page_id_or_url> --format json

# コメントの追加
noti page comment add <page_id_or_url> "コメント内容"
```

#### ページの削除

```bash
# 確認プロンプトあり
noti page remove <page_id_or_url>

# 確認なしで削除
noti page remove <page_id_or_url> -f
```

### データベース操作

#### データベースの一覧表示

```bash
# インタラクティブな一覧表示（fuzzy finder）
noti database list

# JSON形式で出力
noti database list --json

# 取得件数を制限（デフォルト: 50）
noti database list --limit 10

# ファイルに出力
noti database list -o output.json
```

データベース一覧の特徴：

- インタラクティブなfuzzy検索UI（デフォルト）
- 選択したデータベースのIDを出力（他のコマンドとパイプで連携可能）
- 作成日時、更新日時、URLなどの情報を含む

使用例：

```bash
# データベースを選択してブラウザで開く
noti database list | xargs noti open

# データベースを選択してページを追加
noti database list | xargs noti database page add
```

#### データベースページの作成

```bash
# インタラクティブにプロパティを入力
noti database page add <database_id_or_url>

# JSONファイルからプロパティを指定
noti database page create <database_id_or_url> <properties.json>
```

インタラクティブモードでは、データベースの各プロパティタイプに応じて適切な入力方法が提供されます：

- `title`: タイトルテキスト（必須）
- `rich_text`: 複数行テキスト
- `select`: ドロップダウンから選択
- `multi_select`: 複数選択（チェックボックス）
- `checkbox`: はい/いいえの選択
- `number`: 数値入力（バリデーションあり）
- `date`: 日付入力（ISO 8601形式）
- `url`: URL入力
- `email`: メールアドレス入力
- `phone_number`: 電話番号入力

JSONファイルでの作成例：

```json
{
  "properties": {
    "名前": "プロジェクトA",
    "状態": "進行中",
    "優先度": "高",
    "期限": "2024-03-31",
    "担当者": ["山田", "鈴木"],
    "完了": false
  }
}
```

#### データベースページの取得

```bash
# Markdown形式で取得
noti database page get <page_id_or_url>

# JSON形式で取得
noti database page get <page_id_or_url> --json

# ファイルに出力
noti database page get <page_id_or_url> -o output.md
```

出力形式：

1. プロパティセクション
   - 各プロパティの名前と値
   - 日付、選択肢、チェックボックスなどは適切にフォーマット
2. コンテンツセクション
   - ページ内のブロックをMarkdown形式で表示

出力例：

```markdown
# プロパティ

- 名前: プロジェクトA
- 状態: 進行中
- 優先度: 高
- 期限: 2024-03-31
- 担当者: 山田, 鈴木
- 完了: ✗

# コンテンツ

プロジェクトの詳細説明...
```

#### データベースページの削除

```bash
# 確認プロンプトあり
noti database page remove <page_id_or_url>

# 確認なしで削除
noti database page remove <page_id_or_url> -f
```

注意事項：

- データベースページの削除は、アーカイブとして処理されます
- 削除前に確認プロンプトが表示されます（-fオプションでスキップ可能）
- 削除されたページは、Notionのウェブインターフェースから復元可能です

### 検索

```bash
# インタラクティブな検索（fuzzy finder）
noti search

# キーワードで検索
noti search "検索キーワード"

# 親ページ/データベース配下のみ検索
noti search "検索キーワード" -p <parent_id>

# 検索結果の件数を制限（デフォルト: 100）
noti search "検索キーワード" --limit 10

# JSON形式で結果を出力
noti search "検索キーワード" --json
```

検索機能の特徴：

- インタラクティブなfuzzy検索UI（キーワード未指定時）
- 検索結果は最大50文字でトリミング
- データベースとページの両方を検索
- 選択したアイテムのIDを出力（他のコマンドとパイプで連携可能）

使用例：

```bash
# 検索して選択したページをブラウザで開く
noti search | xargs noti open

# 検索して選択したページの内容を取得
noti search | xargs noti page get
```

### エイリアス管理

頻繁にアクセスするページやデータベースにエイリアスを設定できます。
エイリアスを設定すると、長いページIDやURLの代わりに短い名前で参照できます。

```bash
# エイリアスの追加
noti alias add <alias_name> <page_id_or_url>

# エイリアスの削除
noti alias remove <alias_name>

# エイリアス一覧の表示
noti alias list

# JSON形式でエイリアス一覧を表示
noti alias list --json
```

エイリアスの使用例：

```bash
# エイリアスの設定
noti alias add daily-notes f123456789...

# エイリアスを使用してページを開く
noti open daily-notes

# エイリアスを使用してページを取得
noti page get daily-notes
```

エイリアスは`~/.config/noti/aliases.json`に保存され、全てのコマンドで使用できます。

### ブラウザで開く

```bash
# ページやデータベースをブラウザで開く
noti open <page_id_or_url_or_alias>
```

`open`コマンドは、OSに応じて適切なブラウザを自動的に選択します：

- macOS: `open`コマンド
- Linux: `xdg-open`コマンド
- Windows: `start`コマンド

### ユーザー情報の取得

```bash
# 現在のユーザー情報を表示
noti user

# JSON形式で表示
noti user --json
```

表示される情報：

- ユーザーID
- 名前
- アカウントタイプ
- メールアドレス（存在する場合）
- アバターURL（存在する場合）

出力例：

```
ID: user_xxxxxxxxxxxx
名前: 山田太郎
タイプ: person
メール: yamada@example.com
アバター: https://example.com/avatar.png
```

## デバッグモード

各コマンドで `-d` または `--debug`
オプションを使用すると、詳細なデバッグ情報が表示されます。

```bash
noti page get <page_id_or_url> -d
```

## 注意事項

- ページIDやURLは、NotionのWebインターフェースからコピーできます
- データベースの操作には、適切な権限が必要です
- APIトークンは、Notionの統合設定ページから取得できます
- ページIDは32文字の16進数である必要があります
- 設定ファイルは`~/.config/noti/`ディレクトリに保存されます
  - `config.json`: API Token等の設定
  - `aliases.json`: エイリアス設定

## ライセンス

MIT License

## コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 仕様

詳細な仕様については[spec.md](spec.md)を参照してください。
