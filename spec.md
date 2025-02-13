# `noti` CLI Specification (Deno Notion Client)

This specification outlines the design of `noti`, a Notion CLI client built with Deno. It covers authentication, input/output handling, data structure flexibility, search interface, error handling, and specific CLI commands. The design is informed by the official Notion API specifications for correctness.

## Authentication: API Token Integration

**API Token:** `noti` uses an API Token for authentication, treating the Notion integration as an **internal integration**. Internal Notion integrations use a simple API token for authorization. Running `noti configure` for initial setup will:

- Prompt the user to enter their Notion API Token, which can be obtained from https://www.notion.so/my-integrations
- Store the token securely in the configuration file (`~/.noti/config.json`)
- Test the token by making a simple API call (e.g., `users.me`) to verify it works

**Token Storage:** The API token is saved to a configuration file (`~/.noti/config.json`). This file is used for subsequent commands to load the token. The config file should be stored securely with appropriate file permissions.

**Scope & Access:** Notion's API requires pages and databases to be explicitly shared with the integration. The user must ensure the integration has access to the pages or databases they want to use. If a workspace or page is not shared, API calls will return 403 errors. After setting up the token, the user needs to:

1. Go to the Notion page or database they want to access
2. Click "Share" and select the integration name
3. Grant access to the integration

This process needs to be repeated for each top-level page or database the user wants to access through the CLI.

## Output Options: File Output vs Standard Output

All `noti` commands support output redirection via a `-o <filename>`/`--output <filename>` option:

- If `-o` is provided, the CLI will write the output to the specified file. For example, `noti page get <page_id> -o page.json` will save the page data to `page.json`. The file will contain the result in a structured format (JSON by default, or Markdown for page content if specified, see below).

- If no output file is specified, results are printed to standard output (stdout). This makes it easy to pipe `noti` output to other commands or view it directly in the terminal.

- Errors and diagnostic messages are **not** printed to this output. They are sent to standard error (stderr) to avoid corrupting the expected output. This ensures that if the output is being piped or saved, it contains only the intended data.

- The CLI may support format flags in the future (e.g. `--format json|markdown`) to control the output format. By default:
  - **Page content** (when retrieving a page or database entry content) will be output as Markdown text if directed to a file with a `.md` extension or if the user requests markdown. Otherwise, JSON structure may be output. (See **Markdown Export/Import** below.)
  - **Page or database metadata** (property values, schemas) will be output as JSON by default, since Notion's data structures (especially database schemas or page properties) are nested.

Examples:
- `noti search "Project"` (no `-o`): launches an interactive search and then prints the selected result or opens it (see Search Interface below).
- `noti database search <db_id> -o results.json`: outputs a JSON array of matching entries (non-interactively) to `results.json`.
- `noti page get <page_id> -o page.md`: retrieves the page content and saves it as a Markdown file.

## Handling Notion Data Structures and Flexible Input

Notion databases have arbitrary schemas (custom properties/fields). `noti` is designed to handle dynamic fields flexibly:

- **Retrieving Database Schema:** The CLI can fetch a database's structure via the Notion API to understand its fields. The `Retrieve a database` endpoint (`GET /v1/databases/{database_id}`) returns the database object with its property schema (field names, types) ([Retrieve a database](https://developers.notion.com/reference/retrieve-a-database#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fdatabases%2F)). This allows `noti` to adapt to any database. For example, it can list all property names and types to know what values are expected.

- **Adding Database Entries:** When using `noti database add`, the user needs to supply values for one or more properties of the new entry. The CLI supports multiple input methods:
  - **Inline arguments:** Possibly using `--prop "FieldName: value"` flags or a single JSON string argument. For example: `noti database add <db_id> --prop "Name: Buy milk" --prop "Status: Done"`. The CLI will parse these and map them to Notion property values in the required JSON structure.
  - **Interactive prompt:** If no property values are provided via flags, `noti` can enter an interactive mode, prompting the user for each property. Required fields (like the title) would be prompted first. The prompt can show the property name and type (e.g. Text, Select, Date) and validate input where possible.
  - **From file/STDIN:** The CLI could accept a JSON or YAML file describing the properties to create. For instance, `noti database add <db_id> -o newItem.json` might read `newItem.json` for input if a separate input flag is provided (though the prompt/flags cover most cases).

- **Mapping to Notion API format:** `noti` will convert user input into Notion API's JSON format for properties. For example:
  - A **title** property requires an array of rich text objects. The CLI will wrap a plain string in the required structure `{ "title": [ { "text": { "content": "<text>" } } ] }`.
  - A **select** property value will be sent as `{ "select": { "name": "<OptionName>" } }`.
  - Multi-select as `{ "multi_select": [ { "name": "Tag1" }, ... ] }`, and so on.
  - Checkbox (boolean) as `{ "checkbox": true/false }`, etc.
  
  The CLI can use the database schema to determine the property type and construct the JSON accordingly. This ensures the keys in the `properties` JSON match the database's property names and types. (When creating a page in a database, the keys of the properties object must exactly match the database's schema properties ([Create a page](https://developers.notion.com/reference/post-page#:~:text=property%20in%20the%C2%A0)).)

- **Creating Databases:** Similarly, `noti database create` needs a schema definition. The user can provide a structure (via a file or interactive prompts) for the new database's properties (name and type for each column). The CLI will then call the create database endpoint with that schema. For instance, a minimal schema might define a Title property (Notion databases require a title property for pages) and any number of additional fields (text, select, etc.). The CLI ensures the JSON is formatted per Notion API, including a parent page ID where the database will be created, the database title, and the `properties` schema. The Notion API requires the new database's parent to be an existing page (or workspace) and a proper properties schema ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=post%20https%3A%2F%2Fapi)).

