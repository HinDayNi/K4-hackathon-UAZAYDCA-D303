import firebase_admin
from firebase_admin import credentials, firestore

# 1. Khởi tạo Firebase với Key
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)

# 2. Tạo client Firestore
db = firestore.client()

# ==========================================
# THAO TÁC MẪU (CHẠY THẬT KHÔNG MOCK)
# ==========================================

# Thêm 1 Chunk + Embedding vào DB
def save_chunk_to_firebase(slide_id, chunk_data):
    doc_ref = db.collection("slides").doc(slide_id).collection("chunks").document()
    doc_ref.set(chunk_data)
    print(f"✅ Đã lưu Chunk thành công! Doc ID: {doc_ref.id}")

# Thêm 1 Quiz do AI tạo vào DB
def save_quiz_to_firebase(quiz_data):
    doc_ref = db.collection("quizzes").document()
    doc_ref.set(quiz_data)
    print(f"✅ Đã lưu Quiz thành công! Doc ID: {doc_ref.id}")

# Lấy danh sách Quiz để hiện lên UI
def get_all_quizzes():
    quizzes = []
    docs = db.collection("quizzes").stream()
    for doc in docs:
        item = doc.to_dict()
        item['id'] = doc.id
        quizzes.append(item)
    return quizzes