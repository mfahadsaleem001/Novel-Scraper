from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import json
import importlib.util
from datetime import datetime, timedelta, timezone
from werkzeug.utils import secure_filename
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt
import os
from apscheduler.schedulers.background import BackgroundScheduler

from backend.auto_sync import sync_all_novels
from backend.models import User, Novel, Chapter, Setting
from backend.database import SessionLocal


# ============================================================
# PROJECT CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

NOVELS_DIR = BASE_DIR / "novels"

UPLOADS_DIR = BASE_DIR / "uploads"
COVERS_DIR = UPLOADS_DIR / "covers"

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp"
}

NOVELS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

COVERS_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "novel-archive-secret-key-change-this"
)

ADMIN_RESET_KEY = os.getenv(
    "ADMIN_RESET_KEY",
    ""
)


# ============================================================
# SCRAPER MODULE
# ============================================================

SCRAPER_PATH = BASE_DIR / "scraper.py"

scraper = None

if SCRAPER_PATH.exists():

    scraper_spec = importlib.util.spec_from_file_location(
        "novel_scraper",
        SCRAPER_PATH
    )

    if scraper_spec and scraper_spec.loader:

        scraper = importlib.util.module_from_spec(
            scraper_spec
        )

        scraper_spec.loader.exec_module(
            scraper
        )


# ============================================================
# APP
# ============================================================

app = Flask(__name__)

CORS(app)


# ============================================================
# AUTO-SYNC SCHEDULER
# ============================================================

scheduler = None


def get_sync_settings():

    db = SessionLocal()

    try:

        settings = db.query(
            Setting
        ).first()

        if not settings:

            settings = Setting(
                site_name="Novel Archive",
                site_description="A modern novel archive.",
                auto_sync_enabled=True,
                sync_interval=30
            )

            db.add(settings)

            db.commit()

            db.refresh(settings)

        return (
            settings.auto_sync_enabled,
            settings.sync_interval
        )

    finally:

        db.close()


def start_auto_sync_scheduler():

    global scheduler

    scheduler = BackgroundScheduler()

    enabled, interval = get_sync_settings()

    if enabled:

        scheduler.add_job(
            sync_all_novels,
            trigger="interval",
            minutes=interval,
            id="novel_auto_sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        print("==============================================")
        print("AUTO-SYNC SCHEDULER STARTED")
        print(
            f"Sync interval: Every {interval} minutes"
        )
        print("==============================================")

    else:

        print("==============================================")
        print("AUTO-SYNC IS DISABLED")
        print("==============================================")


    scheduler.start()

    return scheduler


def update_auto_sync_scheduler():

    global scheduler

    if scheduler is None:
        return

    enabled, interval = get_sync_settings()

    try:

        scheduler.remove_job(
            "novel_auto_sync"
        )

    except Exception:

        pass

    if enabled:

        scheduler.add_job(
            sync_all_novels,
            trigger="interval",
            minutes=interval,
            id="novel_auto_sync",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

        print(
            f"AUTO-SYNC UPDATED: Every {interval} minutes"
        )

    else:

        print(
            "AUTO-SYNC DISABLED"
        )


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================

def admin_required(function):

    @wraps(function)
    def decorated_function(*args, **kwargs):

        authorization = request.headers.get(
            "Authorization"
        )

        if not authorization:

            return jsonify({
                "error": "Authentication required."
            }), 401

        if not authorization.startswith(
            "Bearer "
        ):

            return jsonify({
                "error": "Invalid authorization format."
            }), 401

        token = authorization.split(
            " ",
            1
        )[1]

        try:

            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=["HS256"]
            )

            user_id = payload.get(
                "user_id"
            )

            if not user_id:

                return jsonify({
                    "error": "Invalid authentication token."
                }), 401

        except jwt.ExpiredSignatureError:

            return jsonify({
                "error": "Authentication token has expired."
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "error": "Invalid authentication token."
            }), 401

        db = SessionLocal()

        try:

            admin = (
                db.query(User)
                .filter(
                    User.id == user_id
                )
                .first()
            )

            if not admin:

                return jsonify({
                    "error": "Admin account not found."
                }), 401

            if admin.role != "admin":

                return jsonify({
                    "error": "Admin access required."
                }), 403

            return function(
                *args,
                **kwargs
            )

        finally:

            db.close()

    return decorated_function


# ============================================================
# HOME
# ============================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({
        "message": "Novel Scraper Backend is running",
        "status": "success"
    })


# ============================================================
# SERVE UPLOADED COVER IMAGES
# ============================================================

@app.route(
    "/uploads/<path:filename>",
    methods=["GET"]
)
def uploaded_file(filename):

    return send_from_directory(
        UPLOADS_DIR,
        filename
    )


# ============================================================
# HELPER - LOAD NOVEL JSON
# ============================================================

def load_novel_file(file_path):

    try:

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as json_file:

            raw_data = json.load(
                json_file
            )

        if isinstance(
            raw_data,
            dict
        ):

            if isinstance(
                raw_data.get("data"),
                dict
            ):

                novel_data = raw_data["data"]

            else:

                novel_data = raw_data

        else:

            return None

        novel_data["filename"] = (
            file_path.name
        )

        return novel_data

    except (
        OSError,
        json.JSONDecodeError
    ) as error:

        print(
            f"Could not read {file_path.name}:",
            error
        )

        return None


# ============================================================
# GET ALL NOVELS
# ============================================================

@app.route(
    "/novels",
    methods=["GET"]
)
def get_novels():

    db = SessionLocal()

    try:

        novels = (
            db.query(Novel)
            .order_by(
                Novel.id.asc()
            )
            .all()
        )

        result = []

        for novel in novels:

            result.append({

                "filename":
                    novel.filename,

                "title":
                    novel.title or "Untitled Novel",

                "author":
                    novel.author or "Unknown",

                "genre":
                    novel.genre or "Unknown",

                "status":
                    novel.status or "Unknown",

                "total_chapters":
                    novel.total_chapters or 0,

                "cover_image":
                    novel.cover_image or "",

                "is_manual":
                    novel.source_website == "Manual Entry"

            })

        return jsonify(result)

    except Exception as error:

        print(
            "Get Novels Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not load novels"
        }), 500

    finally:

        db.close()


# ============================================================
# GET SINGLE NOVEL
# ============================================================

