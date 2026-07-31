import json
import sys
import unicodedata
from collections import Counter
from copy import deepcopy
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SERVER_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE = SERVER_ROOT / "tests" / "fixtures" / "legal_deck_chat_cases.json"


def normalize_text(value: object) -> str:
    folded = str(value).casefold().translate(str.maketrans({"đ": "d"}))
    decomposed = unicodedata.normalize("NFKD", folded)
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(without_marks.split())


def evaluate_case(case: dict, http_status: int, response: dict) -> tuple[bool, list[str]]:
    expected = case["expected"]
    answer = normalize_text(response.get("answer", ""))
    actual_slides = {
        citation["slide_index"]
        for citation in response.get("citations", [])
        if isinstance(citation, dict) and isinstance(citation.get("slide_index"), int)
    }
    required_slides = set(expected["required_citation_slide_indexes"])
    allowed_slides = set(expected.get("allowed_citation_slide_indexes", required_slides))
    failures = []

    scalar_checks = (
        ("http_status", http_status, expected["http_status"]),
        ("status", response.get("status"), expected["status"]),
        ("grounded", response.get("grounded"), expected["grounded"]),
    )
    for label, actual, wanted in scalar_checks:
        if actual != wanted:
            failures.append(f"{label}: expected {wanted!r}, got {actual!r}")

    if not required_slides.issubset(actual_slides):
        missing = sorted(required_slides - actual_slides)
        failures.append(f"missing required citation slides: {missing}")
    if not actual_slides.issubset(allowed_slides):
        unexpected = sorted(actual_slides - allowed_slides)
        failures.append(f"unexpected citation slides: {unexpected}")

    if "confidence" in expected and response.get("confidence") != expected["confidence"]:
        failures.append(
            f"confidence: expected {expected['confidence']!r}, "
            f"got {response.get('confidence')!r}"
        )
    minimum_confidence = expected.get("minimum_confidence")
    if minimum_confidence is not None:
        confidence = response.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence < minimum_confidence:
            failures.append(
                f"confidence: expected >= {minimum_confidence}, got {confidence!r}"
            )

    for alternatives in expected.get("required_answer_concepts", []):
        normalized_alternatives = [normalize_text(term) for term in alternatives]
        if not any(term in answer for term in normalized_alternatives):
            failures.append(f"missing answer concept (any of): {alternatives}")
    for forbidden in expected.get("forbidden_answer_terms", []):
        if normalize_text(forbidden) in answer:
            failures.append(f"forbidden answer term: {forbidden!r}")

    return not failures, failures


def classify_failures(case: dict, failures: list[str], response: dict) -> list[str]:
    categories = []
    expected = case["expected"]
    if (
        expected["status"] == "answered"
        and response.get("status") == "no_basis"
    ):
        categories.append("retrieval_no_source")
    if any(reason.startswith("missing required citation") for reason in failures):
        categories.append("missing_citation")
    if any(reason.startswith("unexpected citation") for reason in failures):
        categories.append("extra_citation")
    if any(reason.startswith("missing answer concept") for reason in failures):
        categories.append("answer_incomplete")
    if (
        expected["status"] == "no_basis"
        and response.get("status") == "answered"
        and any("Mơ hồ" in layer for layer in case["taxonomy_layer"])
    ):
        categories.append("ambiguity_guess")
    if any(reason.startswith("forbidden answer term") for reason in failures):
        categories.append("forbidden_claim")
    if case.get("review_status") == "pending":
        categories.append("suspected_false_negative")
    if failures and not categories:
        categories.append("response_contract_mismatch")
    return list(dict.fromkeys(categories))


def annotate_result(case: dict, result: dict) -> dict:
    annotated = deepcopy(result)
    review_status = case.get("review_status", "not_required")
    if review_status == "pending":
        evaluation_status = "needs_human_review"
    elif annotated["passed"]:
        evaluation_status = "automated_pass"
    else:
        evaluation_status = "automated_fail"
    annotated["evaluation_status"] = evaluation_status
    annotated["failure_owner"] = case.get(
        "failure_owner", "product" if not annotated["passed"] else None
    )
    annotated["review_status"] = review_status
    annotated["review_note"] = case.get("review_note", "")
    annotated["failure_categories"] = classify_failures(
        case, annotated["failures"], annotated.get("response") or {}
    )
    return annotated


