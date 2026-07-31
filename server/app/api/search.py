import os
import json
import re
import numpy as np
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from openai import OpenAI
from firebase_admin import firestore
from sklearn.feature_extraction.text import TfidfVectorizer
from dotenv import load_dotenv  # 🔥 1. IMPORT LOAD_DOTENV

# 🔥 2. NẠP BIẾN MÔI TRƯỜNG TỪ FILE .ENV
load_dotenv()

router = APIRouter(prefix="/api", tags=["Search RAG Llama"])

# ==========================================
# 1. KHỞI TẠO GROQ CLIENT (LLAMA 3.3)
# ==========================================
# Lấy API Key từ file .env (hỗ trợ cả GROQ_API_KEY lẫn OPENAI_API_KEY làm fallback)
GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY") or "").strip()

if not GROQ_API_KEY:
    print("⚠️ CẢNH BÁO: Không tìm thấy GROQ_API_KEY trong file .env!")

# 🔥 3. TRÁNH CRASH UVICORN LÚC BOOTSTRAP: Chỉ truyền api_key hợp lệ hoặc dummy string nếu chưa có
ai_client = OpenAI(
    api_key=GROQ_API_KEY if GROQ_API_KEY else "dummy_key_for_startup",
    base_url="https://api.groq.com/openai/v1"
)
MODEL_NAME = "llama-3.3-70b-versatile"

# ==========================================
# 2. HELPER: TÍNH TƯƠNG ĐỒNG TF-IDF / COSINE
# ==========================================
def find_top_relevant_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
    if not chunks:
        return []

    corpus = [c.get("content", c.get("text", "")) for c in chunks]
    corpus.append(query)

    try:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        query_vector = tfidf_matrix[-1].toarray()[0]
        
        scored_chunks = []
        for i in range(len(chunks)):
            chunk_vector = tfidf_matrix[i].toarray()[0]
            dot_product = np.dot(query_vector, chunk_vector)
            norm_q = np.linalg.norm(query_vector)
            norm_c = np.linalg.norm(chunk_vector)
            
            sim_score = float(dot_product / (norm_q * norm_c)) if (norm_q * norm_c) > 0 else 0.0

            c_item = chunks[i].copy()
            c_item["similarity_score"] = round(sim_score, 4)
            scored_chunks.append(c_item)

        scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_chunks[:top_k]

    except Exception as e:
        print(f"Lỗi TF-IDF Search: {e}")
        return chunks[:top_k]

# ==========================================
# 3. ENDPOINT: RAG SEARCH VỚI LLAMA 3.3
# ==========================================
# @router.post("/search")
# async def search_rag_llama(payload: Dict[str, Any] = Body(...)):
#     if not GROQ_API_KEY:
#         raise HTTPException(
#             status_code=500, 
#             detail="GROQ_API_KEY chưa được cấu hình trong file .env trên Server."
#         )

#     user_query = payload.get("query", "").strip()
#     resource_id = payload.get("resource_id") or payload.get("owner_id") or payload.get("material_id")

#     if not user_query:
#         raise HTTPException(status_code=400, detail="Vui lòng cung cấp câu hỏi truy vấn.")

@router.post("/search")
async def search_rag_llama(payload: Dict[str, Any] = Body(...)):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="GROQ_API_KEY chưa được cấu hình trong file .env trên Server."
        )

    # 🔥 Bắt linh hoạt cả query lẫn query_text / lesson_id lẫn resource_id
    user_query = (payload.get("query") or payload.get("query_text") or payload.get("passage_text") or "").strip()
    resource_id = payload.get("resource_id") or payload.get("owner_id") or payload.get("lesson_id") or payload.get("material_id")

    if not user_query:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp câu hỏi truy vấn.")

    try:
        db = firestore.client()
        chunks_list = []

        if resource_id:
            chunks_ref = db.collection("chunks").where("ownerId", "==", resource_id).stream()
            for doc in chunks_ref:
                c_data = doc.to_dict() or {}
                chunk_id = doc.id.split("_")[-1] if "_" in doc.id else doc.id
                if not chunk_id.startswith("chk_"):
                    chunk_id = f"chk_{c_data.get('chunkIndex', 0) + 1:03d}"

                chunks_list.append({
                    "chunk_id": chunk_id,
                    "content": c_data.get("text", ""),
                    "page_start": c_data.get("pageStart", 1),
                    "section_title": c_data.get("sectionTitle", f"Slide {c_data.get('pageStart', 1)}")
                })

        if not chunks_list:
            chunks_list = payload.get("chunks", [])

        if not chunks_list:
            return {
                "answer": "Không tìm thấy dữ liệu tài liệu môn học để tìm kiếm.",
                "cited_chunks": []
            }

        top_3_chunks = find_top_relevant_chunks(user_query, chunks_list, top_k=3)

        context_str = ""
        for chk in top_3_chunks:
            c_id = chk.get("chunk_id", "unknown")
            p_num = chk.get("page_start", 1)
            text_content = chk.get("content", "")
            context_str += f"\n--- START CHUNK [{c_id}] (Slide {p_num}) ---\n{text_content}\n--- END CHUNK ---\n"

        system_instruction = (
            "Bạn là trợ lý giảng dạy AI (VLearn Tutor). Nhiệm vụ của bạn là trả lời câu hỏi của sinh viên "
            "DỰA TRÊN NGỮ CẢNH TÀI LIỆU được cung cấp. BẮT BUỘC gắn mã trích dẫn dạng [chk_xxx] "
            "ngay sau các câu sử dụng thông tin từ chunk đó. Trả lời ngắn gọn, súc tích và chính xác."
        )

        user_prompt = f"""
<context_document>
{context_str}
</context_document>

CÂU HỎI CỦA SINH VIÊN: {user_query}
"""

        response = ai_client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )

        answer_text = response.choices[0].message.content.strip()

        return {
            "answer": answer_text,
            "query": user_query,
            "cited_chunks": [
                {
                    "chunk_id": chk.get("chunk_id"),
                    "page_start": chk.get("page_start", 1),
                    "section_title": chk.get("section_title", f"Slide {chk.get('page_start', 1)}"),
                    "content_preview": chk.get("content", "")[:120] + "...",
                    "similarity_score": chk.get("similarity_score", 0.0)
                }
                for chk in top_3_chunks
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi RAG Search Llama: {str(e)}")