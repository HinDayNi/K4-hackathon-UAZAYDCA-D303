from app.core.config import get_settings
from app.services.summary_service import summarize_block


def test_deepseek_is_default_model() -> None:
    settings = get_settings()
    assert settings.deepseek_base_url == "https://api.deepseek.com"
    assert settings.deepseek_model == "deepseek-v4-flash"


def test_summary_falls_back_without_deepseek_key() -> None:
    result = summarize_block(
        {
            "id": "block-1",
            "normalized_text": (
                "Đây là một đoạn nội dung đủ dài để kiểm tra cơ chế tóm tắt "
                "ngoại tuyến khi chưa cấu hình khóa DeepSeek."
            ),
        }
    )
    assert result
    assert "DeepSeek" in result
