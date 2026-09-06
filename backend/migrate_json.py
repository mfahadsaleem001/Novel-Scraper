import json
from pathlib import Path
from datetime import datetime

from backend.database import SessionLocal
from backend.models import Novel, Chapter


BASE_DIR = Path(__file__).resolve().parent.parent
NOVELS_DIR = BASE_DIR / "novels"


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, dict) and "data" in data:
        return data["data"]

    return data


def parse_datetime(value):
    if not value:
        return datetime.utcnow()

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return datetime.utcnow()


def migrate_novels():
    db = SessionLocal()

    try:
        json_files = list(NOVELS_DIR.glob("*.json"))

        print(f"Found {len(json_files)} JSON novel files.")

        for file_path in json_files:
            print(f"\nProcessing: {file_path.name}")

            data = load_json(file_path)

            filename = data.get("filename", file_path.name)

            existing_novel = (
                db.query(Novel)
                .filter(Novel.filename == filename)
                .first()
            )

            if existing_novel:
                print(f"Skipping existing novel: {filename}")
                continue

            novel = Novel(
                filename=filename,
                title=data.get("title", "Untitled"),
                author=data.get("author"),
                genre=data.get("genre"),
                status=data.get("status"),
                synopsis=data.get("synopsis"),
                cover_image=data.get("cover_image"),
                source_website=data.get("source_website"),
                source_url=data.get("source_url"),
                total_chapters=len(data.get("chapters", [])),
                last_updated=parse_datetime(data.get("last_updated")),
            )

            db.add(novel)
            db.flush()

            chapters = data.get("chapters", [])

            for index, chapter_data in enumerate(chapters, start=1):

                if not isinstance(chapter_data, dict):
                    continue

                chapter = Chapter(
                    novel_id=novel.id,
                    chapter_number=chapter_data.get(
                        "chapter_number",
                        index
                    ),
                    title=chapter_data.get("title"),
                    date=str(chapter_data.get("date", "")),
                    views=int(chapter_data.get("views", 0) or 0),
                    is_locked=bool(
                        chapter_data.get(
                            "is_locked",
                            chapter_data.get("locked", False)
                        )
                    ),
                    url=chapter_data.get("url"),
                    content=chapter_data.get("content"),
                    scrape_status=chapter_data.get("scrape_status"),
                )

                db.add(chapter)

            print(
                f"Added: {data.get('title', 'Untitled')} "
                f"({len(chapters)} chapters)"
            )

        db.commit()

        print("\nMigration completed successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    migrate_novels()