# Excel MCP Server開発ガイドライン

## プロジェクト概要

Excel自動操作向けのModel Context Protocol（MCP）サーバーです。AIエージェントがExcelファイルのワークブック、ワークシート、セル、書式、数式と効率的にやり取りできるよう設計されています。

- **対応形式**: Excel (.xlsx, .xls)
- **コアライブラリ**: ExcelJS
- **提供ツール**: 11個（ワークブック管理、セル操作、範囲操作、書式設定、数式、検索、CSV出力）

## 一般的な指示事項

### プロジェクト構成

```
excel_mcp_server/
├── src/                           # TypeScriptソース
│   └── index.ts                  # MCPサーバー入口（全ツール実装）
├── dist/                          # コンパイル済みJavaScript
├── test/                          # テストスクリプト
│   ├── mcp-basic-test.js         # 基本テスト
│   ├── excel-integration-test.js # 統合テスト
│   ├── tool-individual-test.js   # 個別ツールテスト
│   └── output/                   # テスト出力ファイル
├── guide/                         # ユーザー向けガイド
│   ├── 01-basics.md              # MCP基礎知識
│   ├── 02-setup.md               # セットアップ手順
│   ├── 03-usage.md               # 使用方法
│   ├── 04-tools.md               # ツール詳細
│   ├── 05-troubleshooting.md     # トラブルシューティング
│   └── 06-samples.md             # サンプル集
├── scripts/                       # サーバー管理スクリプト
│   └── server-manager.js         # サーバー起動・停止管理
├── docs/                          # 技術ドキュメント
│   └── server-management.md      # サーバー管理ガイド
└── package.json                   # プロジェクト設定
```

### 依存関係

必須パッケージ：
- `@modelcontextprotocol/sdk`: MCPプロトコル実装
- `exceljs`: Excelファイル読み書き
- `zod`: スキーマ検証
- `zod-to-json-schema`: ZodスキーマをJSONスキーマに変換

## ベストプラクティス

### API実装パターン

#### 1. ツール登録の原則

```typescript
// Zodスキーマを定義
const ToolSchema = z.object({
    filePath: z.string().describe('対象のExcelファイルの絶対パス'),
    sheetName: z.string().describe('対象のワークシート名'),
    // その他のパラメータ...
});

// ツール実装関数
async function toolImplementation(args: any): Promise<string> {
    const params = ToolSchema.parse(args);
    // 実装...
    return "結果メッセージ";
}

// ツールリストに登録
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: "tool_name",
            description: "ツールの説明",
            inputSchema: zodToJsonSchema(ToolSchema)
        }]
    };
});

// ツール実装マップに追加
const toolImplementations: { [key: string]: (...args: any[]) => Promise<string> } = {
    tool_name: toolImplementation
};
```

#### 2. ExcelJS 使用パターン

```typescript
import ExcelJS from "exceljs";

// ワークブック読み込み
async function loadWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook;
}

// ワークシート取得
const workbook = await loadWorkbook(filePath);
const worksheet = workbook.getWorksheet(sheetName);
if (!worksheet) {
    throw new Error(`ワークシート '${sheetName}' が見つかりません`);
}

// セル操作
worksheet.getCell('A1').value = 'Hello';
const value = worksheet.getCell('B2').value;

// ファイル保存
await workbook.xlsx.writeFile(filePath);
```

#### 3. エラーハンドリング

```typescript
// ツール実装でのエラーハンドリング
async function toolImplementation(args: any): Promise<string> {
    try {
        // パラメータ検証（Zodが自動的に例外を投げる）
        const { filePath, sheetName } = ToolSchema.parse(args);
        
        // 追加の検証
        validateFilePath(filePath);
        validateCellAddress(cell);
        
        // 処理実行
        const result = await performOperation();
        return `処理完了: ${result}`;
        
    } catch (error) {
        // Zodエラーは上位でキャッチされるため、ここでは業務エラーのみ処理
        throw new McpError(
            ErrorCode.InternalError,
            `エラー: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

// ツール呼び出しハンドラーでのエラーハンドリング
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const implementation = toolImplementations[request.params.name];
        const result = await implementation(request.params.arguments);
        return { content: [{ type: "text", text: result }] };
    } catch (error) {
        if (error instanceof z.ZodError) {
            // パラメータ検証エラー
            const errorMessages = error.errors.map(e => 
                `${e.path.join('.')}: ${e.message}`
            );
            throw new McpError(
                ErrorCode.InvalidParams,
                `引数エラー:\n${errorMessages.join('\n')}`
            );
        }
        throw error; // McpErrorはそのまま投げる
    }
});
```

### 入力検証

#### 検証ヘルパー関数

```typescript
// ファイルパス検証
function validateFilePath(filePath: string): void {
    if (!filePath) {
        throw new Error("ファイルパスが指定されていません");
    }
    if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
        throw new Error("ファイル拡張子は .xlsx または .xls である必要があります");
    }
    if (!path.isAbsolute(filePath)) {
        throw new Error("絶対パスを指定してください（例: C:/Users/Username/Documents/file.xlsx）");
    }
}

