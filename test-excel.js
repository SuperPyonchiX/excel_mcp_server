import ExcelJS from "exceljs";

// テスト用のExcelファイル操作
async function testExcelOperations() {
  try {
    console.log("Excel操作のテストを開始します...");
    
    // ワークブックを作成
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("テストシート");
    
    // セルに値を設定
    worksheet.getCell("A1").value = "名前";
    worksheet.getCell("B1").value = "年齢";
    worksheet.getCell("C1").value = "職業";
    
    worksheet.getCell("A2").value = "田中";
    worksheet.getCell("B2").value = 30;
    worksheet.getCell("C2").value = "エンジニア";
    
    worksheet.getCell("A3").value = "佐藤";
    worksheet.getCell("B3").value = 25;
    worksheet.getCell("C3").value = "デザイナー";
    
    // セルの書式を設定
    worksheet.getCell("A1").font = { bold: true };
    worksheet.getCell("B1").font = { bold: true };
    worksheet.getCell("C1").font = { bold: true };
    
    // ファイルを保存
    const testFilePath = "./test.xlsx";
    await workbook.xlsx.writeFile(testFilePath);
    
    console.log(`テストファイルが正常に作成されました: ${testFilePath}`);
    
    // ファイルを読み込んでテスト
    const readWorkbook = new ExcelJS.Workbook();
    await readWorkbook.xlsx.readFile(testFilePath);
    const readWorksheet = readWorkbook.getWorksheet("テストシート");
    
    console.log("読み込みテスト:");
    console.log(`A1: ${readWorksheet.getCell("A1").value}`);
    console.log(`B2: ${readWorksheet.getCell("B2").value}`);
    
    console.log("Excel操作のテストが完了しました！");
    
  } catch (error) {
    console.error("テスト中にエラーが発生しました:", error);
  }
}

testExcelOperations();
