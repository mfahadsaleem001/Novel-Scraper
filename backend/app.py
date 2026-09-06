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

from backend.database import SessionLocal
from backend.models import User, Novel, Chapter


# ============================================================
# APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "development-secret-change-me"
)

ADMIN_RESET_KEY = os.getenv(
    "ADMIN_RESET_KEY",
    ""
)

NOVELS_DIR = BASE_DIR / "novels"

UPLOADS_DIR = BASE_DIR / "uploads"

COVERS_DIR = UPLOADS_DIR / "covers"


NOVELS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

COVERS_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# ALLOWED IMAGE EXTENSIONS
# ============================================================

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp"
}


# ============================================================
# LOAD SCRAPER
# ============================================================

scraper_path = BASE_DIR / "scraper.py"

spec = importlib.util.spec_from_file_location(
    "scraper_module",
    scraper_path
)

scraper = importlib.util.module_from_spec(spec)

spec.loader.exec_module(scraper)



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

        if not authorization.startswith("Bearer "):

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
                .filter(User.id == user_id)
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

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message": "Novel Scraper Backend is running",
        "status": "success"
    })


# ============================================================
# SERVE UPLOADED COVER IMAGES
# ============================================================

@app.route("/uploads/<path:filename>",methods=["GET"])
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

            raw_data = json.load(json_file)


        if isinstance(raw_data, dict):

            if isinstance(
                raw_data.get("data"),
                dict
            ):

                novel_data = raw_data["data"]

            else:

                novel_data = raw_data

        else:

            return None


        # Add filename for frontend
        novel_data["filename"] = file_path.name

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
@app.route("/novels",methods=["GET"])
def get_novels():

    db = SessionLocal()

    try:
        novels = (
            db.query(Novel)
            .order_by(Novel.id.asc())
            .all()
        )

        result = []

        for novel in novels:

            result.append({
                "filename": novel.filename,
                "title": novel.title or "Untitled Novel",
                "author": novel.author or "Unknown",
                "genre": novel.genre or "Unknown",
                "status": novel.status or "Unknown",
                "total_chapters": novel.total_chapters or 0,
                "cover_image": novel.cover_image or "",
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
@app.route("/novel/<path:filename>", methods=["GET"])
@admin_required
def get_novel(filename):

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------
    requested_file = Path(filename)

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
        # ----------------------------------------------------
        # FIND NOVEL
        # ----------------------------------------------------
        novel = (
            db.query(Novel)
            .filter(Novel.filename == filename)
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
                novel.total_chapters or len(chapters),

            "chapters":
                chapters,

            "last_updated":
                novel.last_updated.isoformat()
                if novel.last_updated
                else ""
        }

        return jsonify(novel_data)

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
@app.route("/scrape",methods=["POST"])
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

                db.add(novel)

                # Get novel ID
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

                novel.total_chapters = len(
                    chapters
                )

                novel.last_updated = (
                    datetime.utcnow()
                )

            # ------------------------------------------------
            # REMOVE OLD CHAPTERS
            # ------------------------------------------------
            db.query(
                Chapter
            ).filter(
                Chapter.novel_id == novel.id
            ).delete(
                synchronize_session=False
            )

            # ------------------------------------------------
            # ADD SCRAPED CHAPTERS
            # ------------------------------------------------
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

                db.add(chapter)

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
                        len(chapters),

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
def delete_novel(filename):

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------
    requested_file = Path(filename)

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

        # ----------------------------------------------------
        # FIND NOVEL
        # ----------------------------------------------------
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
        # SAVE INFORMATION FOR RESPONSE
        # ----------------------------------------------------
        deleted_title = novel.title
        deleted_id = novel.id

        # ----------------------------------------------------
        # DELETE NOVEL
        # ----------------------------------------------------
        # Chapter relationship has cascade delete,
        # so related chapters are deleted automatically.
        db.delete(novel)

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------
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


    save_path = COVERS_DIR / unique_name


    uploaded_file.save(
        save_path
    )


    # Browser-accessible URL
    return (
        f"http://127.0.0.1:5000/"
        f"uploads/covers/{unique_name}"
    )


# ============================================================
# MANUAL NOVEL - ADD
# ============================================================
@app.route("/manual-novel", methods=["POST"])
@admin_required
def add_manual_novel():

    # --------------------------------------------------------
    # GET FORM DATA
    # --------------------------------------------------------
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

    # --------------------------------------------------------
    # GET CHAPTERS
    # --------------------------------------------------------
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

    # --------------------------------------------------------
    # GET COVER IMAGE
    # --------------------------------------------------------
    cover_file = request.files.get(
        "cover_image"
    )

    # --------------------------------------------------------
    # VALIDATE REQUEST
    # --------------------------------------------------------
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

        # ----------------------------------------------------
        # CHECK DUPLICATE FILENAME
        # ----------------------------------------------------
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

        # ----------------------------------------------------
        # CREATE NOVEL
        # ----------------------------------------------------
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

        db.add(novel)

        # Generate novel.id
        db.flush()

        # ----------------------------------------------------
        # CREATE CHAPTERS
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

            db.add(chapter)

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------
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
# EDIT NOVEL
# ============================================================
@app.route("/manual-novel/<path:filename>",methods=["PUT"])
@admin_required
def edit_manual_novel(filename):

    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------
    requested_file = Path(filename)

    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):
        return jsonify({
            "error": "Invalid novel file"
        }), 400

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

    # --------------------------------------------------------
    # NOVEL INFORMATION
    # --------------------------------------------------------
    title = str(
        data.get(
            "title",
            ""
        )
    ).strip()

    author = str(
        data.get(
            "author",
            ""
        )
    ).strip()

    genre = str(
        data.get(
            "genre",
            ""
        )
    ).strip()

    status = str(
        data.get(
            "status",
            "Ongoing"
        )
    ).strip()

    synopsis = str(
        data.get(
            "synopsis",
            ""
        )
    ).strip()

    cover_image = str(
        data.get(
            "cover_image",
            ""
        )
    ).strip()

    chapters = data.get(
        "chapters",
        []
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------
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

        # ----------------------------------------------------
        # DUPLICATE CHAPTER CHECK
        # ----------------------------------------------------
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
                str(
                    chapter.get(
                        "date",
                        ""
                    )
                ).strip(),

            "views":
                int(
                    chapter.get(
                        "views",
                        0
                    ) or 0
                ),

            "is_locked":
                bool(
                    chapter.get(
                        "is_locked",
                        False
                    )
                ),

            "url":
                str(
                    chapter.get(
                        "url",
                        ""
                    )
                ).strip(),

            "content":
                content,

            "scrape_status":
                str(
                    chapter.get(
                        "scrape_status",
                        "success"
                    )
                ).strip()
        })

    # --------------------------------------------------------
    # SORT CHAPTERS
    # --------------------------------------------------------
    final_chapters.sort(
        key=lambda chapter:
        chapter["chapter_number"]
    )

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------
    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # FIND NOVEL
        # ----------------------------------------------------
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
        # UPDATE NOVEL INFORMATION
        # ----------------------------------------------------
        novel.title = title
        novel.author = author
        novel.genre = genre
        novel.status = status
        novel.synopsis = synopsis
        novel.cover_image = cover_image
        novel.total_chapters = len(
            final_chapters
        )
        novel.last_updated = datetime.utcnow()

        # ----------------------------------------------------
        # DELETE OLD CHAPTERS
        # ----------------------------------------------------
        db.query(Chapter).filter(
            Chapter.novel_id == novel.id
        ).delete(
            synchronize_session=False
        )

        # ----------------------------------------------------
        # ADD UPDATED CHAPTERS
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

            db.add(chapter)

        # ----------------------------------------------------
        # COMMIT CHANGES
        # ----------------------------------------------------
        db.commit()

        return jsonify({
            "message":
                "Novel updated successfully",

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
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Edit Novel Database Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not save changes"
        }), 500

    finally:

        db.close()

