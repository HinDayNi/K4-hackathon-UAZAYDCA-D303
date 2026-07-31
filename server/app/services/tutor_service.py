import os
import numpy as np
from typing import List, Dict, Any
from google import genai
from google.genai import types

from app.schemas.chat import ChatRequest, ChatResponse, Citation
import firebase_config as firebase_service
from app.scorer import filter_chunks_budgetmem


class TutorService:
    """Service xử lý Tìm kiếm Ngữ nghĩa tối ưu Token & Chi phí (NotebookLM-style)."""

    def __init__(self):
        # Sử dụng Google Gemini Client mới nhất (hoặc OpenAI tùy config)
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")
        self.ai_client = genai.Client(api_key=api_key) if api_key else None

    def _get_embedding(self, text: str) -> List[float]:
        """Tạo vector embedding cho text."""
        if not self.ai_client:
            return []
        response = self.ai_client.models.embed_content(
            model="text-embedding-004",
            contents=text,
        )
        return response.embeddings[0].values

    @staticmethod
    def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Tính độ tương đồng Cosine giữa 2 vector."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
            return 0.0
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    def answer(self, request: ChatRequest) -> ChatResponse:
        lesson_id = request.lesson_id
        user_query = request.query_text if hasattr(request, "query_text") else request.passage_text

        # 1. TRUY XUẤT CHUNKS TỪ FIREBASE (Thay thế hoàn toàn SQLite)
        resource_data = firebase_service.get_raw_resource_with_chunks(lesson_id)
        if not resource_data or not resource_data.get("chunks"):
            raise LookupError(f"Không tìm thấy học liệu hoặc dữ liệu Chunks cho ID: {lesson_id}")

        raw_chunks = resource_data["chunks"]

        # 2. TỐI ƯU TOKEN CẤP 1: Nén lọc Chunk bằng thuật toán BudgetMem (Giữ lại 40% đặc thông tin nhất)
        chunk_texts = [c["content"] for c in raw_chunks]
        filtered_texts = filter_chunks_budgetmem(chunk_texts, budget_ratio=0.4)
        
        # Áp lại danh sách chunk đã nén lọc
        filtered_chunks = [c for c in raw_chunks if c["content"] in filtered_texts]

        # 3. SEMANTIC VECTOR SEARCH: Tìm Top 3 Chunks sát ngữ nghĩa với câu hỏi
        query_vector = self._get_embedding(user_query)
        scored_chunks = []

        for chk in filtered_chunks:
            # Nếu chunk chưa có vector embedding trong DB, tự tạo nhanh
            content = chk["content"]
            chunk_vector = chk.get("embedding") or self._get_embedding(content)
            
            sim_score = self._cosine_similarity(query_vector, chunk_vector) if query_vector and chunk_vector else 0.5
            scored_chunks.append({
                "chunk_id": chk["chunk_id"],
                "content": content,
                "score": sim_score
            })

        # Sắp xếp lấy Top 3 Chunks có độ tương đồng cao nhất
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        top_3_chunks = scored_chunks[:3]

        # 4. TỐI ƯU TOKEN CẤP 2: Dựng Context siêu gọn nhẹ để gửi LLM
        context_str = ""
        citations_list = []

        for chk in top_3_chunks:
            chk_id = chk["chunk_id"]
            context_str += f"\n--- [{chk_id}] ---\n{chk['content']}\n"
            citations_list.append(Citation(code=chk_id, text=chk["content"][:100] + "..."))

        prompt = f"""
Bạn là Trợ lý Học tập AI VLearn.
Hãy trả lời câu hỏi của sinh viên DỰA TRÊN NGỮ CẢNH ĐƯỢC CỦNG CỐ bên dưới.
Nếu thông tin không có trong ngữ cảnh, hãy nói rõ không đủ dữ liệu.
Cuối câu trả lời, hãy trích dẫn rõ mã chunk tương ứng dưới dạng [{top_3_chunks[0]['chunk_id']}].

--- NGỮ CẢNH NÉN TỐI ƯU ---
{context_str}

--- CÂU HỎI SINH VIÊN ---
{user_query}
"""

        # 5. GỌI LLM SINH CÂU TRẢ LỜI
        if self.ai_client:
            llm_response = self.ai_client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.3)
            )
            answer_text = llm_response.text
        else:
            answer_text = f"Đã tìm thấy {len(top_3_chunks)} đoạn ngữ cảnh phù hợp nhất. Dữ liệu: {top_3_chunks[0]['content']}"

        return ChatResponse(
            answer=answer_text,
            citations=citations_list,
            confidence=int(top_3_chunks[0]["score"] * 100) if top_3_chunks else 90,
            grounded=True,
            suggested_questions=[
                "Hãy giải thích chi tiết hơn về phần này?",
                "Cho tôi 1 ví dụ thực tế liên quan đến nội dung trên."
            ]
        )