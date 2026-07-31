import re
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
import spacy

try:
    nlp = spacy.blank("vi") 
except Exception:
    nlp = spacy.blank("en")

def filter_chunks_budgetmem(chunks: List[str], budget_ratio: float = 0.4) -> List[str]:
    """
    Hiện thực hóa thuật toán BudgetMem nén tài liệu phục vụ sinh Quiz/Flashcard/Summary.
    budget_ratio = 0.4: Giữ lại 40% chunk đặc thông tin nhất.
    """
    M = len(chunks)
    if M <= 3:  # Tài liệu quá ngắn thì giữ nguyên ngữ cảnh
        return chunks

    vectorizer = TfidfVectorizer()
    try:
        tfidf_matrix = vectorizer.fit_transform(chunks)
    except Exception:
        tfidf_matrix = None

    scored_chunks = []
    discourse_pattern = r"\b(tuy nhiên|do đó|vì vậy|tóm lại|cụ thể là|sau cùng|however|therefore|consequently|nevertheless|furthermore|in conclusion)\b"
    entity_pattern = r"\b[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĐ][a-zàáâãèéêìíòóôõùúýđ]*(?:\s+[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĐ][a-zàáâãèéêìíòóôõùúýđ]*)*\b"

    for i, chunk_text in enumerate(chunks):
        doc = nlp(chunk_text)
        total_tokens = len(doc) if len(doc) > 0 else 1

        entities = re.findall(entity_pattern, chunk_text)
        f1_entity = len(entities) / total_tokens

        f2_tfidf = 0.0
        if tfidf_matrix is not None:
            chunk_vector = tfidf_matrix[i].toarray()[0]
            important_vals = [v for v in chunk_vector if v > 0]
            if important_vals:
                f2_tfidf = sum(important_vals) / len(important_vals)

        relative_pos = i / (M - 1) if M > 1 else 0.5
        f3_position = 1.0 - 2.0 * abs(relative_pos - 0.5)

        num_digits = sum(1 for token in doc if token.is_digit or re.search(r'\d', token.text))
        f4_numeric = num_digits / total_tokens

        has_discourse = 1.0 if re.search(discourse_pattern, chunk_text.lower()) else 0.0
        has_question = 1.0 if "?" in chunk_text else 0.0
        f5_structure = (has_discourse * 0.1) + (has_question * 0.1)

        salience_score = (0.2 * f1_entity) + (0.2 * f2_tfidf) + (0.15 * f3_position) + (0.15 * f4_numeric) + f5_structure

        scored_chunks.append({
            "text": chunk_text,
            "score": salience_score,
            "original_index": i
        })

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    keep_count = max(1, int(budget_ratio * M))
    retained_objects = scored_chunks[:keep_count]
    retained_objects.sort(key=lambda x: x["original_index"])

    return [obj["text"] for obj in retained_objects]