# ============================================================
# ADMIN SIGNUP
# ============================================================

@app.route("/admin/signup", methods=["POST"])
def admin_signup():
    
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request data is required."
        }), 400

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    # ========================================================
    # VALIDATION
    # ========================================================

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email and password are required."
        }), 400

    # ========================================================
    # DATABASE
    # ========================================================

    db = SessionLocal()

    try:

        # ----------------------------------------------------
        # CHECK IF AN ADMIN ALREADY EXISTS
        # ----------------------------------------------------

        existing_admin = (
            db.query(User)
            .filter(
                User.role == "admin"
            )
            .first()
        )

        # ----------------------------------------------------
        # ADMIN ALREADY EXISTS
        # ----------------------------------------------------

        if existing_admin:
            return jsonify({
                "error":
                    "Admin signup is disabled because an admin account already exists."
            }), 403

        # ----------------------------------------------------
        # CHECK EMAIL
        # ----------------------------------------------------

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
                    "An account with this email already exists."
            }), 409

        # ----------------------------------------------------
        # CREATE FIRST ADMIN
        # ----------------------------------------------------

        admin = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(
                password
            ),
            role="admin"
        )

        db.add(admin)

        db.commit()

        db.refresh(admin)

        # ----------------------------------------------------
        # SUCCESS RESPONSE
        # ----------------------------------------------------

        return jsonify({
            "message":
                "Admin account created successfully.",

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

        }), 201

    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except Exception as error:

        db.rollback()

        print(
            "Admin Signup Error:",
            repr(error)
        )

        return jsonify({
            "error":
                "Could not create admin account."
        }), 500

    # ========================================================
    # CLOSE DATABASE
    # ========================================================

    finally:

        db.close()

