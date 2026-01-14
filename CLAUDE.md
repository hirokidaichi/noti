# CLAUDE.md - noti project guidelines

## Build & Development Commands

- `npm run dev` - Run with watch mode
- `npm run build` - Build TypeScript to dist/
- `npm run test` - Run unit tests
- `npm run test:watch` - Watch unit tests
- `npm run e2e` - Run e2e tests
- `npm run lint` - Run linter
- `npm run fmt` - Format code
- `npm run all-check` - Run lint, build, and tests
- `npx vitest run src/path/to/specific.test.ts` - Run specific test

## Code Style Guidelines

- **Formatting**: 2 spaces indentation, 80 char line width, single quotes
- **Error Handling**: Use the ErrorHandler class with context strings
- **Logging**: Use the Logger singleton (info/error/debug/success methods)
- **Imports**: Organize in groups - standard lib, npm modules, local
- **Naming**: camelCase for variables/methods, PascalCase for classes
- **Types**: Define interfaces/types for all complex objects
- **Testing**: BDD style tests with Vitest (describe/it/expect)
- **File Structure**: Commands in src/commands/, utilities in src/lib/

## Documentation

Japanese is the primary language for user-facing documentation and error messages
