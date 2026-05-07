from weasyprint import HTML
import os

SCHOOL_NAME = "المتوسطة السادسة"
PRINCIPAL_NAME = "عمشاء الدوسري"
TEACHER_NAME = "منيرة العيينا"
NAFS_COORDINATOR = "منسقة نافس"
SUBJECT = "علوم"
GRADE = "ثالث متوسط"

BASE_HTML = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <style>
        @font-face {
            font-family: 'Tajawal';
            src: url('Tajawal-Regular.ttf') format('truetype');
            font-weight: normal;
        }
        @font-face {
            font-family: 'Tajawal';
            src: url('Tajawal-Bold.ttf') format('truetype');
            font-weight: bold;
        }
        @page {
            size: A4 {orientation};
            margin: 20mm;
        }
        body {
            font-family: 'Tajawal', Arial, sans-serif;
            font-size: 14pt;
            line-height: 1.6;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1A237E;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header img {
            height: 80px;
            object-fit: contain;
        }
        .title {
            font-size: 22pt;
            font-weight: bold;
            color: #1A237E;
            text-align: center;
            flex-grow: 1;
            padding: 0 20px;
        }
        .info {
            text-align: right;
            font-size: 14pt;
            margin-bottom: 30px;
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            border-right: 5px solid #1A237E;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: center;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            color: #333;
        }
        .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            font-weight: bold;
            font-size: 14pt;
            text-align: center;
        }
        h2 { color: #0D47A1; }
        .page-break { page-break-after: always; }
        .certificate {
            text-align: center;
            padding: 40px;
        }
        .cert-title {
            font-size: 36pt;
            color: #C62828;
            font-weight: bold;
            margin: 40px 0;
        }
        .cert-body {
            font-size: 24pt;
            line-height: 1.8;
            margin-bottom: 60px;
        }
        .table-dark th {
            background-color: #424242;
            color: white;
        }
        .table-green th {
            background-color: #2E7D32;
            color: white;
        }
    </style>
</head>
<body>
    {content}
</body>
</html>
"""

def generate_pdf(filename, content, orientation="portrait"):
    html_string = BASE_HTML.replace("{orientation}", orientation).replace("{content}", content)
    HTML(string=html_string, base_url=".").write_pdf(filename)

def get_header(title):
    return f"""
    <div class="header">
        <img src="شعار نافس.jpg" alt="NAFS">
        <div class="title">{title}</div>
        <img src="الشعار.jpg" alt="Ministry">
    </div>
    <div class="info">
        <strong>المدرسة:</strong> {SCHOOL_NAME} | <strong>المديرة:</strong> {PRINCIPAL_NAME} | <strong>المعلمة:</strong> {TEACHER_NAME}<br>
        <strong>المادة:</strong> {SUBJECT} | <strong>الصف:</strong> {GRADE}
    </div>
    """

def get_signatures(*roles):
    sigs = "".join([f'<div class="signature">{role[0]}:<br><br>{role[1]}</div>' for role in roles])
    return f'<div class="footer">{sigs}</div>'

def generate_final_report():
    print("Generating Final Report...")
    content = get_header("التقرير الختامي لسير اختبارات نافس") + f"""
    <p>تم بحمد الله وتوفيقه الانتهاء من تنفيذ اختبارات نافس الوطنية في المتوسطة السادسة، للصف الثالث متوسط في مادة العلوم، وذلك بإشراف مديرة المدرسة الأستاذة {PRINCIPAL_NAME}، ومتابعة معلمة المادة الأستاذة {TEACHER_NAME}، وتنسيق {NAFS_COORDINATOR}.</p>
    <p>وقد سارت الاختبارات وفق الخطة المعدة لها مسبقاً، حيث تم تهيئة البيئة المدرسية المناسبة، وتجهيز القاعات، وإبلاغ الطالبات وأولياء الأمور بمواعيد الاختبارات وأهميتها.</p>
    <p>كما تم حصر غياب الطالبات أثناء فترة الاختبارات والوقوف على أسباب الغياب، ورفع التقارير اللازمة للجهات المختصة.</p>
    <p>وبناءً على نتائج الاختبارات، سيتم العمل على تحليل النتائج بشكل دقيق للوقوف على نقاط القوة والضعف لدى الطالبات، وبناء الخطط العلاجية والإثرائية المناسبة لرفع مستوى التحصيل الدراسي.</p>
    """ + get_signatures(("منسقة نافس", NAFS_COORDINATOR), ("يعتمد، مديرة المدرسة", PRINCIPAL_NAME))
    generate_pdf("التقرير_الختامي_لسير_اختبارات_نافس.pdf", content)

def generate_analysis_report():
    print("Generating Analysis Report...")
    content = get_header("التحليل العميق لنتائج الطالبات - اختبارات نافس") + """
    <table>
        <tr><th>م</th><th>المستوى</th><th>عدد الطالبات</th><th>النسبة</th></tr>
        <tr><td>1</td><td>متفوق (15)</td><td>56</td><td>30%</td></tr>
        <tr><td>2</td><td>متقدم (14)</td><td>52</td><td>28%</td></tr>
        <tr><td>3</td><td>متوسط (13)</td><td>35</td><td>18%</td></tr>
        <tr><td>4</td><td>دون المتوسط (12 وما دون)</td><td>45</td><td>24%</td></tr>
    </table>
    <p>من خلال تحليل النتائج يتبين أن مستوى الطالبات ممتاز جداً، حيث أن حوالي 58% من الطالبات حصلن على درجات التميز والتقدم (14-15 درجة).</p>
    <p>يوجد نسبة 24% من الطالبات مستواهن دون المتوسط مما يتطلب تكثيف الجهود وبناء خطط علاجية لمتابعة أدائهن ورفع مستواهن التحصيلي، خصوصاً في المفاهيم التي شهدت تراجعاً مثل معادلات التفاعل الكيميائي وقوانين السرعة.</p>
    """ + get_signatures(("منسقة نافس", NAFS_COORDINATOR))
    generate_pdf("التحليل_العميق_لنتائج_الطلاب.pdf", content, "landscape")

def generate_remedial_plan():
    print("Generating Remedial Plan...")
    content = get_header("الخطة العلاجية المتخصصة - بناءً على نتائج نافس") + """
    <table class="table-green">
        <tr><th>م</th><th>المهارة المستهدفة</th><th>الإجراءات والأنشطة العلاجية</th><th>فترة التنفيذ</th><th>مؤشر الإنجاز</th></tr>
        <tr><td>1</td><td>وزن المعادلات الكيميائية</td><td>أوراق عمل تفاعلية، حصص تقوية إضافية، استخدام المحسوسات</td><td>أسبوعان</td><td>إتقان وزن المعادلات الكيميائية بنسبة 80%</td></tr>
        <tr><td>2</td><td>التفريق بين التغير الفيزيائي والكيميائي</td><td>إعادة شرح المفهوم باستخدام مقاطع فيديو مرئية، ربط المفهوم بالواقع</td><td>أسبوع</td><td>اجتياز الطالبات للتقويم التكويني</td></tr>
        <tr><td>3</td><td>تطبيق قوانين السرعة والتسارع</td><td>تفعيل التعلم التعاوني، أمثلة من الواقع العملي، تكثيف التدريبات</td><td>مستمر</td><td>حل مسائل السرعة بشكل صحيح</td></tr>
    </table>
    """ + get_signatures(("معلمة المادة", TEACHER_NAME), ("منسقة نافس", NAFS_COORDINATOR), ("يعتمد، مديرة المدرسة", PRINCIPAL_NAME))
    generate_pdf("بناء_الخطط_العلاجية_المتخصصة.pdf", content, "landscape")

def generate_self_evaluation():
    print("Generating Self Evaluation...")
    content = get_header("تحديث ملف التقويم الذاتي للمدرسة - معايير نواتج التعلم (نافس)") + """
    <p>في إطار تحديث ملف التقويم الذاتي للمتوسطة السادسة، وفيما يخص مجال "نواتج التعلم"، تم إدراج وتحليل نتائج اختبارات نافس الوطنية للعام الحالي في مادة العلوم للصف الثالث متوسط.</p>
    <ul>
        <li><strong>المجال:</strong> نواتج التعلم</li>
        <li><strong>المعيار:</strong> التحصيل العلمي المستهدف</li>
        <li><strong>المؤشر:</strong> تحقق المدرسة معدلات إيجابية في الاختبارات الوطنية (نافس).</li>
    </ul>
    <h3>نقاط القوة المستنتجة من النتائج:</h3>
    <ul>
        <li>التزام الطالبات بالحضور وأداء الاختبارات في مواعيدها (188 طالبة مختبرة).</li>
        <li>وجود نسبة ممتازة من الطالبات في المستوى المتقدم (حوالي 58%).</li>
        <li>تهيئة بيئة مدرسية داعمة ومحفزة أثناء فترة الاختبارات.</li>
    </ul>
    <h3>فرص التحسين (نقاط الضعف):</h3>
    <ul>
        <li>الحاجة إلى التركيز على مهارات التفكير العليا في أسئلة الاختبارات الدورية لمحاكاة اختبارات نافس.</li>
        <li>معالجة الفجوة التعليمية للطالبات في المستوى دون المتوسط.</li>
    </ul>
    <h3>الإجراءات التصحيحية المدرجة في خطة التحسين:</h3>
    <ul>
        <li>تنفيذ ورش عمل للمعلمات حول صياغة الأسئلة وفق مستويات بلوم العليا.</li>
        <li>تفعيل الخطط العلاجية بشكل منهجي ومتابعة أثرها.</li>
        <li>تقديم برامج إثرائية للطالبات المتميزات.</li>
    </ul>
    """ + get_signatures(("لجنة التميز والتقويم الذاتي بالمدرسة", ""), ("منسقة نافس", NAFS_COORDINATOR), ("مديرة المدرسة", PRINCIPAL_NAME))
    generate_pdf("تحديث_ملف_التقويم_الذاتي_للمدرسة.pdf", content)

def generate_meeting_minutes():
    print("Generating Meeting Minutes...")
    content = get_header("محضر اجتماع مجلس المعلمات لمناقشة نتائج اختبارات نافس") + f"""
    <p><strong>اليوم والتاريخ:</strong> ..................<br>
    <strong>المكان:</strong> غرفة المعلمات / مصادر التعلم<br>
    <strong>رئيسة الاجتماع:</strong> مديرة المدرسة أ. {PRINCIPAL_NAME}<br>
    <strong>مقررة الاجتماع:</strong> {NAFS_COORDINATOR}<br>
    <strong>الفئة المستهدفة:</strong> معلمات المواد المستهدفة في اختبارات نافس (ومن ضمنهن معلمة العلوم أ. {TEACHER_NAME})</p>

    <h3>جدول الأعمال:</h3>
    <ol>
        <li>استعراض نتائج المدرسة في اختبارات نافس الوطنية لعام 2026.</li>
        <li>تحليل نتائج الطالبات ومقارنتها بالمتوسط الوطني والمحلي.</li>
        <li>مناقشة أسباب تدني مستوى بعض الطالبات في مهارات محددة (مثل المعادلات الكيميائية).</li>
        <li>اقتراح واعتماد الخطط العلاجية والإثرائية للفترة القادمة.</li>
    </ol>

    <h3>القرارات والتوصيات:</h3>
    <ol>
        <li>تكليف معلمات المواد المستهدفة بحصر الطالبات ذوات الأداء المتدني ووضع خطط علاجية فردية بناء على نتائج نافس.</li>
        <li>تضمين أنماط أسئلة نافس (التفكير الناقد، الاستنتاج، التطبيق) في الاختبارات الدورية والواجبات.</li>
        <li>تفعيل المنصات التعليمية وبنك الأسئلة لتدريب الطالبات بشكل مستمر.</li>
        <li>عقد اجتماع دوري لمتابعة تقدم الطالبات في الخطط العلاجية المعتمدة.</li>
    </ol>

    <table style="margin-top: 40px;">
        <tr><th>الصفة</th><th>الاسم</th><th>التوقيع</th></tr>
        <tr><td>مديرة المدرسة</td><td>{PRINCIPAL_NAME}</td><td></td></tr>
        <tr><td>منسقة نافس</td><td>{NAFS_COORDINATOR}</td><td></td></tr>
        <tr><td>معلمة المادة</td><td>{TEACHER_NAME}</td><td></td></tr>
    </table>
    """
    generate_pdf("تقرير_محضر_اجتماع_مجلس_المعلمين.pdf", content)

def generate_certificates():
    print("Generating Certificates...")
    top_students = ["لينا علي المنتشري", "ليان سعد الشمري", "نوره مسري فهد القحطاني", "هتاف سليمان المطيري", "مريم سرهيد الدوسري"]
    content = ""
    for i, student in enumerate(top_students):
        content += f"""
        <div class="certificate">
            <div class="header" style="border: none;">
                <img src="شعار نافس.jpg" style="height: 120px;" alt="NAFS">
                <div class="cert-title">شهادة شكر وتقدير</div>
                <img src="الشعار.jpg" style="height: 120px;" alt="Ministry">
            </div>
            <div class="cert-body">
                تتقدم إدارة {SCHOOL_NAME} بخالص الشكر والتقدير<br>
                للطالبة المتميزة: <strong>{student}</strong><br><br>
                لحصولها على الدرجة النهائية (15/15) في اختبارات نافس الوطنية لمادة {SUBJECT}.<br>
                متمنين لها دوام التوفيق والنجاح.
            </div>
            {get_signatures(("مديرة المدرسة", PRINCIPAL_NAME), ("منسقة نافس", NAFS_COORDINATOR), ("معلمة المادة", TEACHER_NAME))}
        </div>
        """
        if i < len(top_students) - 1:
            content += '<div class="page-break"></div>'

    generate_pdf("بطاقات_التكريم_والتحفيز.pdf", content, "landscape")

def generate_e_portfolio():
    print("Generating E-Portfolio cover/index...")
    content = f"""
    <div style="text-align: center; margin-top: 50px;">
        <img src="شعار نافس.jpg" style="height: 150px; margin-bottom: 30px;" alt="NAFS Logo">
        <h1 style="color: #0D47A1; font-size: 32pt;">ملف الإنجاز الإلكتروني لاختبارات نافس</h1>
    </div>

    <div style="font-size: 18pt; text-align: center; margin: 40px 0; line-height: 2;">
        <strong>المدرسة:</strong> {SCHOOL_NAME}<br>
        <strong>مديرة المدرسة:</strong> {PRINCIPAL_NAME}<br>
        <strong>معلمة المادة:</strong> {TEACHER_NAME}<br>
        <strong>منسقة نافس:</strong> {NAFS_COORDINATOR}<br>
        <strong>الصف:</strong> {GRADE} | <strong>المادة:</strong> {SUBJECT}
    </div>

    <h2>محتويات الملف:</h2>
    <ol style="font-size: 16pt; line-height: 2;">
        <li>التعاميم والأدلة الإرشادية الخاصة بنافس.</li>
        <li>الخطة التشغيلية للمدرسة استعداداً للاختبارات.</li>
        <li>نماذج من الاختبارات التجريبية والتهيئة.</li>
        <li>التحليل الإحصائي للنتائج (التحليل العميق).</li>
        <li>الخطط العلاجية والإثرائية ونماذج من تنفيذها.</li>
        <li>الشواهد والصور لبرامج التوعية والتحفيز.</li>
        <li>بطاقات التكريم وشهادات الشكر للطالبات المتميزات.</li>
    </ol>
    """
    generate_pdf("تصميم_ملف_إنجاز_إلكتروني.pdf", content)

def generate_digital_archive():
    print("Generating Digital Archive index...")
    content = get_header("سجل الأرشفة الرقمية لنماذج اختبارات نافس") + """
    <p>يحتوي هذا السجل على فهرس بجميع الروابط والملفات المؤرشفة سحابياً والخاصة باختبارات نافس في المدرسة:</p>
    <table class="table-dark">
        <tr><th>م</th><th>نوع النموذج</th><th>تاريخ الأرشفة</th><th>الرابط (QR/Link)</th></tr>
        <tr><td>1</td><td>نماذج أسئلة تدريبية (علوم)</td><td>15/01/2026</td><td>Drive Link</td></tr>
        <tr><td>2</td><td>أوراق عمل علاجية</td><td>20/01/2026</td><td>Drive Link</td></tr>
        <tr><td>3</td><td>كشوف الحضور والغياب للـ 188 طالبة</td><td>22/01/2026</td><td>Drive Link</td></tr>
        <tr><td>4</td><td>تقارير التحليل النهائية لاختبار نافس</td><td>01/02/2026</td><td>Drive Link</td></tr>
        <tr><td>5</td><td>صور الفعاليات والتكريم</td><td>05/02/2026</td><td>Drive Link</td></tr>
    </table>
    """
    generate_pdf("الأرشفة_الرقمية_للننماذج.pdf", content)

if __name__ == "__main__":
    generate_final_report()
    generate_analysis_report()
    generate_remedial_plan()
    generate_self_evaluation()
    generate_meeting_minutes()
    generate_certificates()
    generate_e_portfolio()
    generate_digital_archive()
    print("All reports generated successfully!")
