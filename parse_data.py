import io
import pandas as pd
import json

data_text = """1	19/01/2026 18:13	19/01/2026 18:18	anonymous		14			عمشاء حسن الدوسري	0		3/2	0		"‌ السرعة المتجهة	‌ "	1		جميع ما سبق صحيح	1		‌ القصور الذاتي	1		" القوة	‌"	1		الثالث	1		المغناطيس	1		"‌تتجاذب	‌"	1		التوالي 	0		المغناطيسي	1		أيون	1		الايونية	1		النواتج	1		طاقة تنشيط	1		تغير فيزيائي	1		معادلة غير موزونة	1
2	19/01/2026 18:12	19/01/2026 18:18	anonymous		4			سلطانة خالد النفيسة 	0		3/3	0		السرعة الثابتة	0		جميع ما سبق صحيح	1		‌ كمية الحركة	0		" السرعة	‌"	0		الرابع	0		المغناطيس	1		"‌تتجاذب	‌"	1		توالي ثم توازي	0		‌ الكهربائي 	0		‌أمركب قطبي 	0		قطبية	0		المتفاعلات 	0		مساعد 	0		تغير فيزيائي	1		معادلة موزونة	0
3	19/01/2026 18:15	19/01/2026 18:20	anonymous		15			لينا علي المنتشري 	0		3/1	0		"‌ السرعة المتجهة	‌ "	1		جميع ما سبق صحيح	1		‌ القصور الذاتي	1		" القوة	‌"	1		الثالث	1		المغناطيس	1		"‌تتجاذب	‌"	1		"‌التوازي	‌"	1		المغناطيسي	1		أيون	1		الايونية	1		النواتج	1		طاقة تنشيط	1		تغير فيزيائي	1		معادلة غير موزونة	1
"""

with open('full_data.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

scores = []
students = []
levels = {'متفوق': 0, 'متقدم': 0, 'متوسط': 0, 'دون المتوسط': 0}

for line in full_text.strip().split('\n'):
    parts = line.split('\t')
    if len(parts) > 5:
        score_str = parts[5].strip()
        name_str = parts[7].strip()
        if score_str.isdigit():
            score = int(score_str)
            scores.append(score)
            students.append((name_str, score))

            # Assuming max score is 15
            percent = (score / 15) * 100
            if percent >= 90:
                levels['متفوق'] += 1
            elif percent >= 75:
                levels['متقدم'] += 1
            elif percent >= 50:
                levels['متوسط'] += 1
            else:
                levels['دون المتوسط'] += 1

print(f"Total students: {len(scores)}")
print(f"Levels: {levels}")
print("Top students:")
students.sort(key=lambda x: x[1], reverse=True)
for s in students[:5]:
    print(s)

with open('analysis_data.json', 'w', encoding='utf-8') as f:
    json.dump({'levels': levels, 'top_students': [s[0] for s in students if s[1] == 15][:5], 'total': len(scores)}, f, ensure_ascii=False)
