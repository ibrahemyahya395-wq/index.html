function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const parentFolderId = "1WZ60QxrzHtRr_vx-n-R1KDabPKH_ovXk";
    const parentFolder = DriveApp.getFolderById(parentFolderId);

    // Backward compatibility for basic folder-creator.html
    if (data.folderName && !data.isBaseTeacherFolder && !data.isUploadFile) {
        const newFolder = parentFolder.createFolder(data.folderName);
        const folderUrl = newFolder.getUrl();
        const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(folderUrl);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          folderUrl: folderUrl,
          qrCodeUrl: qrCodeUrl
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // Initial Base Folder Creation (React App)
    if (data.isBaseTeacherFolder) {
      if (!data.folderName) throw new Error("اسم المجلد مطلوب");
      const existing = parentFolder.getFoldersByName(data.folderName);
      let newFolder;
      if (existing.hasNext()) {
        newFolder = existing.next();
      } else {
        newFolder = parentFolder.createFolder(data.folderName);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        folderUrl: newFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // File Upload into Categorized Folder
    if (data.isUploadFile) {
      if (!data.teacherName || !data.targetPath || !data.fileName || !data.fileData) {
        throw new Error("Missing parameters for file upload");
      }

      // Get or create Teacher's base folder
      let teacherFolder;
      const tFolders = parentFolder.getFoldersByName(data.teacherName);
      if (tFolders.hasNext()) teacherFolder = tFolders.next();
      else teacherFolder = parentFolder.createFolder(data.teacherName);

      // Traverse/Create Target Path (e.g. "01_أداء الواجبات الوظيفية/سجل الدوام الرسمي")
      let currentFolder = teacherFolder;
      const pathParts = data.targetPath.split('/');
      for (let part of pathParts) {
         if (!part) continue;
         let subFolders = currentFolder.getFoldersByName(part);
         if (subFolders.hasNext()) {
             currentFolder = subFolders.next();
         } else {
             currentFolder = currentFolder.createFolder(part);
         }
      }

      // Strip Data URI prefix (e.g. data:image/png;base64,) if present
      let rawBase64 = data.fileData;
      if (rawBase64.indexOf(',') !== -1) {
          rawBase64 = rawBase64.split(',')[1];
      }

      // Decode Base64 and Create File
      const decodedData = Utilities.base64Decode(rawBase64);
      const blob = Utilities.newBlob(decodedData, data.mimeType, data.fileName);
      const newFile = currentFolder.createFile(blob);

      return ContentService.createTextOutput(JSON.stringify({
         success: true,
         fileUrl: newFile.getUrl(),
         fileName: newFile.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Invalid action specified.");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}
