#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import ExcelJS from "exceljs";
import fs from "fs/promises";
import path from "path";
// MCP適切なスキーマ定義（Zodスキーマ）
const CreateWorkbookSchema = z.object({
    filePath: z.string().describe("作成するExcelファイルの絶対パス（例: C:/Users/Username/Documents/report.xlsx）。ファイル拡張子は.xlsxである必要があります"),
});
const GetWorkbookInfoSchema = z.object({
    filePath: z.string().describe("情報を取得するExcelファイルの絶対パス"),
});
const AddWorksheetSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス。既存のファイルである必要があります"),
    sheetName: z.string().describe("作成するワークシート名。英数字、日本語、アンダースコア、ハイフンが使用可能です"),
});
const SetCellValueSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス"),
    sheetName: z.string().describe("対象のワークシート名。既存のワークシート名を指定してください"),
    cell: z.string().describe("セル位置。A1形式で指定（例: A1, B2, AA10, Z99）。範囲指定（A1:B2）は不可"),
    value: z.union([z.string(), z.number(), z.boolean()]).describe("セルに設定する値。文字列、数値、真偽値のいずれか"),
});
const GetCellValueSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス"),
    sheetName: z.string().describe("対象のワークシート名"),
    cell: z.string().describe("セル位置。A1形式で指定（例: A1, B2, AA10）"),
});
const SetRangeValuesSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス"),
    sheetName: z.string().describe("対象のワークシート名"),
    startCell: z.string().describe("データ入力を開始するセル位置（例: A1）。ここから右下方向にデータが入力されます"),
    values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).describe("2次元配列のデータ。外側の配列が行、内側の配列が列を表します。例: [[\"商品名\", \"価格\"], [\"商品A\", 1000]]"),
});
const GetRangeValuesSchema = z.object({
    filePath: z.string().describe("対象のExcelファイルの絶対パス"),
    sheetName: z.string().describe("対象のワークシート名"),
    range: z.string().describe("取得する範囲。A1:C3形式で指定（例: A1:C10, B2:D5）"),
});
const FormatCellSchema = z.object({
    filePath: z.string().describe("Excelファイルのパス"),
    sheetName: z.string().describe("ワークシート名"),
    cell: z.string().describe("セル位置（例: A1）"),
    format: z.object({
        font: z.object({
            bold: z.boolean().optional().describe("太字設定"),
            italic: z.boolean().optional().describe("斜体設定"),
            size: z.number().optional().describe("フォントサイズ"),
            color: z.string().optional().describe("フォント色（ARGB形式）"),
        }).optional().describe("フォント設定"),
        fill: z.object({
            type: z.literal("pattern").describe("塗りつぶしタイプ"),
            pattern: z.string().describe("パターン（solid等）"),
            fgColor: z.string().describe("前景色（ARGB形式）"),
        }).optional().describe("塗りつぶし設定"),
        border: z.object({
            top: z.object({ style: z.string(), color: z.string() }).optional(),
            left: z.object({ style: z.string(), color: z.string() }).optional(),
            bottom: z.object({ style: z.string(), color: z.string() }).optional(),
            right: z.object({ style: z.string(), color: z.string() }).optional(),
        }).optional().describe("罫線設定"),
    }).describe("セルの書式設定"),
});
const FindDataSchema = z.object({
    filePath: z.string().describe("Excelファイルのパス"),
    sheetName: z.string().describe("ワークシート名"),
    searchValue: z.union([z.string(), z.number()]).describe("検索する値"),
});
const AddFormulaSchema = z.object({
    filePath: z.string().describe("Excelファイルのパス"),
    sheetName: z.string().describe("ワークシート名"),
    cell: z.string().describe("セル位置（例: A1）"),
    formula: z.string().describe("数式（=SUM(A1:A10)など、=で始まる）"),
});
const ExportToCSVSchema = z.object({
    filePath: z.string().describe("Excelファイルのパス（既存ファイル）"),
    sheetName: z.string().describe("ワークシート名（既存シート）"),
    csvPath: z.string().describe("CSVファイルの出力パス"),
});
// 引数検証ヘルパー関数
function validateFilePath(filePath) {
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
function validateCellAddress(cell) {
    const cellPattern = /^[A-Z]+[1-9]\d*$/;
    if (!cellPattern.test(cell)) {
        throw new Error(`無効なセル位置: '${cell}'。正しい形式: A1, B2, AA10など`);
    }
}
function validateRangeAddress(range) {
    const rangePattern = /^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/;
    if (!rangePattern.test(range)) {
        throw new Error(`無効な範囲指定: '${range}'。正しい形式: A1:C3, B2:D10など`);
    }
}
function getSheetNames(workbook) {
    const sheetNames = [];
    workbook.eachSheet((worksheet) => {
        sheetNames.push(worksheet.name);
    });
    return sheetNames.join(', ');
}
const server = new Server({
    name: "excel-mcp-server",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// ワークブック作成ツール
async function createWorkbook(filePath) {
    try {
        validateFilePath(filePath);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.writeFile(filePath);
        return `Excelワークブック '${filePath}' を作成しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `ワークブック作成エラー: ${error}`);
    }
}
// ワークブック情報取得
async function getWorkbookInfo(filePath) {
    try {
        validateFilePath(filePath);
        // ファイル存在確認
        try {
            await fs.access(filePath);
        }
        catch {
            throw new Error(`ファイルが見つかりません: ${filePath}`);
        }
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const info = {
            ファイルパス: filePath,
            ワークシート数: workbook.worksheets.length,
            ワークシート名一覧: workbook.worksheets.map(sheet => sheet.name),
            作成者: workbook.creator || "不明",
            最終更新者: workbook.lastModifiedBy || "不明",
            作成日時: workbook.created ? workbook.created.toISOString() : "不明",
            最終更新日時: workbook.modified ? workbook.modified.toISOString() : "不明"
        };
        return `ワークブック情報:\n${JSON.stringify(info, null, 2)}`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `ワークブック情報取得エラー: ${error}`);
    }
}
// ワークブック読み込み
async function loadWorkbook(filePath) {
    try {
        validateFilePath(filePath);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        return workbook;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `ワークブック読み込みエラー: ${error}`);
    }
}
// ワークシート追加
async function addWorksheet(filePath, sheetName) {
    try {
        if (!sheetName || sheetName.trim() === '') {
            throw new Error("ワークシート名が空です");
        }
        const workbook = await loadWorkbook(filePath);
        // 既存のシート名と重複チェック
        const existingSheet = workbook.getWorksheet(sheetName);
        if (existingSheet) {
            throw new Error(`ワークシート '${sheetName}' は既に存在します`);
        }
        workbook.addWorksheet(sheetName);
        await workbook.xlsx.writeFile(filePath);
        return `ワークシート '${sheetName}' を追加しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `ワークシート追加エラー: ${error}`);
    }
}
// セル値設定
async function setCellValue(filePath, sheetName, cell, value) {
    try {
        validateCellAddress(cell);
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能なシート: ${getSheetNames(workbook)}`);
        }
        worksheet.getCell(cell).value = value;
        await workbook.xlsx.writeFile(filePath);
        return `セル ${cell} に値 '${value}' を設定しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `セル値設定エラー: ${error}`);
    }
}
// セル値取得
async function getCellValue(filePath, sheetName, cell) {
    try {
        validateCellAddress(cell);
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能なシート: ${getSheetNames(workbook)}`);
        }
        const cellValue = worksheet.getCell(cell).value;
        return `セル ${cell} の値: ${cellValue}`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `セル値取得エラー: ${error}`);
    }
}
// 範囲値設定
async function setRangeValues(filePath, sheetName, startCell, values) {
    try {
        validateCellAddress(startCell);
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error("valuesは空でない2次元配列である必要があります");
        }
        // 2次元配列の検証
        for (let i = 0; i < values.length; i++) {
            if (!Array.isArray(values[i])) {
                throw new Error(`${i + 1}行目が配列ではありません。2次元配列を指定してください`);
            }
        }
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能なシート: ${getSheetNames(workbook)}`);
        }
        const startCellObj = worksheet.getCell(startCell);
        const startRow = startCellObj.row;
        const startCol = startCellObj.col;
        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
                worksheet.getCell(startRow + i, startCol + j).value = values[i][j];
            }
        }
        await workbook.xlsx.writeFile(filePath);
        return `範囲 ${startCell} から ${values.length}行 x ${values[0].length}列 のデータを設定しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `範囲値設定エラー: ${error}`);
    }
}
// 範囲値取得
async function getRangeValues(filePath, sheetName, range) {
    try {
        validateRangeAddress(range);
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。利用可能なシート: ${getSheetNames(workbook)}`);
        }
        const rangeCells = worksheet.getCell(range);
        const values = [];
        // 指定範囲のデータを取得する正しい実装
        const [startCell, endCell] = range.split(':');
        const startCellObj = worksheet.getCell(startCell);
        const endCellObj = worksheet.getCell(endCell);
        const startRow = Number(startCellObj.row);
        const startCol = Number(startCellObj.col);
        const endRow = Number(endCellObj.row);
        const endCol = Number(endCellObj.col);
        for (let row = startRow; row <= endRow; row++) {
            const rowValues = [];
            for (let col = startCol; col <= endCol; col++) {
                rowValues.push(worksheet.getCell(row, col).value);
            }
            values.push(rowValues);
        }
        return `範囲 ${range} の値:\n${JSON.stringify(values, null, 2)}`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `範囲値取得エラー: ${error}`);
    }
}
// セル書式設定
async function formatCell(filePath, sheetName, cell, format) {
    try {
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。`);
        }
        const targetCell = worksheet.getCell(cell);
        // フォント設定
        if (format.font) {
            const fontFormat = {};
            if (format.font.bold !== undefined)
                fontFormat.bold = format.font.bold;
            if (format.font.size)
                fontFormat.size = format.font.size;
            if (format.font.color) {
                fontFormat.color = { argb: format.font.color };
            }
            targetCell.font = fontFormat;
        }
        // 背景色設定
        if (format.fill) {
            if (format.fill.type === 'pattern') {
                const fillFormat = {
                    type: 'pattern',
                    pattern: format.fill.pattern || 'solid'
                };
                if (format.fill.fgColor) {
                    fillFormat.fgColor = { argb: format.fill.fgColor };
                }
                if (format.fill.bgColor) {
                    fillFormat.bgColor = { argb: format.fill.bgColor };
                }
                targetCell.fill = fillFormat;
            }
            else {
                // 簡単な背景色設定
                targetCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: format.fill.fgColor || format.fill }
                };
            }
        }
        // 罫線設定
        if (format.border) {
            targetCell.border = format.border;
        }
        await workbook.xlsx.writeFile(filePath);
        return `セル ${cell} の書式を設定しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `セル書式設定エラー: ${error}`);
    }
}
// 数式追加
async function addFormula(filePath, sheetName, cell, formula) {
    try {
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。`);
        }
        worksheet.getCell(cell).value = { formula: formula };
        await workbook.xlsx.writeFile(filePath);
        return `セル ${cell} に数式 '${formula}' を設定しました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `数式追加エラー: ${error}`);
    }
}
// データ検索
async function findData(filePath, sheetName, searchValue) {
    try {
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。`);
        }
        const results = [];
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value === searchValue) {
                    const cellAddress = worksheet.getCell(rowNumber, colNumber).address;
                    results.push(cellAddress);
                }
            });
        });
        return `値 '${searchValue}' が見つかったセル: ${results.join(', ')}`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `データ検索エラー: ${error}`);
    }
}
// CSV出力
async function exportToCSV(filePath, sheetName, csvPath) {
    try {
        const workbook = await loadWorkbook(filePath);
        const worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            throw new Error(`ワークシート '${sheetName}' が見つかりません。`);
        }
        await workbook.csv.writeFile(csvPath, { sheetName });
        return `ワークシート '${sheetName}' をCSVファイル '${csvPath}' にエクスポートしました。`;
    }
    catch (error) {
        throw new McpError(ErrorCode.InternalError, `CSV出力エラー: ${error}`);
    }
}
// ツールリストハンドラー（直接定義）
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "create_workbook",
                description: "新しいExcelワークブックを作成します",
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
const toolImplementations = {
    create_workbook: async (args) => {
        const { filePath } = CreateWorkbookSchema.parse(args);
        return await createWorkbook(filePath);
    },
    get_workbook_info: async (args) => {
        const { filePath } = GetWorkbookInfoSchema.parse(args);
        return await getWorkbookInfo(filePath);
    },
    add_worksheet: async (args) => {
        const { filePath, sheetName } = AddWorksheetSchema.parse(args);
        return await addWorksheet(filePath, sheetName);
    },
    set_cell_value: async (args) => {
        const { filePath, sheetName, cell, value } = SetCellValueSchema.parse(args);
        return await setCellValue(filePath, sheetName, cell, value);
    },
    get_cell_value: async (args) => {
        const { filePath, sheetName, cell } = GetCellValueSchema.parse(args);
        return await getCellValue(filePath, sheetName, cell);
    },
    set_range_values: async (args) => {
        const { filePath, sheetName, startCell, values } = SetRangeValuesSchema.parse(args);
        return await setRangeValues(filePath, sheetName, startCell, values);
    },
    get_range_values: async (args) => {
        const { filePath, sheetName, range } = GetRangeValuesSchema.parse(args);
        return await getRangeValues(filePath, sheetName, range);
    },
    format_cell: async (args) => {
        const { filePath, sheetName, cell, format } = FormatCellSchema.parse(args);
        return await formatCell(filePath, sheetName, cell, format);
    },
    add_formula: async (args) => {
        const { filePath, sheetName, cell, formula } = AddFormulaSchema.parse(args);
        return await addFormula(filePath, sheetName, cell, formula);
    },
    find_data: async (args) => {
        const { filePath, sheetName, searchValue } = FindDataSchema.parse(args);
        return await findData(filePath, sheetName, searchValue);
    },
    export_to_csv: async (args) => {
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
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map(e => {
                const field = e.path.join('.');
                const message = e.message;
                const expectedValues = e.code === 'invalid_enum_value' ?
                    `期待値: ${e.options?.join(', ')}` : '';
                return `${field}: ${message} ${expectedValues}`.trim();
            });
            throw new McpError(ErrorCode.InvalidParams, `引数エラー:\n${errorMessages.join('\n')}\n\n使用例を参考にしてください。`);
        }
        if (error instanceof McpError) {
            throw error;
        }
        // その他のエラー
        throw new McpError(ErrorCode.InternalError, `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`);
    }
});
// サーバー開始
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // 正常な起動メッセージは標準出力に出力
    console.log("Excel MCP Server が開始されました");
}
runServer().catch(console.error);
