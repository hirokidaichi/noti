# noti - Notion CLI Tool

NotionのページやデータベースをCLIから操作するためのツールです。

[🎮 デモンストレーションガイド](docs/demonstration.md)で、主要機能の実践的な使い方を体験できます。

## 特徴

- 🔍 高速な検索機能（fuzzy検索対応）
- 📝 ページの作成・編集・取得
- 🗃️ データベースの操作
- 🔐 安全なAPI Token管理
- 📊 Markdownインポート/エクスポート対応

## インストール

### 方法1: git cloneからインストール

```bash
git clone https://github.com/hirokidaichi/noti.git
cd noti
deno task install
```

### 方法2: URLから直接インストール

```bash
deno install --global -A -f -n noti --import-map https://raw.githubusercontent.com/hirokidaichi/noti/main/import_map.json https://raw.githubusercontent.com/hirokidaichi/noti/main/src/main.ts
```

## 設定

初回実行時に、Notion Integration Tokenの設定が必要です。
トークンは[Notion Integrations](https://www.notion.so/my-integrations)から取得できます。

## コマンド一覧

### 1. configure - 初期設定

```bash
noti configure                    # 対話的に設定を行う
noti configure --token <token>    # トークンを直接指定
noti configure --show            # 現在の設定を表示
```

使用例：

```bash
# 初回セットアップ
noti configure
> Notion Integration Tokenを入力してください: 
> トークンを保存しました

# 設定の確認
noti configure --show
> Token: secret_...
> 設定ファイル: ~/.config/noti/config.json
```

### 2. page - ページ操作

```bash
# ページの取得
noti page get <page_id_or_url>                    # Markdownとして取得
noti page get <page_id_or_url> --format json      # JSON形式で取得
noti page get <page_id_or_url> -o output.md       # ファイルに出力

# ページの作成
noti page create <parent_id_or_url> <input_file.md>                    # 親ページの下に作成
noti page create <parent_id_or_url> <input_file.md> -t "タイトル"      # タイトルを指定
noti page create <parent_id_or_url> --template <template_id>           # テンプレートから作成

# ページの更新
noti page update <page_id_or_url> <input_file.md>                      # 内容を更新
noti page update <page_id_or_url> <input_file.md> -t "新しいタイトル"  # タイトルも更新
noti page update <page_id_or_url> <input_file.md> -f                   # 確認なしで更新

# ページの追記
noti page append <page_id_or_url> <input_file.md>                      # 既存ページに追記

# コメント操作
noti page comment get <page_id_or_url>                                 # コメント一覧取得
noti page comment get <page_id_or_url> --format json                   # JSON形式で取得
noti page comment add <page_id_or_url> "コメント内容"                  # コメント追加

# ページの削除
noti page remove <page_id_or_url>                                      # 確認あり
noti page remove <page_id_or_url> -f                                   # 確認なし
```

使用例：

```bash
# Markdownファイルから新規ページを作成
echo "# テストページ" > test.md
noti page create <parent_id> test.md

# ページの内容を取得してファイルに保存
noti page get <page_id> -o page.md

# ページにコメントを追加
noti page comment add <page_id> "タスクが完了しました"
```

### 3. database - データベース操作

```bash
# データベース一覧
noti database list                           # インタラクティブ表示
noti database list --json                    # JSON形式で出力
noti database list --limit 10                # 取得件数制限
noti database list -o output.json            # ファイルに出力

# データベースページの作成
noti database page add <database_id_or_url>  # インタラクティブに作成
noti database page create <database_id_or_url> <properties.json>  # JSONから作成

# データベースページの取得
noti database page get <page_id_or_url>      # Markdown形式で取得
noti database page get <page_id_or_url> --json  # JSON形式で取得
noti database page get <page_id_or_url> -o output.md  # ファイルに出力

# データベースのエクスポート
noti database export <database_id_or_url>     # JSON形式（デフォルト）
noti database export <database_id_or_url> -f csv  # CSV形式
noti database export <database_id_or_url> -f markdown  # Markdown形式
```

使用例：

```bash
# データベースの一覧を取得してJSONで保存
noti database list --json > databases.json

# プロパティファイルからデータベースページを作成
cat << EOF > properties.json
{
  "properties": {
    "名前": "新規タスク",
    "状態": "未着手",
    "期限": "2024-03-31"
  }
}
EOF
noti database page create <database_id> properties.json
```

### 4. search - 検索

```bash
noti search                           # インタラクティブ検索
noti search "検索キーワード"          # キーワード検索
noti search -p <parent_id>           # 特定ページ配下を検索
noti search --limit 10               # 検索結果数制限
noti search --json                   # JSON形式で出力
```

### 5. alias - エイリアス管理

```bash
noti alias add <alias_name> <page_id_or_url>  # エイリアス追加
noti alias remove <alias_name>                 # エイリアス削除
noti alias list                                # 一覧表示
noti alias list --json                         # JSON形式で表示
```

### 6. open - ブラウザで開く

```bash
noti open <page_id_or_url_or_alias>           # ページを開く
noti open --app <app_name>                     # 特定アプリで開く
```

### 7. user - ユーザー情報

```bash
noti user                            # ユーザー情報表示
noti user --json                     # JSON形式で表示
```

## オプション

以下のオプションは全てのコマンドで使用可能です：

```bash
-d, --debug                          # デバッグモード
-h, --help                          # ヘルプ表示
-v, --version                       # バージョン表示
--format <format>                   # 出力形式指定（json/markdown）
-o, --output <file>                 # 出力先ファイル指定
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

## 高度な使用方法

### パイプラインの活用

```bash
# 検索結果をページ取得にパイプ
noti search "会議" | xargs -I {} noti page get {}

# データベース一覧から複数のエクスポート
noti database list | xargs -I {} noti database export {} -f csv -o {}.csv

# エイリアスを使ったバッチ処理
noti alias list --json | jq -r '.[] | .id' | xargs -I {} noti page get {}
```

### シェルスクリプトとの連携

```bash
#!/bin/bash
# 日次レポートの自動作成
TODAY=$(date +%Y-%m-%d)
cat << EOF > report.md
# 日次レポート ${TODAY}
## 概要
- 作成日: ${TODAY}
- 作成者: $(noti user | grep '名前' | cut -d: -f2)
EOF

noti page create <parent_id> report.md -t "日次レポート ${TODAY}"
```

### エラー対処方法

よくあるエラーとその対処方法：

1. 認証エラー

```bash
Error: Authentication failed
→ noti configure で正しいトークンを設定

Error: Token not found
→ 環境変数 NOTION_TOKEN を設定するか、configure を実行
```

2. 権限エラー

```bash
Error: Permission denied
→ Notionの統合設定でページ/データベースへのアクセスを許可

Error: Resource not found
→ ページ/データベースが存在するか確認し、アクセス権限を確認
```

3. 入力形式エラー

```bash
Error: Invalid page ID format
→ 32文字の16進数IDまたは有効なNotionのURLを指定

Error: Invalid JSON format
→ JSONファイルの形式を確認（特にカンマの位置やクォート）
```

### 設定ファイルのカスタマイズ

`~/.config/noti/config.json`:

```json
{
  "token": "secret_...",
  "default_format": "markdown",
  "editor": "vim",
  "browser": "firefox",
  "debug": false
}
```

`~/.config/noti/aliases.json`:

```json
{
  "daily": "page_id_for_daily_notes",
  "tasks": "database_id_for_tasks",
  "team": "page_id_for_team_space"
}
```
