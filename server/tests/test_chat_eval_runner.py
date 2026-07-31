import json
from copy import deepcopy
from pathlib import Path

from scripts.run_chat_test_set import (
    annotate_result,
    evaluate_case,
    normalize_text,
    replay_results,
    summarize_results,
)


FIXTURE_PATH = (
    Path(__file__).parent / "fixtures" / "legal_deck_chat_cases.json"
)


def _case() -> dict:
    return {
        "id": "CASE_TEST",
        "tier": "core",
        "taxonomy_layer": ["① Nguồn sự thật"],
        "expected": {
            "http_status": 200,
            "status": "answered",
            "grounded": True,
            "minimum_confidence": 70,
            "required_citation_slide_indexes": [4],
            "allowed_citation_slide_indexes": [4, 5],
            "required_answer_concepts": [
                ["bảo đảm thực hiện", "cưỡng chế"],
                ["quản lý xã hội"],
            ],
            "forbidden_answer_terms": ["kiến thức bên ngoài"],
        },
    }


def test_normalize_text_is_case_and_diacritic_insensitive() -> None:
    assert normalize_text("  BẢO đảm\n thực hiện ") == "bao dam thuc hien"


def test_evaluate_case_accepts_allowed_citations_and_concept_alternatives() -> None:
    passed, failures = evaluate_case(
        _case(),
        200,
        {
            "status": "answered",
            "grounded": True,
            "confidence": 90,
            "answer": "Nhà nước quản lý xã hội và bảo đảm thực hiện pháp luật.",
            "citations": [{"slide_index": 4}, {"slide_index": 5}],
        },
    )
    assert passed is True
    assert failures == []


def test_evaluate_case_rejects_unexpected_citation_and_forbidden_claim() -> None:
    passed, failures = evaluate_case(
        _case(),
        200,
        {
            "status": "answered",
            "grounded": True,
            "confidence": 90,
            "answer": "Đây là kiến thức bên ngoài và có cưỡng chế.",
            "citations": [{"slide_index": 4}, {"slide_index": 99}],
        },
    )
    assert passed is False
    assert "unexpected citation slides: [99]" in failures
    assert "forbidden answer term: 'kiến thức bên ngoài'" in failures
    assert any("quản lý xã hội" in failure for failure in failures)


def test_summarize_results_counts_cases_in_each_layer() -> None:
    summary = summarize_results(
        [
            {
                "tier": "core",
                "taxonomy_layer": ["① Nguồn sự thật", "④ Đặc thù domain"],
                "passed": True,
                "citation_accurate": True,
            },
            {
                "tier": "niche",
                "taxonomy_layer": ["① Nguồn sự thật"],
                "passed": False,
                "citation_accurate": False,
            },
        ]
    )
    assert summary["passed"] == 1
    assert summary["pass_rate_percent"] == 50.0
    assert summary["citation_accuracy_percent"] == 50.0
    assert summary["by_tier"]["core"] == {"passed": 1, "total": 1}
    assert summary["by_layer"]["① Nguồn sự thật"] == {"passed": 1, "total": 2}


def test_case10_accepts_verified_slide_139_citation() -> None:
    suite = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    case = next(item for item in suite["cases"] if item["id"] == "CASE10")
    passed, failures = evaluate_case(
        case,
        200,
        {
            "status": "answered",
            "grounded": True,
            "confidence": 90,
            "answer": (
                "Các dấu hiệu gồm hành vi, trái pháp luật, lỗi và chủ thể "
                "có năng lực trách nhiệm pháp lý."
            ),
            "citations": [{"slide_index": 139}],
        },
    )
    assert passed is True
    assert failures == []


def test_pending_review_is_not_counted_as_automated_pass() -> None:
    case = {
        **_case(),
        "review_status": "pending",
        "failure_owner": "needs_review",
        "review_note": "Hai người cần xác minh.",
    }
    result = annotate_result(
        case,
        {
            "id": "CASE_TEST",
            "tier": "core",
            "taxonomy_layer": ["① Nguồn sự thật"],
            "passed": True,
            "citation_accurate": True,
            "http_status": 200,
            "failures": [],
            "response": {},
        },
    )
    summary = summarize_results([result])
    assert result["evaluation_status"] == "needs_human_review"
    assert summary["passed"] == 0


def test_replay_preserves_raw_api_response() -> None:
    case = _case()
    suite = {"cases": [case]}
    response = {
        "status": "answered",
        "grounded": True,
        "confidence": 90,
        "answer": "Nhà nước quản lý xã hội và có sức mạnh cưỡng chế.",
        "citations": [{"slide_index": 4}],
    }
    original = deepcopy(response)
    results = replay_results(
        suite,
        [
            {
                "id": "CASE_TEST",
                "http_status": 200,
                "response": response,
            }
        ],
    )
    assert response == original
    assert results[0]["response"] == original


def test_replay_handles_missing_response_without_mutating_it() -> None:
    results = replay_results(
        {"cases": [_case()]},
        [{"id": "CASE_TEST", "http_status": None, "response": None}],
    )
    assert results[0]["passed"] is False
    assert results[0]["response"] is None
    assert results[0]["evaluation_status"] == "automated_fail"


def test_unexpected_citation_remains_an_automated_failure() -> None:
    case = _case()
    passed, failures = evaluate_case(
        case,
        200,
        {
            "status": "answered",
            "grounded": True,
            "confidence": 90,
            "answer": "Nhà nước quản lý xã hội và có sức mạnh cưỡng chế.",
            "citations": [{"slide_index": 4}, {"slide_index": 99}],
        },
    )
    result = annotate_result(
        case,
        {
            "id": "CASE_TEST",
            "tier": "core",
            "taxonomy_layer": ["① Nguồn sự thật"],
            "passed": passed,
            "citation_accurate": False,
            "http_status": 200,
            "failures": failures,
            "response": {},
        },
    )
    assert result["evaluation_status"] == "automated_fail"
    assert "extra_citation" in result["failure_categories"]
