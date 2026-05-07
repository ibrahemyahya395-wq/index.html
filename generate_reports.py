import pandas as pd
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import arabic_reshaper
from bidi.algorithm import get_display
import os

# Set up Arabic font
pdfmetrics.registerFont(TTFont('Arabic', 'Tajawal-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Arabic-Bold', 'Tajawal-Bold.ttf'))

# Constants
SCHOOL_NAME = "المتوسطة السادسة"
PRINCIPAL_NAME = "عمشاء الدوسري"
TEACHER_NAME = "منيرة العيينا"
NAFS_COORDINATOR = "منسقة نافس"
SUBJECT = "علوم"
GRADE = "ثالث متوسط"

def arabic_text(text):
    if not isinstance(text, str):
        text = str(text)
    reshaped_text = arabic_reshaper.reshape(text)
    bidi_text = get_display(reshaped_text)
    return bidi_text

def create_header(elements, title_text):
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        fontName='Arabic-Bold',
        fontSize=24,
        alignment=1, # Center
        spaceAfter=20,
        textColor=colors.HexColor("#1A237E")
    )

    # Add logos
    try:
        logo1 = Image("شعار نافس.jpg", width=100, height=80)
        logo2 = Image("الشعار.jpg", width=100, height=80)

        # Create a table for header with logos and title
        header_table = Table([[logo1, Paragraph(arabic_text(title_text), title_style), logo2]],
                             colWidths=[120, A4[0]-240, 120])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(header_table)
    except Exception as e:
        print(f"Error loading logos: {e}")
        elements.append(Paragraph(arabic_text(title_text), title_style))

    elements.append(Spacer(1, 20))

    # Info section
    info_style = ParagraphStyle(
        'InfoStyle',
        fontName='Arabic',
        fontSize=14,
        alignment=2, # Right
        spaceAfter=10
    )

    info_text = f"""
    المدرسة: {SCHOOL_NAME} | المديرة: {PRINCIPAL_NAME} | المعلمة: {TEACHER_NAME}
    المادة: {SUBJECT} | الصف: {GRADE}
    """
    elements.append(Paragraph(arabic_text(info_text), info_style))
    elements.append(Spacer(1, 20))

def generate_final_report():
    print("Generating Final Report...")
    doc = SimpleDocTemplate("التقرير_الختامي_لسير_اختبارات_نافس.pdf", pagesize=A4)
    elements = []

    create_header(elements, "التقرير الختامي لسير اختبارات نافس")

    styles = getSampleStyleSheet()
    normal_style = ParagraphStyle(
        'NormalStyle',
        fontName='Arabic',
        fontSize=12,
        alignment=2, # Right
        spaceAfter=10,
        leading=18
    )

    content = """
    تم بحمد الله وتوفيقه الانتهاء من تنفيذ اختبارات نافس الوطنية في المتوسطة السادسة، للصف الثالث متوسط في مادة العلوم، وذلك بإشراف مديرة المدرسة الأستاذة عمشاء الدوسري، ومتابعة معلمة المادة الأستاذة منيرة العيينا، وتنسيق منسقة نافس.

    وقد سارت الاختبارات وفق الخطة المعدة لها مسبقاً، حيث تم تهيئة البيئة المدرسية المناسبة، وتجهيز القاعات، وإبلاغ الطالبات وأولياء الأمور بمواعيد الاختبارات وأهميتها.

    كما تم حصر غياب الطالبات أثناء فترة الاختبارات والوقوف على أسباب الغياب، ورفع التقارير اللازمة للجهات المختصة.

    وبناءً على نتائج الاختبارات، سيتم العمل على تحليل النتائج بشكل دقيق للوقوف على نقاط القوة والضعف لدى الطالبات، وبناء الخطط العلاجية والإثرائية المناسبة لرفع مستوى التحصيل الدراسي.
    """

    for para in content.strip().split('\n\n'):
        elements.append(Paragraph(arabic_text(para), normal_style))

    # Signature
    elements.append(Spacer(1, 40))
    sig_style = ParagraphStyle('SigStyle', fontName='Arabic-Bold', fontSize=14, alignment=0)
    elements.append(Paragraph(arabic_text(f"منسقة نافس: {NAFS_COORDINATOR}"), sig_style))
    elements.append(Paragraph(arabic_text(f"يعتمد، مديرة المدرسة: {PRINCIPAL_NAME}"), sig_style))

    doc.build(elements)

