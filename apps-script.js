function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const folderName = data.folderName;

    if (!folderName) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "اسم المجلد مطلوب" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // معرف المجلد الأب في جوجل درايف
    const parentFolderId = "1WZ60QxrzHtRr_vx-n-R1KDabPKH_ovXk";
    const parentFolder = DriveApp.getFolderById(parentFolderId);

    // إنشاء المجلد الجديد
    const newFolder = parentFolder.createFolder(folderName);

    // إعداد الصلاحيات ليكون قابلاً للعرض من قبل أي شخص يمتلك الرابط
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const folderUrl = newFolder.getUrl();

    // رابط إنشاء رمز الـ QR
    const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(folderUrl);

    // معرف مستند جوجل
    const docId = "1SBYkBh02AMytXVaJMQYSHIgPVK_VS8uIFVSgbas19fY";
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();

    // البحث عن جدول أو إنشاء واحد جديد
    let tables = body.getTables();
    let table;
    if (tables.length > 0) {
      table = tables[0];
    } else {
      table = body.appendTable();
      // إضافة صف العناوين
      const header = table.appendTableRow();
      header.appendTableCell("اسم المجلد");
      header.appendTableCell("رابط المشاركة");
      header.appendTableCell("رمز QR");
    }

    // جلب صورة رمز الـ QR
    const response = UrlFetchApp.fetch(qrCodeUrl);
    const blob = response.getBlob();

    // إضافة صف جديد
    const row = table.appendTableRow();
    row.appendTableCell(folderName);

    const linkCell = row.appendTableCell(folderUrl);
    linkCell.editAsText().setLinkUrl(folderUrl);

    const qrCell = row.appendTableCell();
    const image = qrCell.insertImage(0, blob);
    image.setLinkUrl(folderUrl);
    image.setWidth(100);
    image.setHeight(100);

    doc.saveAndClose();

    // استجابة للواجهة الأمامية
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      folderUrl: folderUrl,
      qrCodeUrl: qrCodeUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// لدعم طلبات CORS
function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
