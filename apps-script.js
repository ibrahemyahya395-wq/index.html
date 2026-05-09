function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const folderName = data.folderName;
    const reportType = data.reportType || "individual"; // "individual" or "performance"

    if (!folderName) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "اسم المجلد أو المعلم مطلوب" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const parentFolderId = "1WZ60QxrzHtRr_vx-n-R1KDabPKH_ovXk";
    const parentFolder = DriveApp.getFolderById(parentFolderId);

    // إنشاء المجلد الرئيسي
    const rootFolder = parentFolder.createFolder(folderName);
    const rootFolderUrl = rootFolder.getUrl();
    const rootQrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(rootFolderUrl);

    if (reportType === "individual") {
      // تقرير فردي: مجلد واحد فقط
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        type: "individual",
        folderUrl: rootFolderUrl,
        qrCodeUrl: rootQrCodeUrl
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (reportType === "performance") {
      // ملف أداء: إنشاء هيكل المجلدات الفرعية
      const performanceData = [];
      const structure = [
        {
          name: "01_أداء الواجبات الوظيفية",
          sub: [
            "سجل الدوام الرسمي",
            "سجل المناوبة والإشراف اليومي",
            "التكليفات",
            "تأدية الحصص الدراسية وفق الجدول الدراسي",
            "تفعيل حصص الانتظار",
            "الأنشطة والبرامج المدرسية والوطنية",
            "تقارير النشاط"
          ]
        },
        {
          name: "02_التفاعل مع المجتمع المهني",
          sub: [
            "شهادات حضور الدورات والورش التدريبية",
            "تنفيذ دورات وبرامج تدريبية وورش عمل",
            "تنفيذ مبادرات",
            "مجتمعات مهنية",
            "تبادل الزيارات",
            "الدروس التطبيقية - الحلقات التنشيطية"
          ]
        },
        {
          name: "03_التفاعل مع أولياء الأمور",
          sub: [
            "التواصل الفعال مع أولياء الأمور",
            "صور تفعيل الإشعارات والإعلانات من المنصة",
            "مشاركات أولياء الأمور",
            "تقرير اجتماع مع ولي أمر"
          ]
        },
        {
          name: "04_التنويع في استراتيجيات التدريس",
          sub: [
            "استخدام استراتيجيات متنوعة تناسب مستويات الطلبة",
            "تقرير عن تطبيق استراتيجية"
          ]
        },
        {
          name: "05_تحسين نتائج المتعلمين",
          sub: [
            "الاختبارات القبلية والبعدية",
            "الفاقد التعليمي",
            "الخطط العلاجية والإثرائية",
            "الفهم القرائي",
            "تكريم الطلبة المتميزين",
            "تحسين نتائج الطلبة في الاختبارات الوطنية نافس والتحصيل"
          ]
        },
        {
          name: "06_إعداد وتنفيذ خطة التعلم",
          sub: [
            "توزيع المنهج",
            "الخطط الأسبوعية",
            "تحضير وإعداد الدروس",
            "عروض بوربوينت",
            "خطط التعلم والنشاط",
            "الواجبات وأوراق العمل"
          ]
        },
        {
          name: "07_توظيف تقنيات ووسائل التعلم المناسبة",
          sub: [
            "صور من الوسائل التعليمية",
            "تقرير عن برنامج تقني تم استخدامه"
          ]
        },
        {
          name: "08_تهيئة البيئة التعليمية",
          sub: [
            "تقرير تصنيف الطلبة وفق أنماط التعلم",
            "نماذج من التحفيز المادي والمعنوي"
          ]
        },
        {
          name: "09_الإدارة الصفية",
          sub: [
            "سجل متابعة الطلبة",
            "القوانين الصفية",
            "تطبيق إدارة الصف"
          ]
        },
        {
          name: "10_تحليل نتائج المتعلمين",
          sub: [
            "تحليل نتائج التقييم وإعداد التقارير بشأن فعالية التدريس",
            "تحديد نقاط القوة والضعف",
            "إشراك الطلبة في نتائجهم ومدى تقدمهم لدعم تطورهم"
          ]
        },
        {
          name: "11_تنوع أساليب التقويم",
          sub: [
            "تنوع مصادر التقويم - ملاحظة صفية - استبانات - تقارير ذاتية",
            "تنوع أساليب التقويم - اختبارات شفهية - تحريرية - مهام أدائية",
            "تقديم التغذية الراجعة لتقويم الطلبة",
            "تطبيق التقويم التكويني والبنائي لتطوير أداء الطلبة",
            "تطبيق التقويم الختامي وقياس تقدم التعلم وإصدار الحكم على مستوى الطلبة",
            "بناء الاختبارات الفصلية والنهائية وفق معايير الاختبار الجيد"
          ]
        }
      ];

      for (let i = 0; i < structure.length; i++) {
        let mainObj = structure[i];
        let mainFolder = rootFolder.createFolder(mainObj.name);

        // إنشاء المجلدات الفرعية
        for (let j = 0; j < mainObj.sub.length; j++) {
          mainFolder.createFolder(mainObj.sub[j]);
        }

        let mainUrl = mainFolder.getUrl();
        let mainQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(mainUrl);

        performanceData.push({
          name: mainObj.name,
          url: mainUrl,
          qrCodeUrl: mainQrUrl
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        type: "performance",
        rootFolderUrl: rootFolderUrl,
        mainFolders: performanceData
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