# ============================================================
# ADMIN LOGIN
# ============================================================

@app.route("/admin/login", methods=["POST"])
def admin_login():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request data is required."
        }), 400

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    # ========================================================
    # VALIDATION
    # ========================================================

    if not email or not password:
        return jsonify({
            "error": "Email and password are required."
        }), 400

    # ========================================================
    # DATABASE
    # ========================================================

    db = SessionLocal()

    try:

        admin = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

        # ====================================================
        # USER NOT FOUND
        # ====================================================

        if not admin:
            return jsonify({
                "error": "Invalid email or password."
            }), 401

        # ====================================================
        # ADMIN ROLE CHECK
        # ====================================================

        if admin.role != "admin":
            return jsonify({
                "error": "Access denied. Admin account required."
            }), 403

        # ====================================================
        # PASSWORD CHECK
        # ====================================================

        if not check_password_hash(
            admin.password_hash,
            password
        ):
            return jsonify({
                "error": "Invalid email or password."
            }), 401

        # ====================================================
        # CREATE JWT TOKEN
        # ====================================================

        token = jwt.encode(
            {
                "user_id": admin.id,
                "role": admin.role,
                "exp": (
                    datetime.now(timezone.utc)
                    + timedelta(hours=8)
                )
            },
            JWT_SECRET_KEY,
            algorithm="HS256"
        )

        # ====================================================
        # SUCCESS RESPONSE
        # ====================================================

        return jsonify({
            "message": "Admin login successful.",
            "token": token,
            "user": {
                "id": admin.id,
                "name": admin.name,
                "email": admin.email,
                "role": admin.role
            }
        }), 200

    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except Exception as error:

        print(
            "Admin Login Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not process admin login."
        }), 500

    # ========================================================
    # CLOSE DATABASE
    # ========================================================

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

        total_novels = db.query(Novel).count()

        total_chapters = db.query(Chapter).count()

        ongoing_novels = (
            db.query(Novel)
            .filter(Novel.status.ilike("ongoing"))
            .count()
        )

        completed_novels = (
            db.query(Novel)
            .filter(Novel.status.ilike("completed"))
            .count()
        )

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
                "filename": novel.filename,
                "title": novel.title,
                "author": novel.author,
                "genre": novel.genre,
                "status": novel.status,
                "cover_image": novel.cover_image,
                "total_chapters": novel.total_chapters,
                "created_at": (
                    novel.created_at.isoformat()
                    if novel.created_at
                    else None
                )
            })

        return jsonify({
            "total_novels": total_novels,
            "total_chapters": total_chapters,
            "ongoing_novels": ongoing_novels,
            "completed_novels": completed_novels,
            "recent_novels": recent_novels_data
        }), 200

    except Exception as error:

        return jsonify({
            "error": str(error)
        }), 500

    finally:

        db.close()

# ============================================================
# ADMIN USERS
# ============================================================

@app.route("/admin/users", methods=["GET"])
@admin_required
def admin_users():

    db = SessionLocal()

    try:

        users = (
            db.query(User)
            .order_by(User.created_at.desc())
            .all()
        )

        users_data = []

        for user in users:

            users_data.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": (
                    user.created_at.isoformat()
                    if user.created_at
                    else None
                )
            })

        return jsonify({
            "users": users_data
        }), 200

    except Exception as error:

        print(
            "Admin Users Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not load users."
        }), 500

    finally:

        db.close()


# ============================================================
# ADMIN NOVELS
# ============================================================