def replay_results(suite: dict, previous_results: list[dict]) -> list[dict]:
    previous_by_id = {item["id"]: item for item in previous_results}
    replayed = []
    for case in suite["cases"]:
        previous = previous_by_id[case["id"]]
        response = deepcopy(previous["response"])
        response_payload = response or {}
        http_status = previous["http_status"]
        passed, failures = evaluate_case(case, http_status, response_payload)
        base_result = {
            "id": case["id"],
            "tier": case["tier"],
            "taxonomy_layer": case["taxonomy_layer"],
            "passed": passed,
            "http_status": http_status,
            "citation_accurate": (
                http_status == case["expected"]["http_status"]
                and response_payload.get("status") == case["expected"]["status"]
                and response_payload.get("grounded") == case["expected"]["grounded"]
                and not any("citation slide" in reason for reason in failures)
            ),
            "failures": failures,
            "response": response,
        }
        replayed.append(annotate_result(case, base_result))
    return replayed


def summarize_results(results: list[dict]) -> dict:
    total = len(results)
    passed = sum(
        item.get("evaluation_status") == "automated_pass"
        if "evaluation_status" in item
        else item["passed"]
        for item in results
    )
    citation_accurate = sum(
        item.get("citation_accurate", item["passed"]) for item in results
    )
    evaluation_statuses = Counter(
        item.get(
            "evaluation_status",
            "automated_pass" if item["passed"] else "automated_fail",
        )
        for item in results
    )
    failure_categories = Counter(
        category
        for item in results
        for category in item.get("failure_categories", [])
    )
    by_tier: Counter[str] = Counter()
    by_tier_passed: Counter[str] = Counter()
    by_layer: Counter[str] = Counter()
    by_layer_passed: Counter[str] = Counter()
    for item in results:
        official_pass = (
            item.get("evaluation_status") == "automated_pass"
            if "evaluation_status" in item
            else item["passed"]
        )
        tier = item["tier"]
        by_tier[tier] += 1
        by_tier_passed[tier] += int(official_pass)
        for layer in item["taxonomy_layer"]:
            by_layer[layer] += 1
            by_layer_passed[layer] += int(official_pass)
    return {
        "total": total,
        "passed": passed,
        "pass_rate_percent": round(100 * passed / total, 1) if total else 0.0,
        "citation_accuracy_percent": (
            round(100 * citation_accurate / total, 1) if total else 0.0
        ),
        "evaluation_status": dict(sorted(evaluation_statuses.items())),
        "failure_categories": dict(sorted(failure_categories.items())),
        "by_tier": {
            tier: {"passed": by_tier_passed[tier], "total": count}
            for tier, count in sorted(by_tier.items())
        },
        "by_layer": {
            layer: {"passed": by_layer_passed[layer], "total": count}
            for layer, count in sorted(by_layer.items())
        },
    }


def build_analysis(
    suite: dict,
    results: list[dict],
    original_summary: dict | None = None,
) -> dict:
    summary = summarize_results(results)
    return {
        "original_baseline": original_summary or {
            "source": "Raw API responses preserved from legal_deck_chat_results.json",
            "total_cases": summary["total"],
            "official_automated_passes": summary["passed"],
            "pass_rate_percent": summary["pass_rate_percent"],
            "citation_accuracy_percent": summary["citation_accuracy_percent"],
        },
        "re_evaluated": {
            "source": "Same raw API responses, evaluated with verified CASE10 expectation",
            "total_cases": summary["total"],
            "official_automated_passes": summary["passed"],
            "pass_rate_percent": summary["pass_rate_percent"],
            "citation_accuracy_percent": summary["citation_accuracy_percent"],
        },
        "by_tier": summary["by_tier"],
        "by_layer": summary["by_layer"],
        "evaluation_status": summary["evaluation_status"],
        "failure_categories": summary["failure_categories"],
        "needs_human_review": [
            {
                "id": item["id"],
                "review_note": item["review_note"],
                "failure_categories": item["failure_categories"],
            }
            for item in results
            if item["evaluation_status"] == "needs_human_review"
        ],
        "future_product_priorities": [
            "Ngăn hệ thống đoán khi follow-up không đủ ngữ cảnh.",
            "Cải thiện retrieval cho câu định nghĩa và câu hỏi nhiều phần.",
            "Gom đủ block của bảng trong cùng slide trước khi sinh câu trả lời.",
            "Kiểm tra độ đầy đủ từng ý và giảm citation thừa.",
        ],
        "runtime_change_applied": False,
        "quality_bar": suite["quality_bar"],
    }


