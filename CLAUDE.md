# CLAUDE.md - Excel MCP Server AIアシスタントガイド

## プロジェクト概要

Excel自動操作用の**Model Context Protocol (MCP) サーバー**です。AIエージェント（Claude、ChatGPT、Copilotなど）が標準化されたプロトコルを通じてExcelファイルをプログラムで操作できるようにします。

- **言語**: TypeScript
- **ランタイム**: Node.js (v16以降)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Excelライブラリ**: ExcelJS
- **スキーマ検証**: Zod
- **対応形式**: .xlsx, .xls

## リポジトリ構成

```
excel_mcp_server/
├── src/
│   └── index.ts              # MCPサーバー本体（全11ツール実装）
├── dist/                      # コンパイル済みJavaScript出力
├── test/
│   ├── mcp-basic-test.js     # MCP基本機能テスト
│   ├── excel-integration-test.js  # Excel操作統合テスト
│   ├── tool-individual-test.js    # 個別ツールテスト
│   └── output/               # テスト出力ファイル（gitignore対象）
├── guide/                     # ユーザー向けドキュメント
│   ├── 01-basics.md          # MCP基礎知識
│   ├── 02-setup.md           # セットアップ手順
│   ├── 03-usage.md           # 使用方法
│   ├── 04-tools.md           # ツール詳細
│   ├── 05-troubleshooting.md # トラブルシューティング
│   ├── 06-samples.md         # 使用例集
│   └── 07-api-specification.md  # API仕様書
├── scripts/
│   └── server-manager.js     # サーバー起動・停止・状態確認ユーティリティ
├── docs/
│   └── server-management.md  # サーバー管理ドキュメント
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot用指示書
├── package.json
└── tsconfig.json
```

## よく使うコマンド

```bash
# 依存関係インストール
npm install

# TypeScriptビルド
npm run build

# 全テスト実行（ビルド込み）
npm run test:all

# 個別テスト実行
npm run test:basic        # MCP基本機能
npm run test:integration  # Excel操作統合
npm run test:tools        # 個別ツール

# サーバー管理
npm run server:start      # MCPサーバー起動
npm run server:stop       # サーバー停止
npm run server:status     # 状態確認
npm run server:list       # 実行中プロセス一覧
npm run server:kill       # 強制終了（危険）

# 開発用
npm run dev               # ビルドしてサーバー起動
```

## 提供MCPツール（全11個）

### ワークブック・ワークシート管理
- `create_workbook` - 空のワークブック作成（**シートは含まれない**）
- `get_workbook_info` - ワークブックのメタデータとシート一覧を取得
- `add_worksheet` - 既存ワークブックにワークシートを追加

### セル操作
- `set_cell_value` - 単一セルに値を設定
- `get_cell_value` - 単一セルの値を取得
- `set_range_values` - 指定セルから2次元配列データを設定
- `get_range_values` - セル範囲の値を取得

### 書式・数式
- `format_cell` - セル書式設定（フォント、塗りつぶし、罫線）
- `add_formula` - セルにExcel数式を追加

### データ操作
- `find_data` - ワークシート内で値を検索
- `export_to_csv` - ワークシートをCSVファイルにエクスポート

## 主要な開発パターン

### 新規ツールの追加方法

1. **Zodスキーマを定義**（`src/index.ts` 上部）:
```typescript
const NewToolSchema = z.object({
  filePath: z.string().describe("対象Excelファイルの絶対パス"),
  sheetName: z.string().describe("ワークシート名"),
  // 追加パラメータ...
});
```

2. **関数を実装**:
```typescript
async function newTool(filePath: string, sheetName: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能: ${getSheetNames(workbook)}`);
  }
  // 実装...
  await workbook.xlsx.writeFile(filePath);
  return "成功メッセージ";
}
```

3. **ListToolsRequestSchemaハンドラーに登録**:
```typescript
{
  name: "new_tool",
  description: "ツールの説明",
  inputSchema: zodToJsonSchema(NewToolSchema)
}
```

4. **toolImplementationsマップに追加**:
```typescript
new_tool: async (args: any) => {
  const { filePath, sheetName } = NewToolSchema.parse(args);
  return await newTool(filePath, sheetName);
}
```

### 入力検証パターン

```typescript
// ファイルパス検証
function validateFilePath(filePath: string): void {
  if (!filePath) throw new Error("ファイルパスが指定されていません");
  if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
    throw new Error("ファイル拡張子は .xlsx または .xls である必要があります");
  }
  if (!path.isAbsolute(filePath)) {
    throw new Error("絶対パスを指定してください");
  }
}

// セルアドレス検証（A1形式）
function validateCellAddress(cell: string): void {
  const cellPattern = /^[A-Z]+[1-9]\d*$/;
  if (!cellPattern.test(cell)) {
    throw new Error(`無効なセル位置: '${cell}'。正しい形式: A1, B2, AA10`);
  }
}

