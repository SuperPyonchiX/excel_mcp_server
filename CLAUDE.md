# CLAUDE.md - AI Assistant Guide for Excel MCP Server

## Project Overview

This is a **Model Context Protocol (MCP) server** for Excel automation. It enables AI agents (Claude, ChatGPT, Copilot, etc.) to programmatically interact with Excel files through a standardized protocol.

- **Language**: TypeScript
- **Runtime**: Node.js (v16+)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Excel Library**: ExcelJS
- **Schema Validation**: Zod
- **Supported Formats**: .xlsx, .xls

## Repository Structure

```
excel_mcp_server/
├── src/
│   └── index.ts              # Main MCP server (all 11 tools implemented here)
├── dist/                      # Compiled JavaScript output
├── test/
│   ├── mcp-basic-test.js     # Basic MCP functionality tests
│   ├── excel-integration-test.js  # Excel operations integration tests
│   ├── tool-individual-test.js    # Individual tool tests
│   └── output/               # Test output files (gitignored)
├── guide/                     # User documentation (Japanese)
│   ├── 01-basics.md          # MCP fundamentals
│   ├── 02-setup.md           # Setup instructions
│   ├── 03-usage.md           # Usage guide
│   ├── 04-tools.md           # Tool reference
│   ├── 05-troubleshooting.md # Troubleshooting
│   ├── 06-samples.md         # Usage examples
│   └── 07-api-specification.md  # API specifications
├── scripts/
│   └── server-manager.js     # Server start/stop/status utility
├── docs/
│   └── server-management.md  # Server management documentation
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot instructions
├── package.json
└── tsconfig.json
```

## Quick Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run all tests (builds first)
npm run test:all

# Run individual test suites
npm run test:basic        # MCP basic functionality
npm run test:integration  # Excel operations
npm run test:tools        # Individual tool tests

# Server management
npm run server:start      # Start MCP server
npm run server:stop       # Stop server
npm run server:status     # Check server status
npm run server:list       # List running processes
npm run server:kill       # Force kill (dangerous)

# Development
npm run dev               # Build and start server
```

## MCP Tools Provided (11 Total)

### Workbook/Worksheet Management
- `create_workbook` - Creates empty workbook (**no sheets included**)
- `get_workbook_info` - Gets workbook metadata and sheet list
- `add_worksheet` - Adds worksheet to existing workbook

### Cell Operations
- `set_cell_value` - Sets value in single cell
- `get_cell_value` - Gets value from single cell
- `set_range_values` - Sets 2D array of values starting from cell
- `get_range_values` - Gets values from cell range

### Formatting & Formulas
- `format_cell` - Sets cell formatting (font, fill, border)
- `add_formula` - Adds Excel formula to cell

### Data Operations
- `find_data` - Searches for value in worksheet
- `export_to_csv` - Exports worksheet to CSV file

## Key Development Patterns

### Adding a New Tool

1. **Define Zod schema** at top of `src/index.ts`:
```typescript
const NewToolSchema = z.object({
  filePath: z.string().describe("Absolute path to Excel file"),
  sheetName: z.string().describe("Worksheet name"),
  // additional parameters...
});
```

2. **Implement the function**:
```typescript
async function newTool(filePath: string, sheetName: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`Worksheet '${sheetName}' not found. Available: ${getSheetNames(workbook)}`);
  }
  // implementation...
  await workbook.xlsx.writeFile(filePath);
  return "Success message";
}
```

3. **Register in ListToolsRequestSchema handler**:
```typescript
{
  name: "new_tool",
  description: "Tool description",
  inputSchema: zodToJsonSchema(NewToolSchema)
}
```

4. **Add to toolImplementations map**:
```typescript
new_tool: async (args: any) => {
  const { filePath, sheetName } = NewToolSchema.parse(args);
  return await newTool(filePath, sheetName);
}
```

### Validation Patterns

```typescript
// File path validation
function validateFilePath(filePath: string): void {
  if (!filePath) throw new Error("File path not specified");
  if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
    throw new Error("File extension must be .xlsx or .xls");
  }
  if (!path.isAbsolute(filePath)) {
    throw new Error("Must use absolute path");
  }
}