def post_json(url: str, payload: dict) -> tuple[int, dict]:
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=90) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = json.loads(exc.read().decode("utf-8"))
        return exc.code, body


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    base_url = (
        sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"
    )
    fixture_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_FIXTURE
    output_path = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    suite = json.loads(fixture_path.read_text(encoding="utf-8"))
    results = []

    print(f"Suite: {suite['name']}")
    print(f"Deck:  {suite['deck_id']}")
    for case in suite["cases"]:
        try:
            http_status, response = post_json(
                base_url + suite["endpoint"], case["request"]
            )
        except (URLError, TimeoutError) as exc:
            print(f"[ERROR] {case['id']}: {exc}")
            results.append(
                annotate_result(case, {
                    "id": case["id"],
                    "tier": case["tier"],
                    "taxonomy_layer": case["taxonomy_layer"],
                    "passed": False,
                    "citation_accurate": False,
                    "http_status": None,
                    "failures": [str(exc)],
                    "response": None,
                })
            )
            continue

        actual_slides = sorted(
            citation["slide_index"] for citation in response.get("citations", [])
        )
        passed, reasons = evaluate_case(case, http_status, response)
        label = "PASS" if passed else "FAIL"
        results.append(
            annotate_result(case, {
                "id": case["id"],
                "tier": case["tier"],
                "taxonomy_layer": case["taxonomy_layer"],
                "passed": passed,
                "http_status": http_status,
                "citation_accurate": (
                    http_status == case["expected"]["http_status"]
                    and response.get("status") == case["expected"]["status"]
                    and response.get("grounded") == case["expected"]["grounded"]
                    and not any("citation slide" in reason for reason in reasons)
                ),
                "failures": reasons,
                "response": response,
            })
        )
        print(
            f"[{label}] {case['id']} ({case['tier']}/{case['rarity']}): "
            f"HTTP {http_status}, "
            f"status={response.get('status')}, slides={actual_slides}, "
            f"confidence={response.get('confidence')}"
        )
        if not passed:
            for reason in reasons:
                print(f"  - {reason}")
            print(json.dumps(response, ensure_ascii=False, indent=2))

    summary = summarize_results(results)
    quality_bar = suite["quality_bar"]
    meets_bar = (
        summary["passed"] >= quality_bar["minimum_passed_cases"]
        and summary["pass_rate_percent"] >= quality_bar["minimum_pass_rate_percent"]
        and summary["citation_accuracy_percent"]
        >= quality_bar["citation_accuracy_percent"]
    )
    print(
        f"\nResult: {summary['passed']}/{summary['total']} passed "
        f"({summary['pass_rate_percent']}%)"
    )
    for tier, counts in summary["by_tier"].items():
        print(f"  Tier {tier}: {counts['passed']}/{counts['total']}")
    for layer, counts in summary["by_layer"].items():
        print(f"  Layer {layer}: {counts['passed']}/{counts['total']}")
    print(
        "Quality bar: "
        f"{'MET' if meets_bar else 'NOT MET'} "
        f"(>= {quality_bar['minimum_passed_cases']} cases and "
        f">= {quality_bar['minimum_pass_rate_percent']}% pass; "
        f">= {quality_bar['citation_accuracy_percent']}% citation accuracy, "
        f"actual {summary['citation_accuracy_percent']}%)"
    )
    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(
                {
                    "suite": suite["name"],
                    "deck_id": suite["deck_id"],
                    "quality_bar": quality_bar,
                    "quality_bar_met": meets_bar,
                    "summary": summary,
                    "analysis": build_analysis(suite, results),
                    "results": results,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"Detailed results: {output_path}")
    return 0 if meets_bar else 1


if __name__ == "__main__":
    raise SystemExit(main())
