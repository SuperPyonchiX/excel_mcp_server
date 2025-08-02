# Test Output Directory

このディレクトリは、テスト実行時に生成されるファイルを保存するためのディレクトリです。

## 生成されるファイル

- `test-workbook.xlsx` - 統合テスト用Excelファイル
- `tool-test.xlsx` - 個別テスト用Excelファイル  
- `test-export.csv` - CSV出力テスト結果
- `tool-test.csv` - 個別テスト用CSV出力

## 注意事項

- このディレクトリ内のファイルは自動生成されるため、手動で編集しないでください
- テスト実行のたびにファイルは上書きされます
- Git管理対象外に設定されています (.gitignore に追加推奨)
