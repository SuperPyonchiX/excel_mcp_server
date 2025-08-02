# 🔧 ツール詳細

この文書では、Excel MCP Serverが提供する各ツールの詳細な仕様と使用例を説明します。

## ツール一覧

| ツール名 | 機能 | 主な用途 |
|---------|------|----------|
| `create_workbook` | ワークブック作成 | 新しいExcelファイルの作成 |
| `add_worksheet` | ワークシート追加 | 既存ファイルへのシート追加 |
| `set_cell_value` | セル値設定 | 単一セルへのデータ入力 |
| `get_cell_value` | セル値取得 | 単一セルのデータ読み取り |
| `set_range_values` | 範囲値設定 | 複数セルへの一括データ入力 |
| `get_range_values` | 範囲値取得 | 複数セルのデータ読み取り |
| `format_cell` | セル書式設定 | フォント、色、罫線の設定 |
| `add_formula` | 数式追加 | 計算式の設定 |
| `find_data` | データ検索 | ワークシート内の値検索 |
| `export_to_csv` | CSV出力 | シートのCSV変換 |

---

## 1. create_workbook

### 機能
新しいExcelワークブックファイルを作成します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 作成するExcelファイルのパス |

### 使用例
```json
{
  "name": "create_workbook",
  "arguments": {
    "filePath": "C:/Users/Username/Documents/report.xlsx"
  }
}
```

### AI指示例
```
"新しいExcelファイル 'monthly_report.xlsx' を作成してください"
```

### 注意事項
- 既存ファイルは上書きされます
- ディレクトリが存在しない場合はエラーになります
- デフォルトで空のワークシートが1つ作成されます

---

## 2. add_worksheet

### 機能
既存のワークブックに新しいワークシートを追加します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 新しいワークシート名 |

### 使用例
```json
{
  "name": "add_worksheet",
  "arguments": {
    "filePath": "C:/path/to/workbook.xlsx",
    "sheetName": "売上データ"
  }
}
```

### AI指示例
```
"既存のファイルに '売上分析' というシートを追加してください"
```

---

## 3. set_cell_value

### 機能
指定されたセルに値を設定します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `cell` | string | ✅ | セル位置（例: "A1", "B2"） |
| `value` | string/number/boolean | ✅ | 設定する値 |

### 使用例
```json
{
  "name": "set_cell_value",
  "arguments": {
    "filePath": "report.xlsx",
    "sheetName": "Sheet1",
    "cell": "A1",
    "value": "商品名"
  }
}
```

### 対応データ型
- **文字列**: `"商品名"`
- **数値**: `123`, `45.67`
- **真偽値**: `true`, `false`

---

## 4. get_cell_value

### 機能
指定されたセルの値を取得します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `cell` | string | ✅ | セル位置（例: "A1"） |

### 使用例
```json
{
  "name": "get_cell_value",
  "arguments": {
    "filePath": "data.xlsx",
    "sheetName": "売上",
    "cell": "C5"
  }
}
```

---

## 5. set_range_values

### 機能
指定された開始セルから2次元配列のデータを設定します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `startCell` | string | ✅ | 開始セル位置（例: "A1"） |
| `values` | array[][] | ✅ | 2次元配列のデータ |

### 使用例
```json
{
  "name": "set_range_values",
  "arguments": {
    "filePath": "sales.xlsx",
    "sheetName": "データ",
    "startCell": "A1",
    "values": [
      ["商品名", "価格", "在庫"],
      ["商品A", 1000, 50],
      ["商品B", 1500, 30]
    ]
  }
}
```

### AI指示例
```
"以下のデータをA1から入力してください：
名前 | 年齢 | 部署
田中 | 30  | 営業
佐藤 | 25  | 開発"
```

---

## 6. format_cell

### 機能
セルの書式（フォント、塗りつぶし、罫線）を設定します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `cell` | string | ✅ | セル位置 |
| `format` | object | ✅ | 書式設定オブジェクト |

### 書式設定オプション

