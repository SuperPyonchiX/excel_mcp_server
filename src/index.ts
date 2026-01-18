#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import ExcelJS from "exceljs";
import fs from "fs/promises";
import path from "path";

// ========================================
// 共通スキーマ定義
// ========================================

// セルアドレス検証スキーマ（A1形式）
const CellAddressSchema = z.string()
  .regex(/^[A-Z]+[1-9]\d*$/, {
    message: "セル位置はA1形式で指定してください（例: A1, B2, AA10）"
  })
  .describe("セル位置。A1形式で指定（例: A1, B2, AA10）");

// 範囲アドレス検証スキーマ（A1:C3形式）
const RangeAddressSchema = z.string()
  .regex(/^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/, {
    message: "範囲はA1:C3形式で指定してください（例: A1:C10, B2:D5）"
  })
  .describe("範囲指定。A1:C3形式で指定（例: A1:C10）");

// Excelファイルパス検証スキーマ
const ExcelFilePathSchema = z.string()
  .refine((p) => path.isAbsolute(p), {
    message: "絶対パスを指定してください（例: C:/Users/Username/Documents/file.xlsx）"
  })
  .refine((p) => p.endsWith('.xlsx') || p.endsWith('.xls'), {
    message: "ファイル拡張子は .xlsx または .xls である必要があります"
  })
  .describe("Excelファイルの絶対パス（.xlsx または .xls）");

// ARGB色形式検証スキーマ
const ARGBColorSchema = z.string()
  .regex(/^[0-9A-Fa-f]{8}$/, {
    message: "色はARGB形式（8桁の16進数）で指定してください（例: FF0000FF = 不透明な青）"
  })
  .describe("色指定（ARGB形式、例: FF0000FF = 不透明な青、FFFFFF00 = 不透明な黄）");

// ワークシート名スキーマ
const SheetNameSchema = z.string()
  .min(1, { message: "ワークシート名は空にできません" })
  .describe("ワークシート名");

// ========================================
// エラーカテゴリとレスポンス型定義
// ========================================

const ErrorCategory = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS: 'FILE_ACCESS',
  SHEET_NOT_FOUND: 'SHEET_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL: 'INTERNAL'
} as const;

type ErrorCategoryType = typeof ErrorCategory[keyof typeof ErrorCategory];

interface ToolResponse<T = unknown> {
  success: boolean;
  operation: string;
  data?: T;
  message: string;
  nextActions?: string[];
}

interface ErrorResponse {
  error: boolean;
  category: ErrorCategoryType;
  message: string;
  suggestions: string[];
}

// 成功レスポンス生成関数
function createSuccessResponse<T>(
  operation: string,
  data: T,
  message: string,
  nextActions?: string[]
): string {
  const response: ToolResponse<T> = {
    success: true,
    operation,
    data,
    message,
    nextActions
  };
  return JSON.stringify(response, null, 2);
}

// エラーレスポンス生成関数
function createErrorResponse(
  category: ErrorCategoryType,
  message: string,
  suggestions: string[]
): ErrorResponse {
  return {
    error: true,
    category,
    message,
    suggestions
  };
}

// ========================================
// MCP適切なスキーマ定義（Zodスキーマ）
// ========================================

const CreateWorkbookSchema = z.object({
  filePath: ExcelFilePathSchema.describe("作成するExcelファイルの絶対パス"),
  sheetName: z.string()
    .min(1, { message: "ワークシート名は空にできません" })
    .optional()
    .default("Sheet1")
    .describe("初期ワークシート名（省略時は 'Sheet1' を作成）"),
});

const GetWorkbookInfoSchema = z.object({
  filePath: ExcelFilePathSchema.describe("情報を取得するExcelファイルの絶対パス"),
});

const AddWorksheetSchema = z.object({
  filePath: ExcelFilePathSchema.describe("対象のExcelファイルの絶対パス。既存のファイルである必要があります"),
  sheetName: SheetNameSchema.describe("作成するワークシート名。英数字、日本語、アンダースコア、ハイフンが使用可能です"),
});

const SetCellValueSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema.describe("対象のワークシート名。既存のワークシート名を指定してください"),
  cell: CellAddressSchema.describe("セル位置。A1形式で指定（例: A1, B2, AA10, Z99）。範囲指定（A1:B2）は不可"),
  value: z.union([z.string(), z.number(), z.boolean()]).describe("セルに設定する値。文字列、数値、真偽値のいずれか"),
});

const GetCellValueSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  cell: CellAddressSchema,
});

const SetRangeValuesSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  startCell: CellAddressSchema.describe("データ入力を開始するセル位置（例: A1）。ここから右下方向にデータが入力されます"),
  values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()])))
    .min(1, { message: "valuesは空でない2次元配列である必要があります" })
    .describe("2次元配列のデータ。外側の配列が行、内側の配列が列を表します。例: [[\"商品名\", \"価格\"], [\"商品A\", 1000]]"),
});

const GetRangeValuesSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  range: RangeAddressSchema,
});

const FormatCellSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  cell: CellAddressSchema,
  format: z.object({
    font: z.object({
      bold: z.boolean().optional().describe("太字設定"),
      italic: z.boolean().optional().describe("斜体設定"),
      size: z.number().optional().describe("フォントサイズ"),
      color: ARGBColorSchema.optional().describe("フォント色（ARGB形式）"),
    }).optional().describe("フォント設定"),
    fill: z.object({
      type: z.literal("pattern").describe("塗りつぶしタイプ"),
      pattern: z.string().describe("パターン（solid等）"),
      fgColor: ARGBColorSchema.describe("前景色（ARGB形式）"),
    }).optional().describe("塗りつぶし設定"),
    border: z.object({
      top: z.object({ style: z.string(), color: ARGBColorSchema }).optional(),
      left: z.object({ style: z.string(), color: ARGBColorSchema }).optional(),
      bottom: z.object({ style: z.string(), color: ARGBColorSchema }).optional(),
      right: z.object({ style: z.string(), color: ARGBColorSchema }).optional(),
    }).optional().describe("罫線設定"),
  }).describe("セルの書式設定"),
});

const FindDataSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  searchValue: z.union([z.string(), z.number()]).describe("検索する値"),
});

const AddFormulaSchema = z.object({
  filePath: ExcelFilePathSchema,
  sheetName: SheetNameSchema,
  cell: CellAddressSchema,
  formula: z.string()
    .refine((f) => f.startsWith('='), {
      message: "数式は '=' で始まる必要があります（例: =SUM(A1:A10)）"
    })
    .describe("数式（=SUM(A1:A10)など、=で始まる）"),
});

const ExportToCSVSchema = z.object({
  filePath: ExcelFilePathSchema.describe("Excelファイルのパス（既存ファイル）"),
  sheetName: SheetNameSchema.describe("ワークシート名（既存シート）"),
  csvPath: z.string()
    .refine((p) => path.isAbsolute(p), {
      message: "絶対パスを指定してください"
    })
    .describe("CSVファイルの出力パス（絶対パス）"),
});

// ========================================
// ヘルパー関数
// ========================================

function getSheetNames(workbook: ExcelJS.Workbook): string {
  const sheetNames: string[] = [];
  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);
  });
  return sheetNames.join(', ');
}

function getSheetNamesArray(workbook: ExcelJS.Workbook): string[] {
  const sheetNames: string[] = [];
  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);
  });
  return sheetNames;
}

