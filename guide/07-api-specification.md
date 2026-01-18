# Excel MCP Server - 引数仕様と使用例

## 共通の注意事項

### ファイルパス
- **必ず絶対パスを使用してください**
- Windows: `C:/Users/Username/Documents/file.xlsx`
- 拡張子は `.xlsx` または `.xls` を使用
- 相対パス（`./file.xlsx`）は使用不可

### シート名
- 既存のシート名を正確に指定
- 大文字小文字を区別します
- 空白文字も含めて正確に

### セル位置
- A1形式で指定: `A1`, `B2`, `AA10`, `Z99`
- 範囲指定: `A1:C3`, `B2:D10`
- 数字のみ（`1`, `2`）や列のみ（`A`, `B`）は不可

## 各ツールの詳細仕様

### 1. create_workbook

**正しい使用例:**
```json
{
  "name": "create_workbook",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx"
  }
}
```

**よくある間違い:**
- ❌ `"filePath": "report.xlsx"` (相対パス)
- ❌ `"filePath": "C:/report"` (拡張子なし)
- ❌ `"path": "C:/report.xlsx"` (パラメータ名間違い)

### 2. add_worksheet

**正しい使用例:**
```json
{
  "name": "add_worksheet",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "売上データ"
  }
}
```

**よくある間違い:**
- ❌ `"sheetName": ""` (空文字)
- ❌ 既に存在するシート名を指定

### 3. set_cell_value

**正しい使用例:**
```json
{
  "name": "set_cell_value",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "cell": "A1",
    "value": "商品名"
  }
}
```

**データ型の例:**
- 文字列: `"value": "商品名"`
- 数値: `"value": 1000`
- 真偽値: `"value": true`

**よくある間違い:**
- ❌ `"cell": "A"` (列のみ)
- ❌ `"cell": "1"` (行のみ)
- ❌ `"cell": "a1"` (小文字)

### 4. set_range_values

**正しい使用例:**
```json
{
  "name": "set_range_values",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "startCell": "A1",
    "values": [
      ["商品名", "価格", "在庫"],
      ["商品A", 1000, 50],
      ["商品B", 1500, 30]
    ]
  }
}
```

**よくある間違い:**
- ❌ `"values": []` (空配列)
- ❌ `"values": ["商品A", "商品B"]` (1次元配列)
- ❌ `"values": [["商品A"], ["商品B", 1000, 50]]` (行の長さが不一致)

### 5. get_range_values

**正しい使用例:**
```json
{
  "name": "get_range_values",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "range": "A1:C3"
  }
}
```

**よくある間違い:**
- ❌ `"range": "A1"` (単一セル - get_cell_valueを使用)
- ❌ `"range": "A1-C3"` (ハイフン使用)
- ❌ `"range": "A1:c3"` (小文字)

### 6. format_cell

**正しい使用例:**
```json
{
  "name": "format_cell",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "cell": "A1",
    "format": {
      "font": {
        "bold": true,
        "size": 14,
        "color": "FF0000FF"
      },
      "fill": {
        "type": "pattern",
        "pattern": "solid",
        "fgColor": "FFFFFF00"
      }
    }
  }
}
```

**色の指定方法:**
- ARGB形式: `FF0000FF` (不透明な青)
- `FF` + `RGB値`

### 7. add_formula

**正しい使用例:**
```json
{
  "name": "add_formula",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "cell": "D2",
    "formula": "=SUM(A2:C2)"
  }
}
```

**数式の例:**
- 合計: `=SUM(A1:A10)`
- 平均: `=AVERAGE(B1:B10)`
- 単純計算: `=A1+B1`
- 条件式: `=IF(A1>100,"高","低")`

**よくある間違い:**
- ❌ `"formula": "SUM(A1:A10)"` (=が欠如)
- ❌ `"formula": "=sum(a1:a10)"` (小文字)

### 8. find_data

**正しい使用例:**
```json
{
  "name": "find_data",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "searchValue": "商品A"
  }
}
```

**検索値の型:**
- 文字列: `"searchValue": "商品A"`
- 数値: `"searchValue": 1000`

### 9. export_to_csv

