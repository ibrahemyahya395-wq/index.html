import { CATEGORIES } from "../constants";

export interface ClassificationTag {
  categoryId: number;
  subCategoryName: string;
}

export interface ClassificationResult {
  suggestedName: string;
  tags: ClassificationTag[];
}

export async function classifyFile(base64Data: string, mimeType: string, originalName: string): Promise<ClassificationResult> {
  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data,
        mimeType,
        originalName
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json() as ClassificationResult;

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
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teacherName,
                filesListStr
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.report || "تعذر إنشاء التقرير. يرجى المحاولة لاحقاً.";

    } catch(e) {
        console.error("Analysis error:", e);
        return "تعذر إنشاء التقرير. يرجى المحاولة لاحقاً أو التحقق من وجود الشواهد.";
    }
}