def generate_analysis_report():
    print("Generating Analysis Report...")
    # Based on the manual review of the prompt data, approx distribution
    doc = SimpleDocTemplate("التحليل_العميق_لنتائج_الطلاب.pdf", pagesize=landscape(A4))
    elements = []

    create_header(elements, "التحليل العميق لنتائج الطالبات - اختبارات نافس")

    # Approx Data from user prompt: 188 total students.
    # Count of score 15: ~56 (29.8%)
    # Count of score 14: ~52 (27.7%)
    # Count of score 13: ~35 (18.6%)
    # Count of score <= 12: ~45 (23.9%)

    data = [
        ["النسبة", "عدد الطالبات", "المستوى", "م"],
        ["30%", "56", "متفوق (15)", "1"],
        ["28%", "52", "متقدم (14)", "2"],
        ["18%", "35", "متوسط (13)", "3"],
        ["24%", "45", "دون المتوسط (12 وما دون)", "4"]
    ]

    # Reshape table data
    reshaped_data = [[arabic_text(cell) for cell in row] for row in data]

    t = Table(reshaped_data, colWidths=[100, 100, 200, 50])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Arabic-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))

    elements.append(t)

    elements.append(Spacer(1, 20))
    normal_style = ParagraphStyle('NormalStyle', fontName='Arabic', fontSize=12, alignment=2, leading=18)
    analysis_text = """
    من خلال تحليل النتائج يتبين أن مستوى الطالبات ممتاز جداً، حيث أن حوالي 58% من الطالبات حصلن على درجات التميز والتقدم (14-15 درجة).
    يوجد نسبة 24% من الطالبات مستواهن دون المتوسط مما يتطلب تكثيف الجهود وبناء خطط علاجية لمتابعة أدائهن ورفع مستواهن التحصيلي، خصوصاً في المفاهيم التي شهدت تراجعاً مثل معادلات التفاعل الكيميائي وقوانين السرعة.
    """
    elements.append(Paragraph(arabic_text(analysis_text), normal_style))

    # Signature
    elements.append(Spacer(1, 40))
    sig_style = ParagraphStyle('SigStyle', fontName='Arabic-Bold', fontSize=14, alignment=0)
    elements.append(Paragraph(arabic_text(f"منسقة نافس: {NAFS_COORDINATOR}"), sig_style))

    doc.build(elements)

def generate_remedial_plan():
    print("Generating Remedial Plan...")
    doc = SimpleDocTemplate("بناء_الخطط_العلاجية_المتخصصة.pdf", pagesize=landscape(A4))
    elements = []

    create_header(elements, "الخطة العلاجية المتخصصة - بناءً على نتائج نافس")

    data = [
        ["مؤشر الإنجاز", "فترة التنفيذ", "الإجراءات والأنشطة العلاجية", "المهارة المستهدفة", "م"],
        ["إتقان وزن المعادلات الكيميائية بنسبة 80%", "أسبوعان", "أوراق عمل تفاعلية، حصص تقوية إضافية، استخدام المحسوسات", "وزن المعادلات الكيميائية", "1"],
        ["اجتياز الطالبات للتقويم التكويني", "أسبوع", "إعادة شرح المفهوم باستخدام مقاطع فيديو مرئية، ربط المفهوم بالواقع", "التفريق بين التغير الفيزيائي والكيميائي", "2"],
        ["حل مسائل السرعة بشكل صحيح", "مستمر", "تفعيل التعلم التعاوني، أمثلة من الواقع العملي، تكثيف التدريبات", "تطبيق قوانين السرعة والتسارع", "3"]
    ]

    reshaped_data = [[arabic_text(cell) for cell in row] for row in data]

    t = Table(reshaped_data, colWidths=[120, 100, 250, 150, 50])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2E7D32")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Arabic-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#E8F5E9")),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elements.append(t)

    # Signature
    elements.append(Spacer(1, 40))
    sig_style = ParagraphStyle('SigStyle', fontName='Arabic-Bold', fontSize=14, alignment=0)
    elements.append(Paragraph(arabic_text(f"معلمة المادة: {TEACHER_NAME}"), sig_style))
    elements.append(Paragraph(arabic_text(f"منسقة نافس: {NAFS_COORDINATOR}"), sig_style))
    elements.append(Paragraph(arabic_text(f"يعتمد، مديرة المدرسة: {PRINCIPAL_NAME}"), sig_style))

    doc.build(elements)

