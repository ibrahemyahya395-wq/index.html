import { GoogleGenAI } from "@google/genai";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ClassificationTag {
  categoryId: number;
  subCategoryName: string;
}

export interface ClassificationResult {
  suggestedName: string;
  tags: ClassificationTag[];
}

export async function classifyFile(base64Data: string, mimeType: string, originalName: string): Promise<ClassificationResult> {
  const categoriesList = CATEGORIES.map(c => `
    الفئة ${c.id}: ${c.folderName}
    البنود الفرعية: [${c.subCategories.join('، ')}]
  `).join('\n');

  const prompt = `
    أنت خبير في تقييم أداء المعلمين. مهمتك هي تحليل الملف المرفق (قد يكون صورة أو مستند ب دي اف) وتصنيفه بدقة.
    كما يجب عليك اقتراح اسم جديد وواضح للملف يعبر عن محتواه ونوعه (بدون امتداد الملف).

    اسم الملف الأصلي: ${originalName}

    الهيكل التنظيمي للفرز والمجلدات المتاح للتصنيف فيه:
    ${categoriesList}

    المطلوب:
    1. استخراج أو تخمين اسم مناسب للملف يصف محتواه بدقة ليكون اسمه الجديد (مثال: "تحضير درس الرياضيات الأسبوع الأول", "شهادة دورة التقنية").
    2. تحديد جميع الفئات والبنود الفرعية المناسبة للملف (يمكن أن ينتمي لأكثر من بند). استخدم الأسماء الدقيقة للبنود كما هي مكتوبة وتأكد من مطابقتها.

    يجب أن يكون ردك بصيغة JSON فقط كالتالي، ولا تقم بإضافة أي نص خارج الـ JSON:
    {
      "suggestedName": "الاسم الجديد المقترح هنا",
      "tags": [
        { "categoryId": رقم_الفئة, "subCategoryName": "الاسم الدقيق للبند الفرعي" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data.split(',')[1] || base64Data
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const text = response.text?.trim() || "{}";
    const result = JSON.parse(text) as ClassificationResult;

    if (!result.tags) {
       result.tags = [];
    }

    // Validation
    const validTags = result.tags.filter(r => CATEGORIES.some(c => c.id === r.categoryId)).map(r => ({
      categoryId: r.categoryId,
      subCategoryName: r.subCategoryName || "عام"
    }));

    return {
      suggestedName: result.suggestedName || originalName.split('.')[0],
      tags: validTags.length > 0 ? validTags : [{ categoryId: 1, subCategoryName: "غير مصنف" }]
    };
  } catch (error) {
    console.error("Classification error:", error);
    return {
      suggestedName: originalName.split('.')[0],
      tags: [{ categoryId: 1, subCategoryName: "غير مصنف" }]
    };
  }
}

export async function generateGapAnalysis(teacherName: string, filesListStr: string) {
    const prompt = `
    أنت مستشار تقييم معلمين في السعودية وتوجيه وارشاد مهني للمعلمين. قم بكتابة تقرير تحليلي احترافي للمعلم "${teacherName}" بناءً على الشواهد والأدلة التي تم التعرف عليها وتسليمها ومطابقتها مع معايير التقييم الـ 11.

    البيانات (الملفات المدرجة والفئات التي صنفت لها):
    ${filesListStr}

    المطلوب:
    اكتب تقريراً نصياً، منظماً ومرتباً ومميزاً يشمل:
    1. نقاط القوة: أين يبرز المعلم بشكل مشوق وماهي المجلدات والمعايير المكتملة بصورة مميزة.
    2. النواقص أو الثغرات: ما هي المجالات والشواهد والمجلدات المفقودة أو التي لم يتم تسليم شواهد بها ويجب على المعلم أضافتها والعمل عليها لتكملة ملفه.
    3. توصيات تطويرية: نصيحة مهنية قصيرة ومباشرة في نقطتين لرفع الأداء المهني وسد الثغرات.

    صيغ التقرير بلغة عربية فصحى مشوقه بتنسيق Markdown.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { temperature: 0.5 }
        });
        return response.text;
    } catch(e) {
        return "تعذر إنشاء التقرير. يرجى المحاولة لاحقاً أو التحقق من وجود الشواهد.";
    }
}