@app.route("/admin/novels", methods=["GET"])
@admin_required
def admin_novels():

    db = SessionLocal()

    try:

        novels = (
            db.query(Novel)
            .order_by(Novel.created_at.desc())
            .all()
        )

        novels_data = []

        for novel in novels:

            novels_data.append({
                "id": novel.id,
                "filename": novel.filename,
                "title": novel.title or "Untitled Novel",
                "author": novel.author or "Unknown",
                "genre": novel.genre or "Unknown",
                "status": novel.status or "Unknown",
                "synopsis": novel.synopsis or "",
                "cover_image": novel.cover_image or "",
                "source_website": novel.source_website or "",
                "source_url": novel.source_url or "",
                "total_chapters": novel.total_chapters or 0,
                "created_at": (
                    novel.created_at.isoformat()
                    if novel.created_at
                    else None
                ),
                "last_updated": (
                    novel.last_updated.isoformat()
                    if novel.last_updated
                    else None
                )
            })

        return jsonify({
            "novels": novels_data
        }), 200

    except Exception as error:

        print(
            "Admin Novels Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not load novels."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN NOVEL DETAILS
# ============================================================

@app.route("/admin/novels/<int:novel_id>", methods=["GET"])
@admin_required
def admin_novel_details(novel_id):

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        chapters = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel.id
            )
            .order_by(
                Chapter.chapter_number.asc()
            )
            .all()
        )

        chapters_data = []

        for chapter in chapters:

            chapters_data.append({
                "id": chapter.id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title or "",
                "date": chapter.date or "",
                "views": chapter.views or 0,
                "is_locked": chapter.is_locked,
                "url": chapter.url or "",
                "content": chapter.content or "",
                "scrape_status": chapter.scrape_status or "",
                "created_at": (
                    chapter.created_at.isoformat()
                    if chapter.created_at
                    else None
                )
            })

        return jsonify({
            "novel": {
                "id": novel.id,
                "filename": novel.filename,
                "title": novel.title or "Untitled Novel",
                "author": novel.author or "Unknown",
                "genre": novel.genre or "Unknown",
                "status": novel.status or "Unknown",
                "synopsis": novel.synopsis or "",
                "cover_image": novel.cover_image or "",
                "source_website": novel.source_website or "",
                "source_url": novel.source_url or "",
                "total_chapters": len(chapters),
                "created_at": (
                    novel.created_at.isoformat()
                    if novel.created_at
                    else None
                ),
                "last_updated": (
                    novel.last_updated.isoformat()
                    if novel.last_updated
                    else None
                ),
                "chapters": chapters_data
            }
        }), 200

    except Exception as error:

        print(
            "Admin Novel Details Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not load novel details."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN NOVEL EDIT
# ============================================================

@app.route("/admin/novels/<int:novel_id>", methods=["PUT"])
@admin_required
def admin_edit_novel(novel_id):
    
    print("ADMIN EDIT ROUTE HIT")
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request data is required."
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        # ----------------------------------------------------
        # Update title
        # ----------------------------------------------------

        if "title" in data:
            title = str(data.get("title", "")).strip()

            if not title:
                return jsonify({
                    "error": "Novel title is required."
                }), 400

            novel.title = title

        # ----------------------------------------------------
        # Update author
        # ----------------------------------------------------

        if "author" in data:
            novel.author = (
                str(data.get("author", "")).strip()
            )

        # ----------------------------------------------------
        # Update genre
        # ----------------------------------------------------

        if "genre" in data:
            novel.genre = (
                str(data.get("genre", "")).strip()
            )

        # ----------------------------------------------------
        # Update status
        # ----------------------------------------------------

        if "status" in data:
            novel.status = (
                str(data.get("status", "")).strip()
            )

        # ----------------------------------------------------
        # Update synopsis
        # ----------------------------------------------------

        if "synopsis" in data:
            novel.synopsis = (
                str(data.get("synopsis", "")).strip()
            )

        # ----------------------------------------------------
        # Update source website
        # ----------------------------------------------------

        if "source_website" in data:
            novel.source_website = (
                str(data.get("source_website", "")).strip()
            )

        # ----------------------------------------------------
        # Update source URL
        # ----------------------------------------------------

        if "source_url" in data:
            novel.source_url = (
                str(data.get("source_url", "")).strip()
            )

        # ----------------------------------------------------
        # Update last modified time
        # ----------------------------------------------------

        novel.last_updated = datetime.now(timezone.utc)

        db.commit()
        db.refresh(novel)

        return jsonify({
            "message": "Novel updated successfully.",
            "novel": {
                "id": novel.id,
                "filename": novel.filename,
                "title": novel.title or "",
                "author": novel.author or "",
                "genre": novel.genre or "",
                "status": novel.status or "",
                "synopsis": novel.synopsis or "",
                "cover_image": novel.cover_image or "",
                "source_website": novel.source_website or "",
                "source_url": novel.source_url or "",
                "total_chapters": novel.total_chapters or 0,
                "last_updated": (
                    novel.last_updated.isoformat()
                    if novel.last_updated
                    else None
                )
            }
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Novel Edit Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not update novel."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN ADD CHAPTER
# ============================================================

@app.route("/admin/novels/<int:novel_id>/chapters", methods=["POST"])
@admin_required
def admin_add_chapter(novel_id):

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Valid JSON request body is required."
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        chapter_number = data.get("chapter_number")
        title = str(data.get("title", "")).strip()
        content = str(data.get("content", "")).strip()

        if chapter_number is None:
            return jsonify({
                "error": "Chapter number is required."
            }), 400

        try:
            chapter_number = int(chapter_number)
        except (TypeError, ValueError):
            return jsonify({
                "error": "Chapter number must be an integer."
            }), 400

        if chapter_number <= 0:
            return jsonify({
                "error": "Chapter number must be greater than 0."
            }), 400

        if not title:
            return jsonify({
                "error": "Chapter title is required."
            }), 400

        if not content:
            return jsonify({
                "error": "Chapter content is required."
            }), 400

        existing_chapter = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel.id,
                Chapter.chapter_number == chapter_number
            )
            .first()
        )

        if existing_chapter:
            return jsonify({
                "error": "A chapter with this number already exists."
            }), 409

        chapter = Chapter(
            novel_id=novel.id,
            chapter_number=chapter_number,
            title=title,
            date=str(data.get("date", "")).strip(),
            views=0,
            is_locked=bool(data.get("is_locked", False)),
            url=str(data.get("url", "")).strip(),
            content=content,
            scrape_status="manual"
        )

        db.add(chapter)

        novel.total_chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel.id)
            .count()
            + 1
        )

        novel.last_updated = datetime.now(timezone.utc)

        db.commit()
        db.refresh(chapter)

        return jsonify({
            "message": "Chapter added successfully.",
            "chapter": {
                "id": chapter.id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "date": chapter.date,
                "views": chapter.views,
                "is_locked": chapter.is_locked,
                "url": chapter.url,
                "content": chapter.content,
                "scrape_status": chapter.scrape_status,
                "created_at": (
                    chapter.created_at.isoformat()
                    if chapter.created_at
                    else None
                )
            }
        }), 201

    except Exception as error:

        db.rollback()

        print(
            "Admin Add Chapter Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not add chapter."
        }), 500

    finally:

        db.close()