- **Flexible Field Handling:** Because the CLI doesn't hard-code field names, it works with any database. If a database has properties "Due Date" (Date) or "Tags" (multi-select), the CLI will handle those just as well as a generic "Name" or "Status". It uses the API's response and rules:
  - If a new page is added to a database, all provided property keys must exist in that database (unknown keys will cause a 400 error). The CLI can warn or error if the user tries to use a property name not in the schema.
  - Notion-generated properties like Created Time, Last Edited are read-only and cannot be set via API ([Create a page](https://developers.notion.com/reference/post-page#:~:text=,corresponding%20values%20are%20automatically%20created)), so the CLI will not allow those in input.

- **Example (Database Entry):** If the user runs `noti database add <TasksDB_ID>` interactively, and the Tasks database has properties **Name** (title), **Due** (date), **Done** (checkbox), the CLI might prompt:
  ```
  Name (text): Buy groceries
  Due (date, YYYY-MM-DD): 2025-03-01
  Done (checkbox true/false): false
  ```
  It then constructs:
  ```json
  {
    "parent": { "database_id": "<TasksDB_ID>" },
    "properties": {
      "Name": { "title": [ { "text": { "content": "Buy groceries" } } ] },
      "Due":  { "date": { "start": "2025-03-01" } },
      "Done": { "checkbox": false }
    }
  }
  ```
  and calls `POST /v1/pages` with this body to create the entry in the database ([Create a page](https://developers.notion.com/reference/post-page#:~:text=If%20the%20new%20page%20is,body%20param)).

## Search Interface: Fuzzy Finder (TUI with fzf)

Searching in `noti` is designed to be interactive, leveraging a text-based UI similar to [fzf](https://github.com/junegunn/fzf) for fuzzy finding results.

- **Global Search (`noti search`):** This command allows searching across all pages and databases the integration has access to. It uses Notion's **Search API** (`POST /v1/search`). `noti` will send the query string to this endpoint and get a list of matching pages or databases. Notion's search endpoint returns pages/databases whose titles contain the query text ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities)). If no query is provided (e.g. `noti search` with no arguments), Notion returns **all** pages and databases shared with the integration ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities)). (The CLI may enforce at least an empty query to retrieve all accessible content as a starting list.)

  - The search can be refined by type using the API's `filter` parameter. For example, `filter: {"value": "page"}` to only search pages, or `"database"` for databases ([Search by title](https://developers.notion.com/reference/post-search#:~:text=an%C2%A0integration%E2%80%99s%20capabilities)). The CLI could expose this via flags like `--pages-only` or `--databases-only` if needed.

- **Interactive Selection:** Once results are retrieved, `noti` will present them in an interactive list using a fuzzy finder interface:
  - Each result could be shown as a single line with an identifier and title (and perhaps an icon or label indicating Page vs Database). For example: 
    - `[P] Project Plan` 
    - `[DB] Tasks`.
  - The user can type to filter the list in real-time (fzf fuzzy matching on titles).
  - The user selects a result (e.g., moving with arrow keys and pressing Enter).

- **Result of Selection:** After selection, the CLI can either:
  - **Open** the selected page/database in the Notion web app (similar to `noti open` functionality) if the intent is quick navigation, **or**
  - **Print** the selected item's information to stdout (e.g. output the page ID or a JSON of the page). 
  
  By default, it's user-friendly to directly open the page in Notion (as a quick launcher). However, for scripting purposes, we want an option to just get the result. We could design `noti search` such that:
    - If run interactively in a terminal, it uses the TUI and opens the page (with a message to stderr like "Opening Page ...").
    - If the `-o` flag is used or if the output is piped, skip the TUI and output results in a parsable format (like JSON array or newline-separated list). For example, `noti search "Project" -o results.json` would not invoke fzf but simply save all search results to `results.json`.

- **Database-Specific Search (`noti database search`):** This command searches *within a particular database* for entries:
  - It uses Notion's **Query a Database** endpoint (`POST /v1/databases/{database_id}/query`) to retrieve items from that database ([Query a database](https://developers.notion.com/reference/post-database-query#:~:text=post%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fdatabases%2F)). By default (no filters), this returns all pages in the database, paginated if necessary.
  - `noti` can accept a query string or filter to narrow results. If a simple text query is given, the CLI can implement this by using a filter condition on the Title property of the database. For example, if the database's title property is named "Name", and the user runs `noti database search <db_id> "foo"`, the CLI can send:
    ```json
    {
      "filter": {
        "property": "Name",
        "title": { "contains": "foo" }
      }
    }
    ``` 
    in the query request, so that Notion only returns entries whose Name contains "foo". This uses the same filtering capabilities that Notion's UI provides for databases ([Query a database](https://developers.notion.com/reference/post-database-query#:~:text=,%5B)).
  - Alternatively, `noti` can retrieve all entries and then use the local fuzzy finder to filter, which might be simpler but could be less efficient for very large databases.
  - The results (which are pages from the database) are then presented in an interactive list (fzf TUI), similar to global search. Each item can be shown by its primary title property and perhaps one key property or icon.
  - The user selects an entry. On selection, likely `noti` will open the page or print its details (similar to global search behavior).

  *Note:* The Notion API suggests using the database query endpoint to search within a database rather than the global search ([Search by title](https://developers.notion.com/reference/post-search#:~:text=%3E%20,Query%20a%20database%20endpoint%20instead)), which is exactly what we implement for `noti database search`.

- **Interactive File-Browser Mode (`noti` without arguments):** Running `noti` with no subcommand launches a TUI that behaves like a file explorer for your Notion workspace:
  - The interface would mimic Notion's left sidebar navigation. All top-level pages and databases accessible to the integration are listed. These could be fetched by calling the search endpoint with no query (to list all) ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities)) or by retrieving the user's top-level pages via another method (Notion doesn't have a direct "list all pages" API except search).
  - Items that are pages can be expanded to show their sub-pages. If a page has child pages, the CLI can fetch them by using the Retrieve Block Children API on that page to find any `child_page` blocks (which represent sub-pages) ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=Returns%20a%20paginated%20array%20of,block%20children%20of%20child%20blocks)). Those sub-pages would then be listed indented under the parent in the UI, allowing navigation into nested page hierarchies.
  - Items that are databases can be "opened" to show their entries. In Notion's own UI, database entries don't show in the sidebar, but for the CLI we can allow it: selecting a database in the navigator could trigger a view of that database's entries (similar to running `database search` with no filter). The UI could then allow selecting an entry to either view details or open it.
  - Navigation keys: The UI might use arrow keys or Vim keys (h/j/k/l) to navigate. For example, highlight an item and press Enter to open it (if it's a page, perhaps open its content preview or just open in web; if it's a database, toggle showing its entries). Perhaps Right arrow (or Enter) to drill down, Left arrow to go up a level.
  - We can integrate fuzzy search in this mode as well by allowing the user to press `/` to filter the currently visible list with a fuzzy query (similar to fzf).
  - This mode essentially provides a quick way to browse and open pages, acting as a Notion navigator. It will likely use a library for terminal UI (or fzf in a controlled way) since multi-level navigation is beyond single-list selection.
  
  For simplicity, initially the interactive mode might not show page *content* in the terminal, it just helps locate and open pages. (Future enhancements could allow viewing a page's content in the terminal viewer, but that requires rendering Notion blocks in text form, which is complex.)

In all search scenarios, using fzf-like interaction greatly improves usability by letting users quickly find the page or database they need with fuzzy matching.

## Error Handling and Result Management

Robust error handling is crucial. `noti` will utilize a `Result` type pattern (similar to Rust's `Result<T, E>`) internally to manage operations that may fail, instead of using exceptions for flow control. We can use a library like **Resulty** for Deno, which provides Rust-like `Result` and `Option` types ([GitHub - RobDWaller/resulty: Provides simple, Rust-like Result and Option objects for Deno.](https://github.com/RobDWaller/resulty#:~:text=Resulty)), or implement a simple Result type ourselves. This means each operation (e.g., an API call) returns either `Ok(value)` or `Err(error)`, and the error can be handled or propagated gracefully.

**Standard Error Output:** If an error occurs (at any stage of the command), `noti` will output a clear error message to **stderr**. This ensures that no error text is mixed with normal output data on stdout. The CLI will also set a non-zero exit code when a command fails. For example:
- If `noti search` fails to reach the Notion API (network issue) or returns an API error, it might print: `Error: Network request failed` or `Error: Notion API returned 401 Unauthorized` to stderr, and exit.
- If `noti database add` is given a property that doesn't exist, it might print an error indicating an unknown field.
- If an API call returns an error response, `noti` will include the relevant info from the API response if available (Notion typically returns an error `code` and message in JSON). For instance, a 400 error with a message about invalid JSON will be conveyed to the user.

**Handling Notion API Errors:** The Notion API uses HTTP status codes for errors. `noti` will interpret these and respond accordingly:
- **401 Unauthorized or 403 Forbidden:** Indicates an authentication issue (token expired/revoked, or integration not authorized to a page). The CLI can suggest running `noti configure` again if token is invalid, or checking page sharing settings if 403. 
- **404 Not Found:** Could mean the specified page or database ID is wrong or not accessible ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Returns%20a%20404%20HTTP%20response,have%20access%20to%20the%20page)). The CLI will warn the user that the target wasn't found or they lack access.
- **400 Bad Request:** Typically means the request was malformed. This could happen if our CLI sent incorrect JSON (bug) or the user input is not acceptable (e.g., invalid property values). The error message from Notion (if any) will be shown. For example, Notion might return 400 if required fields are missing.
- **429 Rate Limit:** Notion API has a rate limit (likely 3 requests per second for the same integration). If this is hit, the CLI will inform the user of being rate-limited (and possibly advise to retry after some time) ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=Returns%20a%20404%20if%20the,access%20to%20the%20parent%20page)).
- **500/502 Server Errors:** Rare, but the CLI will note it's a server error and not much can be done except retry later.

