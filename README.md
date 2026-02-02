<p align="center">
  <h1 align="center">noti</h1>
  <p align="center">
    <strong>Notion CLI for AI Agents & Humans</strong>
  </p>
  <p align="center">
    Seamlessly integrate Notion into your AI-powered workflows
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#agent-skills">Agent Skills</a> •
  <a href="#cli-usage">CLI Usage</a> •
  <a href="./README-ja.md">日本語</a>
</p>

---

## Why noti?

**noti** bridges the gap between Notion and AI agents like Claude Code. Instead of manually copy-pasting content, let your AI assistant directly read, create, and manage your Notion workspace.

- **AI-Native Design** — Built as a Claude Code Agent Skill for seamless AI integration
- **Full Notion API Coverage** — Pages, databases, blocks, comments, and search
- **Non-Interactive** — All commands work without prompts, perfect for automation
- **Markdown-First** — Read and write content in familiar Markdown format

## Quick Start

### 1. Install

```bash
npm install -g @hirokidaichi/noti
```

Or build from source:

```bash
git clone https://github.com/hirokidaichi/noti.git
cd noti
npm install && npm run build && npm link
```

### 2. Configure

Get your Integration Token from [Notion Integrations](https://www.notion.so/my-integrations), then:

```bash
noti configure --token <your_token>
```

### 3. Install Agent Skills (for Claude Code)

```bash
# Install to your home directory (available globally)
noti setup-skills --user

# Or install to current project only
noti setup-skills --project
```

That's it! Claude Code will now have access to all noti commands.

## Agent Skills

noti is designed to work as a **Claude Code Agent Skill**. Once installed, Claude can:

### Read & Understand Your Notion

```
"Read the meeting notes from last week"
"What tasks are marked as high priority in my project database?"
"Show me the latest entries in my journal"
```

### Create & Update Content

```
"Create a new page summarizing our discussion"
"Add a task to the project database with priority high"
"Append today's notes to my daily log"
```

### Search & Query

```
"Find all pages mentioning 'quarterly review'"
"List incomplete tasks sorted by due date"
"Export the customer database as CSV"
```

### Manage Your Workspace

```
"Set up an alias 'tasks' for my task database"
"Archive completed items from last month"
"Import this CSV data into the contacts database"
```

## CLI Usage

All commands work in your terminal too:

### Pages

```bash
noti page get <id>                    # Get page as Markdown
noti page create <parent> file.md     # Create from Markdown
noti page update <id> file.md -f      # Update content
noti page append <id> file.md         # Append content
noti page remove <id> -f              # Delete page
```

### Databases

```bash
noti database list                    # List all databases
noti database query <id>              # Query database
noti database query <id> -f "Status=Done" -s "Name:asc"
noti database export <id> -f csv -o data.csv
noti database import -f data.csv -d <id>
```

### Search

```bash
noti search "keyword"                 # Search workspace
noti search "keyword" --json          # JSON output
```

### Aliases

```bash
noti alias add tasks <database_id>    # Create shortcut
noti open tasks                       # Open in browser
```

## Command Reference

| Command | Description |
|---------|-------------|
| `configure` | Set up Notion API token |
| `page` | Page operations (get/create/update/append/remove) |
| `database` | Database operations (list/query/export/import/create) |
| `search` | Search pages and databases |
| `block` | Block operations (get/list/delete) |
| `alias` | Manage shortcuts to pages/databases |
| `user` | User information |
| `open` | Open page in browser |
| `setup-skills` | Install Agent Skills for Claude Code |

## Examples

### Daily Standup Automation

```bash
# Claude can create your standup notes
"Create a standup note for today with sections for Yesterday, Today, and Blockers"
```

### Database Backup

```bash
# Export your important data
noti database export <id> -f csv -o backup_$(date +%Y%m%d).csv
```

### Bulk Import

```bash
# Import data with validation
noti database import -f contacts.csv -d <id> --dry-run  # Validate first
noti database import -f contacts.csv -d <id>            # Execute
```

### Meeting Notes Workflow

```bash
# Claude can help manage meeting notes
"Find the meeting notes from the product sync and summarize the action items"
"Create a follow-up page with the decisions we discussed"
```

## Configuration

Config files are stored in `~/.config/noti/`:

- `config.json` — API token and settings
- `aliases.json` — Page/database aliases

## Requirements

- Node.js 18+
- Notion Integration Token
- Claude Code (for Agent Skills)

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  <sub>Built for the AI-powered workflow era</sub>
</p>
