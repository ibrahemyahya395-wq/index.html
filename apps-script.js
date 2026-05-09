function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Handle Upload File Action
    if (action === "uploadFile") {
      const folderId = data.folderId;
      const fileData = data.fileData; // base64
      const mimeType = data.mimeType;
      const fileName = data.fileName;
      const categoryName = data.categoryName;
      const subCategoryName = data.subCategoryName;

      if (!folderId || !fileData || !fileName || !categoryName || !subCategoryName) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "بيانات ناقصة للرفع" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Extract base64 without prefix if it exists
      let pureBase64 = fileData;
      if (fileData.indexOf(',') !== -1) {
        pureBase64 = fileData.split(',')[1];
      }

      const decodedFile = Utilities.base64Decode(pureBase64);
      const blob = Utilities.newBlob(decodedFile, mimeType, fileName);

      // Get teacher's folder
      let teacherFolder;
      try {
        teacherFolder = DriveApp.getFolderById(folderId);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "المجلد المحدد غير موجود أو لا تملك صلاحية الوصول إليه" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Get or create Category folder
      let categoryFolder = getOrCreateFolder(teacherFolder, categoryName);

      // Get or create Subcategory folder
      let subCategoryFolder = getOrCreateFolder(categoryFolder, subCategoryName);

      // Create file in subcategory folder
      const file = subCategoryFolder.createFile(blob);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: file.getUrl(),
        fileId: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default Action: Create Folder (original behavior)
    const folderName = data.folderName;

    if (!folderName) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "اسم المجلد أو نوع الإجراء مطلوب" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // معرف المجلد الأب في جوجل درايف
    const parentFolderId = "1WZ60QxrzHtRr_vx-n-R1KDabPKH_ovXk";
    const parentFolder = DriveApp.getFolderById(parentFolderId);

    // إنشاء المجلد الجديد
    const newFolder = parentFolder.createFolder(folderName);

    const folderUrl = newFolder.getUrl();
    const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(folderUrl);

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

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

// لدعم طلبات CORS
function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
