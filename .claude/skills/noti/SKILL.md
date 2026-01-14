# noti - Notion CLI Tool Skill

notiはNotionをコマンドラインから操作するためのCLIツールです。このスキルを使用することで、ページの作成・編集、データベースの操作、検索などをNotionに対して実行できます。

## 初期設定

初めて使用する場合は、Notion APIトークンを設定してください：

```bash
noti configure
```

Notion Integration Token は https://www.notion.so/my-integrations から取得できます。

## ページ操作

### ページの取得

```bash
# Markdown形式で取得
noti page get <page_id_or_url>

# JSON形式で取得
noti page get <page_id_or_url> -f json

# ファイルに出力
noti page get <page_id_or_url> -o output.md
```

### ページの作成

```bash
# Markdownファイルからページを作成
noti page create <parent_page_id> content.md

# タイトルを指定して作成
noti page create <parent_page_id> content.md -t "新しいページ"
```

Markdownファイルの最初の`# 見出し`がタイトルとして使用されます（`-t`オプションで上書き可能）。

### ページの更新

```bash
# ページ内容を置き換え
noti page update <page_id> new_content.md

# 確認なしで更新
noti page update <page_id> new_content.md -f
```

### ページへの追記

```bash
noti page append <page_id> additional_content.md
```

### ページの削除

```bash
# 確認あり
noti page remove <page_id>

# 確認なし
noti page remove <page_id> -f
```

## データベース操作

### データベース一覧の取得

```bash
noti database list
noti database list --json
```

### データベースのクエリ

```bash
# 基本的なクエリ
noti database query <database_id>

# フィルタ付きクエリ
noti database query <database_id> -f "Status=Done"
noti database query <database_id> -f "Priority!=Low" -f "Status=In Progress"

# ソート付きクエリ
noti database query <database_id> -s "Name:asc"
noti database query <database_id> -s "created_time:desc"

# 複合クエリ
noti database query <database_id> -f "Status=Done" -s "Name:asc" --limit 10
```

**フィルタ演算子:**
- `=`, `!=` - 等価比較
- `>`, `<`, `>=`, `<=` - 数値・日付比較
- `contains`, `!contains` - テキスト・マルチセレクト検索

### データベースのエクスポート

```bash
# JSON形式
noti database export <database_id> -f json -o data.json

# CSV形式
noti database export <database_id> -f csv -o data.csv

# Markdown形式
noti database export <database_id> -f markdown -o data.md
```

### データベースへのインポート

```bash
# CSVからインポート
noti database import -f data.csv -d <database_id>

# ドライラン（検証のみ）
noti database import -f data.csv -d <database_id> --dry-run

# マッピングファイルを使用
noti database import -f data.csv -d <database_id> --map-file mapping.json
```

### データベースの作成

```bash
# インタラクティブに作成
noti database create

# オプション指定
noti database create --title "タスク管理" --parent <parent_page_id>
```

### データベースページの操作

```bash
# ページの追加（インタラクティブ）
noti database page add <database_id>

# JSONから追加
noti database page add <database_id> -j page_data.json

# ページの取得
noti database page get <page_id>

# ページの削除
noti database page remove <page_id>
```

## コメント操作

```bash
# コメント一覧を取得
noti page comment get <page_id>

# スレッド形式で表示
noti page comment get <page_id> -f thread

# コメントを追加
noti page comment add <page_id> "コメント内容"

# スレッドに返信
noti page comment reply <page_id> <thread_id> "返信内容"

# スレッド一覧
noti page comment list-threads <page_id>
```

## 検索

```bash
# キーワード検索
noti search "検索キーワード"

# JSON形式で出力
noti search "キーワード" --json

# 件数制限
noti search "キーワード" --limit 50
```

## ブロック操作

```bash
# ブロックの取得
noti block get <block_id>

# 子ブロックも含めて取得
noti block get <block_id> -c

# ブロック一覧
noti block list <page_id>

# ブロックの削除
noti block delete <block_id>
```

## エイリアス管理

よく使うページにエイリアスを設定できます：

```bash
# エイリアスの追加
noti alias add mypage <page_id_or_url>

# エイリアス一覧
noti alias list

# エイリアスの削除
noti alias remove mypage

# エイリアスを使用してページを開く
noti open mypage
```

## ユーザー情報

```bash
# 自分の情報
noti user me

# ワークスペースのユーザー一覧
noti user list

# 特定ユーザーの情報
noti user get <user_id>
```

## ブラウザで開く

```bash
noti open <page_id_or_url_or_alias>
```

## 使用例：典型的なワークフロー

### 1. 議事録の作成と保存

```bash
# Markdownで議事録を書いてNotionに保存
echo "# 会議議事録 2024-01-15

## 参加者
- 田中
- 鈴木

## 議題
1. プロジェクト進捗
2. 次回アクション

## 決定事項
- 来週までにデザイン確定
" > meeting.md

noti page create <parent_page_id> meeting.md
```

### 2. タスクの検索と更新

```bash
# 未完了タスクを検索
noti database query <task_db_id> -f "Status!=Done" -s "Priority:desc"

# 特定のタスクを確認
noti database page get <task_page_id>
```

### 3. データのバックアップ

```bash
# データベース全体をCSVでエクスポート
noti database export <database_id> -f csv -o backup_$(date +%Y%m%d).csv
```

### 4. 一括データ登録

```bash
# CSVからデータベースにインポート
noti database import -f new_data.csv -d <database_id> --dry-run  # まず検証
noti database import -f new_data.csv -d <database_id>            # 実行
```

## 注意事項

- ページID、データベースID、NotionのURLのいずれも指定可能です
- エイリアスを設定しておくと、IDやURLの代わりに短い名前でアクセスできます
- `--debug` または `-d` オプションで詳細なログを確認できます
- 破壊的な操作（削除、更新）には確認プロンプトが表示されます（`-f`で省略可能）