@app.route(
    "/novel/<path:filename>",
    methods=["GET"]
)
def get_novel(filename):

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------

    requested_file = Path(
        filename
    )

    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):

        return jsonify({
            "error": "Invalid novel file"
        }), 400

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.filename == filename
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error": "Novel not found"
            }), 404

        # ----------------------------------------------------
        # BUILD CHAPTERS
        # ----------------------------------------------------

        chapters = []

        for chapter in novel.chapters:

            chapters.append({

                "chapter_number":
                    chapter.chapter_number,

                "title":
                    chapter.title or "",

                "date":
                    chapter.date or "",

                "views":
                    chapter.views or 0,

                "is_locked":
                    chapter.is_locked,

                "url":
                    chapter.url or "",

                "content":
                    chapter.content or "",

                "scrape_status":
                    chapter.scrape_status or ""

            })

        # ----------------------------------------------------
        # BUILD NOVEL RESPONSE
        # ----------------------------------------------------

        novel_data = {

            "filename":
                novel.filename,

            "source_website":
                novel.source_website or "",

            "source_url":
                novel.source_url or "",

            "title":
                novel.title or "Untitled Novel",

            "author":
                novel.author or "Unknown",

            "genre":
                novel.genre or "Unknown",

            "status":
                novel.status or "Unknown",

            "synopsis":
                novel.synopsis or "",

            "cover_image":
                novel.cover_image or "",

            "total_chapters":
                novel.total_chapters or len(
                    chapters
                ),

            "chapters":
                chapters,

            "last_updated":
                novel.last_updated.isoformat()
                if novel.last_updated
                else ""

        }

        return jsonify(
            novel_data
        )

    except Exception as error:

        print(
            "Get Novel Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not load novel"
        }), 500

    finally:

        db.close()


# ============================================================
# SCRAPE NOVEL
# ============================================================

@app.route(
    "/scrape",
    methods=["POST"]
)
@admin_required
def scrape_novel():

    # --------------------------------------------------------
    # GET REQUEST DATA
    # --------------------------------------------------------

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error": "Invalid request data"
        }), 400

    url = str(
        data.get(
            "url",
            ""
        )
    ).strip()

    if not url:

        return jsonify({
            "error": "Please enter a novel URL"
        }), 400

    if not url.startswith(
        (
            "http://",
            "https://"
        )
    ):

        return jsonify({
            "error": "Please enter a valid URL"
        }), 400

    # --------------------------------------------------------
    # SCRAPER CHECK
    # --------------------------------------------------------

    if scraper is None:

        return jsonify({
            "error": "Scraper module is not available."
        }), 500

    # --------------------------------------------------------
    # SCRAPE NOVEL
    # --------------------------------------------------------

    try:

        result = scraper.process_url(
            url
        )

        if not result:

            return jsonify({
                "error": (
                    "Could not scrape this URL. "
                    "The website may not be supported "
                    "or the URL may not exist."
                )
            }), 400

        novel_data = result

        # ----------------------------------------------------
        # VALIDATE SCRAPED DATA
        # ----------------------------------------------------

        if not isinstance(
            novel_data,
            dict
        ):

            return jsonify({
                "error":
                    "Invalid scraped novel data"
            }), 500

        title = str(
            novel_data.get(
                "title",
                ""
            )
        ).strip()

        if not title:

            return jsonify({
                "error":
                    "Scraped novel title is missing"
            }), 400

        chapters = novel_data.get(
            "chapters",
            []
        )

        if not isinstance(
            chapters,
            list
        ):

            return jsonify({
                "error":
                    "Invalid chapter data"
            }), 500

        if len(chapters) == 0:

            return jsonify({
                "error":
                    "No chapters found"
            }), 400

        # ----------------------------------------------------
        # CREATE SAME FILENAME STYLE
        # ----------------------------------------------------

        safe_title = title.lower()

        safe_title = "".join(
            character
            if character.isalnum()
            else "-"
            for character in safe_title
        )

        safe_title = "-".join(
            part
            for part in safe_title.split("-")
            if part
        )

        safe_title = safe_title[:150]

        filename = (
            f"novel_{safe_title}.json"
        )

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        db = SessionLocal()

        try:

            # ------------------------------------------------
            # CHECK EXISTING NOVEL
            # ------------------------------------------------

            novel = (
                db.query(Novel)
                .filter(
                    Novel.filename == filename
                )
                .first()
            )

            # ------------------------------------------------
            # CREATE OR UPDATE NOVEL
            # ------------------------------------------------

            if not novel:

                novel = Novel(

                    filename=filename,

                    title=title,

                    author=str(
                        novel_data.get(
                            "author",
                            ""
                        )
                    ).strip(),

                    genre=str(
                        novel_data.get(
                            "genre",
                            ""
                        )
                    ).strip(),

                    status=str(
                        novel_data.get(
                            "status",
                            ""
                        )
                    ).strip(),

                    synopsis=str(
                        novel_data.get(
                            "synopsis",
                            ""
                        )
                    ).strip(),

                    cover_image=str(
                        novel_data.get(
                            "cover_image",
                            ""
                        )
                    ).strip(),

                    source_website=str(
                        novel_data.get(
                            "source_website",
                            "CrushReadNovel"
                        )
                    ).strip(),

                    source_url=str(
                        novel_data.get(
                            "source_url",
                            url
                        )
                    ).strip(),

                    total_chapters=len(
                        chapters
                    ),

                    last_updated=datetime.utcnow()

                )

                db.add(
                    novel
                )

                db.flush()

            else:

                novel.title = title

                novel.author = str(
                    novel_data.get(
                        "author",
                        ""
                    )
                ).strip()

                novel.genre = str(
                    novel_data.get(
                        "genre",
                        ""
                    )
                ).strip()

                novel.status = str(
                    novel_data.get(
                        "status",
                        ""
                    )
                ).strip()

                novel.synopsis = str(
                    novel_data.get(
                        "synopsis",
                        ""
                    )
                ).strip()

                novel.cover_image = str(
                    novel_data.get(
                        "cover_image",
                        ""
                    )
                ).strip()

                novel.source_website = str(
                    novel_data.get(
                        "source_website",
                        "CrushReadNovel"
                    )
                ).strip()

                novel.source_url = str(
                    novel_data.get(
                        "source_url",
                        url
                    )
                ).strip()

                novel.last_updated = (
                    datetime.utcnow()
                )

            # ------------------------------------------------
            # PRESERVE MANUAL CHAPTERS
            # ------------------------------------------------

            manual_chapters = (
                db.query(Chapter)
                .filter(
                    Chapter.novel_id == novel.id,
                    Chapter.is_manual == True
                )
                .all()
            )

            manual_chapter_numbers = {
                chapter.chapter_number
                for chapter in manual_chapters
            }

            # ------------------------------------------------
            # DELETE ONLY SCRAPED CHAPTERS
            # ------------------------------------------------

            db.query(
                Chapter
            ).filter(
                Chapter.novel_id == novel.id,
                Chapter.is_manual == False
            ).delete(
                synchronize_session=False
            )

            # ------------------------------------------------
            # ADD SCRAPED CHAPTERS
            # ------------------------------------------------

            added_scraped_chapters = 0

            for index, chapter_data in enumerate(
                chapters,
                start=1
            ):

                if not isinstance(
                    chapter_data,
                    dict
                ):

                    continue

                try:

                    chapter_number = int(
                        chapter_data.get(
                            "chapter_number",
                            index
                        )
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    continue

                # --------------------------------------------
                # MANUAL CHAPTER HAS PRIORITY
                # --------------------------------------------

                if chapter_number in manual_chapter_numbers:

                    continue

                try:

                    chapter_views = int(
                        chapter_data.get(
                            "views",
                            0
                        ) or 0
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    chapter_views = 0

                chapter = Chapter(

                    novel_id=novel.id,

                    chapter_number=chapter_number,

                    title=str(
                        chapter_data.get(
                            "title",
                            f"Chapter {chapter_number}"
                        )
                    ).strip(),

                    date=str(
                        chapter_data.get(
                            "date",
                            ""
                        )
                    ).strip(),

                    views=chapter_views,

                    is_locked=bool(
                        chapter_data.get(
                            "is_locked",
                            False
                        )
                    ),

                    is_manual=False,

                    url=str(
                        chapter_data.get(
                            "url",
                            ""
                        )
                    ).strip(),

                    content=str(
                        chapter_data.get(
                            "content",
                            ""
                        )
                    ).strip(),

                    scrape_status=str(
                        chapter_data.get(
                            "scrape_status",
                            ""
                        )
                    ).strip()
                )

                db.add(
                    chapter
                )

                added_scraped_chapters += 1

            # ------------------------------------------------
            # TOTAL CHAPTERS
            # ------------------------------------------------

            novel.total_chapters = (
                db.query(Chapter)
                .filter(
                    Chapter.novel_id == novel.id
                )
                .count()
                + added_scraped_chapters
            )

            # ------------------------------------------------
            # COMMIT
            # ------------------------------------------------

            db.commit()

            # ------------------------------------------------
            # RESPONSE
            # ------------------------------------------------

            return jsonify({

                "message":
                    "Novel scraped successfully",

                "status":
                    "success",

                "filename":
                    filename,

                "novel": {

                    "title":
                        title,

                    "author":
                        novel_data.get(
                            "author",
                            "Unknown"
                        ),

                    "genre":
                        novel_data.get(
                            "genre",
                            "Unknown"
                        ),

                    "status":
                        novel_data.get(
                            "status",
                            "Unknown"
                        ),

                    "total_chapters":
                        novel.total_chapters,

                    "cover_image":
                        novel_data.get(
                            "cover_image",
                            ""
                        )
                }

            }), 201

        except Exception as error:

            db.rollback()

            print(
                "Scrape Database Error:",
                repr(error)
            )

            return jsonify({
                "error":
                    "Could not save scraped novel to database"
            }), 500

        finally:

            db.close()

    except Exception as error:

        print(
            "Scraper Error:",
            repr(error)
        )

        return jsonify({
            "error":
                str(error)
        }), 500


# ============================================================
# DELETE NOVEL
# ============================================================

@app.route(
    "/novel/<path:filename>",
    methods=["DELETE"]
)
@admin_required
def delete_novel(filename):

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------

    requested_file = Path(
        filename
    )

    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):

        return jsonify({
            "error": "Invalid novel file"
        }), 400

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.filename == filename
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error": "Novel not found"
            }), 404

        deleted_title = novel.title
        deleted_id = novel.id

        db.delete(
            novel
        )

        db.commit()

        return jsonify({

            "message":
                "Novel deleted successfully",

            "status":
                "success",

            "id":
                deleted_id,

            "filename":
                filename,

            "title":
                deleted_title

        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Delete Novel Database Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not delete novel"
        }), 500

    finally:

        db.close()