All these error messages go to stderr. In addition, the CLI's design with a `Result` type means errors can be caught at various layers:
- Low-level HTTP request errors (like DNS failure) will be caught and turned into a user-friendly error.
- JSON parsing errors (if the API returns invalid JSON or if we parse user input JSON) will be caught and reported.
- Logical errors (like failing to open the browser in `noti open`) will also be reported clearly.

Using a `Result` type library can make the code cleaner – for instance, we might do:
```ts
const response = await notionApiRequest(...);
if (!response.ok) {
    return Err(new Error("API error: " + response.status));
}
```
and then at a higher level:
```ts
const result = await executeCommand();
if (result.isErr()) {
    console.error(result.unwrapErr().message);
    Deno.exit(1);
}
```
This way, all errors funnel to one place for output. 

**Logging:** For debugging, we might include a verbose mode (`-v`) to print additional info to stderr (like the raw error from the API or the request payload) but by default, the user sees concise messages.

## CLI Commands and API Endpoints

Below is a breakdown of each `noti` command, its purpose, and how it maps to Notion API endpoints including required parameters and response handling:

### `noti login` / `noti configure` (Authentication Setup)

- **Description:** Initiates the API Token setup to authorize the CLI to access the user's Notion data. Also used to configure integration credentials if needed.
- **Flow:** As described in the Authentication section, `noti configure` prompts the user to enter their Notion API Token and stores it securely.
- **Parameters:** No additional parameters are needed for this command.
- **Output:** Success message on stdout, e.g. "Authentication successful. Token saved." No file output (so `-o` is not applicable here typically, since it's an interactive flow), but if `-o` was provided, we could output the token info to a file for debugging (not standard).
- **Errors:** Any issues in the setup (network errors, incorrect token, user denied access) are shown on stderr. For example, if the token is invalid, `noti` will catch that and show a message.

### `noti search [<query>]`

- **Description:** Search across all Notion pages and databases accessible to the integration, and interactively select one.
- **API:** Uses **Search API** – `POST /v1/search` with a JSON body containing the search `query`. If the user provides `<query>`, it is used; otherwise an empty or omitted query lists all items ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities)).
  - The CLI will include the "Notion-Version" header (ensuring the latest version) and the Authorization header with the token.
  - Example request body: `{ "query": "Project", "page_size": 20 }`. The response will contain an array of results (mix of page objects and database objects).
- **TUI:** Presents results via fzf interface as discussed. The user can further filter by typing.
- **Selection Outcome:** Upon selecting an item:
  - If it's a page, by default `noti` will invoke `noti open <page_id>` (open in web browser).
  - If it's a database, perhaps also open in browser (which will show the database in Notion web).
  - Alternatively, a future enhancement: allow the user to choose an action (open or get details). But initially, simply opening is straightforward.
  - Non-interactive usage: If `-o` is specified, `noti search` will skip the interactive UI and output the list of results (as JSON or text) to the file. If output is being piped, it might output the selected result's ID or JSON to stdout instead of opening a browser.
- **Error Handling:** If the search API call fails or returns an error, show it on stderr. For example, a 401 would indicate the token is bad; an empty result is not an error (just informs "No results found for '<query>'").

### `noti get <id>`