// Cell address validation (A1 format)
function validateCellAddress(cell: string): void {
  const cellPattern = /^[A-Z]+[1-9]\d*$/;
  if (!cellPattern.test(cell)) {
    throw new Error(`Invalid cell: '${cell}'. Use format: A1, B2, AA10`);
  }
}

// Range validation (A1:C3 format)
function validateRangeAddress(range: string): void {
  const rangePattern = /^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/;
  if (!rangePattern.test(range)) {
    throw new Error(`Invalid range: '${range}'. Use format: A1:C3`);
  }
}
```

## Critical Constraints

### STDIO Communication - No Console.log

**CRITICAL**: This server uses stdio transport. `console.log()` will corrupt the MCP protocol communication.

```typescript
// NEVER do this:
console.log("Debug message");  // Breaks MCP protocol!

// Use console.error for logging (goes to stderr):
console.error(JSON.stringify({
  level: 'error',
  message: 'Operation failed',
  error: error.message
}));
```

### Empty Workbook Behavior

The `create_workbook` tool creates workbooks **without any sheets**. Users must call `add_worksheet` before any cell operations:

```
1. create_workbook -> Creates empty .xlsx file
2. add_worksheet -> Adds a sheet (REQUIRED before data operations)
3. set_cell_value -> Now can write data
```

### File Path Requirements

- All file paths must be **absolute paths**
- Extensions must be `.xlsx` or `.xls`
- Example: `C:/Users/Username/Documents/report.xlsx`
- Relative paths are rejected with error

## Error Handling Pattern

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const implementation = toolImplementations[request.params.name];
    const result = await implementation(request.params.arguments);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Parameter validation error - provide helpful message
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new McpError(ErrorCode.InvalidParams, `Argument error:\n${messages.join('\n')}`);
    }
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Error: ${error.message}`);
  }
});
```

## Testing Guidelines

### Before Committing
```bash
npm run build           # Ensure TypeScript compiles
npm run test:all        # Run all test suites
```

### Test File Locations
- Tests output to `test/output/` directory
- Output files are gitignored
- Each test creates its own test files

### Test Structure
- `mcp-basic-test.js` - Tests MCP server startup, tool listing, JSONRPC
- `excel-integration-test.js` - Tests full Excel workflows
- `tool-individual-test.js` - Tests each of 11 tools individually

## TypeScript Configuration

Key settings in `tsconfig.json`:
- **Target**: ES2022
- **Module**: ESNext with Node resolution
- **Strict mode**: Enabled
- **Output**: `dist/` directory
- **Source**: `src/` directory

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Workbook read error | File doesn't exist | Check path, use absolute path |
| Worksheet not found | Wrong sheet name | Use `get_workbook_info` to list sheets |
| Invalid cell position | Wrong format | Use A1, B2, AA10 format |
| Extension error | Non-.xlsx/.xls file | Use correct extension |
| Empty workbook error | No sheets added | Call `add_worksheet` first |
| Protocol corruption | Using console.log | Use console.error only |

## Architecture

```
AI Agent (Claude, ChatGPT, etc.)
    ↓ MCP Protocol (JSON-RPC over stdio)
Excel MCP Server (src/index.ts)
    ↓ ExcelJS Library
Excel File (.xlsx)
```

## Code Style

- **Single file architecture**: All tool implementations in `src/index.ts`
- **Tool naming**: `<action>_<target>` pattern (e.g., `set_cell_value`)
- **Schema naming**: `<ToolName>Schema` pattern (e.g., `SetCellValueSchema`)
- **Error messages**: Include actionable information (available sheets, correct formats)
- **Japanese comments**: Source code uses Japanese for comments and messages
- **Documentation**: User-facing docs in `guide/` are in Japanese

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.17.1",  // MCP protocol implementation
  "exceljs": "^4.4.0",                      // Excel file manipulation
  "zod": "^3.25.76",                        // Schema validation
  "zod-to-json-schema": "^3.24.6",          // Convert Zod to JSON Schema
  "@types/node": "^24.1.0",                 // Node.js types
  "typescript": "^5.9.2"                    // TypeScript compiler
}
```

## Making Changes

1. Edit `src/index.ts` for server functionality
2. Run `npm run build` to compile
3. Run `npm run test:all` to verify
4. Test manually with `npm run server:start` if needed
5. Update relevant documentation in `guide/` if user-facing changes