# ============================================================
# HELPER - SAVE COVER IMAGE
# ============================================================

def save_cover_image(uploaded_file):

    if not uploaded_file:
        return ""

    original_name = secure_filename(
        uploaded_file.filename or ""
    )

    if not original_name:

        raise ValueError(
            "Invalid image filename."
        )

    extension = Path(
        original_name
    ).suffix.lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:

        raise ValueError(
            "Invalid image format. "
            "Allowed formats: JPG, JPEG, PNG, GIF, WEBP."
        )

    unique_name = (
        f"{uuid.uuid4().hex}{extension}"
    )

    save_path = (
        COVERS_DIR / unique_name
    )

    uploaded_file.save(
        save_path
    )

    return (
        f"http://127.0.0.1:5000/"
        f"uploads/covers/{unique_name}"
    )


# ============================================================
# MANUAL NOVEL - ADD
# ============================================================

@app.route(
    "/manual-novel",
    methods=["POST"]
)
@admin_required
def add_manual_novel():

    title = str(
        request.form.get(
            "title",
            ""
        )
    ).strip()

    author = str(
        request.form.get(
            "author",
            ""
        )
    ).strip()

    genre = str(
        request.form.get(
            "genre",
            ""
        )
    ).strip()

    status = str(
        request.form.get(
            "status",
            "Ongoing"
        )
    ).strip()

    synopsis = str(
        request.form.get(
            "synopsis",
            ""
        )
    ).strip()

    chapters_raw = request.form.get(
        "chapters",
        "[]"
    )

    try:

        chapters = json.loads(
            chapters_raw
        )

    except json.JSONDecodeError:

        return jsonify({
            "error": "Invalid chapters data"
        }), 400

    cover_file = request.files.get(
        "cover_image"
    )

    if not title:

        return jsonify({
            "error": "Novel title is required"
        }), 400

    if not isinstance(
        chapters,
        list
    ):

        return jsonify({
            "error": "Chapters must be a list"
        }), 400

    if len(chapters) == 0:

        return jsonify({
            "error": "At least one chapter is required"
        }), 400

    # --------------------------------------------------------
    # VALIDATE CHAPTERS
    # --------------------------------------------------------

    final_chapters = []

    chapter_numbers = set()

    for index, chapter in enumerate(
        chapters,
        start=1
    ):

        if not isinstance(
            chapter,
            dict
        ):

            return jsonify({
                "error":
                    f"Invalid chapter {index}"
            }), 400

        try:

            chapter_number = int(
                chapter.get(
                    "chapter_number",
                    index
                )
            )

        except (
            TypeError,
            ValueError
        ):

            return jsonify({
                "error": (
                    f"Invalid chapter number "
                    f"at chapter {index}"
                )
            }), 400

        if chapter_number <= 0:

            return jsonify({
                "error": (
                    f"Chapter number must be greater "
                    f"than 0 at chapter {index}"
                )
            }), 400

        if chapter_number in chapter_numbers:

            return jsonify({
                "error": (
                    f"Duplicate chapter number: "
                    f"{chapter_number}"
                )
            }), 400

        chapter_numbers.add(
            chapter_number
        )

        chapter_title = str(
            chapter.get(
                "title",
                f"Chapter {chapter_number}"
            )
        ).strip()

        content = str(
            chapter.get(
                "content",
                ""
            )
        ).strip()

        if not content:

            return jsonify({
                "error": (
                    f"Chapter {chapter_number} "
                    "content is required"
                )
            }), 400

        final_chapters.append({

            "chapter_number":
                chapter_number,

            "title":
                chapter_title,

            "date":
                "",

            "views":
                0,

            "is_locked":
                False,

            "url":
                "",

            "content":
                content,

            "scrape_status":
                "success"

        })

    # --------------------------------------------------------
    # SORT CHAPTERS
    # --------------------------------------------------------

    final_chapters.sort(
        key=lambda chapter:
        chapter["chapter_number"]
    )

    # --------------------------------------------------------
    # SAVE COVER IMAGE
    # --------------------------------------------------------

    try:

        cover_image = save_cover_image(
            cover_file
        )

    except ValueError as error:

        return jsonify({
            "error": str(error)
        }), 400

    except OSError as error:

        print(
            "Cover Image Save Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not save cover image"
        }), 500

    # --------------------------------------------------------
    # CREATE SAFE FILENAME
    # --------------------------------------------------------

    safe_title = title.lower()

    safe_title = "".join(
        character
        if character.isalnum()
        else "-"
        for character in safe_title
    )

    safe_title = "-".join(
        part
        for part in safe_title.split("-")
        if part
    )

    safe_title = safe_title[:150]

    filename = (
        f"novel_{safe_title}.json"
    )

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    db = SessionLocal()

    try:

        existing_novel = (
            db.query(Novel)
            .filter(
                Novel.filename == filename
            )
            .first()
        )

        if existing_novel:

            return jsonify({
                "error":
                    "A novel with this title already exists"
            }), 409

        novel = Novel(

            filename=filename,

            title=title,

            author=author,

            genre=genre,

            status=status,

            synopsis=synopsis,

            cover_image=cover_image,

            source_website="Manual Entry",

            source_url="",

            total_chapters=len(
                final_chapters
            ),

            last_updated=datetime.utcnow()

        )

        db.add(
            novel
        )

        db.flush()

        # ----------------------------------------------------
        # CREATE MANUAL CHAPTERS
        # ----------------------------------------------------

        for chapter_data in final_chapters:

            chapter = Chapter(

                novel_id=novel.id,

                chapter_number=
                    chapter_data[
                        "chapter_number"
                    ],

                title=
                    chapter_data[
                        "title"
                    ],

                date=
                    chapter_data[
                        "date"
                    ],

                views=
                    chapter_data[
                        "views"
                    ],

                is_locked=
                    chapter_data[
                        "is_locked"
                    ],

                # IMPORTANT:
                # Manual chapters must be protected
                # from automatic source synchronization.
                is_manual=True,

                url=
                    chapter_data[
                        "url"
                    ],

                content=
                    chapter_data[
                        "content"
                    ],

                scrape_status=
                    chapter_data[
                        "scrape_status"
                    ]

            )

            db.add(
                chapter
            )

        db.commit()

        return jsonify({

            "message":
                "Novel added successfully",

            "status":
                "success",

            "filename":
                filename,

            "novel": {

                "title":
                    title,

                "author":
                    author,

                "genre":
                    genre,

                "status":
                    status,

                "total_chapters":
                    len(final_chapters),

                "cover_image":
                    cover_image

            }

        }), 201

    except Exception as error:

        db.rollback()

        print(
            "Manual Novel Database Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not save novel to database"
        }), 500

    finally:

        db.close()

