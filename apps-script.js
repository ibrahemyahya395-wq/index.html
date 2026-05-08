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
    // ملاحظة: تم تعطيل هذا السطر لتجنب مشكلة الصلاحيات في الحسابات التعليمية
    // المجلد الجديد سيرث الصلاحيات من المجلد الأب تلقائياً
    // newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const folderUrl = newFolder.getUrl();

    // رابط إنشاء رمز الـ QR
    const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(folderUrl);

    // استجابة للواجهة الأمامية بالبيانات فقط (بدون الحفظ في مستند جوجل)
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