// セルアドレス検証
function validateCellAddress(cell: string): void {
    const cellPattern = /^[A-Z]+[1-9]\d*$/;
    if (!cellPattern.test(cell)) {
        throw new Error(`無効なセル位置: '${cell}'。正しい形式: A1, B2, AA10など`);
    }
}

// 範囲アドレス検証
function validateRangeAddress(range: string): void {
    const rangePattern = /^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/;
    if (!rangePattern.test(range)) {
        throw new Error(`無効な範囲指定: '${range}'。正しい形式: A1:C3, B2:D10など`);
    }
}
```

## コード標準

### ファイル組織

- **MCPサーバー**: `src/index.ts`（全ツール実装を1ファイルに集約）
  - Zodスキーマ定義
  - 検証ヘルパー関数
  - ツール実装関数
  - ツール登録ハンドラー
  - サーバー起動処理

### 命名規則

#### ツール命名

- プリフィックス: なし（簡潔な名前）
- パターン: `<action>_<target>`
  - 例: `create_workbook`, `set_cell_value`, `add_formula`
- カテゴリ:
  - ワークブック操作: `create_workbook`, `get_workbook_info`
  - ワークシート操作: `add_worksheet`
  - セル操作: `set_cell_value`, `get_cell_value`
  - 範囲操作: `set_range_values`, `get_range_values`
  - 書式操作: `format_cell`
  - 数式操作: `add_formula`
  - データ操作: `find_data`, `export_to_csv`

#### 内部関数命名

- プライベートメソッド: `private` キーワード使用
- 非同期関数: `async` キーワード明示
- 補助関数: `_` プリフィックスはなし

#### スキーマ命名

```typescript
// Zodスキーマは <ToolName>Schema パターン
const CreateWorkbookSchema = z.object({ ... });
const SetCellValueSchema = z.object({ ... });
const FormatCellSchema = z.object({ ... });
```

### Zodスキーマ定義パターン

```typescript
// ツールパラメータの定義
const SetCellValueSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス"),
    sheetName: z.string().describe("対象のワークシート名。既存のワークシート名を指定してください"),
    cell: z.string().describe("セル位置。A1形式で指定（例: A1, B2, AA10, Z99）。範囲指定（A1:B2）は不可"),
    value: z.union([z.string(), z.number(), z.boolean()]).describe("セルに設定する値。文字列、数値、真偽値のいずれか")
});

// 複雑なオブジェクトの定義（書式設定など）
const FormatCellSchema = z.object({
    filePath: z.string().describe("Excelファイルのパス"),
    sheetName: z.string().describe("ワークシート名"),
    cell: z.string().describe("セル位置（例: A1）"),
    format: z.object({
        font: z.object({
            bold: z.boolean().optional().describe("太字設定"),
            italic: z.boolean().optional().describe("斜体設定"),
            size: z.number().optional().describe("フォントサイズ"),
            color: z.string().optional().describe("フォント色（ARGB形式）")
        }).optional().describe("フォント設定"),
        fill: z.object({
            type: z.literal("pattern").describe("塗りつぶしタイプ"),
            pattern: z.string().describe("パターン（solid等）"),
            fgColor: z.string().describe("前景色（ARGB形式）")
        }).optional().describe("塗りつぶし設定")
    }).describe("セルの書式設定")
});
```

### エラーメッセージ

```typescript
// ユーザーフレンドリーかつ実行可能な情報を含める
throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能なシート: ${getSheetNames(workbook)}`);

throw new Error(`無効なセル位置: '${cell}'。正しい形式: A1, B2, AA10など`);

throw new Error("絶対パスを指定してください（例: C:/Users/Username/Documents/file.xlsx）");
```

## 一般的なパターン

### ツールカテゴリ別実装

#### ワークブック・ワークシート管理ツール

```typescript
// 3個のツール: create_workbook, get_workbook_info, add_worksheet
// 重要: create_workbookは空のワークブックを作成（シートなし）
// データ操作前に必ずadd_worksheetでシートを追加
create_workbook(filePath: string): Promise<string>
get_workbook_info(filePath: string): Promise<string>
add_worksheet(filePath: string, sheetName: string): Promise<string>
```

#### セル・範囲操作ツール

```typescript
// 4個のツール: set_cell_value, get_cell_value, set_range_values, get_range_values
// セルアドレス: A1形式（例: A1, B2, AA10）
// 範囲アドレス: A1:C3形式（例: A1:C10, B2:D5）
set_cell_value(filePath, sheetName, cell, value): Promise<string>
get_cell_value(filePath, sheetName, cell): Promise<string>
set_range_values(filePath, sheetName, startCell, values): Promise<string>
get_range_values(filePath, sheetName, range): Promise<string>
```

#### 書式・数式ツール

