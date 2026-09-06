from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import json
import importlib.util
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid

from backend.database import SessionLocal
from backend.models import Novel, Chapter


# ============================================================
# APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

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
@app.route(
    "/novels",
    methods=["GET"]
)
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
@app.route(
    "/novel/<path:filename>",
    methods=["GET"]
)
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
@app.route(
    "/scrape",
    methods=["POST"]
)
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
@app.route(
    "/manual-novel",
    methods=["POST"]
)
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
@app.route(
    "/manual-novel/<path:filename>",
    methods=["PUT"]
)
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