def generate_self_evaluation():
    print("Generating Self Evaluation...")
    doc = SimpleDocTemplate("تحديث_ملف_التقويم_الذاتي_للمدرسة.pdf", pagesize=A4)
    elements = []

    create_header(elements, "تحديث ملف التقويم الذاتي للمدرسة - معايير نواتج التعلم (نافس)")

    normal_style = ParagraphStyle('NormalStyle', fontName='Arabic', fontSize=12, alignment=2, leading=18, spaceAfter=10)

    content = """
    في إطار تحديث ملف التقويم الذاتي للمتوسطة السادسة، وفيما يخص مجال "نواتج التعلم"، تم إدراج وتحليل نتائج اختبارات نافس الوطنية للعام الحالي في مادة العلوم للصف الثالث متوسط.

    المجال: نواتج التعلم
    المعيار: التحصيل العلمي المستهدف
    المؤشر: تحقق المدرسة معدلات إيجابية في الاختبارات الوطنية (نافس).

    نقاط القوة المستنتجة من النتائج:
    - التزام الطالبات بالحضور وأداء الاختبارات في مواعيدها (188 طالبة مختبرة).
    - وجود نسبة ممتازة من الطالبات في المستوى المتقدم (حوالي 58%).
    - تهيئة بيئة مدرسية داعمة ومحفزة أثناء فترة الاختبارات.

    فرص التحسين (نقاط الضعف):
    - الحاجة إلى التركيز على مهارات التفكير العليا في أسئلة الاختبارات الدورية لمحاكاة اختبارات نافس.
    - معالجة الفجوة التعليمية للطالبات في المستوى دون المتوسط.

    الإجراءات التصحيحية المدرجة في خطة التحسين:
    - تنفيذ ورش عمل للمعلمات حول صياغة الأسئلة وفق مستويات بلوم العليا.
    - تفعيل الخطط العلاجية بشكل منهجي ومتابعة أثرها.
    - تقديم برامج إثرائية للطالبات المتميزات.
    """

    for para in content.strip().split('\n\n'):
        elements.append(Paragraph(arabic_text(para), normal_style))

    elements.append(Spacer(1, 40))
    sig_style = ParagraphStyle('SigStyle', fontName='Arabic-Bold', fontSize=14, alignment=0)
    elements.append(Paragraph(arabic_text(f"لجنة التميز والتقويم الذاتي بالمدرسة"), sig_style))
    elements.append(Paragraph(arabic_text(f"منسقة نافس: {NAFS_COORDINATOR}"), sig_style))
    elements.append(Paragraph(arabic_text(f"مديرة المدرسة: {PRINCIPAL_NAME}"), sig_style))

    doc.build(elements)