- **Description:** Retrieve information about a Notion object by ID. This is a general command that can handle either a page or a database ID, outputting the object's details.
- **API:** It will attempt to determine the type of `<id>`:
  - First, try **Retrieve a Page** (`GET /v1/pages/{id}`) ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Retrieves%20a%20Page%20object%20using,the%20ID%20specified)). If a valid page is found, the API returns a Page object (metadata/properties).
  - If the page request returns an error indicating not found or wrong type, then try **Retrieve a Database** (`GET /v1/databases/{id}`) ([Retrieve a database](https://developers.notion.com/reference/retrieve-a-database#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fdatabases%2F)). 
  - (Alternatively, the CLI could inspect the format of the ID or maintain a cache of known IDs from search results to know which is which. But simply trying one then the other is fine because if you call retrieve-page on a database ID, the API will 404 since that ID isn't a page, and vice versa.)
- **Output:** 
  - If the ID is a page:
    - The CLI will output the page's properties in JSON (or a simplified text table). For pages **in a database**, those properties include all the custom fields with their values conforming to the database's schema ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=If%20a%20page%E2%80%99s%C2%A0Parent%20object%20%C2%A0is,will%20conform%20to%20the%C2%A0%2017)). For pages that are standalone (not in a database), the only property is the Title ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=conform%20to%20the%C2%A0database%20property%20schema)).
    - By default, `noti get` might output JSON. But if the user wants the page content, they should use `noti page get` (which can retrieve content as well). We clarify that `noti get` by itself focuses on metadata.
  - If the ID is a database:
    - The CLI will output the database's details (its title, and its schema of properties). This comes directly from the retrieve database response, which includes the names and types of each column ([Retrieve a database](https://developers.notion.com/reference/retrieve-a-database#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fdatabases%2F)).
    - It will not list the entries of the database (for that, use `noti database search` or `query`).
  - The output can be redirected with `-o` as usual. For example, `noti get <db_id> -o schema.json` saves the database schema. Or `noti get <page_id> -o page.json` saves page properties.
- **Notes:** This command is useful for quick fetches when you already know the ID (perhaps copied from a Notion URL or from a previous search). It's essentially a low-level command.
- **Error Handling:** If the ID is invalid or not accessible, a 404 error will result. The CLI will report "Object not found or not accessible." ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Returns%20a%20404%20HTTP%20response,have%20access%20to%20the%20page)). If the user is mistaken about the ID type (e.g., using a database ID thinking it's a page), `noti` will handle it gracefully by trying both endpoints.

### `noti open <id>`

- **Description:** Open a page or database in the default web browser, using Notion's web app. This command does not use the API beyond maybe verifying the ID.
- **Behavior:** 
  - For a given Notion ID (page or database), `noti` will construct the URL to open in a browser. Notion URLs typically have the format `https://www.notion.so/<WorkspaceName>/<PageTitleHyphenated>-<ID>` for pages. However, just using `https://www.notion.so/<ID-without-hyphens>` also works to directly open the page, as Notion can resolve the ID.
  - The CLI can simply strip hyphens from the UUID and open `https://www.notion.so/{ID_without_hyphens}`. (If the user is logged into the Notion web, this will open the page. If not, they will be prompted to log in — which is fine.)
  - If the ID is a database, the same applies: a database is essentially a page, and opening that URL will show the database.
- **No API Call:** This command might not call the Notion API at all (unless we want to verify the page exists first). It's a straight system operation to open a URL.
- **Output:** No direct output to stdout. It may print a message like "Opening Notion page in browser..." to stderr for feedback. The `-o` flag isn't applicable since we're not producing an output.
- **Platform Considerations:** Implementation will use Deno's ability to launch a subprocess or use the `Deno.open`/shell to open a URL. On macOS, for example, `open <url>`; on Windows `start <url>`; on Linux `xdg-open <url>`. The CLI will handle these differences.
- **Error Handling:** If the URL fails to open (e.g., no browser available), it will error out. But such cases are rare. We might catch exceptions and tell the user to manually open the URL if automatic open fails.

### `noti page get <page_id>`

- **Description:** Retrieves the full details of a specific Notion page, including **content**. This differs from `noti get` for a page in that it can fetch the page's content (the blocks within the page), not just the property metadata.
- **API:** 
  1. **Retrieve Page Properties:** First, it calls `GET /v1/pages/{page_id}` to get the page object (this yields the Title and properties) ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Retrieves%20a%20Page%20object%20using,the%20ID%20specified)). This confirms the page exists and gets basic info (and is necessary to know if the page is in a database, what its title is, etc.).
  2. **Retrieve Page Content:** To get the content (the blocks), `noti` uses **Retrieve Block Children** (`GET /v1/blocks/{page_id}/children`) ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fblocks%2F)). In Notion's API, the page's content is represented as children of the page, which is a block container ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=%3E%20,content%20guide%20for%20more%20information)). This will return an array of block objects (paragraphs, headings, lists, etc) that are the top-level blocks on the page.
     - If the page has more than 100 blocks, results are paginated. `noti` will loop using the `next_cursor` if provided to get all content blocks.
     - For nested content (like toggles or lists with children, etc.), `noti` might need to recursively fetch child blocks of those blocks to get the full content. The Notion API indicates you may need to recursively retrieve children for complete representation ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=Returns%20a%20paginated%20array%20of,block%20children%20of%20child%20blocks)). The CLI can do this recursion or at least fetch two levels deep if needed (the API allows 2 levels in one call for append, but for reading we might have to loop).
- **Output:** The user can choose the format:
  - By default, `noti page get` without `-o` might print a summary of the page: perhaps the page title and a few key properties, and maybe the content as plain text or markdown.
  - If `-o <file>` is used:
    - **Markdown Export:** If the file extension is `.md` or the user indicates, the CLI will convert the page's block list into Markdown format and save that. For example, Notion paragraphs become plain text, headings become `# Heading` syntax, bulleted list items become `- item`, toggles might become a Markdown blockquote or a bold title with a collapsible indicator (though Markdown has no direct toggle equivalent, we might just list them as bold text plus indented content). Code blocks become triple backticks with language if available, etc. This allows users to export a Notion page as Markdown easily.
    - **JSON:** If the user wants the raw data, they can save as `.json`, which would contain the page object and maybe the block children array. Alternatively, two files: one for properties, one for content. But likely just one JSON structure that includes both properties and content. (We could merge them, or output a JSON with {"page": {...}, "blocks": [...]} for completeness.)
  - On stdout (no file), we might default to a human-readable Markdown output to let the user quickly read the page content in the terminal. Because raw JSON with blocks is not easy to read. If they want JSON, they can specify an output file or perhaps a `--json` flag.
- **Use Cases:** `noti page get` is useful for exporting a note or reading it in the terminal. For instance, a user might do `noti page get <note_page_id> -o note.md` to export a meeting notes page to markdown.
- **Error Handling:** If the page is not found or not accessible, error on stderr (404 message). If the page has content that cannot be retrieved (should not happen if page is accessible and the integration has read content capability), handle accordingly. Rate limit or large page issues (like too many blocks) will be handled by doing multiple requests as needed.

