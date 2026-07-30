import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SERVER_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURE = SERVER_ROOT / "tests" / "fixtures" / "legal_deck_chat_cases.json"


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
    base_url = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"
    fixture_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_FIXTURE
    suite = json.loads(fixture_path.read_text(encoding="utf-8"))
    failures = 0

    print(f"Suite: {suite['name']}")
    print(f"Deck:  {suite['deck_id']}")
    for case in suite["cases"]:
        try:
            http_status, response = post_json(
                base_url + suite["endpoint"], case["request"]
            )
        except (URLError, TimeoutError) as exc:
            print(f"[ERROR] {case['id']}: {exc}")
            failures += 1
            continue

        expected = case["expected"]
        actual_slides = sorted(
            citation["slide_index"] for citation in response.get("citations", [])
        )
        required_slides = set(expected["required_citation_slide_indexes"])
        checks = [
            http_status == expected["http_status"],
            response.get("status") == expected["status"],
            response.get("grounded") == expected["grounded"],
            required_slides.issubset(actual_slides),
        ]
        if "confidence" in expected:
            checks.append(response.get("confidence") == expected["confidence"])

        label = "PASS" if all(checks) else "FAIL"
        failures += int(label == "FAIL")
        print(
            f"[{label}] {case['id']}: HTTP {http_status}, "
            f"status={response.get('status')}, slides={actual_slides}, "
            f"confidence={response.get('confidence')}"
        )
        if label == "FAIL":
            print(json.dumps(response, ensure_ascii=False, indent=2))

    print(f"\nResult: {len(suite['cases']) - failures}/{len(suite['cases'])} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