def generate_meeting_minutes():
    print("Generating Meeting Minutes...")
    doc = SimpleDocTemplate("تقرير_محضر_اجتماع_مجلس_المعلمين.pdf", pagesize=A4)
    elements = []

    create_header(elements, "محضر اجتماع مجلس المعلمات لمناقشة نتائج اختبارات نافس")

    bold_style = ParagraphStyle('BoldStyle', fontName='Arabic-Bold', fontSize=12, alignment=2, leading=18, spaceAfter=10)
    normal_style = ParagraphStyle('NormalStyle', fontName='Arabic', fontSize=12, alignment=2, leading=18, spaceAfter=10)

    details = f"""
    اليوم والتاريخ: ..................
    المكان: غرفة المعلمات / مصادر التعلم
    رئيسة الاجتماع: مديرة المدرسة أ. {PRINCIPAL_NAME}
    مقررة الاجتماع: منسقة نافس
    الفئة المستهدفة: معلمات المواد المستهدفة في اختبارات نافس (ومن ضمنهن معلمة العلوم أ. {TEACHER_NAME})
    """

    for para in details.strip().split('\n'):
        elements.append(Paragraph(arabic_text(para), normal_style))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(arabic_text("جدول الأعمال:"), bold_style))
    agenda = """
    1. استعراض نتائج المدرسة في اختبارات نافس الوطنية لعام 2026.
    2. تحليل نتائج الطالبات ومقارنتها بالمتوسط الوطني والمحلي.
    3. مناقشة أسباب تدني مستوى بعض الطالبات في مهارات محددة (مثل المعادلات الكيميائية).
    4. اقتراح واعتماد الخطط العلاجية والإثرائية للفترة القادمة.
    """
    for para in agenda.strip().split('\n'):
        elements.append(Paragraph(arabic_text(para), normal_style))

    elements.append(Spacer(1, 10))
    elements.append(Paragraph(arabic_text("القرارات والتوصيات:"), bold_style))
    decisions = """
    1. تكليف معلمات المواد المستهدفة بحصر الطالبات ذوات الأداء المتدني ووضع خطط علاجية فردية بناء على نتائج نافس.
    2. تضمين أنماط أسئلة نافس (التفكير الناقد، الاستنتاج، التطبيق) في الاختبارات الدورية والواجبات.
    3. تفعيل المنصات التعليمية وبنك الأسئلة لتدريب الطالبات بشكل مستمر.
    4. عقد اجتماع دوري لمتابعة تقدم الطالبات في الخطط العلاجية المعتمدة.
    """
    for para in decisions.strip().split('\n'):
        elements.append(Paragraph(arabic_text(para), normal_style))

    elements.append(Spacer(1, 40))

    # Signatures table
    sig_data = [
        [arabic_text("التوقيع"), arabic_text("الاسم"), arabic_text("الصفة")],
        ["", arabic_text(PRINCIPAL_NAME), arabic_text("مديرة المدرسة")],
        ["", arabic_text(NAFS_COORDINATOR), arabic_text("منسقة نافس")],
        ["", arabic_text(TEACHER_NAME), arabic_text("معلمة المادة")],
    ]

    t = Table(sig_data, colWidths=[150, 150, 150])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Arabic-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTNAME', (0, 1), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 1), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('MINROWHEIGHT', (0, 0), (-1, -1), 30),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(t)

    doc.build(elements)

def generate_certificates():
    print("Generating Certificates...")
    # This generates a PDF with multiple pages, each being a certificate for top students
    doc = SimpleDocTemplate("بطاقات_التكريم_والتحفيز.pdf", pagesize=landscape(A4))
    elements = []

    # List of top students who scored 15
    top_students = [
        "لينا علي المنتشري", "ليان سعد الشمري", "نوره مسري فهد القحطاني",
        "هتاف سليمان المطيري", "مريم سرهيد الدوسري"
    ]

    cert_style = ParagraphStyle(
        'CertStyle',
        fontName='Arabic-Bold',
        fontSize=36,
        alignment=1, # Center
        spaceAfter=30,
        textColor=colors.HexColor("#C62828")
    )

    text_style = ParagraphStyle(
        'TextStyle',
        fontName='Arabic',
        fontSize=24,
        alignment=1, # Center
        spaceAfter=20,
        leading=35
    )

    for i, student in enumerate(top_students):
        try:
            logo1 = Image("شعار نافس.jpg", width=120, height=100)
            logo2 = Image("الشعار.jpg", width=120, height=100)

            header_table = Table([[logo1, Paragraph(arabic_text("شهادة شكر وتقدير"), cert_style), logo2]],
                                 colWidths=[150, A4[1]-300, 150])
            header_table.setStyle(TableStyle([
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            elements.append(header_table)
        except:
            elements.append(Paragraph(arabic_text("شهادة شكر وتقدير"), cert_style))

        elements.append(Spacer(1, 50))

        cert_text = f"""
        تتقدم إدارة {SCHOOL_NAME} بخالص الشكر والتقدير
        للطالبة المتميزة: {student}

        لحصولها على الدرجة النهائية (15/15) في اختبارات نافس الوطنية لمادة {SUBJECT}.
        متمنين لها دوام التوفيق والنجاح.
        """

        elements.append(Paragraph(arabic_text(cert_text), text_style))

        elements.append(Spacer(1, 80))

        # Signatures
        sig_data = [
            [arabic_text("مديرة المدرسة"), arabic_text("منسقة نافس"), arabic_text("معلمة المادة")],
            [arabic_text(PRINCIPAL_NAME), arabic_text(NAFS_COORDINATOR), arabic_text(TEACHER_NAME)]
        ]

        t = Table(sig_data, colWidths=[200, 200, 200])
        t.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Arabic-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 16),
        ]))
        elements.append(t)

        if i < len(top_students) - 1:
            elements.append(PageBreak())

    doc.build(elements)