### `noti page append <page_id>`

- **Description:** Append content to an existing Notion page, using Markdown as input. This lets users add notes or sections to a Notion page from the CLI (for example, appending a log entry to a daily journal page).
- **API:** Uses **Append block children** – `PATCH /v1/blocks/{block_id}/children` with the page ID as the block_id ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=patch%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fblocks%2F)). This endpoint allows adding new blocks to the end of the page's content.
- **API:** Uses **Append block children** – `PATCH /v1/blocks/{block_id}/children` with the page ID as the block_id ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=patch%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fblocks%2F)). This endpoint allows adding new blocks to the end of the page’s content.
  - The CLI will take the input content (provided as Markdown or plain text) and convert it into Notion block objects in the request JSON. For example:
    - A line of text becomes a "paragraph" block with rich text contents.
    - A line starting with "# " becomes a "heading_1" block, "## " heading_2, etc.
    - Bullet list items `- item` become "bulleted_list_item" blocks (with children if nested lists).
    - Numbered list items become "numbered_list_item" blocks.
    - Triple backtick ``` sections become "code" blocks (CLI can detect language if provided after triple backticks).
    - Etc. (The conversion can be as sophisticated as we allow. Initially, we handle basic Markdown elements.)
  - All these blocks are placed in an array as the `children` property in the PATCH request. The Notion API will append them at the bottom of the page ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=Existing%20blocks%20cannot%20be%20moved,moved%20elsewhere%20via%20the%20API)).
  - The API returns the newly created block objects if successful (or at least a 200 OK with the list of appended blocks) ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=Returns%20a%20paginated%20list%20of,first%20level%20children%20block%20objects)). We may not need to use the response extensively, except to confirm success.
  - Notion API limitations: maximum 100 blocks can be appended in one call ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=request)). If the input text corresponds to more than 100 blocks (e.g., a very large markdown), `noti` should split the append into multiple batches or inform the user. We will likely implement batching if needed so the user can append large content seamlessly.
  - Also, Notion only allows two levels of nesting in a single request ([Append block children](https://developers.notion.com/reference/patch-block-children#:~:text=For%20blocks%20that%20allow%20children%2C,nesting%20in%20a%20single%20request)) (meaning our JSON can have children of children, but not deeper, in one go). For deeply nested Markdown (like nested lists), we might structure two levels and then perhaps need a second call for deeper, but typical use should be fine.
- **Input:** The content to append can be provided in a few ways:
  - **File input:** `noti page append <page_id> -o input.md` might be a bit counterintuitive since `-o` is for output. Instead, we might use `-f/--file <file>` or just redirect from stdin. For example: `noti page append <page_id> < content.md` (using shell redirection) or `noti page append <page_id> --input content.md`.
  - **Direct argument:** Possibly we allow a short text to append via an argument (though for larger content Markdown, a file or stdin is better). For example: `noti page append <page_id> "Note: Deployment completed."` could append a new paragraph with that text.
  - If neither file nor arg is given, perhaps `noti` could open a text editor (like `EDITOR` env var) to let the user compose the content to append, then upon editor save/close, use that content. (This is how tools like `git commit` work, and could be convenient.)
- **Output:** On success, the CLI can either be silent or confirm success (to stderr). If the user wants confirmation of what was added, we could output the appended content as stored. But since the user just provided it, it's usually not needed to echo it back. We might output nothing on stdout (so as not to interfere if piped) and just return exit code 0 for success. If `-o` was specified (though normally `-o` here isn't for output, but if someone did `-o result.json`, we could choose to output the API response JSON of new blocks).
- **Example:** `noti page append 1234-5678-... < update.md` – reads update.md which contains:
  ```markdown
  ## Deployment Status
  - Deployed to staging at 10:00 AM.
  - Testing in progress.
  ```
  The CLI will translate this to two blocks: a heading_2 with text "Deployment Status", and a bulleted list with two items. It PATCHes them to the page. Notion will add them to the bottom of that page. The CLI prints maybe "Content appended to page." on stderr.
- **Error Handling:** 
  - If the page ID is invalid or the integration lacks write permission, the API returns 404 or 403. The CLI will report that error.
  - If the Markdown parsing fails or an unsupported element is used, the CLI can warn (e.g., "Warning: Toggle blocks are not supported, skipping those lines.").
  - In case of partial failure (maybe one block fails), Notion likely treats the whole request as atomic (all or nothing). So it's either all appended or none. We handle any non-200 response as failure.
  - Rate limiting (429) for too many writes will be handled by perhaps retrying after a short delay (Notion includes a `Retry-After` header typically if rate-limited) or just erroring with a message to try again.

### `noti database create <parent_page_id>`

- **Description:** Create a new database (table) in Notion under a specified parent page.
- **API:** Uses **Create a Database** – `POST /v1/databases` ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=post%20https%3A%2F%2Fapi)).
  - Required fields in the request:
    - `parent`: an object specifying the parent page where this database will be created. For example: `"parent": { "page_id": "<parent_page_id>" }`. (Notion currently requires the parent to be a page or a workspace; we will use a page ID the user provides, likely a page in their workspace where they want the database. Alternatively, if they want it at the top level, they could provide their top-level page or we might allow `--parent-root` to put in workspace if possible.)
    - `title`: an array of rich text objects for the database title. The CLI can take a `--title "Name"` or derive from an option. We might also allow simply `noti database create <parent_page_id> "Project Tasks"` where the second arg is the title.
    - `properties`: an object defining the schema of the database’s columns. The API expects at least one property (the Title property) because every database must have a primary title property for its entries. The CLI will merge the user-defined properties with a required Title if not provided.
      - If the user doesn't specify a Title property in the schema, we will add one. Often we can call it "Name" or use a default name. (Notion's API might automatically add "Name" if none given? But it's safer we specify.)
      - The schema definition format: each key is a property name and the value is a property object with a `type` and type-specific configuration. For example:
        ```json
        "properties": {
          "Name": { "title": {} },
          "Due Date": { "date": {} },
          "Tags": { "multi_select": { "options": [ {"name": "Urgent"}, {"name": "Low"} ] } }
        }
        ```
        The CLI will gather this from user input. Perhaps the user supplies a JSON schema file or we prompt:
        - Enter property name (or blank to finish): Name
        - Type for "Name": title (only one title allowed, mark which is title)
        - Enter property name: Description
        - Type for "Description": rich_text
        - Enter property name: Due
        - Type for "Due": date
        - ... and so on.
      - We must enforce that exactly one property is of type `title`. The CLI can automatically assign the first property as title or have the user mark it.
      - Note: The API as of 2023 does not support creating a "status" property via the API (the API docs mention creating status property is not supported ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=%3E%20,properties%20is%20currently%20not%20supported))). The CLI should avoid unsupported types (or document that limitation).
  - The integration must have *insert content* capability to create a database ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=,capabilities%2C%20see%20the%20capabilities%20guide)), otherwise Notion will return 403.
- **Output:** 
  - On success, Notion returns the new database object (with its ID and schema). The CLI will output the new database ID and perhaps the whole schema.
  - If no `-o` specified, we might print a short message: "Database '<Title>' created (ID: ...)" to stdout, so the user can copy the ID if needed. For detailed schema output, `-o` can be used to save the JSON.
  - With `-o`, we can save the full database JSON to file. Or if to stdout (pipe), output the JSON.
- **Example:** `noti database create <parent_page_id> --title "Task List" --schema schema.json`
  - `schema.json` might contain:
    ```json
    {
      "Status": { "select": { "options": [ {"name": "Todo"}, {"name": "Done"} ] } },
      "Due Date": { "date": {} }
    }
    ```
    CLI reads this, adds "Name": { "title": {} } if not present, sends to API. The created DB will have Name, Status, Due Date.
- **Error Handling:** 
  - 404 if parent page doesn't exist or accessible ([Create a database](https://developers.notion.com/reference/create-a-database#:~:text=Returns%20a%20404%20if%20the,access%20to%20the%20parent%20page)) – CLI will report "Parent page not found or no access."
  - 400 if the schema is malformed or missing required parts (e.g., no title property) – CLI should validate before sending, but if Notion returns an error (maybe for an unsupported property type), we show that. E.g., if user tried to include a "status" property, the API might error, and we can convey "Status property not supported via API."
  - If integration lacks permission, 403 – error message about permission.
  - If success, no error; if any property options are ignored by Notion, we might warn (for instance, Notion might ignore certain things or adjust option IDs).

### `noti database add <database_id>`

- **Description:** Add a new page (entry) to an existing database.
- **API:** Uses **Create a Page** – `POST /v1/pages`, with the parent set to the database ID ([Create a page](https://developers.notion.com/reference/post-page#:~:text=Create%20a%20page)) ([Create a page](https://developers.notion.com/reference/post-page#:~:text=If%20the%20new%20page%20is,must%20match%20the%20parent%C2%A0database%27s%20properties)). 
  - Request body:
    - `parent: { "database_id": "<database_id>" }`.
    - `properties: { ... }` – keys must match the database’s property names, and the values must conform to the types defined in that database ([Create a page](https://developers.notion.com/reference/post-page#:~:text=property%20in%20the%C2%A0)).
    - Optionally, `children` if we want to create the page with some content blocks immediately (the API allows adding content in the same call). `noti` might not use this unless we want to let the user also add some content for the page (like a description) at creation. In many cases, database entries are just properties; content can be added later with `page append` if needed. We could support an `--content file.md` to create with initial content.
  - The CLI will likely do a `Retrieve a database` (or cache from earlier) to get the schema, then prompt or parse user input for each property, as described in **Data Structure** section. It then constructs the JSON and posts it.
  - The response will be the created page object (with its ID and properties set).
- **Output:** 
  - If no `-o`, print confirmation like "Added new entry `<PageTitle>` (ID: ...) to database." Or possibly just print the new page's URL or open it (maybe not open by default, since user might just be adding data).
  - If `-o` is used, output the full created page JSON to the file or stdout.
  - Perhaps also print the new page’s Notion URL for convenience on stdout, so user can click or open it.
- **Example:** `noti database add <db_id> --props '{"Name": "Test Task", "Done": false, "Tags": ["tag1","tag2"]}'`
  - CLI fetches schema: knows "Name" is title text, "Done" is checkbox, "Tags" is multi_select. It creates:
    ```json
    {
      "parent": { "database_id": "<db_id>" },
      "properties": {
         "Name": { "title": [ {"text": {"content": "Test Task"}} ] },
         "Done": { "checkbox": false },
         "Tags": { "multi_select": [ {"name": "tag1"}, {"name": "tag2"} ] }
      }
    }
    ```
  - Calls POST /pages, gets success. 
- **Error Handling:** 
  - Missing required property (like the title) -> Notion will error (400). The CLI will catch and inform "Title is required" (it should ensure this before sending).
  - If a provided property name is not in the schema -> Notion 400 "Property does not exist". CLI should prevent this by validation, but if it happens, show error.
  - If property value is wrong type (e.g., string for a date) -> 400, error message likely from Notion like "invalid property value for ...", which CLI will show.
  - 404 if database_id is wrong or no access -> error.
  - 409 Conflict maybe if some unique constraint? (Notion doesn't have unique constraints, except maybe for title if blank? Not likely.)
  - If the integration only has read access and not write, 403 forbidden -> error telling user they need write permission.
  - Generally, handle as with other commands.

### `noti database remove <page_id>`

- **Description:** Remove (archive) an entry from a database. In Notion, deleting a page is handled via the Update (archive) endpoint.
- **API:** Uses **Update Page (Archive)** – `PATCH /v1/pages/{page_id}` with `"archived": true` in the body ([Trash a page](https://developers.notion.com/reference/archive-a-page#:~:text=curl%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fpages%2F60bdc8bd,true)). This effectively moves the page to Trash (it disappears from the database view for users, but can be recovered from Trash if needed).
  - We expect the user to provide the page ID of the database entry to remove. This could be obtained via search or the interactive UI. (In future, we might allow specifying something like an index or a filter to identify the entry, but an ID is straightforward.)
- **Behavior:** 
  - The CLI might confirm the action (to avoid accidental deletions). For example, prompt "Are you sure you want to remove this entry? (y/N)" unless a `--yes` flag is provided.
  - Then it sends the PATCH request with archived=true. Notion responds with the page object (now archived).
- **Output:** 
  - On success, perhaps print "Entry removed (archived) successfully." to stdout.
  - If `-o` is given, we could output the archived page object JSON (which will show `"archived": true` in it).
  - Most likely, users won't need a file output for a deletion; the flag is supported but not typical.
- **Error Handling:** 
  - 404 if the page ID is invalid or already archived/not accessible ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Returns%20a%20404%20HTTP%20response,have%20access%20to%20the%20page)).
  - If the page is not in a database (e.g., user accidentally used a wrong ID), it will still archive it if accessible. Archiving a top-level page is also possible. The CLI should maybe warn if they are archiving a page that is not in the specified database. (If we only take a page_id, we might not know which database it came from unless the user also gave a database context. We assume user knows what they're doing if they call remove with an ID.)
  - If integration lacks permission, 403 -> error.
  - The Notion API treats archiving as a success (200) even if the page was already archived, I believe. So doing it twice might not error but the page remains archived. That's fine.

### `noti database search <database_id> [<query>]`

- **Description:** Search or filter entries within a specific database. (This was discussed in the Search Interface section, but here are specifics as a command.)
- **API:** **Query a Database** – `POST /v1/databases/{database_id}/query` ([Query a database](https://developers.notion.com/reference/post-database-query#:~:text=post%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fdatabases%2F)). 
  - If a `<query>` string is provided, `noti` will translate that into a filter on the Title property (or possibly all text properties). The simplest approach is a Title contains filter as described earlier.
  - If more advanced querying is needed, the CLI might accept filter arguments (like `--filter '{"property":"Status","select":{"equals":"Done"}}'` to use the API’s filter object directly). This could be an advanced feature for power users.
  - If no query is provided, the CLI will retrieve all entries (paginated). Possibly a `--limit` flag could restrict the number of entries fetched for performance.
  - Sorting: The Notion API allows sort criteria in the query. We could expose a flag for sort (e.g., `--sort "Created:desc"`). But initially, we might just rely on the default sort or the order that Notion returns (which is usually by last edited time descending by default).
- **Interactive Result:** 
  - Just like global search, it will use fzf TUI to list matching entries. Each entry can be displayed by its Title (primary property). We might also show one other property (like Status) if that helps identification, but to keep it simple, just the title is fine.
  - The user selects one entry.
  - On selection, we have a choice: we could directly open the page (`noti open`) or we could show the entry's details. Given this is a search command, probably we follow the same pattern as `noti search`: by default, open the page in the browser. If the user wanted just data, they could use `noti get` on it or use `-o` to output data.
  - Perhaps we allow a `--get` flag if the user wants to retrieve the page content in terminal instead of opening web.
- **Output:** 
  - Without `-o`, no direct stdout output except possibly a message or nothing (since it's interactive). If the user selects and we open, we might not output anything.
  - With `-o <file>` or if output is piped, we skip interactive mode and instead output the list of results in JSON or text. Or if a query was provided, output matching results. (This non-interactive use essentially duplicates `query` functionality and could be used in scripts.)
- **Error Handling:** 
  - 404 if the database ID is wrong or not accessible.
  - If the filter query is malformed, the API returns 400. For instance, if property name is wrong in filter, Notion errors. The CLI should catch that. If the user provided a raw filter JSON, that's on them; we just forward the error.
  - If no results, we inform "No entries found." (Not an error, just feedback).
  - Rate limiting should not be an issue unless a DB has thousands of entries and we paginate very fast; we can respect `has_more` and possibly throttle if needed.

### `noti` (Interactive Navigation Mode)

- **Description:** Launches a file-explorer-like TUI to navigate pages and databases hierarchically, similar to Notion’s sidebar experience.
- **Implementation Outline:** 
  - **Initial Listing:** The CLI lists all top-level objects the integration can access. This likely includes all pages that have no parent (or whose parent is the workspace) and all full-page databases. We obtain this list by calling the Search API with no query (which returns all shared pages/databases) ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities)). We might also call the List all pages endpoint if it existed, but since it doesn't, search is the way.
    - We can filter out duplicates or linked database references as needed (Notion search excludes duplicate linked databases by default ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities))).
  - The initial view shows each item with an icon [📄 for page, 🗃️ for database perhaps] and the title.
  - **Navigation:** The user can move the selection with arrow keys. Pressing Enter or Right arrow:
    - If the item is a Page:
      - The CLI fetches that page’s children blocks via `GET /blocks/{page_id}/childre ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fblocks%2F))3】. Among these, it will look for any blocks of type `child_page` or `child_database` which represent sub-pages or inline databases inside that page.
      - It then displays those as a nested list (indented under the page). Essentially, we treat sub-pages as "subfolders".
      - The user can then navigate into those. (If a page has no sub-pages, pressing enter could potentially open it in browser or display content preview. But to keep the file-navigator analogy, maybe Enter just expands/collapses, and a separate action opens the page.)
      - Possibly use Right arrow to expand (show children), Left arrow to collapse/go up.
      - If a page is highlighted and the user presses a specific key (say "o"), we open it in browser; or another key (say "v") to view content in CLI (which might just call `page get` and show markdown in a pager).
    - If the item is a Database:
      - The CLI could list its entries as children. However, if a database has a lot of entries, listing all could be overwhelming. Perhaps we don't auto-expand databases in the tree. Instead, pressing Enter on a database might open a focused view of that database (like leaving the sidebar context and showing a list of its entries in the main area). This is complex for a CLI, but maybe a simple approach:
      - For now, pressing Enter on a database could just trigger `noti database search <id>` internally (which then goes to an fzf list of its items for selection). That would break out of the tree navigation feel though.
      - Alternatively, we treat the database as a container: when expanded, list a subset of entries (maybe the most recent 10, or no entries at all but an option to search inside).
      - Given complexity, we might choose that in the tree UI, databases are not expandable; instead, the user can press "s" (for search) on a selected database to trigger the database search function for that DB, or press "o" to open the database page in web.
  - **UI Implementation:** We may use a high-level library or build on fzf. Fzf itself is primarily a single-list filter, not a tree. We might need a curses-like library (if available for Deno, e.g., `cliffy` or `blessed`-like library in TS) to manage the UI state. This is a more advanced TUI feature.
  - **Keyboard shortcuts:** As mentioned, some keys for actions:
    - Enter/Right: expand node (if page or db).
    - Left: collapse node / go up to parent.
    - `o`: open in browser (or maybe just pressing enter on a leaf node opens it).
    - `/`: open a search prompt to filter the currently visible list (this could integrate fzf in a limited way).
    - `q` or `Esc`: quit the TUI.
    - Arrow keys / j,k: move selection.
  - The UI could have two panes: left pane is the navigation tree, right pane could show a preview of the currently selected page's content or properties. However, implementing a preview means concurrently fetching content as user moves selection which could be slow. A simpler approach is to show just the tree (like a file manager, where you open a file to view it separately).