# ============================================================
# EDIT MANUAL NOVEL
# ============================================================

@app.route(
    "/manual-novel/<path:filename>",
    methods=["PUT"]
)
@admin_required
def edit_manual_novel(filename):

    requested_file = Path(filename)

    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):

        return jsonify({
            "error": "Invalid novel file"
        }), 400

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error": "Invalid request data"
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.filename == filename
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error": "Novel not found"
            }), 404

        title = str(
            data.get(
                "title",
                novel.title
            )
        ).strip()

        if not title:

            return jsonify({
                "error": "Novel title is required"
            }), 400

        novel.title = title

        novel.author = str(
            data.get(
                "author",
                novel.author or ""
            )
        ).strip()

        novel.genre = str(
            data.get(
                "genre",
                novel.genre or ""
            )
        ).strip()

        novel.status = str(
            data.get(
                "status",
                novel.status or ""
            )
        ).strip()

        novel.synopsis = str(
            data.get(
                "synopsis",
                novel.synopsis or ""
            )
        ).strip()

        chapters = data.get(
            "chapters"
        )

        if chapters is not None:

            if not isinstance(
                chapters,
                list
            ):

                return jsonify({
                    "error":
                        "Chapters must be a list"
                }), 400

            chapter_is_manual = (
                novel.source_website
                == "Manual Entry"
            )

            # --------------------------------------------
            # Replace chapters only for this legacy
            # manual-novel edit endpoint.
            # --------------------------------------------

            db.query(
                Chapter
            ).filter(
                Chapter.novel_id == novel.id
            ).delete(
                synchronize_session=False
            )

            used_numbers = set()

            for index, chapter_data in enumerate(
                chapters,
                start=1
            ):

                if not isinstance(
                    chapter_data,
                    dict
                ):

                    continue

                try:

                    chapter_number = int(
                        chapter_data.get(
                            "chapter_number",
                            index
                        )
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    continue

                if chapter_number <= 0:
                    continue

                if chapter_number in used_numbers:
                    continue

                used_numbers.add(
                    chapter_number
                )

                chapter = Chapter(

                    novel_id=novel.id,

                    chapter_number=
                        chapter_number,

                    title=str(
                        chapter_data.get(
                            "title",
                            f"Chapter {chapter_number}"
                        )
                    ).strip(),

                    date=str(
                        chapter_data.get(
                            "date",
                            ""
                        )
                    ).strip(),

                    views=int(
                        chapter_data.get(
                            "views",
                            0
                        ) or 0
                    ),

                    is_locked=bool(
                        chapter_data.get(
                            "is_locked",
                            False
                        )
                    ),

                    is_manual=chapter_is_manual,

                    url=str(
                        chapter_data.get(
                            "url",
                            ""
                        )
                    ).strip(),

                    content=str(
                        chapter_data.get(
                            "content",
                            ""
                        )
                    ).strip(),

                    scrape_status=str(
                        chapter_data.get(
                            "scrape_status",
                            "success"
                        )
                    ).strip()
                )

                db.add(
                    chapter
                )

            novel.total_chapters = (
                len(used_numbers)
            )

        novel.last_updated = (
            datetime.utcnow()
        )

        db.commit()

        return jsonify({

            "message":
                "Novel updated successfully",

            "status":
                "success",

            "filename":
                filename

        })

    except Exception as error:

        db.rollback()

        print(
            "Edit Manual Novel Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update novel"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN SIGNUP
# ============================================================

@app.route(
    "/admin/signup",
    methods=["POST"]
)
def admin_signup():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error": "Invalid request data"
        }), 400

    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()

    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()

    password = str(
        data.get(
            "password",
            ""
        )
    )

    if not name:

        return jsonify({
            "error": "Name is required"
        }), 400

    if not email:

        return jsonify({
            "error": "Email is required"
        }), 400

    if len(password) < 6:

        return jsonify({
            "error":
                "Password must contain at least 6 characters"
        }), 400

    db = SessionLocal()

    try:

        existing_user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

        if existing_user:

            return jsonify({
                "error":
                    "An account with this email already exists"
            }), 409

        user = User(

            name=name,

            email=email,

            password_hash=
                generate_password_hash(
                    password
                ),

            role="admin"

        )

        db.add(
            user
        )

        db.commit()

        db.refresh(
            user
        )

        return jsonify({

            "message":
                "Admin account created successfully",

            "status":
                "success",

            "user": {

                "id":
                    user.id,

                "name":
                    user.name,

                "email":
                    user.email,

                "role":
                    user.role

            }

        }), 201

    except Exception as error:

        db.rollback()

        print(
            "Admin Signup Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not create admin account"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN LOGIN
# ============================================================

@app.route(
    "/admin/login",
    methods=["POST"]
)
def admin_login():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error": "Invalid request data"
        }), 400

    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()

    password = str(
        data.get(
            "password",
            ""
        )
    )

    if not email or not password:

        return jsonify({
            "error":
                "Email and password are required"
        }), 400

    db = SessionLocal()

    try:

        user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

        if not user:

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        if user.role != "admin":

            return jsonify({
                "error":
                    "This account does not have admin access"
            }), 403

        if not check_password_hash(
            user.password_hash,
            password
        ):

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        token = jwt.encode(

            {
                "user_id":
                    user.id,

                "role":
                    user.role,

                "exp":
                    datetime.now(
                        timezone.utc
                    ) + timedelta(
                        hours=24
                    )
            },

            JWT_SECRET_KEY,

            algorithm="HS256"

        )

        return jsonify({

            "message":
                "Login successful",

            "status":
                "success",

            "token":
                token,

            "user": {

                "id":
                    user.id,

                "name":
                    user.name,

                "email":
                    user.email,

                "role":
                    user.role

            }

        })

    except Exception as error:

        print(
            "Admin Login Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not process login"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@app.route("/admin/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():

    db = SessionLocal()

    try:

        # =====================================================
        # BASIC COUNTS
        # =====================================================

        total_novels = db.query(Novel).count()

        total_chapters = db.query(Chapter).count()

        total_users = (
            db.query(User)
            .filter(User.role == "user")
            .count()
        )

        total_admins = (
            db.query(User)
            .filter(User.role == "admin")
            .count()
        )

        # =====================================================
        # NOVEL TYPE COUNTS
        # =====================================================

        manual_novels = (
            db.query(Novel)
            .filter(Novel.source_website == "Manual Entry")
            .count()
        )

        # Count everything that is NOT manual
        # NULL values are also handled safely
        scraped_novels = (
            db.query(Novel)
            .filter(
                Novel.source_website.isnot(None),
                Novel.source_website != "Manual Entry"
            )
            .count()
        )

        # =====================================================
        # NOVEL STATUS COUNTS
        # =====================================================

        ongoing_novels = (
            db.query(Novel)
            .filter(
                Novel.status.isnot(None),
                Novel.status.ilike("%ongoing%")
            )
            .count()
        )

        completed_novels = (
            db.query(Novel)
            .filter(
                Novel.status.isnot(None),
                Novel.status.ilike("%completed%")
            )
            .count()
        )

        # =====================================================
        # AUTO-SYNC COUNTS
        # =====================================================

        successful_syncs = (
            db.query(Novel)
            .filter(Novel.sync_status == "success")
            .count()
        )

        failed_syncs = (
            db.query(Novel)
            .filter(Novel.sync_status == "failed")
            .count()
        )

        # =====================================================
        # RECENT NOVELS
        # =====================================================

        recent_novels = (
            db.query(Novel)
            .order_by(Novel.created_at.desc())
            .limit(5)
            .all()
        )

        recent_novels_data = []

        for novel in recent_novels:

            recent_novels_data.append({
                "id": novel.id,
                "title": novel.title,
                "author": novel.author,
                "cover_image": novel.cover_image,
                "total_chapters": novel.total_chapters or 0,
                "status": novel.status or "Unknown"
            })

        # =====================================================
        # RESPONSE
        # =====================================================

        return jsonify({

            "status": "success",

            # =================================================
            # TOP-LEVEL VALUES
            # =================================================

            "total_novels": total_novels,
            "total_chapters": total_chapters,
            "ongoing_novels": ongoing_novels,
            "completed_novels": completed_novels,

            # =================================================
            # COMPLETE STATISTICS
            # =================================================

            "stats": {

                "total_novels": total_novels,
                "total_chapters": total_chapters,

                "ongoing_novels": ongoing_novels,
                "completed_novels": completed_novels,

                "total_users": total_users,
                "total_admins": total_admins,

                "manual_novels": manual_novels,
                "scraped_novels": scraped_novels,

                "successful_syncs": successful_syncs,
                "failed_syncs": failed_syncs
            },

            # =================================================
            # RECENT NOVELS
            # =================================================

            "recent_novels": recent_novels_data
        })

    except Exception as error:

        print(
            "Admin Dashboard Error:",
            repr(error)
        )

        return jsonify({
            "status": "error",
            "error": "Could not load dashboard"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN USERS
# ============================================================

@app.route(
    "/admin/users",
    methods=["GET"]
)
@admin_required
def admin_users():

    db = SessionLocal()

    try:

        users = (
            db.query(User)
            .order_by(
                User.created_at.desc()
            )
            .all()
        )

        result = []

        for user in users:

            result.append({

                "id":
                    user.id,

                "name":
                    user.name,

                "email":
                    user.email,

                "role":
                    user.role,

                "created_at":
                    user.created_at.isoformat()
                    if user.created_at
                    else ""

            })

        return jsonify({

            "status":
                "success",

            "users":
                result

        })

    except Exception as error:

        print(
            "Admin Users Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not load users"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN NOVELS
# ============================================================

@app.route(
    "/admin/novels",
    methods=["GET"]
)
@admin_required
def admin_novels():

    db = SessionLocal()

    try:

        novels = (
            db.query(Novel)
            .order_by(
                Novel.last_updated.desc()
            )
            .all()
        )

        result = []

        for novel in novels:

            result.append({

                "id":
                    novel.id,

                "filename":
                    novel.filename,

                "title":
                    novel.title,

                "author":
                    novel.author or "",

                "genre":
                    novel.genre or "",

                "status":
                    novel.status or "",

                "synopsis":
                    novel.synopsis or "",

                "cover_image":
                    novel.cover_image or "",

                "source_website":
                    novel.source_website or "",

                "source_url":
                    novel.source_url or "",

                "total_chapters":
                    novel.total_chapters or 0,

                "is_manual":
                    novel.source_website
                    == "Manual Entry",

                "sync_status":
                    novel.sync_status or "pending",

                "last_synced_at":
                    novel.last_synced_at.isoformat()
                    if novel.last_synced_at
                    else "",

                "last_sync_error":
                    novel.last_sync_error or "",

                "created_at":
                    novel.created_at.isoformat()
                    if novel.created_at
                    else "",

                "last_updated":
                    novel.last_updated.isoformat()
                    if novel.last_updated
                    else ""

            })

        return jsonify({

            "status":
                "success",

            "novels":
                result

        })

    except Exception as error:

        print(
            "Admin Novels Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not load admin novels"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN NOVEL DETAILS
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>",
    methods=["GET"]
)
@admin_required
def admin_novel_details(novel_id):

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.id == novel_id
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error":
                    "Novel not found"
            }), 404

        chapters = []

        for chapter in novel.chapters:

            chapters.append({

                "id":
                    chapter.id,

                "chapter_number":
                    chapter.chapter_number,

                "title":
                    chapter.title or "",

                "date":
                    chapter.date or "",

                "views":
                    chapter.views or 0,

                "is_locked":
                    chapter.is_locked,

                "is_manual":
                    chapter.is_manual,

                "url":
                    chapter.url or "",

                "content":
                    chapter.content or "",

                "scrape_status":
                    chapter.scrape_status or "",

                "created_at":
                    chapter.created_at.isoformat()
                    if chapter.created_at
                    else ""

            })

        return jsonify({

            "status":
                "success",

            "novel": {

                "id":
                    novel.id,

                "filename":
                    novel.filename,

                "title":
                    novel.title,

                "author":
                    novel.author or "",

                "genre":
                    novel.genre or "",

                "status":
                    novel.status or "",

                "synopsis":
                    novel.synopsis or "",

                "cover_image":
                    novel.cover_image or "",

                "source_website":
                    novel.source_website or "",

                "source_url":
                    novel.source_url or "",

                "total_chapters":
                    novel.total_chapters or 0,

                "is_manual":
                    novel.source_website
                    == "Manual Entry",

                "sync_status":
                    novel.sync_status or "pending",

                "last_synced_at":
                    novel.last_synced_at.isoformat()
                    if novel.last_synced_at
                    else "",

                "last_sync_error":
                    novel.last_sync_error or "",

                "chapters":
                    chapters

            }

        })

    except Exception as error:

        print(
            "Admin Novel Details Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not load novel details"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN EDIT NOVEL
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>",
    methods=["PUT"]
)
@admin_required
def admin_edit_novel(novel_id):

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error":
                "Invalid request data"
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.id == novel_id
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error":
                    "Novel not found"
            }), 404

        if "title" in data:

            title = str(
                data.get(
                    "title",
                    ""
                )
            ).strip()

            if not title:

                return jsonify({
                    "error":
                        "Title cannot be empty"
                }), 400

            novel.title = title

        if "author" in data:

            novel.author = str(
                data.get(
                    "author",
                    ""
                )
            ).strip()

        if "genre" in data:

            novel.genre = str(
                data.get(
                    "genre",
                    ""
                )
            ).strip()

        if "status" in data:

            novel.status = str(
                data.get(
                    "status",
                    ""
                )
            ).strip()

        if "synopsis" in data:

            novel.synopsis = str(
                data.get(
                    "synopsis",
                    ""
                )
            ).strip()

        if "source_url" in data:

            novel.source_url = str(
                data.get(
                    "source_url",
                    ""
                )
            ).strip()

        if "source_website" in data:

            novel.source_website = str(
                data.get(
                    "source_website",
                    ""
                )
            ).strip()

        novel.last_updated = (
            datetime.utcnow()
        )

        db.commit()

        return jsonify({

            "message":
                "Novel updated successfully",

            "status":
                "success",

            "novel": {

                "id":
                    novel.id,

                "filename":
                    novel.filename,

                "title":
                    novel.title,

                "author":
                    novel.author or "",

                "genre":
                    novel.genre or "",

                "status":
                    novel.status or "",

                "synopsis":
                    novel.synopsis or "",

                "source_url":
                    novel.source_url or ""

            }

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Edit Novel Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update novel"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN EDIT CHAPTER
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>/chapters/<int:chapter_id>",
    methods=["PUT"]
)
@admin_required
def admin_edit_chapter(
    novel_id,
    chapter_id
):

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error":
                "Invalid request data"
        }), 400

    db = SessionLocal()

    try:

        chapter = (
            db.query(Chapter)
            .filter(
                Chapter.id == chapter_id,
                Chapter.novel_id == novel_id
            )
            .first()
        )

        if not chapter:

            return jsonify({
                "error":
                    "Chapter not found"
            }), 404

        if "chapter_number" in data:

            try:

                new_number = int(
                    data.get(
                        "chapter_number"
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                return jsonify({
                    "error":
                        "Invalid chapter number"
                }), 400

            if new_number <= 0:

                return jsonify({
                    "error":
                        "Chapter number must be greater than 0"
                }), 400

            existing = (
                db.query(Chapter)
                .filter(
                    Chapter.novel_id == novel_id,
                    Chapter.chapter_number == new_number,
                    Chapter.id != chapter.id
                )
                .first()
            )

            if existing:

                return jsonify({
                    "error":
                        "Another chapter already uses this number"
                }), 409

            chapter.chapter_number = (
                new_number
            )

        if "title" in data:

            chapter.title = str(
                data.get(
                    "title",
                    ""
                )
            ).strip()

        if "date" in data:

            chapter.date = str(
                data.get(
                    "date",
                    ""
                )
            ).strip()

        if "views" in data:

            try:

                chapter.views = max(
                    0,
                    int(
                        data.get(
                            "views",
                            0
                        )
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                return jsonify({
                    "error":
                        "Invalid views value"
                }), 400

        if "is_locked" in data:

            chapter.is_locked = bool(
                data.get(
                    "is_locked"
                )
            )

        if "url" in data:

            chapter.url = str(
                data.get(
                    "url",
                    ""
                )
            ).strip()

        if "content" in data:

            chapter.content = str(
                data.get(
                    "content",
                    ""
                )
            ).strip()

        if "scrape_status" in data:

            chapter.scrape_status = str(
                data.get(
                    "scrape_status",
                    ""
                )
            ).strip()

        db.flush()

        novel = (
            db.query(Novel)
            .filter(
                Novel.id == novel_id
            )
            .first()
        )

        if novel:

            novel.total_chapters = (
                db.query(Chapter)
                .filter(
                    Chapter.novel_id == novel_id
                )
                .count()
            )

            novel.last_updated = (
                datetime.utcnow()
            )

        db.commit()

        return jsonify({

            "message":
                "Chapter updated successfully",

            "status":
                "success",

            "chapter": {

                "id":
                    chapter.id,

                "chapter_number":
                    chapter.chapter_number,

                "title":
                    chapter.title or "",

                "date":
                    chapter.date or "",

                "views":
                    chapter.views or 0,

                "is_locked":
                    chapter.is_locked,

                "is_manual":
                    chapter.is_manual,

                "url":
                    chapter.url or "",

                "content":
                    chapter.content or "",

                "scrape_status":
                    chapter.scrape_status or ""

            }

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Edit Chapter Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update chapter"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN DELETE CHAPTER
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>/chapters/<int:chapter_id>",
    methods=["DELETE"]
)
@admin_required
def admin_delete_chapter(
    novel_id,
    chapter_id
):

    db = SessionLocal()

    try:

        chapter = (
            db.query(Chapter)
            .filter(
                Chapter.id == chapter_id,
                Chapter.novel_id == novel_id
            )
            .first()
        )

        if not chapter:

            return jsonify({
                "error":
                    "Chapter not found"
            }), 404

        db.delete(
            chapter
        )

        db.flush()

        # IMPORTANT:
        # Do not renumber remaining chapters.
        # Renumbering can cause PostgreSQL unique
        # constraint conflicts and would change
        # the real chapter numbers.

        novel = (
            db.query(Novel)
            .filter(
                Novel.id == novel_id
            )
            .first()
        )

        remaining_count = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel_id
            )
            .count()
        )

        if novel:

            novel.total_chapters = (
                remaining_count
            )

            novel.last_updated = (
                datetime.utcnow()
            )

        db.commit()

        return jsonify({

            "message":
                "Chapter deleted successfully",

            "status":
                "success",

            "remaining_chapters":
                remaining_count

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Delete Chapter Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not delete chapter"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN COVER UPLOAD
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>/cover",
    methods=["POST"]
)
@admin_required
def admin_upload_cover(novel_id):

    cover_file = request.files.get(
        "cover_image"
    )

    if not cover_file:

        return jsonify({
            "error":
                "Please select a cover image"
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(
                Novel.id == novel_id
            )
            .first()
        )

        if not novel:

            return jsonify({
                "error":
                    "Novel not found"
            }), 404

        try:

            new_cover = save_cover_image(
                cover_file
            )

        except ValueError as error:

            return jsonify({
                "error":
                    str(error)
            }), 400

        except OSError as error:

            print(
                "Cover Save Error:",
                repr(error)
            )

            return jsonify({
                "error":
                    "Could not save cover image"
            }), 500

        novel.cover_image = (
            new_cover
        )

        novel.last_updated = (
            datetime.utcnow()
        )

        db.commit()

        return jsonify({

            "message":
                "Cover image updated successfully",

            "status":
                "success",

            "cover_image":
                new_cover

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Cover Upload Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update cover image"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN PROFILE
# ============================================================

@app.route(
    "/admin/profile",
    methods=["PUT"]
)
@admin_required
def admin_profile():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error":
                "Invalid request data"
        }), 400

    authorization = request.headers.get(
        "Authorization"
    )

    token = authorization.split(
        " ",
        1
    )[1]

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=["HS256"]
        )

        user_id = payload.get(
            "user_id"
        )

    except jwt.InvalidTokenError:

        return jsonify({
            "error":
                "Invalid authentication token"
        }), 401

    db = SessionLocal()

    try:

        admin = (
            db.query(User)
            .filter(
                User.id == user_id,
                User.role == "admin"
            )
            .first()
        )

        if not admin:

            return jsonify({
                "error":
                    "Admin not found"
            }), 404

        if "name" in data:

            name = str(
                data.get(
                    "name",
                    ""
                )
            ).strip()

            if not name:

                return jsonify({
                    "error":
                        "Name cannot be empty"
                }), 400

            admin.name = name

        if "email" in data:

            email = str(
                data.get(
                    "email",
                    ""
                )
            ).strip().lower()

            if not email:

                return jsonify({
                    "error":
                        "Email cannot be empty"
                }), 400

            existing = (
                db.query(User)
                .filter(
                    User.email == email,
                    User.id != admin.id
                )
                .first()
            )

            if existing:

                return jsonify({
                    "error":
                        "Email is already in use"
                }), 409

            admin.email = email

        db.commit()

        return jsonify({

            "message":
                "Profile updated successfully",

            "status":
                "success",

            "user": {

                "id":
                    admin.id,

                "name":
                    admin.name,

                "email":
                    admin.email,

                "role":
                    admin.role

            }

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Profile Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update profile"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN RESET PASSWORD
# ============================================================

@app.route(
    "/admin/reset-password",
    methods=["POST"]
)
@admin_required
def admin_reset_password():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error":
                "Invalid request data"
        }), 400

    current_password = str(
        data.get(
            "current_password",
            ""
        )
    )

    new_password = str(
        data.get(
            "new_password",
            ""
        )
    )

    if not current_password:

        return jsonify({
            "error":
                "Current password is required"
        }), 400

    if len(new_password) < 6:

        return jsonify({
            "error":
                "New password must contain at least 6 characters"
        }), 400

    authorization = request.headers.get(
        "Authorization"
    )

    token = authorization.split(
        " ",
        1
    )[1]

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=["HS256"]
        )

        user_id = payload.get(
            "user_id"
        )

    except jwt.InvalidTokenError:

        return jsonify({
            "error":
                "Invalid authentication token"
        }), 401

    db = SessionLocal()

    try:

        admin = (
            db.query(User)
            .filter(
                User.id == user_id,
                User.role == "admin"
            )
            .first()
        )

        if not admin:

            return jsonify({
                "error":
                    "Admin not found"
            }), 404

        if not check_password_hash(
            admin.password_hash,
            current_password
        ):

            return jsonify({
                "error":
                    "Current password is incorrect"
            }), 401

        admin.password_hash = (
            generate_password_hash(
                new_password
            )
        )

        db.commit()

        return jsonify({

            "message":
                "Password updated successfully",

            "status":
                "success"

        })

    except Exception as error:

        db.rollback()

        print(
            "Admin Password Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update password"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN SETTINGS - GET
# ============================================================

@app.route(
    "/admin/settings",
    methods=["GET"]
)
@admin_required
def get_admin_settings():

    db = SessionLocal()

    try:

        settings = (
            db.query(Setting)
            .first()
        )

        if not settings:

            settings = Setting(

                site_name=
                    "Novel Archive",

                site_description=
                    "A modern novel archive.",

                auto_sync_enabled=True,

                sync_interval=30

            )

            db.add(
                settings
            )

            db.commit()

            db.refresh(
                settings
            )

        return jsonify({

            "status":
                "success",

            "settings": {

                "site_name":
                    settings.site_name,

                "site_description":
                    settings.site_description,

                "auto_sync_enabled":
                    settings.auto_sync_enabled,

                "sync_interval":
                    settings.sync_interval,

                "updated_at":
                    settings.updated_at.isoformat()
                    if settings.updated_at
                    else ""

            }

        })

    except Exception as error:

        print(
            "Get Admin Settings Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not load settings"
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN SETTINGS - UPDATE
# ============================================================

@app.route(
    "/admin/settings",
    methods=["PUT"]
)
@admin_required
def update_admin_settings():

    data = request.get_json(
        silent=True
    )

    if not isinstance(
        data,
        dict
    ):

        return jsonify({
            "error":
                "Invalid request data"
        }), 400

    db = SessionLocal()

    try:

        settings = (
            db.query(Setting)
            .first()
        )

        if not settings:

            settings = Setting(

                site_name=
                    "Novel Archive",

                site_description=
                    "A modern novel archive.",

                auto_sync_enabled=True,

                sync_interval=30

            )

            db.add(
                settings
            )

        # ----------------------------------------------------
        # SITE NAME
        # ----------------------------------------------------

        if "site_name" in data:

            site_name = str(
                data.get(
                    "site_name",
                    ""
                )
            ).strip()

            if not site_name:

                return jsonify({
                    "error":
                        "Site name cannot be empty"
                }), 400

            settings.site_name = (
                site_name[:100]
            )

        # ----------------------------------------------------
        # SITE DESCRIPTION
        # ----------------------------------------------------

        if "site_description" in data:

            site_description = str(
                data.get(
                    "site_description",
                    ""
                )
            ).strip()

            settings.site_description = (
                site_description[:500]
            )

        # ----------------------------------------------------
        # AUTO SYNC
        # ----------------------------------------------------

        if "auto_sync_enabled" in data:

            raw_value = data.get(
                "auto_sync_enabled"
            )

            if isinstance(
                raw_value,
                bool
            ):

                settings.auto_sync_enabled = (
                    raw_value
                )

            elif isinstance(
                raw_value,
                str
            ):

                settings.auto_sync_enabled = (
                    raw_value.strip().lower()
                    in {
                        "true",
                        "1",
                        "yes",
                        "on"
                    }
                )

            else:

                settings.auto_sync_enabled = (
                    bool(raw_value)
                )

        # ----------------------------------------------------
        # SYNC INTERVAL
        # ----------------------------------------------------

        if "sync_interval" in data:

            try:

                sync_interval = int(
                    data.get(
                        "sync_interval"
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                return jsonify({
                    "error":
                        "Invalid sync interval"
                }), 400

            allowed_intervals = {

                15,
                30,
                60,
                120,
                360,
                720,
                1440

            }

            if sync_interval not in allowed_intervals:

                return jsonify({
                    "error":
                        "Invalid sync interval selected"
                }), 400

            settings.sync_interval = (
                sync_interval
            )

        settings.updated_at = (
            datetime.utcnow()
        )

        db.commit()

        db.refresh(
            settings
        )

        # IMPORTANT:
        # Apply new auto-sync settings immediately.
        update_auto_sync_scheduler()

        return jsonify({

            "message":
                "Settings updated successfully",

            "status":
                "success",

            "settings": {

                "site_name":
                    settings.site_name,

                "site_description":
                    settings.site_description,

                "auto_sync_enabled":
                    settings.auto_sync_enabled,

                "sync_interval":
                    settings.sync_interval,

                "updated_at":
                    settings.updated_at.isoformat()
                    if settings.updated_at
                    else ""

            }

        })

    except Exception as error:

        db.rollback()

        print(
            "Update Admin Settings Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not update settings"
        }), 500

    finally:

        db.close()


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    try:

        start_auto_sync_scheduler()

    except Exception as error:

        print(
            "Auto-sync scheduler could not start:",
            repr(error)
        )

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )