from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import json
import importlib.util
from datetime import datetime
from werkzeug.utils import secure_filename
import uuid


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

    novels = []


    if not NOVELS_DIR.exists():

        return jsonify(novels)


    for file in sorted(
        NOVELS_DIR.glob("*.json")
    ):

        data = load_novel_file(file)


        if data is None:

            continue


        chapters = data.get(
            "chapters",
            []
        )


        novels.append({

            "filename": file.name,

            "title": data.get(
                "title",
                "Untitled Novel"
            ),

            "author": data.get(
                "author",
                "Unknown"
            ),

            "genre": data.get(
                "genre",
                "Unknown"
            ),

            "status": data.get(
                "status",
                "Unknown"
            ),

            "total_chapters": data.get(
                "total_chapters",
                len(chapters)
            ),

            "cover_image": data.get(
                "cover_image",
                ""
            ),

            "is_manual":
                data.get(
                    "source_website"
                ) == "Manual Entry"
        })


    return jsonify(novels)


# ============================================================
# GET SINGLE NOVEL
# ============================================================

@app.route(
    "/novel/<path:filename>",
    methods=["GET"]
)
def get_novel(filename):

    # --------------------------------------------------------
    # Security check
    # --------------------------------------------------------

    requested_file = Path(filename)


    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):

        return jsonify({
            "error": "Invalid novel file"
        }), 400


    file_path = NOVELS_DIR / filename


    if not file_path.exists():

        return jsonify({
            "error": "Novel not found"
        }), 404


    novel_data = load_novel_file(
        file_path
    )


    if novel_data is None:

        return jsonify({
            "error": "Could not read novel file"
        }), 500


    return jsonify(
        novel_data
    )


# ============================================================
# SCRAPE NOVEL
# ============================================================

@app.route(
    "/scrape",
    methods=["POST"]
)
def scrape_novel():

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


    try:

        result = scraper.process_url(url)


        if not result:

            return jsonify({
                "error": (
                    "Could not scrape this URL. "
                    "The website may not be supported "
                    "or the URL may not exist."
                )
            }), 400


        # ----------------------------------------------------
        # PROCESS_URL MAY RETURN:
        #
        # {
        #     "filename": "...",
        #     "data": {...}
        # }
        #
        # OR DIRECT NOVEL DATA
        # ----------------------------------------------------

        if (
            isinstance(result, dict)
            and isinstance(
                result.get("data"),
                dict
            )
        ):

            filename = result.get(
                "filename",
                ""
            )

            novel_data = result["data"]


        else:

            novel_data = result

            filename = ""


        return jsonify({

            "message":
                "Novel scraped successfully",

            "status":
                "success",

            "filename":
                filename,

            "novel": {

                "title":
                    novel_data.get(
                        "title",
                        "Untitled Novel"
                    ),

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
                    novel_data.get(
                        "total_chapters",
                        len(
                            novel_data.get(
                                "chapters",
                                []
                            )
                        )
                    ),

                "cover_image":
                    novel_data.get(
                        "cover_image",
                        ""
                    )
            }
        })


    except Exception as error:

        print(
            "Scraper Error:",
            repr(error)
        )


        return jsonify({
            "error": str(error)
        }), 500


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


    file_path = NOVELS_DIR / filename


    # --------------------------------------------------------
    # FINAL NOVEL DATA
    # --------------------------------------------------------

    novel_data = {

        "source_website":
            "Manual Entry",

        "source_url":
            "",

        "title":
            title,

        "author":
            author,

        "genre":
            genre,

        "status":
            status,

        "synopsis":
            synopsis,

        "cover_image":
            cover_image,

        "total_chapters":
            len(final_chapters),

        "chapters":
            final_chapters,

        "last_updated":
            datetime.now().isoformat(
                timespec="seconds"
            )
    }


    # --------------------------------------------------------
    # SAVE JSON
    # --------------------------------------------------------

    try:

        with open(
            file_path,
            "w",
            encoding="utf-8"
        ) as json_file:

            json.dump(
                novel_data,
                json_file,
                indent=4,
                ensure_ascii=False
            )


    except OSError as error:

        print(
            "Manual Novel Save Error:",
            repr(error)
        )


        return jsonify({
            "error":
                "Could not save novel file"
        }), 500


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

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


# ============================================================
# EDIT MANUAL NOVEL
# ============================================================

@app.route(
    "/manual-novel/<path:filename>",
    methods=["PUT"]
)
def edit_manual_novel(filename):

    requested_file = Path(filename)


    # --------------------------------------------------------
    # SECURITY CHECK
    # --------------------------------------------------------

    if (
        requested_file.name != filename
        or requested_file.suffix.lower() != ".json"
    ):

        return jsonify({
            "error": "Invalid novel file"
        }), 400


    file_path = NOVELS_DIR / filename


    if not file_path.exists():

        return jsonify({
            "error": "Novel not found"
        }), 404


    # --------------------------------------------------------
    # LOAD EXISTING NOVEL
    # --------------------------------------------------------

    try:

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as json_file:

            existing_data = json.load(
                json_file
            )


    except (
        OSError,
        json.JSONDecodeError
    ):

        return jsonify({
            "error": "Could not read novel file"
        }), 500

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
    # UPDATE EXISTING DATA
    # --------------------------------------------------------

    existing_data["title"] = title

    existing_data["author"] = author

    existing_data["genre"] = genre

    existing_data["status"] = status

    existing_data["synopsis"] = synopsis

    existing_data["cover_image"] = cover_image

    existing_data["total_chapters"] = len(
        final_chapters
    )

    existing_data["chapters"] = final_chapters

    existing_data["last_updated"] = (
        datetime.now().isoformat(
            timespec="seconds"
        )
    )


    # --------------------------------------------------------
    # SAVE CHANGES
    # --------------------------------------------------------

    try:

        with open(
            file_path,
            "w",
            encoding="utf-8"
        ) as json_file:

            json.dump(
                existing_data,
                json_file,
                indent=4,
                ensure_ascii=False
            )


    except OSError as error:

        print(
            "Edit Novel Save Error:",
            repr(error)
        )


        return jsonify({
            "error":
                "Could not save changes"
        }), 500


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

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