- **Output:** This mode is purely interactive. It doesn't produce stdout data, except perhaps if we allow selecting something to output its ID (but that overlaps with search functionality). Typically, this is for user navigation, not scripting.
- **Use Cases:** A user might run `noti` to quickly browse their workspace structure and open pages without leaving terminal. It’s a convenience feature wrapping several of the above commands in an interface.
- **Error Handling:** In the UI, errors (like failing to load children for a page) should be shown as messages (maybe in a status bar). For instance, if one tries to expand a page and the API returns 403, the UI can flash "Access denied to that page." and not expand. The UI should handle network failures gracefully, maybe by retrying or showing an error and allowing the user to quit.
- **Limitations:** If the workspace is very large (hundreds of pages), listing all in a tree might be slow. We might consider lazy-loading: only fetch children when a node is expanded (this we do), and maybe not fetch all top-level at once if thousands (though search with no query could return a lot; hopefully, Notion’s API paginates that and we can load more as needed).
  
This interactive mode is the most complex part of the CLI, and its implementation may evolve. The spec ensures it provides a familiar Notion navigation feel in text form.

## Markdown Export/Import Considerations

Because the CLI deals with content in Markdown for import (`page append`) and export (`page get`), here are additional notes on how markdown conversion is handled:

- **Export (Notion to Markdown):** When outputting Notion page content as Markdown, `noti` will convert each Notion block to an equivalent markdown representation as closely as possible. For example:
  - Paragraph -> plain text (with markdown for any bold/italic/links in the rich text).
  - Heading 1/2/3 -> `#`, `##`, `###` headings.
  - Bulleted list -> `- ` list items (indent nested lists with 2 spaces or so per level).
  - Numbered list -> `1. `, `2. ` etc (though Notion API might not preserve the actual numbers, we can number sequentially during conversion).
  - To-do (checkbox) -> `- [ ] ` or `- [x] ` markdown checkboxes.
  - Toggle -> Could be represented as a markdown blockquote or a bold heading followed by indented content. (No perfect analog, maybe `**Toggle title**\n> Toggle content` as a compromise.)
  - Code block -> ```` ```language ... ``` ````.
  - Quote -> `> ` prefix.
  - Callout -> maybe `> [!NOTE]` style (extension) or just as Quote with an icon if possible.
  - Images -> `![alt text](image_url)` if the integration has access to the file URL (the API might give file URLs).
  - Embed/Video -> a link to the resource.
  - Databases in page (if any inline database) -> probably skip or just note "Inline database: <name>" since exporting a database as markdown table is complex and maybe out of scope.
  
  The goal is not to lose textual information. The CLI could leverage existing Notion-to-markdown libraries or implement basic rules.
  
- **Import (Markdown to Notion):** When appending, the reverse mapping is applied for supported elements:
  - The CLI might use a Markdown parser to generate an AST of the markdown, then transform to Notion blocks. For instance, use a library or regex for headings, lists, etc.
  - Not all markdown elements have direct Notion equivalents. The CLI will handle what’s reasonable:
    - Tables in Markdown have no direct Notion API create (Notion tables would be a database, which is not creatable via page content API). So if a markdown table is found, we might convert it to a code block or just plain text, or ignore with a warning.
    - HTML blocks or unsupported MD syntax will be ignored or included as plain text.
  - The spec assumes basic markdown (text, lists, headings, code, quotes, simple formatting) will be supported for append.
  
- **Character Encoding and Limitations:** Notion API expects UTF-8 text; `noti` will ensure it doesn’t send characters that break JSON. Emojis and non-Latin scripts are fine (they'll be in text content).
  - If the markdown has extremely long paragraphs or unsupported characters, the CLI will still send them as is, since Notion can handle fairly large text in a block (there is a limit but it's high).
  - If an image is included in markdown (like `![](path/to/img.png)`), the CLI in theory could upload the image to Notion. However, file upload is a separate API flow requiring an S3 signed URL from Notion. That’s out of scope for now; we would likely skip images on import (or require the user to provide a URL instead of local file path, because Notion API can attach images via URL). We can note that image embedding via CLI is not directly supported in this version.
  
- **Testing Markdown Conversion:** The CLI should be tested with a sample markdown to ensure the structure in Notion appears correctly. We might note in docs any elements that are not supported.

## Conclusion

The `noti` CLI is designed to provide a powerful interface to Notion through the command line, meeting the outlined requirements:

- It uses OAuth 2.0 for user authentication and stores a long-lived token for API cal ([Authorization](https://developers.notion.com/docs/authorization#:~:text=What%20is%20a%20public%20integration%3F)) ([Notion - Nango Docs](https://docs.nango.dev/integrations/all/notion#:~:text=API%20gotchas))7】.
- It can output data to files or stdout as needed, without mixing error messages into outputs.
- It handles Notion’s flexible data structures by dynamically adapting to database schemas and supporting user input in multiple forms.
- It provides a convenient search with a TUI fuzzy finder, as well as a navigation UI to browse and open Notion content.
- It robustly handles errors using a Result pattern and stderr logging, ensuring the user experience is clear even when things go wrong.

By adhering closely to Notion’s API specs for each feature (sear ([Search by title](https://developers.notion.com/reference/post-search#:~:text=Returns%20all%C2%A0pages%20%C2%A0or%C2%A0%2016%2C%20excluding,limitations%20related%20to%20an%C2%A0integration%E2%80%99s%20capabilities))7】, page retriev ([Retrieve a page](https://developers.notion.com/reference/retrieve-a-page#:~:text=Retrieves%20a%20Page%20object%20using,the%20ID%20specified))2】 and conte ([Retrieve block children](https://developers.notion.com/reference/get-block-children#:~:text=get%20https%3A%2F%2Fapi.notion.com%2Fv1%2Fblocks%2F))3】, adding pages to databas ([Create a page](https://developers.notion.com/reference/post-page#:~:text=property%20in%20the%C2%A0))7】, etc.), `noti` ensures compatibility and correctness in its operations. All API interactions (including required parameters and expected responses) have been accounted for in the design, and any important limitations (like rate limits, or unsupported property types) have been noted.

The end result will be a CLI tool that developers and power users can integrate into their workflows for managing Notion content from the terminal, with the ease of piping outputs, editing with $EDITOR, and searching quickly without context switching away from the keyboard. Each command in `noti` corresponds to one or more Notion API calls as detailed above, making the CLI a thin but user-friendly layer over the official Notion capabilities. 

