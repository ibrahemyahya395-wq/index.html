import os
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from folders_structure import FOLDERS_STRUCTURE, ALL_SUBFOLDERS

# Map keywords to folder paths
# This is a basic mapping, you can expand it based on expected content
KEYWORDS_MAP = {}
for main_folder, subfolders in FOLDERS_STRUCTURE.items():
    KEYWORDS_MAP[main_folder] = main_folder
    for sub in subfolders:
        KEYWORDS_MAP[sub] = f"{main_folder}/{sub}"

def extract_text_from_image(image_path):
    try:
        # Use Arabic + English language for Tesseract
        text = pytesseract.image_to_string(Image.open(image_path), lang='ara+eng')
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        images = convert_from_path(pdf_path)
        for img in images:
            text += pytesseract.image_to_string(img, lang='ara+eng') + "\n"
    except Exception as e:
        print(f"PDF OCR Error: {e}")
    return text

def classify_text(text):
    text = text.lower()

    # Simple keyword matching
    best_match = "غير مصنف"
    max_score = 0

    for keyword, folder_path in KEYWORDS_MAP.items():
        # A simple scoring based on presence of the folder name/keyword in text
        # You might need a more sophisticated NLP approach for better accuracy
        if keyword in text:
            # Prefer subfolders over main folders if both match
            score = len(keyword)
            if score > max_score:
                max_score = score
                best_match = folder_path

    if best_match == "غير مصنف":
        # Check if text contains any words from the keywords
        for keyword, folder_path in KEYWORDS_MAP.items():
            words = keyword.split()
            matches = sum(1 for w in words if w in text and len(w) > 3)
            if matches > 0 and matches > max_score:
                max_score = matches
                best_match = folder_path

    if best_match == "غير مصنف":
        # Default to the first folder if nothing matches, or you could create an "Unsorted" folder
        best_match = list(FOLDERS_STRUCTURE.keys())[0]

    return best_match

def process_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    if ext in ['.pdf']:
        text = extract_text_from_pdf(file_path)
    elif ext in ['.png', '.jpg', '.jpeg']:
        text = extract_text_from_image(file_path)

    category_path = classify_text(text)

    # Generate new filename based on category
    category_name = os.path.basename(category_path)
    new_name = f"{category_name}{ext}"

    return category_path, new_name
