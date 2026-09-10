import sys
import time
import threading

from datetime import datetime, timezone

from bs4 import BeautifulSoup

from backend.database import SessionLocal
from backend.models import Novel, Chapter

from scraper import (
    fetch_page,
    extract_title,
    extract_author,
    extract_genre,
    extract_status,
    extract_synopsis,
    extract_cover,
    get_chapter_list,
    scrape_chapter,
)


# ============================================================
# AUTO SYNC CONFIGURATION
# ============================================================

SYNC_INTERVAL_SECONDS = 60 * 60


# ============================================================
# WINDOWS / UNICODE CONSOLE SAFETY
# ============================================================

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(
            encoding="utf-8",
            errors="replace"
        )

    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(
            encoding="utf-8",
            errors="replace"
        )

except Exception:
    pass


# ============================================================
# UTC DATETIME HELPER
# ============================================================

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ============================================================
# AUTO SYNC ENGINE
# ============================================================

def sync_novel(novel_id):
    """
    Synchronize one existing scraped novel with its
    original source website.

    This function does NOT recreate the novel.

    It compares PostgreSQL data with the latest source
    website data and applies only required changes.
    """

    db = SessionLocal()

    try:

        # ====================================================
        # FIND NOVEL
        # ====================================================

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return {
                "success": False,
                "message": "Novel not found."
            }

        # ====================================================
        # SOURCE URL CHECK
        # ====================================================

        if not novel.source_url:

            novel.sync_status = "skipped"
            novel.last_sync_error = (
                "Novel does not have a source URL."
            )
            novel.last_synced_at = utc_now()

            db.commit()

            return {
                "success": False,
                "message": "Novel has no source URL."
            }

        # ====================================================
        # START SYNC
        # ====================================================

        print()
        print("=" * 60)
        print("AUTO SYNC STARTED")
        print("=" * 60)

        print(f"Novel: {novel.title}")
        print(f"Source: {novel.source_url}")

        novel.sync_status = "running"
        novel.last_sync_error = None

        db.commit()

        # ====================================================
        # FETCH NOVEL PAGE
        # ====================================================

        response = fetch_page(
            novel.source_url
        )

        if response is None:
            raise RuntimeError(
                "Could not fetch source novel page."
            )

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        # ====================================================
        # EXTRACT LATEST METADATA
        # ====================================================

        latest_title = extract_title(soup)
        latest_author = extract_author(soup)
        latest_genre = extract_genre(soup)
        latest_status = extract_status(soup)
        latest_synopsis = extract_synopsis(soup)
        latest_cover = extract_cover(soup)

        # ====================================================
        # UPDATE NOVEL METADATA
        # ====================================================

        metadata_changes = []

        if (
            latest_title
            and latest_title != novel.title
        ):
            novel.title = latest_title
            metadata_changes.append("title")

        if (
            latest_author
            and latest_author != novel.author
        ):
            novel.author = latest_author
            metadata_changes.append("author")

        if (
            latest_genre
            and latest_genre != novel.genre
        ):
            novel.genre = latest_genre
            metadata_changes.append("genre")

        if (
            latest_status
            and latest_status != novel.status
        ):
            novel.status = latest_status
            metadata_changes.append("status")

        if (
            latest_synopsis
            and latest_synopsis != novel.synopsis
        ):
            novel.synopsis = latest_synopsis
            metadata_changes.append("synopsis")

        if (
            latest_cover
            and latest_cover != novel.cover_image
        ):
            novel.cover_image = latest_cover
            metadata_changes.append("cover")

        if metadata_changes:

            print(
                "Metadata updated:",
                ", ".join(metadata_changes)
            )

        # ====================================================
        # GET LATEST CHAPTER LIST
        # ====================================================

        latest_chapter_list = get_chapter_list(
            soup,
            novel.source_url
        )

        if not latest_chapter_list:

            raise RuntimeError(
                "No chapters found on source website."
            )

        source_chapters = {}

        for chapter in latest_chapter_list:

            chapter_number = chapter.get(
                "chapter_number"
            )

            if chapter_number is None:
                continue

            try:
                chapter_number = int(
                    chapter_number
                )
            except (
                TypeError,
                ValueError
            ):
                continue

            source_chapters[
                chapter_number
            ] = chapter

        # ====================================================
        # GET DATABASE CHAPTERS
        # ====================================================

        database_chapters = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel.id
            )
            .all()
        )

        database_chapters_map = {}

        for chapter in database_chapters:

            try:
                chapter_number = int(
                    chapter.chapter_number
                )
            except (
                TypeError,
                ValueError
            ):
                continue

            database_chapters_map[
                chapter_number
            ] = chapter

        # ====================================================
        # TRACK CHANGES
        # ====================================================

        added_count = 0
        updated_count = 0
        removed_count = 0
        unchanged_count = 0
        failed_count = 0
        manual_count = 0

        # ====================================================
        # REMOVE SOURCE CHAPTERS THAT NO LONGER EXIST
        # ====================================================

        source_numbers = set(
            source_chapters.keys()
        )

        database_numbers = set(
            database_chapters_map.keys()
        )

        removed_numbers = (
            database_numbers - source_numbers
        )

        for chapter_number in sorted(
            removed_numbers
        ):

            chapter = database_chapters_map[
                chapter_number
            ]

            # ------------------------------------------------
            # NEVER DELETE MANUAL CHAPTERS
            # ------------------------------------------------

            if chapter.is_manual:

                print(
                    f"Keeping manual Chapter "
                    f"{chapter_number}"
                )

                manual_count += 1
                continue

            print(
                f"Removing Chapter "
                f"{chapter_number}..."
            )

            db.delete(chapter)

            removed_count += 1

        # ====================================================
        # PROCESS SOURCE CHAPTERS
        # ====================================================

        for chapter_number in sorted(
            source_chapters.keys()
        ):

            source_chapter = source_chapters[
                chapter_number
            ]

            existing_chapter = (
                database_chapters_map.get(
                    chapter_number
                )
            )

            # =================================================
            # NEW CHAPTER
            # =================================================

            if existing_chapter is None:

                print(
                    f"New Chapter detected: "
                    f"{chapter_number}"
                )

                result = scrape_chapter(
                    source_chapter
                )

                if result:

                    new_chapter = Chapter(
                        novel_id=novel.id,

                        chapter_number=(
                            result["chapter_number"]
                        ),

                        title=result.get(
                            "title",
                            f"Chapter {chapter_number}"
                        ),

                        date=result.get(
                            "date",
                            ""
                        ),

                        views=result.get(
                            "views",
                            0
                        ),

                        is_locked=result.get(
                            "is_locked",
                            False
                        ),

                        is_manual=False,

                        url=result.get(
                            "url",
                            source_chapter.get(
                                "url",
                                ""
                            )
                        ),

                        content=result.get(
                            "content",
                            ""
                        ),

                        scrape_status="success"
                    )

                    db.add(
                        new_chapter
                    )

                    added_count += 1

                else:

                    print(
                        f"Failed to scrape new "
                        f"Chapter {chapter_number}"
                    )

                    failed_count += 1

                continue

            # =================================================
            # MANUAL CHAPTER PROTECTION
            # =================================================

            if existing_chapter.is_manual:

                print(
                    f"Skipping manual Chapter "
                    f"{chapter_number}"
                )

                manual_count += 1
                continue

            # =================================================
            # EXISTING SOURCE CHAPTER
            # =================================================

            source_url = source_chapter.get(
                "url",
                ""
            )

            existing_url = (
                existing_chapter.url or ""
            )

            # -------------------------------------------------
            # UPDATE URL IF SOURCE CHANGED
            # -------------------------------------------------

            if (
                source_url
                and source_url != existing_url
            ):

                existing_chapter.url = source_url

            # =================================================
            # CHECK EXISTING CHAPTER CONTENT
            # =================================================

            result = scrape_chapter(
                source_chapter
            )

            if not result:

                print(
                    f"Could not check Chapter "
                    f"{chapter_number}"
                )

                failed_count += 1
                continue

            latest_content = result.get(
                "content",
                ""
            )

            current_content = (
                existing_chapter.content or ""
            )

            # =================================================
            # CHAPTER CHANGED
            # =================================================

            if latest_content != current_content:

                print(
                    f"Updated Chapter detected: "
                    f"{chapter_number}"
                )

                existing_chapter.content = (
                    latest_content
                )

                existing_chapter.title = (
                    result.get(
                        "title",
                        existing_chapter.title
                    )
                )

                existing_chapter.date = (
                    result.get(
                        "date",
                        existing_chapter.date
                    )
                )

                existing_chapter.views = (
                    result.get(
                        "views",
                        existing_chapter.views
                    )
                )

                existing_chapter.is_locked = (
                    result.get(
                        "is_locked",
                        existing_chapter.is_locked
                    )
                )

                existing_chapter.url = (
                    result.get(
                        "url",
                        existing_chapter.url
                    )
                )

                existing_chapter.scrape_status = (
                    "success"
                )

                updated_count += 1

            else:

                unchanged_count += 1

        # ====================================================
        # UPDATE TOTAL CHAPTERS
        # ====================================================

        remaining_count = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel.id
            )
            .count()
        )

        novel.total_chapters = (
            remaining_count
        )

        # ====================================================
        # UPDATE SYNC STATUS
        # ====================================================

        novel.last_synced_at = utc_now()

        if (
            metadata_changes
            or added_count > 0
            or updated_count > 0
            or removed_count > 0
        ):

            novel.last_updated = utc_now()

        if failed_count > 0:

            novel.sync_status = "partial"

            novel.last_sync_error = (
                f"{failed_count} chapter(s) "
                f"could not be checked."
            )

        else:

            novel.sync_status = "success"
            novel.last_sync_error = None

        db.commit()

        # ====================================================
        # SUMMARY
        # ====================================================

        print()
        print("=" * 60)
        print("AUTO SYNC COMPLETE")
        print("=" * 60)

        print(
            f"New Chapters: {added_count}"
        )

        print(
            f"Updated Chapters: {updated_count}"
        )

        print(
            f"Removed Chapters: {removed_count}"
        )

        print(
            f"Unchanged Chapters: {unchanged_count}"
        )

        print(
            f"Manual Chapters Preserved: "
            f"{manual_count}"
        )

        print(
            f"Failed Checks: {failed_count}"
        )

        print(
            f"Total Chapters: {remaining_count}"
        )

        if metadata_changes:

            print(
                "Metadata Changes:",
                ", ".join(metadata_changes)
            )

        print(
            f"Sync Status: {novel.sync_status}"
        )

        print("=" * 60)

        return {
            "success": True,
            "novel_id": novel.id,
            "title": novel.title,
            "added": added_count,
            "updated": updated_count,
            "removed": removed_count,
            "unchanged": unchanged_count,
            "manual_preserved": manual_count,
            "failed": failed_count,
            "total_chapters": remaining_count,
            "metadata_changes": metadata_changes,
            "sync_status": novel.sync_status,
            "last_synced_at": (
                novel.last_synced_at.isoformat()
                if novel.last_synced_at
                else None
            )
        }

    except Exception as error:

        db.rollback()

        try:

            print()
            print(
                "AUTO SYNC ERROR:",
                repr(error)
            )

        except Exception:
            pass

        try:

            novel = (
                db.query(Novel)
                .filter(
                    Novel.id == novel_id
                )
                .first()
            )

            if novel:

                novel.sync_status = "failed"

                novel.last_sync_error = str(
                    error
                )

                novel.last_synced_at = (
                    utc_now()
                )

                db.commit()

        except Exception:

            db.rollback()

        return {
            "success": False,
            "novel_id": novel_id,
            "message": str(error)
        }

    finally:

        db.close()