# ============================================================
# ADMIN EDIT CHAPTER
# ============================================================

@app.route("/admin/novels/<int:novel_id>/chapters/<int:chapter_id>",methods=["PUT"])
@admin_required
def admin_edit_chapter(novel_id, chapter_id):

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Valid JSON request body is required."
        }), 400

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        chapter = (
            db.query(Chapter)
            .filter(
                Chapter.id == chapter_id,
                Chapter.novel_id == novel.id
            )
            .first()
        )

        if not chapter:
            return jsonify({
                "error": "Chapter not found."
            }), 404

        # ----------------------------------------------------
        # Update chapter number
        # ----------------------------------------------------

        if "chapter_number" in data:

            try:
                chapter_number = int(
                    data.get("chapter_number")
                )
            except (TypeError, ValueError):

                return jsonify({
                    "error": "Chapter number must be an integer."
                }), 400

            if chapter_number <= 0:
                return jsonify({
                    "error": "Chapter number must be greater than 0."
                }), 400

            existing_chapter = (
                db.query(Chapter)
                .filter(
                    Chapter.novel_id == novel.id,
                    Chapter.chapter_number == chapter_number,
                    Chapter.id != chapter.id
                )
                .first()
            )

            if existing_chapter:
                return jsonify({
                    "error": "A chapter with this number already exists."
                }), 409

            chapter.chapter_number = chapter_number

        # ----------------------------------------------------
        # Update title
        # ----------------------------------------------------

        if "title" in data:

            title = str(
                data.get("title", "")
            ).strip()

            if not title:
                return jsonify({
                    "error": "Chapter title is required."
                }), 400

            chapter.title = title

        # ----------------------------------------------------
        # Update content
        # ----------------------------------------------------

        if "content" in data:

            content = str(
                data.get("content", "")
            ).strip()

            if not content:
                return jsonify({
                    "error": "Chapter content is required."
                }), 400

            chapter.content = content

        # ----------------------------------------------------
        # Update date
        # ----------------------------------------------------

        if "date" in data:

            chapter.date = str(
                data.get("date", "")
            ).strip()

        # ----------------------------------------------------
        # Update URL
        # ----------------------------------------------------

        if "url" in data:

            chapter.url = str(
                data.get("url", "")
            ).strip()

        # ----------------------------------------------------
        # Update lock status
        # ----------------------------------------------------

        if "is_locked" in data:

            chapter.is_locked = bool(
                data.get("is_locked")
            )

        novel.last_updated = datetime.now(timezone.utc)

        db.commit()
        db.refresh(chapter)

        return jsonify({
            "message": "Chapter updated successfully.",
            "chapter": {
                "id": chapter.id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title or "",
                "date": chapter.date or "",
                "views": chapter.views or 0,
                "is_locked": chapter.is_locked,
                "url": chapter.url or "",
                "content": chapter.content or "",
                "scrape_status": chapter.scrape_status or "",
                "created_at": (
                    chapter.created_at.isoformat()
                    if chapter.created_at
                    else None
                )
            }
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Edit Chapter Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not update chapter."
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
def admin_delete_chapter(novel_id, chapter_id):

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        chapter = (
            db.query(Chapter)
            .filter(
                Chapter.id == chapter_id,
                Chapter.novel_id == novel.id
            )
            .first()
        )

        if not chapter:
            return jsonify({
                "error": "Chapter not found."
            }), 404

        deleted_chapter_number = chapter.chapter_number

        db.delete(chapter)

        db.flush()

        remaining_chapters = (
            db.query(Chapter)
            .filter(
                Chapter.novel_id == novel.id
            )
            .order_by(
                Chapter.chapter_number.asc()
            )
            .all()
        )

        # ----------------------------------------------------
        # Re-number remaining chapters
        # ----------------------------------------------------

        for index, remaining_chapter in enumerate(
            remaining_chapters,
            start=1
        ):
            remaining_chapter.chapter_number = index

        novel.total_chapters = len(
            remaining_chapters
        )

        novel.last_updated = datetime.now(timezone.utc)

        db.commit()

        return jsonify({
            "message": "Chapter deleted successfully.",
            "deleted_chapter_number": deleted_chapter_number,
            "remaining_chapters": len(
                remaining_chapters
            )
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Delete Chapter Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not delete chapter."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN COVER UPLOAD / REPLACE
# ============================================================

@app.route(
    "/admin/novels/<int:novel_id>/cover",
    methods=["POST"]
)
@admin_required
def admin_upload_cover(novel_id):

    db = SessionLocal()

    try:

        novel = (
            db.query(Novel)
            .filter(Novel.id == novel_id)
            .first()
        )

        if not novel:
            return jsonify({
                "error": "Novel not found."
            }), 404

        uploaded_file = request.files.get("cover")

        if not uploaded_file:
            return jsonify({
                "error": "Cover image is required."
            }), 400

        try:
            new_cover_url = save_cover_image(
                uploaded_file
            )
        except ValueError as error:
            return jsonify({
                "error": str(error)
            }), 400

        if not new_cover_url:
            return jsonify({
                "error": "Could not save cover image."
            }), 400

        # ----------------------------------------------------
        # Delete old uploaded cover if it belongs to uploads
        # ----------------------------------------------------

        old_cover_url = novel.cover_image or ""

        if "/uploads/covers/" in old_cover_url:

            old_filename = old_cover_url.split(
                "/uploads/covers/",
                1
            )[1]

            old_cover_path = (
                COVERS_DIR / Path(old_filename).name
            )

            if old_cover_path.exists():

                try:
                    old_cover_path.unlink()
                except OSError as error:
                    print(
                        "Could not delete old cover:",
                        repr(error)
                    )

        # ----------------------------------------------------
        # Save new cover URL
        # ----------------------------------------------------

        novel.cover_image = new_cover_url
        novel.last_updated = datetime.now(timezone.utc)

        db.commit()
        db.refresh(novel)

        return jsonify({
            "message": "Cover image updated successfully.",
            "cover_image": novel.cover_image
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Cover Upload Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not update cover image."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN SETTINGS
# ============================================================

@app.route("/admin/settings", methods=["PUT"])
@admin_required
def admin_settings():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Valid JSON request body is required."
        }), 400

    db = SessionLocal()

    try:

        # Get current admin from JWT
        authorization = request.headers.get("Authorization")
        token = authorization.split(" ", 1)[1]

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=["HS256"]
        )

        admin_id = payload.get("user_id")

        admin = (
            db.query(User)
            .filter(User.id == admin_id)
            .first()
        )

        if not admin:
            return jsonify({
                "error": "Admin account not found."
            }), 404

        # ----------------------------------------------------
        # Change Name
        # ----------------------------------------------------

        if "name" in data:

            name = str(
                data.get("name", "")
            ).strip()

            if not name:
                return jsonify({
                    "error": "Name cannot be empty."
                }), 400

            admin.name = name

        # ----------------------------------------------------
        # Change Email
        # ----------------------------------------------------

        if "email" in data:

            email = str(
                data.get("email", "")
            ).strip().lower()

            if not email:
                return jsonify({
                    "error": "Email cannot be empty."
                }), 400

            existing_user = (
                db.query(User)
                .filter(
                    User.email == email,
                    User.id != admin.id
                )
                .first()
            )

            if existing_user:
                return jsonify({
                    "error": "This email is already in use."
                }), 409

            admin.email = email

        # ----------------------------------------------------
        # Change Password
        # ----------------------------------------------------

        if "new_password" in data:

            current_password = data.get(
                "current_password",
                ""
            )

            new_password = data.get(
                "new_password",
                ""
            )

            if not current_password:
                return jsonify({
                    "error": "Current password is required."
                }), 400

            if not new_password:
                return jsonify({
                    "error": "New password is required."
                }), 400

            if not check_password_hash(
                admin.password_hash,
                current_password
            ):
                return jsonify({
                    "error": "Current password is incorrect."
                }), 401

            if len(new_password) < 8:
                return jsonify({
                    "error": "New password must be at least 8 characters."
                }), 400

            admin.password_hash = generate_password_hash(
                new_password
            )

        db.commit()
        db.refresh(admin)

        return jsonify({
            "message": "Admin settings updated successfully.",
            "user": {
                "id": admin.id,
                "name": admin.name,
                "email": admin.email,
                "role": admin.role
            }
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Settings Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not update admin settings."
        }), 500

    finally:

        db.close()
        
# ============================================================
# ADMIN PASSWORD RESET
# ============================================================

@app.route("/admin/reset-password", methods=["POST"])
def admin_reset_password():

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Valid JSON request body is required."
        }), 400

    recovery_key = str(
        data.get("recovery_key", "")
    ).strip()

    new_password = data.get(
        "new_password",
        ""
    )

    if not recovery_key:
        return jsonify({
            "error": "Recovery key is required."
        }), 400

    if not ADMIN_RESET_KEY:
        return jsonify({
            "error": "Admin password reset is not configured."
        }), 500

    if recovery_key != ADMIN_RESET_KEY:
        return jsonify({
            "error": "Invalid recovery key."
        }), 401

    if not new_password:
        return jsonify({
            "error": "New password is required."
        }), 400

    if len(new_password) < 8:
        return jsonify({
            "error": "New password must be at least 8 characters."
        }), 400

    db = SessionLocal()

    try:

        admin = (
            db.query(User)
            .filter(User.role == "admin")
            .first()
        )

        if not admin:
            return jsonify({
                "error": "Admin account not found."
            }), 404

        admin.password_hash = generate_password_hash(
            new_password
        )

        db.commit()

        return jsonify({
            "message": "Admin password reset successfully."
        }), 200

    except Exception as error:

        db.rollback()

        print(
            "Admin Password Reset Error:",
            repr(error)
        )

        return jsonify({
            "error": "Could not reset admin password."
        }), 500

    finally:

        db.close()
# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 60)

    print(
        "NOVEL SCRAPER BACKEND"
    )

    print("=" * 60)

    print(
        f"Novels Directory: {NOVELS_DIR}"
    )

    print(
        f"Covers Directory: {COVERS_DIR}"
    )

    print(
        "Server: http://127.0.0.1:5000"
    )

    print("=" * 60)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )