# CLAUDE.md - noti project guidelines

## Build & Development Commands

- `deno task dev` - Run with watch mode
- `deno task test` - Run unit tests
- `deno task test:watch` - Watch unit tests
- `deno task e2e` - Run e2e tests
- `deno task lint` - Run linter
- `deno task fmt` - Format code
- `deno task all-check` - Run lint, type check, and tests
- `deno test -A path/to/specific/test.ts` - Run specific test

## Code Style Guidelines

- **Formatting**: 2 spaces indentation, 80 char line width, single quotes
- **Error Handling**: Use the ErrorHandler class with context strings
- **Logging**: Use the Logger singleton (info/error/debug/success methods)
- **Imports**: Organize in groups - standard lib, npm modules, local
- **Naming**: camelCase for variables/methods, PascalCase for classes
- **Types**: Define interfaces/types for all complex objects
- **Testing**: BDD style tests with setup/cleanup steps
- **File Structure**: Commands in src/commands/, utilities in src/lib/

## Documentation

Japanese is the primary language for user-facing documentation and error messages