# ============================================================
# SYNC ALL SCRAPED NOVELS
# ============================================================

def sync_all_novels():
    """
    Synchronize all novels that have a source URL.

    Manually created novels without a source URL
    are skipped.
    """

    db = SessionLocal()

    try:

        novels = (
            db.query(Novel)
            .filter(
                Novel.source_url.isnot(None),
                Novel.source_url != ""
            )
            .all()
        )

        novel_ids = [
            novel.id
            for novel in novels
        ]

    finally:

        db.close()

    print()
    print("=" * 60)
    print("AUTO SYNC - ALL SOURCE NOVELS")
    print("=" * 60)

    print(
        f"Novels to synchronize: "
        f"{len(novel_ids)}"
    )

    print("=" * 60)

    results = []

    for novel_id in novel_ids:

        result = sync_novel(
            novel_id
        )

        results.append(
            result
        )

    # ========================================================
    # FINAL ALL-NOVELS SUMMARY
    # ========================================================

    successful = sum(
        1
        for result in results
        if result.get("success")
    )

    failed = (
        len(results) - successful
    )

    total_added = sum(
        result.get("added", 0)
        for result in results
        if result.get("success")
    )

    total_updated = sum(
        result.get("updated", 0)
        for result in results
        if result.get("success")
    )

    total_removed = sum(
        result.get("removed", 0)
        for result in results
        if result.get("success")
    )

    print()
    print("=" * 60)
    print("ALL NOVELS AUTO SYNC FINISHED")
    print("=" * 60)

    print(
        f"Successful: {successful}"
    )

    print(
        f"Failed: {failed}"
    )

    print(
        f"Total Added: {total_added}"
    )

    print(
        f"Total Updated: {total_updated}"
    )

    print(
        f"Total Removed: {total_removed}"
    )

    print("=" * 60)

    return results


