---
name: noti
description: Notion CLI tool for managing pages, databases, and content. Use when working with Notion data, creating/updating pages, querying databases, or syncing content.
---

# noti - Notion CLI Tool Skill

noti is a CLI tool for operating Notion from the command line. With this skill, you can create/edit pages, manipulate databases, search, and more.

## Installing noti

```bash
# Install from npm
npm install -g @hirokidaichi/noti
```

Or build from source:

```bash
git clone https://github.com/hirokidaichi/noti.git
cd noti
npm install && npm run build && npm link
```

## Installing the Skill

```bash
# Install to user directory (available for all projects)
noti setup-skills --user

# Install to project directory (this project only)
noti setup-skills --project
```

## Initial Setup

Set your Notion API token:

```bash
noti configure --token <your_token>

# Check current settings
noti configure --show
```

Get your Notion Integration Token from https://www.notion.so/my-integrations

## Page Operations

### Get Page

```bash
# Get as Markdown (default)
noti page get <page_id_or_url>

# Get as JSON
noti page get <page_id_or_url> --format json

# Output to file
noti page get <page_id_or_url> -o output.md
```

### Create Page

```bash
# Create page from Markdown file
noti page create <parent_page_id> content.md

# Create with specific title
noti page create <parent_page_id> content.md -t "New Page"
```

The first `# heading` in the Markdown file is used as the title (can be overridden with `-t` option).

### Update Page

```bash
# Replace page content (-f required)
noti page update <page_id> new_content.md -f
```

### Append to Page

```bash
noti page append <page_id> additional_content.md
```

### Delete Page

```bash
# -f option required
noti page remove <page_id> -f
```

## Database Operations

### List Databases

```bash
# Tab-separated list
noti database list

# JSON output
noti database list --json
```

### Show Database Schema

```bash
# Table format (human/AI readable)
noti database schema <database_id>

# JSON format (full property definitions)
noti database schema <database_id> --json

# Output to file
noti database schema <database_id> --json -o schema.json
```

Shows property names, types, and available options (select/multi_select/status).
Use `--json` to get detailed type information for programmatic use.

### Query Database

```bash
# Basic query
noti database query <database_id>

# Query with filter
noti database query <database_id> -f "Status=Done"
noti database query <database_id> -f "Priority!=Low" -f "Status=In Progress"

# Query with sort
noti database query <database_id> -s "Name:asc"
noti database query <database_id> -s "created_time:desc"

# Combined query
noti database query <database_id> -f "Status=Done" -s "Name:asc" --limit 10
```

**Filter Operators:**
- `=`, `!=` - Equality comparison
- `>`, `<`, `>=`, `<=` - Numeric/date comparison
- `contains`, `!contains` - Text/multi-select search

### Export Database

```bash
# JSON format
noti database export <database_id> -f json -o data.json

# CSV format
noti database export <database_id> -f csv -o data.csv

# Markdown format
noti database export <database_id> -f markdown -o data.md
```

### Import to Database

```bash
# Import from CSV
noti database import -f data.csv -d <database_id>

# Dry run (validation only)
noti database import -f data.csv -d <database_id> --dry-run

# Use mapping file
noti database import -f data.csv -d <database_id> --map-file mapping.json
```

### Create Database

```bash
# Create with schema JSON file
noti database create <parent_page_id> schema.json
```

Schema JSON format:
```json
{
  "title": "Task Management",
  "properties": {
    "Name": { "type": "title" },
    "Status": { "type": "select", "options": ["Todo", "In Progress", "Done"] },
    "Priority": { "type": "number" },
    "DueDate": { "type": "date" }
  }
}
```

### Database Page Operations

```bash
# Add page from JSON file
noti database page add <database_id> page_data.json

# Get page
noti database page get <page_id>

# Update page properties from JSON file
noti database page update <page_id> page_data.json

# Delete page (-f required)
noti database page remove <page_id> -f
```

Page data JSON format (used for both add and update):
```json
{
  "properties": {
    "Name": "Task Name",
    "Status": "Todo",
    "Priority": 1
  }
}
```

For update, only the specified properties are changed; other properties remain unchanged.

## Comment Operations

```bash
# Get comments
noti page comment get <page_id>

# Display as threads
noti page comment get <page_id> -f thread

# Add comment
noti page comment add <page_id> "Comment content"

# Reply to thread
noti page comment reply <page_id> <thread_id> "Reply content"

# List threads
noti page comment list-threads <page_id>
```

## Search

```bash
# Keyword search
noti search "search keyword"

# JSON output
noti search "keyword" --json

# Limit results
noti search "keyword" --limit 50
```

## Block Operations

```bash
# Get block
noti block get <block_id>

# Get with children
noti block get <block_id> -c

# List blocks
noti block list <page_id>

# Delete block (-f required)
noti block delete <block_id> -f
```

## Alias Management

Set aliases for frequently used pages:

```bash
# Add alias
noti alias add mypage <page_id_or_url>

# Set alias (same as add)
noti alias set mypage <page_id_or_url>

# List aliases
noti alias list

# Remove alias
noti alias remove mypage

# Open page using alias
noti open mypage
```

## User Information

```bash
# Current user
noti user me

# List workspace users
noti user list

# Get specific user
noti user get <user_id>
```

## Open in Browser

```bash
noti open <page_id_or_url_or_alias>
```

## Examples: Typical Workflows

### 1. Create and Save Meeting Notes

```bash
# Write meeting notes in Markdown and save to Notion
echo "# Meeting Notes 2024-01-15

## Attendees
- Alice
- Bob

## Agenda
1. Project progress
2. Next actions

## Decisions
- Finalize design by next week
" > meeting.md

noti page create <parent_page_id> meeting.md
```

### 2. Search and Update Tasks

```bash
# Search incomplete tasks
noti database query <task_db_id> -f "Status!=Done" -s "Priority:desc"

# Check specific task
noti database page get <task_page_id>
```

### 3. Data Backup

```bash
# Export entire database as CSV
noti database export <database_id> -f csv -o backup_$(date +%Y%m%d).csv
```

### 4. Bulk Data Import

```bash
# Import to database from CSV
noti database import -f new_data.csv -d <database_id> --dry-run  # Validate first
noti database import -f new_data.csv -d <database_id>            # Execute
```

## Notes

- Page ID, database ID, or Notion URL can be specified
- Set aliases to access with short names instead of IDs or URLs
- Use `--debug` or `-d` option for detailed logs
- Destructive operations (delete, update) require `-f` option