**正しい使用例:**
```json
{
  "name": "export_to_csv",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx",
    "sheetName": "Sheet1",
    "csvPath": "C:/Users/Username/Documents/export.csv"
  }
}
```

## AIへの推奨指示方法

### 良い指示例:
```
新しいExcelファイル 'C:/Users/Username/Documents/sales.xlsx' を作成して、
'売上データ' というシートを追加し、
A1セルに '商品名'、B1セルに '売上' と入力してください。
```

### 曖昧な指示例（避ける）:
```
Excelファイルを作って何かデータを入れて
```

## エラーメッセージの理解

- **ファイルが見つからない**: ファイルパスが正しくない、または存在しない
- **ワークシートが見つからない**: シート名が間違っている
- **無効なセル位置**: セル指定の形式が間違っている
- **引数エラー**: 必須パラメータが不足している、または型が間違っている

この仕様書を参考に、正確な引数でツールを呼び出してください。

---

## 戻り値形式

すべてのツールは以下の構造化JSON形式でレスポンスを返します。

### 成功時のレスポンス形式
```json
{
  "success": true,
  "operation": "ツール名",
  "data": {
    // 操作結果の詳細データ
  },
  "message": "操作完了メッセージ",
  "nextActions": [
    "推奨される次のアクション1",
    "推奨される次のアクション2"
  ]
}
```

### エラー時のレスポンス形式
```json
{
  "error": true,
  "category": "FILE_NOT_FOUND | SHEET_NOT_FOUND | INVALID_INPUT | FILE_ACCESS | INTERNAL",
  "message": "エラーメッセージ",
  "suggestions": [
    "リカバリー方法1",
    "リカバリー方法2"
  ]
}
```

### エラーカテゴリ一覧

| カテゴリ | 説明 | 対処法 |
|---------|------|--------|
| `FILE_NOT_FOUND` | ファイルが存在しない | ファイルパスを確認、絶対パスを使用 |
| `SHEET_NOT_FOUND` | シートが存在しない | get_workbook_info でシート名確認 |
| `INVALID_INPUT` | パラメータ形式エラー | セル位置やパスの形式を確認 |
| `FILE_ACCESS` | ファイルアクセスエラー | ファイルの読み取り/書き込み権限を確認 |
| `INTERNAL` | 内部エラー | 再試行または問題報告 |

### 各ツールのdata構造

#### create_workbook
```json
{
  "filePath": "作成されたファイルのパス",
  "sheetName": "Sheet1",
  "sheetsCreated": 1
}
```

#### get_workbook_info
```json
{
  "filePath": "ファイルパス",
  "sheetCount": 3,
  "sheetNames": ["Sheet1", "データ", "集計"],
  "creator": "作成者名",
  "lastModifiedBy": "最終更新者名",
  "created": "2024-01-01T00:00:00.000Z",
  "modified": "2024-01-15T10:30:00.000Z"
}
```

#### set_cell_value
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "cell": "A1",
  "value": "設定した値",
  "previousValue": "変更前の値（または null）"
}
```

#### get_cell_value
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "cell": "A1",
  "value": "取得した値",
  "valueType": "string | number | boolean | null"
}
```

#### set_range_values
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "startCell": "A1",
  "rowCount": 3,
  "columnCount": 4,
  "totalCells": 12
}
```

#### get_range_values
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "range": "A1:C3",
  "values": [
    ["値1", "値2", "値3"],
    ["値4", "値5", "値6"]
  ],
  "rowCount": 2,
  "columnCount": 3
}
```

#### find_data
```json
{
  "searchValue": "検索した値",
  "matchCount": 3,
  "matches": [
    {"cell": "A1", "value": "検索値", "row": 1, "column": 1},
    {"cell": "C5", "value": "検索値", "row": 5, "column": 3}
  ]
}
```

#### format_cell
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "cell": "A1",
  "appliedFormats": ["font", "fill", "border"]
}
```

#### add_formula
```json
{
  "filePath": "ファイルパス",
  "sheetName": "シート名",
  "cell": "A1",
  "formula": "=SUM(A1:A10)"
}
```

#### export_to_csv
```json
{
  "sourceFile": "元のExcelファイルパス",
  "sheetName": "エクスポートしたシート名",
  "csvPath": "出力されたCSVファイルパス"
}
```