#### フォント設定
```json
{
  "font": {
    "bold": true,           // 太字
    "italic": false,        // 斜体
    "size": 14,            // フォントサイズ
    "color": "FF0000FF"    // 色（ARGB形式）
  }
}
```

#### 塗りつぶし設定
```json
{
  "fill": {
    "type": "pattern",
    "pattern": "solid",     // パターン種類
    "fgColor": "FFFF00"    // 前景色（ARGB形式）
  }
}
```

#### 罫線設定
```json
{
  "border": {
    "top": {"style": "thin", "color": "FF000000"},
    "left": {"style": "thin", "color": "FF000000"},
    "bottom": {"style": "thin", "color": "FF000000"},
    "right": {"style": "thin", "color": "FF000000"}
  }
}
```

### 完全な使用例
```json
{
  "name": "format_cell",
  "arguments": {
    "filePath": "report.xlsx",
    "sheetName": "Sheet1",
    "cell": "A1",
    "format": {
      "font": {
        "bold": true,
        "size": 16,
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

---

## 7. add_formula

### 機能
セルに数式を追加します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `cell` | string | ✅ | セル位置 |
| `formula` | string | ✅ | 数式（=で始まる） |

### 使用例
```json
{
  "name": "add_formula",
  "arguments": {
    "filePath": "calc.xlsx",
    "sheetName": "計算",
    "cell": "D2",
    "formula": "=SUM(A2:C2)"
  }
}
```

### 対応数式例
- `=SUM(A1:A10)` - 合計
- `=AVERAGE(B1:B10)` - 平均
- `=MAX(C1:C10)` - 最大値
- `=MIN(C1:C10)` - 最小値
- `=COUNT(D1:D10)` - 個数
- `=A1+B1` - 単純計算

---

## 8. find_data

### 機能
ワークシート内で指定された値を検索します。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 対象のExcelファイルパス |
| `sheetName` | string | ✅ | 対象のワークシート名 |
| `searchValue` | string/number | ✅ | 検索する値 |

### 使用例
```json
{
  "name": "find_data",
  "arguments": {
    "filePath": "data.xlsx",
    "sheetName": "顧客リスト",
    "searchValue": "田中"
  }
}
```

### 戻り値
見つかったセルのアドレスリスト（例: "A5, C10"）

---

## 9. export_to_csv

### 機能
ワークシートをCSVファイルにエクスポートします。

### パラメータ
| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| `filePath` | string | ✅ | 元のExcelファイルパス |
| `sheetName` | string | ✅ | エクスポートするシート名 |
| `csvPath` | string | ✅ | 出力CSVファイルパス |

### 使用例
```json
{
  "name": "export_to_csv",
  "arguments": {
    "filePath": "sales.xlsx",
    "sheetName": "月次売上",
    "csvPath": "sales_monthly.csv"
  }
}
```

---

## エラーハンドリング

### よくあるエラー

1. **ファイルが見つからない**
   ```
   エラー: ワークブック読み込みエラー: ENOENT: no such file or directory
   ```

2. **シートが見つからない**
   ```
   エラー: ワークシート 'Sheet2' が見つかりません。
   ```

3. **無効なセル位置**
   ```
   エラー: 無効なセル位置: 'A'
   ```

4. **パラメータ検証エラー**
   ```
   エラー: 無効なパラメータ: filePath: Required
   ```

### デバッグのヒント

1. **ファイルパスの確認**: 絶対パスを使用することを推奨
2. **シート名の確認**: 大文字小文字が区別されます
3. **データ型の確認**: 期待される型と一致しているか確認

---

## パフォーマンス考慮事項

### 効率的な操作

1. **大量データの場合**: `set_range_values` を使用
2. **複数操作**: 1つのセッションで複数の操作を実行
3. **ファイルサイズ**: 不要なシートや書式は削除

## 次のステップ

ツールの詳細を理解したら、[トラブルシューティング](./05-troubleshooting.md)で問題解決方法を確認しましょう。
