import os
import fitz  # PyMuPDF
import firebase_admin
from firebase_admin import credentials, firestore
import re
import json
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
import spacy

# Tải tokenizer nếu chưa có
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

try:
    nlp = spacy.blank("vi") 
except Exception:
    nlp = spacy.blank("en")

# ==========================================
# 1. CẤU HÌNH ĐƯỜNG DẪN & FIREBASE FIRESTORE
# ==========================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIAL_PATH = os.path.join(SCRIPT_DIR, "firebase-key.json")

try:
    if os.path.exists(CREDENTIAL_PATH):
        cred = credentials.Certificate(CREDENTIAL_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print(f"✅ Đã kết nối Firebase Firestore thành công qua key: {CREDENTIAL_PATH}")
    else:
        print(f"⚠️ Không tìm thấy file credential tại: {CREDENTIAL_PATH}")
        db = None
except Exception as e:
    print("⚠️ Cảnh báo lỗi kết nối Firebase:", e)
    db = None

# ==========================================
# 2. THUẬT TOÁN BUDGETMEM TÍNH ĐIỂM CHUNK
# ==========================================
def calculate_budgetmem_scores(chunks_list):
    """
    Hiện thực hóa thuật toán BudgetMem chấm điểm Salience Score cho từng Chunk
    """
    texts = [c["content"] for c in chunks_list]
    M = len(texts)
    if M == 0:
        return chunks_list

    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
    except Exception:
        tfidf_matrix = None

    discourse_pattern = r"\b(tuy nhiên|do đó|vì vậy|tóm lại|cụ thể là|sau cùng|however|therefore|consequently|nevertheless|furthermore|in conclusion)\b"
    entity_pattern = r"\b[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĐ][a-zàáâãèéêìíòóôõùúýđ]*(?:\s+[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĐ][a-zàáâãèéêìíòóôõùúýđ]*)*\b"

    for i, chunk in enumerate(chunks_list):
        chunk_text = chunk["content"]
        doc = nlp(chunk_text)
        total_tokens = len(doc) if len(doc) > 0 else 1

        # 1. Entity Density
        entities = re.findall(entity_pattern, chunk_text)
        f1_entity = len(entities) / total_tokens

        # 2. TF-IDF Importance
        f2_tfidf = 0.0
        if tfidf_matrix is not None:
            chunk_vector = tfidf_matrix[i].toarray()[0]
            important_vals = [v for v in chunk_vector if v > 0]
            if important_vals:
                f2_tfidf = sum(important_vals) / len(important_vals)

        # 3. Position Bias
        relative_pos = i / (M - 1) if M > 1 else 0.5
        f3_position = 1.0 - 2.0 * abs(relative_pos - 0.5)

        # 4. Numerical Density
        num_digits = sum(1 for token in doc if token.is_digit or re.search(r'\d', token.text))
        f4_numeric = num_digits / total_tokens

        # 5. Structure & Question
        has_discourse = 1.0 if re.search(discourse_pattern, chunk_text.lower()) else 0.0
        has_question = 1.0 if "?" in chunk_text else 0.0
        f5_structure = (has_discourse * 0.1) + (has_question * 0.1)

        # Điểm tổng hợp Salience Score
        salience_score = round((0.2 * f1_entity) + (0.2 * f2_tfidf) + (0.15 * f3_position) + (0.15 * f4_numeric) + f5_structure, 4)
        chunk["salience_score"] = salience_score

    return chunks_list

# ==========================================
# 3. BÓC TÁCH PDF LƯU ĐỦ METADATA PAGE/SLIDE
# ==========================================
def parse_pdf_to_chunks(pdf_path, max_words=200):
    print(f"📄 Đang bóc tách PDF và trích xuất Metadata Slide: {pdf_path}")
    doc = fitz.open(pdf_path)
    raw_chunks = []
    chunk_counter = 1

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        cleaned_text = re.sub(r'\n+', '\n', text).strip()
        
        if not cleaned_text:
            continue

        words = cleaned_text.split()
        
        # Nếu trang quá dài, chia nhỏ theo MAX_WORDS nhưng VẪN GIỮ NGUYÊN page_start/page_end
        for i in range(0, len(words), max_words):
            chunk_words = words[i:i + max_words]
            chunk_text = " ".join(chunk_words)
            
            raw_chunks.append({
                "chunk_id": f"chk_{chunk_counter:03d}",
                "chunk_index": chunk_counter - 1,
                "content": chunk_text,
                "word_count": len(chunk_words),
                # 🔥 LƯU METADATA PHỤC VỤ JUMP SLIDE KHI SEARCH / LLM CHAT
                "page_start": page_num + 1,  # Slide 1-based index
                "page_end": page_num + 1,
                "section_title": f"Slide {page_num + 1}"
            })
            chunk_counter += 1

    # Tính điểm BudgetMem cho tất cả các chunk
    scored_chunks = calculate_budgetmem_scores(raw_chunks)
    print(f"🎯 Đã tạo thành công {len(scored_chunks)} Chunks kèm Metadata Slide & Salience Score!")
    return scored_chunks

# ==========================================
# 4. HÀM LƯU FIRESTORE CẤU TRÚC CHUẨN BACKEND
# ==========================================
def save_chunks_to_firestore(lesson_id, chunks, user_id="system_default"):
    if not db:
        print("⏭️ Bỏ qua bước lưu DB do chưa kết nối Firebase.")
        return

    print(f"☁️ Đang đẩy {len(chunks)} chunks của {lesson_id} lên Firestore...")
    batch = db.batch()
    
    # 1. Tạo document tài liệu gốc trong collection 'raw_resources'
    resource_ref = db.collection("raw_resources").document(lesson_id)
    batch.set(resource_ref, {
        "userId": user_id,
        "name": lesson_id,
        "fileType": "pdf",
        "hasSummary": False,
        "createdAt": firestore.SERVER_TIMESTAMP
    }, merge=True)

    # 2. Lưu từng chunk vào collection 'chunks' với ĐỦ THÔNG TIN SEARCH
    for chunk in chunks:
        doc_ref = db.collection("chunks").document(f"{lesson_id}_{chunk['chunk_id']}")
        batch.set(doc_ref, {
            "userId": user_id,
            "ownerId": lesson_id,         # 🔥 ID tài liệu
            "sourceType": "library",
            "chunkIndex": chunk["chunk_index"],
            "text": chunk["content"],
            "wordCount": chunk["word_count"],
            "salienceScore": chunk["salience_score"], # 🔥 Điểm lọc BudgetMem
            "pageStart": chunk["page_start"],         # 🔥 PHỤC VỤ UI JUMP SLIDE
            "pageEnd": chunk["page_end"],             # 🔥 PHỤC VỤ UI JUMP SLIDE
            "sectionTitle": chunk["section_title"],
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        
    batch.commit()
    print("✅ Đã lưu toàn bộ Chunks kèm Metadata Jump Slide lên Firestore thành công!")

# ==========================================
# 🚀 MAIN PIPELINE
# ==========================================
if __name__ == "__main__":
    PDF_FILE_PATH = "C:/abc/vin/K4-hackathon-UAZAYDCA-D303/data/Lesson_01_Agile.pdf" 
    LESSON_ID = "lesson_01_agile"
    
    # Bóc tách & tính điểm BudgetMem
    chunks = parse_pdf_to_chunks(PDF_FILE_PATH, max_words=200)
    
    # Preview Chunk 1
    print("\n🔍 Bản xem trước Chunk 1 (Đã bao gồm Metadata Jump Slide & Score):")
    print("-" * 50)
    print(json.dumps(chunks[0], ensure_ascii=False, indent=2))
    print("-" * 50, "\n")
    
    # Đẩy DB
    save_chunks_to_firestore(LESSON_ID, chunks)
    
    # Backup JSON
    json_out_path = os.path.join(SCRIPT_DIR, "demo_chunks.json")
    with open(json_out_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu bản backup JSON tại: {json_out_path}")