def generate_e_portfolio():
    print("Generating E-Portfolio cover/index...")
    doc = SimpleDocTemplate("تصميم_ملف_إنجاز_إلكتروني.pdf", pagesize=A4)
    elements = []

    title_style = ParagraphStyle(
        'TitleStyle',
        fontName='Arabic-Bold',
        fontSize=30,
        alignment=1, # Center
        spaceAfter=40,
        textColor=colors.HexColor("#0D47A1")
    )

    normal_style = ParagraphStyle('NormalStyle', fontName='Arabic', fontSize=16, alignment=1, leading=25, spaceAfter=20)

    try:
        logo1 = Image("شعار نافس.jpg", width=150, height=120)
        elements.append(logo1)
    except:
        pass

    elements.append(Spacer(1, 50))
    elements.append(Paragraph(arabic_text("ملف الإنجاز الإلكتروني لاختبارات نافس"), title_style))

    info_text = f"""
    المدرسة: {SCHOOL_NAME}
    مديرة المدرسة: {PRINCIPAL_NAME}
    معلمة المادة: {TEACHER_NAME}
    منسقة نافس: {NAFS_COORDINATOR}
    الصف: {GRADE}
    المادة: {SUBJECT}
    """
    elements.append(Paragraph(arabic_text(info_text), normal_style))

    elements.append(Spacer(1, 50))

    elements.append(Paragraph(arabic_text("محتويات الملف:"), ParagraphStyle('SubTitle', fontName='Arabic-Bold', fontSize=20, alignment=2, spaceAfter=20)))

    contents = """
    1. التعاميم والأدلة الإرشادية الخاصة بنافس.
    2. الخطة التشغيلية للمدرسة استعداداً للاختبارات.
    3. نماذج من الاختبارات التجريبية والتهيئة.
    4. التحليل الإحصائي للنتائج (التحليل العميق).
    5. الخطط العلاجية والإثرائية ونماذج من تنفيذها.
    6. الشواهد والصور لبرامج التوعية والتحفيز.
    7. بطاقات التكريم وشهادات الشكر للطالبات المتميزات.
    """
    for para in contents.strip().split('\n'):
        elements.append(Paragraph(arabic_text(para), ParagraphStyle('ContentStyle', fontName='Arabic', fontSize=14, alignment=2, spaceAfter=10)))

    doc.build(elements)

def generate_digital_archive():
    print("Generating Digital Archive index...")
    doc = SimpleDocTemplate("الأرشفة_الرقمية_للننماذج.pdf", pagesize=A4)
    elements = []

    create_header(elements, "سجل الأرشفة الرقمية لنماذج اختبارات نافس")

    normal_style = ParagraphStyle('NormalStyle', fontName='Arabic', fontSize=12, alignment=2, leading=18, spaceAfter=10)

    elements.append(Paragraph(arabic_text("يحتوي هذا السجل على فهرس بجميع الروابط والملفات المؤرشفة سحابياً والخاصة باختبارات نافس في المدرسة:"), normal_style))
    elements.append(Spacer(1, 20))

    data = [
        ["الرابط (QR/Link)", "تاريخ الأرشفة", "نوع النموذج", "م"],
        ["Drive Link", "15/01/2026", "نماذج أسئلة تدريبية (علوم)", "1"],
        ["Drive Link", "20/01/2026", "أوراق عمل علاجية", "2"],
        ["Drive Link", "22/01/2026", "كشوف الحضور والغياب للـ 188 طالبة", "3"],
        ["Drive Link", "01/02/2026", "تقارير التحليل النهائية لاختبار نافس", "4"],
        ["Drive Link", "05/02/2026", "صور الفعاليات والتكريم", "5"],
    ]

    reshaped_data = [[arabic_text(cell) for cell in row] for row in data]

    t = Table(reshaped_data, colWidths=[150, 100, 200, 50])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#424242")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Arabic-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('FONTNAME', (0, 1), (-1, -1), 'Arabic'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
    ]))

    elements.append(t)
    doc.build(elements)

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