const server = new Server(
  {
    name: "excel-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ワークブック作成ツール
async function createWorkbook(filePath: string, sheetName: string = "Sheet1"): Promise<string> {
  try {
    const workbook = new ExcelJS.Workbook();
    // 初期ワークシートを作成
    workbook.addWorksheet(sheetName);
    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'create_workbook',
      {
        filePath,
        sheetName,
        sheetsCreated: 1
      },
      `ワークブック '${filePath}' を作成しました（シート: '${sheetName}'）`,
      [
        `set_cell_value でシート '${sheetName}' にデータを入力できます`,
        `set_range_values で複数データを一括入力できます`,
        'add_worksheet で追加のシートを作成できます'
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.FILE_ACCESS,
      `ワークブック作成エラー: ${error instanceof Error ? error.message : String(error)}`,
      [
        'ディレクトリが存在するか確認してください',
        '書き込み権限があるか確認してください',
        '絶対パスを使用してください（例: C:/Users/Username/Documents/file.xlsx）'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// ワークブック情報取得
async function getWorkbookInfo(filePath: string): Promise<string> {
  try {
    // ファイル存在確認
    try {
      await fs.access(filePath);
    } catch {
      const errorResponse = createErrorResponse(
        ErrorCategory.FILE_NOT_FOUND,
        `ファイルが見つかりません: ${filePath}`,
        [
          'ファイルパスが正しいか確認してください',
          '絶対パスを使用してください',
          'create_workbook で新しいファイルを作成できます'
        ]
      );
      throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    return createSuccessResponse(
      'get_workbook_info',
      {
        filePath,
        sheetCount: workbook.worksheets.length,
        sheetNames: workbook.worksheets.map(sheet => sheet.name),
        creator: workbook.creator || null,
        lastModifiedBy: workbook.lastModifiedBy || null,
        created: workbook.created ? workbook.created.toISOString() : null,
        modified: workbook.modified ? workbook.modified.toISOString() : null
      },
      `ワークブック情報を取得しました（${workbook.worksheets.length}シート）`,
      workbook.worksheets.length === 0
        ? ['add_worksheet でワークシートを追加してください']
        : [`set_cell_value でシート '${workbook.worksheets[0]?.name}' にデータを入力できます`]
    );
  } catch (error) {
    if (error instanceof McpError) throw error;
    const errorResponse = createErrorResponse(
      ErrorCategory.FILE_ACCESS,
      `ワークブック情報取得エラー: ${error instanceof Error ? error.message : String(error)}`,
      [
        'ファイルが破損していないか確認してください',
        '読み取り権限があるか確認してください'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// ワークブック読み込み
async function loadWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  try {
    // ファイル存在確認
    await fs.access(filePath);
  } catch {
    const errorResponse = createErrorResponse(
      ErrorCategory.FILE_NOT_FOUND,
      `ファイルが見つかりません: ${filePath}`,
      [
        'ファイルパスが正しいか確認してください',
        '絶対パスを使用してください',
        'create_workbook で新しいファイルを作成できます'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook;
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.FILE_ACCESS,
      `ワークブック読み込みエラー: ${error instanceof Error ? error.message : String(error)}`,
      [
        'ファイルが破損していないか確認してください',
        '読み取り権限があるか確認してください',
        '有効なExcelファイル(.xlsx/.xls)か確認してください'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// ワークシート追加
async function addWorksheet(filePath: string, sheetName: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);

  // 既存のシート名と重複チェック
  const existingSheet = workbook.getWorksheet(sheetName);
  if (existingSheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INVALID_INPUT,
      `ワークシート '${sheetName}' は既に存在します`,
      [
        `利用可能なシート: ${getSheetNames(workbook)}`,
        '別のシート名を指定してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    workbook.addWorksheet(sheetName);
    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'add_worksheet',
      {
        filePath,
        sheetName,
        totalSheets: workbook.worksheets.length
      },
      `ワークシート '${sheetName}' を追加しました`,
      [
        `set_cell_value でシート '${sheetName}' にデータを入力できます`,
        `set_range_values で複数データを一括入力できます`
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INTERNAL,
      `ワークシート追加エラー: ${error instanceof Error ? error.message : String(error)}`,
      ['ファイルの書き込み権限を確認してください']
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// セル値設定
async function setCellValue(filePath: string, sheetName: string, cell: string, value: string | number | boolean): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください',
        'add_worksheet でシートを追加できます'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    const previousValue = worksheet.getCell(cell).value;
    worksheet.getCell(cell).value = value;
    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'set_cell_value',
      {
        filePath,
        sheetName,
        cell,
        value,
        previousValue: previousValue ?? null
      },
      `セル ${cell} に値を設定しました`,
      [
        `get_cell_value で設定値を確認できます`,
        `format_cell でセルの書式を設定できます`
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INTERNAL,
      `セル値設定エラー: ${error instanceof Error ? error.message : String(error)}`,
      ['ファイルの書き込み権限を確認してください']
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// セル値取得
async function getCellValue(filePath: string, sheetName: string, cell: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  const cellValue = worksheet.getCell(cell).value;
  const valueType = cellValue === null ? 'null' : typeof cellValue;

  return createSuccessResponse(
    'get_cell_value',
    {
      filePath,
      sheetName,
      cell,
      value: cellValue,
      valueType
    },
    cellValue !== null ? `セル ${cell} の値を取得しました` : `セル ${cell} は空です`,
    [
      'set_cell_value で値を変更できます',
      'get_range_values で範囲の値を取得できます'
    ]
  );
}

// 範囲値設定
async function setRangeValues(filePath: string, sheetName: string, startCell: string, values: (string | number | boolean)[][]): Promise<string> {
  // 2次元配列の検証
  for (let i = 0; i < values.length; i++) {
    if (!Array.isArray(values[i])) {
      const errorResponse = createErrorResponse(
        ErrorCategory.INVALID_INPUT,
        `${i + 1}行目が配列ではありません`,
        [
          '2次元配列を指定してください',
          '例: [["商品名", "価格"], ["商品A", 1000]]'
        ]
      );
      throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
    }
  }

  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください',
        'add_worksheet でシートを追加できます'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    const startCellObj = worksheet.getCell(startCell);
    const startRow = startCellObj.row;
    const startCol = startCellObj.col;
    const rowCount = values.length;
    const columnCount = values[0]?.length || 0;

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        worksheet.getCell(startRow + i, startCol + j).value = values[i][j];
      }
    }

    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'set_range_values',
      {
        filePath,
        sheetName,
        startCell,
        rowCount,
        columnCount,
        totalCells: rowCount * columnCount
      },
      `${rowCount}行 x ${columnCount}列 のデータを設定しました`,
      [
        `get_range_values で設定値を確認できます`,
        `format_cell で書式を設定できます`
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INTERNAL,
      `範囲値設定エラー: ${error instanceof Error ? error.message : String(error)}`,
      ['ファイルの書き込み権限を確認してください']
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// 範囲値取得
async function getRangeValues(filePath: string, sheetName: string, range: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  // 指定範囲のデータを取得
  const [startCell, endCell] = range.split(':');
  const startCellObj = worksheet.getCell(startCell);
  const endCellObj = worksheet.getCell(endCell);

  const startRow = Number(startCellObj.row);
  const startCol = Number(startCellObj.col);
  const endRow = Number(endCellObj.row);
  const endCol = Number(endCellObj.col);

  const values: unknown[][] = [];
  for (let row = startRow; row <= endRow; row++) {
    const rowValues: unknown[] = [];
    for (let col = startCol; col <= endCol; col++) {
      rowValues.push(worksheet.getCell(row, col).value);
    }
    values.push(rowValues);
  }

  const rowCount = endRow - startRow + 1;
  const columnCount = endCol - startCol + 1;

  return createSuccessResponse(
    'get_range_values',
    {
      filePath,
      sheetName,
      range,
      values,
      rowCount,
      columnCount
    },
    `範囲 ${range} のデータを取得しました（${rowCount}行 x ${columnCount}列）`,
    [
      'set_range_values で値を変更できます',
      'find_data でデータを検索できます'
    ]
  );
}

// セル書式設定
interface FormatOptions {
  font?: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: string;
  };
  fill?: {
    type: 'pattern';
    pattern: string;
    fgColor: string;
    bgColor?: string;
  };
  border?: {
    top?: { style: string; color: string };
    left?: { style: string; color: string };
    bottom?: { style: string; color: string };
    right?: { style: string; color: string };
  };
}

async function formatCell(filePath: string, sheetName: string, cell: string, format: FormatOptions): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    const targetCell = worksheet.getCell(cell);
    const appliedFormats: string[] = [];

    // フォント設定
    if (format.font) {
      const fontFormat: Partial<ExcelJS.Font> = {};
      if (format.font.bold !== undefined) fontFormat.bold = format.font.bold;
      if (format.font.italic !== undefined) fontFormat.italic = format.font.italic;
      if (format.font.size) fontFormat.size = format.font.size;
      if (format.font.color) {
        fontFormat.color = { argb: format.font.color };
      }
      targetCell.font = fontFormat as ExcelJS.Font;
      appliedFormats.push('font');
    }

    // 背景色設定
    if (format.fill) {
      const fillFormat: ExcelJS.FillPattern = {
        type: 'pattern',
        pattern: (format.fill.pattern || 'solid') as ExcelJS.FillPatterns,
        fgColor: { argb: format.fill.fgColor }
      };
      if (format.fill.bgColor) {
        fillFormat.bgColor = { argb: format.fill.bgColor };
      }
      targetCell.fill = fillFormat;
      appliedFormats.push('fill');
    }

    // 罫線設定
    if (format.border) {
      const borderFormat: Partial<ExcelJS.Borders> = {};
      if (format.border.top) {
        borderFormat.top = { style: format.border.top.style as ExcelJS.BorderStyle, color: { argb: format.border.top.color } };
      }
      if (format.border.left) {
        borderFormat.left = { style: format.border.left.style as ExcelJS.BorderStyle, color: { argb: format.border.left.color } };
      }
      if (format.border.bottom) {
        borderFormat.bottom = { style: format.border.bottom.style as ExcelJS.BorderStyle, color: { argb: format.border.bottom.color } };
      }
      if (format.border.right) {
        borderFormat.right = { style: format.border.right.style as ExcelJS.BorderStyle, color: { argb: format.border.right.color } };
      }
      targetCell.border = borderFormat;
      appliedFormats.push('border');
    }

    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'format_cell',
      {
        filePath,
        sheetName,
        cell,
        appliedFormats
      },
      `セル ${cell} の書式を設定しました`,
      [
        'get_cell_value でセルの値を確認できます',
        '他のセルにも同じ書式を適用できます'
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INTERNAL,
      `セル書式設定エラー: ${error instanceof Error ? error.message : String(error)}`,
      ['ファイルの書き込み権限を確認してください']
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// 数式追加
async function addFormula(filePath: string, sheetName: string, cell: string, formula: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    worksheet.getCell(cell).value = { formula: formula };
    await workbook.xlsx.writeFile(filePath);

    return createSuccessResponse(
      'add_formula',
      {
        filePath,
        sheetName,
        cell,
        formula
      },
      `セル ${cell} に数式を設定しました`,
      [
        'get_cell_value で計算結果を確認できます',
        'Excelで開くと数式が計算されます'
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.INTERNAL,
      `数式追加エラー: ${error instanceof Error ? error.message : String(error)}`,
      [
        '数式の構文を確認してください',
        '数式は "=" で始まる必要があります（例: =SUM(A1:A10)）'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// データ検索
async function findData(filePath: string, sheetName: string, searchValue: string | number): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  const matches: Array<{ cell: string; value: unknown; row: number; column: number }> = [];

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      if (cell.value === searchValue) {
        const cellAddress = worksheet.getCell(rowNumber, colNumber).address;
        matches.push({
          cell: cellAddress,
          value: cell.value,
          row: rowNumber,
          column: colNumber
        });
      }
    });
  });

  const message = matches.length > 0
    ? `${matches.length}件の一致が見つかりました`
    : `'${searchValue}' は見つかりませんでした`;

  const nextActions = matches.length > 0
    ? [
        `get_cell_value で詳細を確認: ${matches[0].cell}`,
        'set_cell_value で値を更新できます'
      ]
    : [
        'get_range_values で範囲内のデータを確認してください',
        '別のシートを検索: find_data で sheetName を変更'
      ];

  return createSuccessResponse(
    'find_data',
    {
      searchValue,
      matchCount: matches.length,
      matches
    },
    message,
    nextActions
  );
}

// CSV出力
async function exportToCSV(filePath: string, sheetName: string, csvPath: string): Promise<string> {
  const workbook = await loadWorkbook(filePath);
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    const errorResponse = createErrorResponse(
      ErrorCategory.SHEET_NOT_FOUND,
      `ワークシート '${sheetName}' が見つかりません`,
      [
        `利用可能なシート: ${getSheetNames(workbook) || '(なし)'}`,
        'get_workbook_info でシート一覧を確認してください'
      ]
    );
    throw new McpError(ErrorCode.InvalidParams, JSON.stringify(errorResponse));
  }

  try {
    await workbook.csv.writeFile(csvPath, { sheetName });

    return createSuccessResponse(
      'export_to_csv',
      {
        sourceFile: filePath,
        sheetName,
        csvPath
      },
      `ワークシート '${sheetName}' をCSVにエクスポートしました`,
      [
        'エクスポートしたCSVファイルを確認してください',
        '別のシートもエクスポートできます'
      ]
    );
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCategory.FILE_ACCESS,
      `CSV出力エラー: ${error instanceof Error ? error.message : String(error)}`,
      [
        '出力先ディレクトリが存在するか確認してください',
        '書き込み権限があるか確認してください'
      ]
    );
    throw new McpError(ErrorCode.InternalError, JSON.stringify(errorResponse));
  }
}

// ツールリストハンドラー（直接定義）
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_workbook",
        description: "新しいExcelワークブックを作成します。デフォルトで 'Sheet1' という名前のワークシートが作成されます。sheetName引数でシート名をカスタマイズできます。",
        inputSchema: zodToJsonSchema(CreateWorkbookSchema)
      },
      {
        name: "get_workbook_info",
        description: "Excelワークブックの詳細情報を取得します（シート一覧、メタデータ等）",
        inputSchema: zodToJsonSchema(GetWorkbookInfoSchema)
      },
      {
        name: "add_worksheet", 
        description: "既存のワークブックにワークシートを追加します",
        inputSchema: zodToJsonSchema(AddWorksheetSchema)
      },
      {
        name: "set_cell_value",
        description: "指定されたセルに値を設定します",
        inputSchema: zodToJsonSchema(SetCellValueSchema)
      },
      {
        name: "get_cell_value",
        description: "指定されたセルの値を取得します", 
        inputSchema: zodToJsonSchema(GetCellValueSchema)
      },
      {
        name: "set_range_values",
        description: "指定された範囲に2次元配列のデータを設定します",
        inputSchema: zodToJsonSchema(SetRangeValuesSchema)
      },
      {
        name: "get_range_values",
        description: "指定された範囲のデータを取得します",
        inputSchema: zodToJsonSchema(GetRangeValuesSchema)
      },
      {
        name: "format_cell",
        description: "セルの書式（フォント、塗りつぶし、罫線）を設定します",
        inputSchema: zodToJsonSchema(FormatCellSchema)
      },
      {
        name: "add_formula",
        description: "セルに数式を追加します",
        inputSchema: zodToJsonSchema(AddFormulaSchema)
      },
      {
        name: "find_data",
        description: "ワークシート内で指定された値を検索します",
        inputSchema: zodToJsonSchema(FindDataSchema)
      },
      {
        name: "export_to_csv",
        description: "ワークシートをCSVファイルにエクスポートします",
        inputSchema: zodToJsonSchema(ExportToCSVSchema)
      }
    ]
  };
});

// ツール実装関数のマップ
const toolImplementations: { [key: string]: (...args: any[]) => Promise<string> } = {
  create_workbook: async (args: any) => {
    const { filePath, sheetName } = CreateWorkbookSchema.parse(args);
    return await createWorkbook(filePath, sheetName);
  },
  get_workbook_info: async (args: any) => {
    const { filePath } = GetWorkbookInfoSchema.parse(args);
    return await getWorkbookInfo(filePath);
  },
  add_worksheet: async (args: any) => {
    const { filePath, sheetName } = AddWorksheetSchema.parse(args);
    return await addWorksheet(filePath, sheetName);
  },
  set_cell_value: async (args: any) => {
    const { filePath, sheetName, cell, value } = SetCellValueSchema.parse(args);
    return await setCellValue(filePath, sheetName, cell, value);
  },
  get_cell_value: async (args: any) => {
    const { filePath, sheetName, cell } = GetCellValueSchema.parse(args);
    return await getCellValue(filePath, sheetName, cell);
  },
  set_range_values: async (args: any) => {
    const { filePath, sheetName, startCell, values } = SetRangeValuesSchema.parse(args);
    return await setRangeValues(filePath, sheetName, startCell, values);
  },
  get_range_values: async (args: any) => {
    const { filePath, sheetName, range } = GetRangeValuesSchema.parse(args);
    return await getRangeValues(filePath, sheetName, range);
  },
  format_cell: async (args: any) => {
    const { filePath, sheetName, cell, format } = FormatCellSchema.parse(args);
    return await formatCell(filePath, sheetName, cell, format);
  },
  add_formula: async (args: any) => {
    const { filePath, sheetName, cell, formula } = AddFormulaSchema.parse(args);
    return await addFormula(filePath, sheetName, cell, formula);
  },
  find_data: async (args: any) => {
    const { filePath, sheetName, searchValue } = FindDataSchema.parse(args);
    return await findData(filePath, sheetName, searchValue);
  },
  export_to_csv: async (args: any) => {
    const { filePath, sheetName, csvPath } = ExportToCSVSchema.parse(args);
    return await exportToCSV(filePath, sheetName, csvPath);
  }
};

// ツール呼び出しハンドラー（自動化）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const implementation = toolImplementations[name];
    if (!implementation) {
      throw new McpError(ErrorCode.MethodNotFound, `未知のツール: ${name}`);
    }

    const result = await implementation(args);
    return { content: [{ type: "text", text: result }] };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => {
        const field = e.path.join('.');
        const message = e.message;
        const expectedValues = e.code === 'invalid_enum_value' ? 
          `期待値: ${(e as any).options?.join(', ')}` : '';
        return `${field}: ${message} ${expectedValues}`.trim();
      });
      
      throw new McpError(
        ErrorCode.InvalidParams,
        `引数エラー:\n${errorMessages.join('\n')}\n\n使用例を参考にしてください。`
      );
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    // その他のエラー
    throw new McpError(
      ErrorCode.InternalError,
      `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// サーバー開始
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