```typescript
// 2個のツール: format_cell, add_formula
// format_cell: フォント、背景色、罫線を設定
// add_formula: Excel数式を設定（=SUM(A1:A10)など）
format_cell(filePath, sheetName, cell, format): Promise<string>
add_formula(filePath, sheetName, cell, formula): Promise<string>
```

#### データ操作・出力ツール

```typescript
// 2個のツール: find_data, export_to_csv
find_data(filePath, sheetName, searchValue): Promise<string>
export_to_csv(filePath, sheetName, csvPath): Promise<string>
```

### 環境変数設定

このプロジェクトでは環境変数は不要です。すべての設定はツールのパラメータとして渡されます。

### テストとビルド

```bash
# ビルド
npm run build

# 開発モード（ビルド後に起動）
npm run dev

# サーバー管理（scripts/server-manager.js使用）
npm run server:start   # サーバー起動
npm run server:stop    # サーバー停止
npm run server:status  # 状態確認
npm run server:list    # 全MCPサーバー一覧
npm run server:kill    # 強制終了

# テスト実行
npm run test            # 全テスト実行
npm run test:basic      # 基本テスト
npm run test:integration # 統合テスト
npm run test:tools      # 個別ツールテスト
npm run test:all        # ビルド後に全テスト実行
```

## セキュリティ考慮事項

### ファイルシステム操作

- **パス検証**: ユーザーが指定したパスは必ず絶対パスで検証
- **拡張子検証**: `.xlsx` または `.xls` のみ許可
- **ディレクトリトラバーサル**: `../` パターンを含むパスは拒否
- **ファイル存在確認**: 読み取り前に `fs.access()` でファイル存在を確認

### ログ出力

- **stdout/stderr汚染禁止**: stdio通信では標準出力を汚染してはならない
- **デバッグログ**: 本番環境では無効化するか、ファイルに出力
- **エラーログ**: `console.error()` は使用可能だが、構造化ログ推奨
- **重要**: `console.log()` は起動メッセージでも使用禁止（MCPプロトコル違反）

## パフォーマンス最適化

### ファイルI/O削減

- **範囲操作**: 大量データは `set_range_values` を使用（個別セルよりも高速）
- **読み書き**: ワークブックは一度読み込んで複数操作後に保存
- **キャッシング**: 頻繁にアクセスするワークブックはメモリに保持（ただし注意）

## トラブルシューティング

### よくある問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| ワークブック読み込みエラー | ファイルが存在しない | ファイルパスを確認、絶対パスで指定 |
| ワークシートが見つからない | シート名が誤っている | `get_workbook_info` でシート名を確認 |
| 無効なセル位置 | セルアドレスの形式が誤っている | A1, B2, AA10などの形式で指定 |
| ファイル拡張子エラー | .xlsx/.xls以外を指定 | 正しい拡張子を使用 |
| 空のワークブックエラー | create_workbook後シート未追加 | `add_worksheet` でシートを追加 |

### デバッグ方法

```typescript
// エラーログはconsole.errorを使用（構造化ログ推奨）
console.error(JSON.stringify({ 
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Excel operation failed',
    filePath: filePath,
    sheetName: sheetName,
    error: error instanceof Error ? error.message : String(error)
}));

// 重要: console.log()は絶対に使用しないこと（stdioプロトコル違反）
```

## 検証と確認

### ビルド検証
```bash
npm run build
# TypeScriptコンパイルエラーがないことを確認
# dist/index.js が生成されることを確認
```

### テスト検証
```bash
npm run test:all
# ビルド後に全テストが実行される
# 基本テスト、統合テスト、個別ツールテストがパスすることを確認
```

### サーバー動作確認
```bash
# サーバーを起動
npm run server:start

# 別のターミナルで状態確認
npm run server:status

# テスト実行
npm run test:basic

# サーバー停止
npm run server:stop
```

### コード品質
- **型安全性**: TypeScriptの strict mode で型チェック
- **エラーハンドリング**: try-catch で全非同期操作をカバー
- **パラメータ検証**: zod スキーマで入力値検証
- **ログ汚染防止**: console.log()を使用しない（stdio通信では禁止）

## メンテナンス

### 更新時のチェックリスト

- [ ] ExcelJSライブラリの最新仕様を確認
- [ ] `@modelcontextprotocol/sdk` の新バージョン確認
- [ ] zodライブラリの最新仕様を確認
- [ ] 全テストの実行と検証
- [ ] エッジケースのテスト追加
- [ ] ガイドドキュメントの更新

### バージョン管理

- **パッチ版**: バグ修正（1.0.1）
- **マイナー版**: 新機能追加（1.1.0）
- **メジャー版**: 互換性破壊的な変更（2.0.0）

## 追加リソース

- [ExcelJS ドキュメント](https://github.com/exceljs/exceljs)
- [MCPプロトコル仕様](https://modelcontextprotocol.io/)
- [TypeScript MCPサーバー開発ガイド](./instructions/typescript-mcp-server.instructions.md)
- [Zod ドキュメント](https://zod.dev/)
