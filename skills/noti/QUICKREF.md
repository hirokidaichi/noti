# noti Quick Reference

## Install Skill
```bash
noti setup-skills --user      # Install to ~/.claude/skills/
noti setup-skills --project   # Install to ./.claude/skills/
```

## Configuration
```bash
noti configure --token <token>    # Set API token
noti configure --show             # Show current settings
```

## Page Operations
```bash
noti page get <id>                # Get (Markdown)
noti page get <id> -f json        # Get (JSON)
noti page create <parent> file.md # Create
noti page update <id> file.md -f  # Update (-f required)
noti page append <id> file.md     # Append
noti page remove <id> -f          # Delete (-f required)
```

## Database Operations
```bash
noti database list                # List (tab-separated)
noti database list --json         # List (JSON)
noti database query <id>          # Query
noti database query <id> -f "Status=Done"           # Filter
noti database query <id> -s "Name:asc"              # Sort
noti database export <id> -f csv -o data.csv        # Export
noti database import -f data.csv -d <id>            # Import
noti database create <parent> schema.json           # Create
```

## Database Pages
```bash
noti database page add <db_id> data.json  # Add from JSON
noti database page get <page_id>          # Get
noti database page remove <page_id> -f    # Delete (-f required)
```

## Comments
```bash
noti page comment get <id>                          # Get
noti page comment add <id> "comment"                # Add
noti page comment reply <id> <thread> "reply"       # Reply
```

## Search
```bash
noti search "keyword"             # Search
noti search "keyword" --json      # JSON output
```

## Blocks
```bash
noti block get <id>               # Get
noti block list <parent_id>       # List
noti block delete <id> -f         # Delete (-f required)
```

## Aliases
```bash
noti alias add <name> <id>        # Add
noti alias list                   # List
noti alias remove <name>          # Remove
noti open <alias>                 # Open in browser
```

## Users
```bash
noti user me                      # Current user
noti user list                    # List
noti user get <id>                # Get
```

## Common Options
```
-d, --debug     Debug mode
-f, --force     Execute destructive operations (required for delete/update)
--json          JSON output
-o, --output    File output
```

## Filter Operators
```
=, !=           Equality
>, <, >=, <=    Comparison
contains        Contains
!contains       Does not contain
```

## JSON Formats

### Database Schema (schema.json)
```json
{
  "title": "DB Name",
  "properties": {
    "Name": { "type": "title" },
    "Status": { "type": "select", "options": ["A", "B"] }
  }
}
```

### Page Data (page_data.json)
```json
{
  "properties": {
    "Name": "value",
    "Status": "A"
  }
}
```
