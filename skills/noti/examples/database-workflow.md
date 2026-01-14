# データベース操作ワークフロー例

## データベースクエリの活用

### 基本的なフィルタリング

```bash
# ステータスが「完了」のアイテム
noti database query <db_id> -f "Status=Done"

# 優先度が「高」のアイテム
noti database query <db_id> -f "Priority=High"

# 複数条件（AND）
noti database query <db_id> -f "Status=In Progress" -f "Priority=High"
```

### テキスト検索

```bash
# タイトルに特定の文字列を含む
noti database query <db_id> -f "Name contains プロジェクト"

# タイトルに特定の文字列を含まない
noti database query <db_id> -f "Name !contains テスト"
```

### 数値比較

```bash
# 見積もり時間が10以上
noti database query <db_id> -f "Estimate>=10"

# スコアが80より大きい
noti database query <db_id> -f "Score>80"
```

### 日付フィルタ

```bash
# 特定の日付以降
noti database query <db_id> -f "DueDate>=2024-01-01"

# 特定の日付より前
noti database query <db_id> -f "CreatedAt<2024-06-01"
```

### ソートオプション

```bash
# 名前で昇順
noti database query <db_id> -s "Name:asc"

# 作成日時で降順（新しい順）
noti database query <db_id> -s "created_time:desc"

# 複合ソート
noti database query <db_id> -s "Priority:desc" -s "Name:asc"
```

## CSVインポート

### CSVファイルの準備

```csv
Name,Status,Priority,DueDate
タスク1,Todo,High,2024-02-01
タスク2,In Progress,Medium,2024-02-15
タスク3,Done,Low,2024-01-31
```

### マッピングファイル（オプション）

CSVのカラム名とNotionプロパティ名が異なる場合：

```json
[
  {
    "sourceField": "task_name",
    "targetField": "Name",
    "dataType": "title"
  },
  {
    "sourceField": "state",
    "targetField": "Status",
    "dataType": "select"
  },
  {
    "sourceField": "due",
    "targetField": "DueDate",
    "dataType": "date"
  }
]
```

### インポート実行

```bash
# まずドライランで検証
noti database import -f tasks.csv -d <db_id> --dry-run

# 問題なければ実行
noti database import -f tasks.csv -d <db_id>

# マッピングファイルを使用
noti database import -f tasks.csv -d <db_id> --map-file mapping.json
```

## データベースページの追加

### JSONファイルからの追加

```json
{
  "Name": {
    "title": [{ "text": { "content": "新しいタスク" } }]
  },
  "Status": {
    "select": { "name": "Todo" }
  },
  "Priority": {
    "select": { "name": "High" }
  },
  "DueDate": {
    "date": { "start": "2024-02-01" }
  },
  "Tags": {
    "multi_select": [
      { "name": "開発" },
      { "name": "緊急" }
    ]
  }
}
```

```bash
noti database page add <db_id> -j new_task.json
```

## バックアップと移行

### 定期バックアップスクリプト

```bash
#!/bin/bash
BACKUP_DIR="./notion_backups"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# データベース一覧を取得してバックアップ
noti database list --json | jq -r '.[].id' | while read db_id; do
  noti database export "$db_id" -f csv -o "$BACKUP_DIR/${db_id}_${DATE}.csv"
done
```

### データ分析用エクスポート

```bash
# JSON形式でエクスポートしてjqで加工
noti database export <db_id> -f json -o data.json

# ステータス別の集計
cat data.json | jq 'group_by(.properties.Status.select.name) | map({status: .[0].properties.Status.select.name, count: length})'
```
