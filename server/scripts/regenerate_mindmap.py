import argparse

from app.core.database import initialize_database
from app.services.mindmap_service import MindmapService


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate a stored deck mindmap")
    parser.add_argument("deck_id")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    initialize_database()
    artifact = MindmapService().generate(args.deck_id, force=args.force)
    print(f"{artifact['id']} {artifact['status']}")


if __name__ == "__main__":
    main()