// 範囲検証（A1:C3形式）
function validateRangeAddress(range: string): void {
  const rangePattern = /^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/;
  if (!rangePattern.test(range)) {
    throw new Error(`無効な範囲指定: '${range}'。正しい形式: A1:C3`);
  }
}
```

## 重要な制約事項

### stdio通信 - console.log禁止

**重要**: このサーバーはstdioトランスポートを使用します。`console.log()` はMCPプロトコル通信を破壊します。

```typescript
// 絶対にやってはいけない:
console.log("デバッグメッセージ");  // MCPプロトコルが壊れる！

// ログ出力はconsole.errorを使用（stderrに出力）:
console.error(JSON.stringify({
  level: 'error',
  message: '操作失敗',
  error: error.message
}));
```

### ワークブック作成動作

`create_workbook` ツールはデフォルトで「Sheet1」シートを含むワークブックを作成します。`sheetName`引数でシート名をカスタマイズできます:

```
1. create_workbook -> Sheet1を含む.xlsxファイル作成（すぐにデータ操作可能）
2. create_workbook(sheetName: "売上データ") -> カスタム名のシートを作成
3. add_worksheet -> 追加のシートが必要な場合に使用
```

### ファイルパス要件

- 全ファイルパスは**絶対パス**必須
- 拡張子は `.xlsx` または `.xls` のみ
- 例: `C:/Users/Username/Documents/report.xlsx`
- 相対パスはエラーで拒否

## エラーハンドリングパターン

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const implementation = toolImplementations[request.params.name];
    const result = await implementation(request.params.arguments);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // パラメータ検証エラー - 有用なメッセージを提供
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new McpError(ErrorCode.InvalidParams, `引数エラー:\n${messages.join('\n')}`);
    }
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `エラー: ${error.message}`);
  }
});
```

## テストガイドライン

### コミット前の確認
```bash
npm run build           # TypeScriptがコンパイルできることを確認
npm run test:all        # 全テストスイート実行
```

### テストファイルの場所
- テスト出力は `test/output/` ディレクトリに保存
- 出力ファイルはgitignore対象
- 各テストは独自のテストファイルを作成

### テスト構成
- `mcp-basic-test.js` - MCPサーバー起動、ツール一覧、JSONRPC通信
- `excel-integration-test.js` - Excelワークフロー全体
- `tool-individual-test.js` - 11ツール各個別テスト

## TypeScript設定

`tsconfig.json` の主要設定:
- **Target**: ES2022
- **Module**: ESNext（Node解決）
- **Strictモード**: 有効
- **出力先**: `dist/` ディレクトリ
- **ソース**: `src/` ディレクトリ

## よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| ワークブック読み込みエラー | ファイルが存在しない | パス確認、絶対パス使用 |
| ワークシートが見つからない | シート名が間違っている | `get_workbook_info` でシート名確認 |
| 無効なセル位置 | 形式が間違っている | A1, B2, AA10形式を使用 |
| 拡張子エラー | .xlsx/.xls以外のファイル | 正しい拡張子を使用 |
| 空のワークブックエラー | シート未追加 | 先に `add_worksheet` を呼び出す |
| プロトコル破損 | console.log使用 | console.errorのみ使用 |

## アーキテクチャ

```
AIエージェント（Claude、ChatGPTなど）
    ↓ MCPプロトコル（stdio経由のJSON-RPC）
Excel MCPサーバー（src/index.ts）
    ↓ ExcelJSライブラリ
Excelファイル（.xlsx）
```

## コードスタイル

- **単一ファイル構成**: 全ツール実装は `src/index.ts` に集約
- **ツール命名**: `<動作>_<対象>` パターン（例: `set_cell_value`）
- **スキーマ命名**: `<ToolName>Schema` パターン（例: `SetCellValueSchema`）
- **エラーメッセージ**: 実行可能な情報を含める（利用可能なシート、正しい形式など）
- **コメント**: ソースコードのコメントとメッセージは日本語
- **ドキュメント**: `guide/` のユーザー向けドキュメントは日本語

## 依存関係

```json
{
  "@modelcontextprotocol/sdk": "^1.17.1",  // MCPプロトコル実装
  "exceljs": "^4.4.0",                      // Excelファイル操作
  "zod": "^3.25.76",                        // スキーマ検証
  "zod-to-json-schema": "^3.24.6",          // ZodをJSONスキーマに変換
  "@types/node": "^24.1.0",                 // Node.js型定義
  "typescript": "^5.9.2"                    // TypeScriptコンパイラ
}
```

## 変更を加える際の手順

1. `src/index.ts` でサーバー機能を編集
2. `npm run build` でコンパイル
3. `npm run test:all` で検証
4. 必要に応じて `npm run server:start` で手動テスト
5. ユーザー向け変更の場合は `guide/` のドキュメントも更新