# ============================================================
# CONTINUOUS AUTO SYNC LOOP
# ============================================================

def auto_sync_loop():
    """
    Continuously synchronize all scraped novels.

    The loop runs once immediately and then
    repeats after the configured interval.
    """

    print()
    print("=" * 60)
    print("NOVEL ARCHIVE AUTO SYNC SERVICE")
    print("=" * 60)

    print(
        "Automatic synchronization is enabled."
    )

    print(
        "Sync interval: 1 hour"
    )

    print(
        "All scraped novels will be checked automatically."
    )

    print("=" * 60)

    while True:

        try:

            sync_all_novels()

        except Exception as error:

            print()
            print(
                "AUTO SYNC LOOP ERROR:",
                repr(error)
            )

        print()
        print("=" * 60)

        print(
            "NEXT AUTO SYNC IN 1 HOUR"
        )

        print("=" * 60)

        time.sleep(
            SYNC_INTERVAL_SECONDS
        )


# ============================================================
# START AUTO SYNC IN BACKGROUND THREAD
# ============================================================

def start_auto_sync():

    """
    Start the continuous auto-sync service
    in a background daemon thread.

    This allows the Flask application to continue
    running normally.
    """

    sync_thread = threading.Thread(
        target=auto_sync_loop,
        name="NovelAutoSync",
        daemon=True
    )

    sync_thread.start()

    print(
        "Novel Auto Sync background service started."
    )

    return sync_thread


# ============================================================
# TEST / STANDALONE MODE
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("NOVEL ARCHIVE AUTO SYNC")
    print("=" * 60)

    print(
        "Starting automatic synchronization..."
    )

    print(
        "All scraped novels will be synchronized."
    )

    print(
        "Interval: 1 hour"
    )

    print("=" * 60)

    auto_sync_loop()