import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import json
import os
import re
import time
from datetime import datetime


# ============================================================
# CONFIGURATION
# ============================================================

BASE_URL = "https://crushnovels.net"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": BASE_URL + "/",
}

REQUEST_TIMEOUT = 20
MAX_RETRIES = 3

MAX_REASONABLE_CHAPTER = 10000

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NOVELS_FOLDER = os.path.join(BASE_DIR, "novels")


# ============================================================
# SESSION
# ============================================================

session = requests.Session()
session.headers.update(HEADERS)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clean_text(text):
    """Clean unnecessary whitespace while preserving paragraphs."""

    if not text:
        return ""

    text = text.replace("\xa0", " ")
    text = text.replace("\r", "\n")

    lines = []

    for line in text.split("\n"):
        line = re.sub(r"[ \t]+", " ", line).strip()

        if line:
            lines.append(line)

    return "\n\n".join(lines).strip()


def safe_filename(title):
    """Create a safe filename."""

    title = title.lower()

    title = re.sub(
        r"[^a-z0-9]+",
        "-",
        title
    )

    title = title.strip("-")

    return title[:150]


def get_json_path(title):
    """Return JSON file path."""

    os.makedirs(
        NOVELS_FOLDER,
        exist_ok=True
    )

    filename = (
        f"novel_{safe_filename(title)}.json"
    )

    return os.path.join(
        NOVELS_FOLDER,
        filename
    )


# ============================================================
# HTTP REQUEST
# ============================================================

def fetch_page(url):
    """Fetch page with retry logic."""

    for attempt in range(
        1,
        MAX_RETRIES + 1
    ):

        try:

            print(
                f"Fetching page "
                f"(attempt {attempt}/{MAX_RETRIES})..."
            )

            response = session.get(
                url,
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True
            )

            print(
                f"HTTP Status: "
                f"{response.status_code}"
            )

            response.raise_for_status()

            return response

        except Exception as e:

            print(
                f"Request failed: {e}"
            )

            if attempt < MAX_RETRIES:

                print("Retrying...")

                time.sleep(2)

    return None


def extract_title(soup):

    selectors = [
        "h1",
        ".novel-title",
        ".book-title",
        ".entry-title",
        "meta[property='og:title']"
    ]

    for selector in selectors:

        element = soup.select_one(selector)

        if not element:
            continue

        if element.name == "meta":

            value = element.get(
                "content",
                ""
            ).strip()

        else:

            value = element.get_text(
                " ",
                strip=True
            )

        if not value:
            continue

        value = re.sub(
            r"\s[-|]\sCrushNovels.*$",
            "",
            value,
            flags=re.I
        )

        value = re.sub(
            r"\s+by\s+CrushNovels.*$",
            "",
            value,
            flags=re.I
        )

        return value.strip()

    return "Unknown Novel"
# ============================================================
# NOVEL METADATA
# ============================================================
def extract_structured_metadata(soup):
    metadata = []

    for element in soup.select("script[type='application/ld+json']"):
        try:
            value = json.loads(element.string or element.get_text())
        except (TypeError, json.JSONDecodeError):
            continue

        values = value if isinstance(value, list) else [value]
        for item in values:
            if isinstance(item, dict):
                metadata.append(item)

    return metadata


def extract_labeled_value(soup, label):
    pattern = re.compile(rf"^{label}\s*:\s*(.+)$", flags=re.I)

    for element in soup.find_all(["dt", "dd", "p", "li", "div", "span"]):
        text = clean_text(element.get_text(" ", strip=True))
        match = pattern.match(text)
        if match and len(match.group(1)) < 100:
            return match.group(1).strip()

    page_text = clean_text(soup.get_text(" ", strip=True))
    match = re.search(rf"\b{label}\s*:\s*([^|;,]+)", page_text, flags=re.I)
    return match.group(1).strip() if match else ""


def is_valid_metadata(value, invalid_values=()):
    normalized = clean_text(str(value)).strip(" -|")
    return (
        bool(normalized)
        and normalized.lower() not in {item.lower() for item in invalid_values}
        and len(normalized) < 100
    )


def is_valid_genre(value):
    return is_valid_metadata(
        value,
        {
            "unknown",
            "genre",
            "novel",
            "light novel",
            "web novel",
            "online novel"
        }
    )


def extract_author(soup):
    invalid_authors = {"crushnovels", "crushnovels.net", "admin"}

    for item in extract_structured_metadata(soup):
        author = item.get("author", "")
        if isinstance(author, dict):
            author = author.get("name", "")
        if is_valid_metadata(author, invalid_authors):
            return clean_text(author)

    for selector in [
        "meta[name='author']",
        "meta[property='book:author']",
        "meta[property='article:author']"
    ]:
        element = soup.select_one(selector)
        author = element.get("content", "") if element else ""
        if is_valid_metadata(author, invalid_authors):
            return clean_text(author)

    for selector in [".author", ".novel-author", ".book-author", "[class*='author']"]:
        for element in soup.select(selector):
            author = re.sub(r"^\s*author\s*:\s*", "", element.get_text(" ", strip=True), flags=re.I)
            if is_valid_metadata(author, invalid_authors):
                return clean_text(author)

    author = extract_labeled_value(soup, "author")
    if is_valid_metadata(author, invalid_authors):
        return author

    title_text = soup.select_one("h1")
    if title_text:
        match = re.search(r"\bby\s+([^|]+)$", title_text.get_text(" ", strip=True), flags=re.I)
        if match and is_valid_metadata(match.group(1), invalid_authors):
            return clean_text(match.group(1))

    return "Unknown"


def extract_genre(soup):
    novel_genres = []
    for link in soup.select("div.flex.flex-wrap.gap-3 a[href*='genre=']"):
        genre = link.get_text(" ", strip=True)
        if is_valid_genre(genre) and genre not in novel_genres:
            novel_genres.append(genre)
    if novel_genres:
        return ", ".join(clean_text(genre) for genre in novel_genres)

    for item in extract_structured_metadata(soup):
        genre = item.get("genre", "")
        genres = genre if isinstance(genre, list) else [genre]
        valid_genres = [value for value in genres if is_valid_genre(value)]
        if valid_genres:
            return ", ".join(clean_text(value) for value in valid_genres)

        description = item.get("description", "")
        match = re.search(r"\bin the\s+([^,.]+?)\s+genre\b", description, flags=re.I)
        if match and is_valid_genre(match.group(1)):
            return clean_text(match.group(1))

    for selector in [
        ".novel-info a[href*='genre=']",
        "article a[href*='genre=']",
        "a[href*='genre=']"
    ]:
        genres = []
        for link in soup.select(selector):
            genre = link.get_text(" ", strip=True)
            if is_valid_genre(genre) and genre not in genres:
                genres.append(genre)
        if genres:
            return ", ".join(clean_text(genre) for genre in genres)

    for selector in [
        "meta[name='genre']",
        "meta[property='book:genre']"
    ]:
        element = soup.select_one(selector)
        content = element.get("content", "") if element else ""
        candidates = [part.strip() for part in content.split(",")]
        for genre in candidates:
            if is_valid_genre(genre):
                return clean_text(genre)

    for link in soup.select("a[href*='/genre/'], a[href*='/category/'], [class*='genre'] a"):
        genre = link.get_text(" ", strip=True)
        if is_valid_genre(genre):
            return clean_text(genre)

    genre = extract_labeled_value(soup, "genre")
    if is_valid_genre(genre):
        return genre

    keywords = soup.select_one("meta[name='keywords']")
    if keywords:
        for genre in keywords.get("content", "").split(","):
            if is_valid_genre(genre):
                return clean_text(genre)

    descriptions = soup.select("meta[name='description'], meta[property='og:description']")
    for element in descriptions:
        text = element.get("content", "")
        match = re.search(r"\bin the\s+([^,.]+?)\s+genre\b", text, flags=re.I)
        if match and is_valid_genre(match.group(1)):
            return clean_text(match.group(1))

    return "Unknown"

def extract_status(soup):
    selectors = [
        ".status",
        ".novel-status",
        ".book-status",
        "[class*='status']"
    ]

    for selector in selectors:
        elements = soup.select(selector)

        for element in elements:
            text = element.get_text(" ", strip=True)

            if not text:
                continue

            text = re.sub(
                r"^\s*status\s*:\s*",
                "",
                text,
                flags=re.I
            ).strip()

            if len(text) <= 50:
                return text

    page_text = soup.get_text(" ", strip=True)

    if re.search(r"\bongoing\b", page_text, flags=re.I):
        return "Ongoing"

    if re.search(r"\bcompleted\b", page_text, flags=re.I):
        return "Completed"

    return ""

def extract_synopsis(soup):

    selectors = [
        ".summary",
        ".synopsis",
        ".description",
        ".novel-description",
        ".book-description",
        "[class*='summary']",
        "[class*='synopsis']"
    ]

    for selector in selectors:

        element = soup.select_one(
            selector
        )

        if element:

            text = clean_text(
                element.get_text(
                    "\n",
                    strip=True
                )
            )

            if len(text) > 50:
                return text

    return ""


def extract_cover(soup):

    selectors = [
        "meta[property='og:image']",
        ".novel-cover img",
        ".book-cover img",
        ".cover img",
        "img"
    ]

    for selector in selectors:

        element = soup.select_one(
            selector
        )

        if not element:
            continue

        if element.name == "meta":

            image = element.get(
                "content",
                ""
            )

        else:

            image = (
                element.get("src")
                or element.get("data-src")
                or ""
            )

        if image:

            return urljoin(
                BASE_URL,
                image
            )

    return ""


# ============================================================
# CHAPTER COUNT
# ============================================================

def extract_total_chapters(soup):
    """
    Extract total chapter count from the novel page.

    Example:
    '640 Chapters'
    '1-50 of 640 chapters'
    """

    page_text = soup.get_text(
        " ",
        strip=True
    )

    patterns = [

        r"of\s+([\d,]+)\s+chapters",

        r"([\d,]+)\s+chapters",

        r"chapters?\s*[:\-]?\s*([\d,]+)"
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            page_text,
            flags=re.I
        )

        if not matches:
            continue

        numbers = []

        for value in matches:

            try:
                number = int(
                    value.replace(",", "")
                )

                if (
                    number > 0
                    and number <= MAX_REASONABLE_CHAPTER
                ):
                    numbers.append(number)

            except ValueError:
                continue

        if numbers:

            # Use largest valid chapter count
            return max(numbers)

    return 0


# ============================================================
# CHAPTER URL
# ============================================================

def build_chapter_url(
    novel_url,
    chapter_number
):
    """
    Build real CrushNovels chapter URL.
    """

    parsed = urlparse(
        novel_url
    )

    path = parsed.path.rstrip("/")

    slug = path.split("/")[-1]

    return (
        f"{BASE_URL}/read/"
        f"{slug}&chuong={chapter_number}"
    )


# ============================================================
# CHAPTER DISCOVERY
# ============================================================

def extract_chapter_links(soup):

    chapters = []

    seen_numbers = set()

    for link in soup.find_all(
        "a",
        href=True
    ):

        href = link.get(
            "href",
            ""
        ).strip()

        text = link.get_text(
            " ",
            strip=True
        )

        # First check URL
        match = re.search(
            r"[?&]chuong=(\d+)",
            href,
            flags=re.I
        )

        # Then check text
        if not match:

            match = re.search(
                r"(?:chapter|ch)[\s\-_]*(\d+)",
                text,
                flags=re.I
            )

        if not match:
            continue

        number = int(
            match.group(1)
        )

        if (
            number < 1
            or number > MAX_REASONABLE_CHAPTER
        ):
            continue

        if number in seen_numbers:
            continue

        seen_numbers.add(
            number
        )

        chapter_url = urljoin(
            BASE_URL,
            href
        )

        chapters.append({
            "chapter_number": number,
            "title": f"Chapter {number}",
            "url": chapter_url
        })

    return chapters


def get_chapter_list(
    soup,
    novel_url
):
    """
    Get ALL chapter numbers.

    Important:
    CrushNovels loads only some chapter links
    in the initial HTML. Therefore we also read
    the total chapter count and generate missing
    chapter URLs.
    """

    discovered = extract_chapter_links(
        soup
    )

    discovered_map = {}

    for chapter in discovered:

        number = chapter[
            "chapter_number"
        ]

        discovered_map[number] = chapter

    total_chapters = extract_total_chapters(
        soup
    )

    print(
        f"Website total chapters: "
        f"{total_chapters}"
    )

    print(
        f"Directly discovered links: "
        f"{len(discovered)}"
    )

    # --------------------------------------------------------
    # GENERATE MISSING CHAPTERS
    # --------------------------------------------------------

    if total_chapters > 0:

        for number in range(
            1,
            total_chapters + 1
        ):

            if number not in discovered_map:

                discovered_map[number] = {

                    "chapter_number": number,

                    "title":
                        f"Chapter {number}",

                    "url":
                        build_chapter_url(
                            novel_url,
                            number
                        )
                }

    chapters = sorted(
        discovered_map.values(),
        key=lambda x:
            x["chapter_number"]
    )

    print(
        f"Total chapter URLs prepared: "
        f"{len(chapters)}"
    )

    return chapters


# ============================================================
# REMOVE UNWANTED ELEMENTS
# ============================================================

def remove_unwanted_elements(
    soup
):

    selectors = [

        "script",
        "style",
        "noscript",
        "iframe",
        "svg",

        "header",
        "footer",
        "nav",

        ".ads",
        ".ad",
        ".advertisement",
        ".adsbygoogle",

        "[class*='ad-']",
        "[class*='advert']",

        "[class*='audio']",
        "[class*='player']",
        "[class*='tts']",
        "[class*='speech']",

        "[class*='premium']",
        "[class*='reading-tools']",
        "[class*='chapter-tools']",

        "[class*='chapter-list']",
        "[class*='chapter-nav']",
        "[class*='navigation']",
        "[class*='breadcrumb']",

        "[class*='report']",
        "[class*='comment']",
        "[class*='feedback']",
        "[class*='thought']",

    ]

    for selector in selectors:

        for element in soup.select(
            selector
        ):

            element.decompose()

def extract_chapter_content(soup):
    """
    Extract complete chapter content safely.

    Goals:
    - Preserve first paragraph
    - Preserve short dialogue
    - Preserve paragraph order
    - Avoid deleting story because of broad parent selectors
    - Remove only clearly identifiable website/UI content
    """
    #Remove This line
    #Listen mode uses high-quality English narration and is reserved for Premium members.

    # ========================================================
    # 1. REMOVE ONLY SAFE WEBSITE ELEMENTS
    # ========================================================

    safe_remove_selectors = [
        "script",
        "style",
        "noscript",
        "iframe",
        "svg",

        # Common UI/navigation
        "header",
        "footer",
        "nav",

        # Clearly identifiable ads
        ".adsbygoogle",
        ".advertisement",
        ".advert",
    ]

    for selector in safe_remove_selectors:
        for element in soup.select(selector):
            element.decompose()

    # ========================================================
    # 2. FIND CHAPTER CONTAINER
    # ========================================================

    container_selectors = [
        ".chapter-content",
        ".chapter-content-detail",
        ".reading-content",
        ".read-content",
        ".content-chapter",
        ".chapter-body",
        ".entry-content",
        "article",
    ]

    container = None

    for selector in container_selectors:
        element = soup.select_one(selector)

        if not element:
            continue

        text = element.get_text("\n", strip=True)

        if len(text) > 100:
            container = element
            print(f"Chapter container found: {selector}")
            break

    # ========================================================
    # 3. FALLBACK - FIND BEST TEXT CONTAINER
    # ========================================================

    if container is None:

        candidates = soup.find_all(
            ["main", "article", "section", "div"]
        )

        best_container = None
        best_score = 0

        for candidate in candidates:

            text = candidate.get_text(
                "\n",
                strip=True
            )

            if len(text) < 200:
                continue

            # Count paragraph-like elements
            p_count = len(
                candidate.find_all("p")
            )

            div_count = len(
                candidate.find_all("div")
            )

            score = len(text)

            # Prefer actual paragraph containers
            score += p_count * 500

            # Slight preference for multiple text blocks
            if div_count >= 3:
                score += div_count * 20

            if score > best_score:
                best_score = score
                best_container = candidate

        container = best_container

    if container is None:
        print("Chapter container could not be found.")
        return ""

    # ========================================================
    # 4. REMOVE ONLY CLEAR UI BLOCKS
    # ========================================================

    # IMPORTANT:
    # We do NOT remove generic [class*='ad-'],
    # [class*='thought'], [class*='comment'], etc.
    #
    # Those broad selectors can accidentally match
    # story containers or their parents.

    safe_ui_selectors = [
        ".share",
        ".social-share",
        ".pagination",

        ".chapter-list",
        ".chapter-nav",

        ".reading-tools",
        ".chapter-tools",

        ".report",
        ".feedback",

        ".comments",
        "#comments",

        ".premium",
    ]

    for selector in safe_ui_selectors:

        for element in container.select(selector):

            # Make sure we are not deleting the entire
            # chapter container itself.
            if element is container:
                continue

            element.decompose()

    # ========================================================
    # 5. PROMOTIONAL PHRASES
    # ========================================================

    unwanted_phrases = [
        "thank you for reading on crushnovels",
        "thank you for reading on crushnovels!",
        "follow new episodes on",
        "follow new episodes",
        "our website offers a complete collection of goodnovel novels",
        "readers can easily search and read any goodnovel story online",
        "click here to browse all goodnovel short novels",
        "register for membership to remove ads",
        "share novels to remove ads",
        "enjoy ad-free reading",
        "upgrade to premium",
        "premium membership",
        "ad-free reading experience",
        "report chapter error",
        "report chapter issue",
        "issue type",
        "select issue type",
        "submit report",
        "go to current chapter",
        "search chapter",
        "previous chapter",
        "next chapter",
        "back to novel",
        "your thoughts",
        "post comment",
        "Listen mode uses high-quality English narration and is reserved for Premium members.",
    ]

    # ========================================================
    # 6. COLLECT PARAGRAPHS
    # ========================================================

    paragraphs = []

    p_elements = container.find_all("p")

    print(
        f"HTML <p> elements found: {len(p_elements)}"
    )

    for p in p_elements:

        text = p.get_text(
            " ",
            strip=True
        )
        
        # Remove "Listen mode" line completely
        text = re.sub(
            r"listen\s+mode\s+uses\s+high-quality\s+english\s+narration\s+and\s+is\s+reserved\s+for\s+premium\s+members\.?\s*",
            "",
            text,
            flags=re.IGNORECASE
        ).strip()
        
        if not text:
            continue

        if not text:
            continue

        text = re.sub(
            r"\s+",
            " ",
            text
        ).strip()

        if not text:
            continue

        lower_text = text.lower()

        # ----------------------------------------------------
        # Remove ONLY clearly promotional paragraphs
        # ----------------------------------------------------

        if any(
            phrase in lower_text
            for phrase in unwanted_phrases
        ):
            print(
                "Removed promotional paragraph:"
            )
            print(text[:200])
            continue

        # ----------------------------------------------------
        # Navigation text
        # ----------------------------------------------------

        if re.search(
            r"\b("
            r"chapter\s+(list|search)"
            r"|previous\s+chapter"
            r"|next\s+chapter"
            r"|go\s+to\s+current\s+chapter"
            r")\b",
            lower_text
        ):
            continue

        # ----------------------------------------------------
        # Keep short genuine dialogue
        #
        # Only ignore extremely tiny garbage.
        # Do NOT use len(text) < 5 because:
        # "Go."
        # "No."
        # "Run."
        # are valid story text.
        # ----------------------------------------------------

        if len(text.strip()) < 2:
            continue

        paragraphs.append(text)

    # ========================================================
    # 7. FALLBACK IF <p> TAGS ARE NOT USED
    # ========================================================

    if len(paragraphs) <= 1:

        print(
            "Few <p> elements found."
        )
        print(
            "Trying text-block fallback..."
        )

        paragraphs = []

        for element in container.find_all(
            ["div", "section"]
        ):

            # Ignore elements containing nested
            # paragraph/div blocks.
            if element.find(
                ["p", "div", "section"]
            ):
                continue

            text = element.get_text(
                " ",
                strip=True
            )

            if not text:
                continue

            # Remove "Listen mode" line completely
            text = re.sub(
                r"listen\s+mode\s+uses\s+high-quality\s+english\s+narration\s+and\s+is\s+reserved\s+for\s+premium\s+members\.?\s*",
                "",
                text,
                flags=re.IGNORECASE
            ).strip()

            if not text:
                continue

            text = re.sub(
                r"\s+",
                " ",
                text
            ).strip()

            if len(text) < 2:
                continue

            lower_text = text.lower()

            if any(
                phrase in lower_text
                for phrase in unwanted_phrases
            ):
                continue

            paragraphs.append(text)

    # ========================================================
    # 8. DEBUG OUTPUT
    # ========================================================

    print()
    print("========== EXTRACTED PARAGRAPHS ==========")

    for i, paragraph in enumerate(
        paragraphs[:10],
        1
    ):
        print(
            f"\nPARAGRAPH {i}:"
        )
        print(
            paragraph[:500]
        )

    print(
        f"\nTotal extracted paragraphs: {len(paragraphs)}"
    )

    print(
        "=========================================="
    )

    # ========================================================
    # 9. REMOVE ONLY CHAPTER HEADING
    # ========================================================

    if paragraphs:

        first = paragraphs[0]

        # Remove heading only if the ENTIRE
        # paragraph is a chapter heading.

        heading_patterns = [
            r"^chapter\s+\d+$",
            r"^chapter\s+\d+\s*[:\-–—]?\s*$",
        ]

        is_heading = any(
            re.match(
                pattern,
                first,
                flags=re.I
            )
            for pattern in heading_patterns
        )

        if is_heading:
            print(
                f"Removing chapter heading: {first}"
            )
            paragraphs.pop(0)

    # ========================================================
    # 10. CLEAN PROGRESS MARKERS
    # ========================================================

    cleaned_paragraphs = []

    for text in paragraphs:

        text = text.strip()

        if not text:
            continue

        # Remove only injected progress markers.
        text = re.sub(
            r"\bChapter\s+\d+\s+"
            r"(?:\d+(?:\.\d+)?\s*){1,2}%\s*",
            "",
            text,
            flags=re.I
        ).strip()

        if not text:
            continue

        cleaned_paragraphs.append(text)

    # ========================================================
    # 11. REMOVE CLEAR AD/PROMOTIONAL PARAGRAPHS
    # ========================================================

    final_paragraphs = []

    ad_phrases = [
        "register for membership to remove ads",
        "share novels to remove ads",
        "enjoy ad-free reading",
        "subscribe to remove ads",
        "sign up to remove ads",
        "support the site by removing ads",
        "support the author by removing ads",
    ]

    author_promo_phrases = [
        "is a rising voice in the world of romance",
        "with a gift for weaving deep emotions",
        "their stories are a blend of passion and drama",
        "their novels are a blend of romance and suspense",
        "their works are a blend of romance and fantasy",
        "their novels are a blend of romance and mystery",
        "their stories are a blend of romance and adventure",
    ]

    for text in cleaned_paragraphs:

        lower_text = text.lower()

        # Remove clear ads
        if any(
            phrase in lower_text
            for phrase in ad_phrases
        ):
            print(
                "Removed advertisement paragraph."
            )
            continue

        # Remove clear author promotion
        if any(
            phrase in lower_text
            for phrase in author_promo_phrases
        ):
            print(
                "Removed author promotion."
            )
            continue

        # Keep everything else
        final_paragraphs.append(text)

    # ========================================================
    # 12. DO NOT REMOVE DUPLICATES
    # ========================================================
    #
    # We intentionally keep duplicate paragraphs.
    #
    # Why?
    # A scraper should preserve the original story.
    # Removing duplicates can accidentally modify
    # legitimate repeated dialogue/story text.

    # ========================================================
    # 13. FINAL OUTPUT
    # ========================================================

    print()
    print("========================================")
    print("FINAL EXTRACTED PARAGRAPHS")
    print("========================================")

    for i, paragraph in enumerate(
        final_paragraphs[:5],
        1
    ):
        print(
            f"\nPARAGRAPH {i}:"
        )
        print(
            paragraph[:500]
        )

    print(
        f"\nFINAL COUNT: {len(final_paragraphs)}"
    )

    print(
        "========================================"
    )

    # Final pass: Remove any remaining "Listen mode" lines
    final_content = "\n\n".join(
        final_paragraphs
    ).strip()
    
    # Clean up any remaining instances of the "Listen mode" phrase
    final_content = re.sub(
        r"listen\s+mode\s+uses\s+high-quality\s+english\s+narration\s+and\s+is\s+reserved\s+for\s+premium\s+members\.?\s*\n*",
        "",
        final_content,
        flags=re.IGNORECASE
    ).strip()

    return final_content

# ============================================================
# CHAPTER SCRAPER
# ============================================================

def scrape_chapter(
    chapter
):

    number = chapter[
        "chapter_number"
    ]

    url = chapter[
        "url"
    ]

    print()
    print(
        f"Scraping Chapter {number}..."
    )

    print(
        f"URL: {url}"
    )

    response = fetch_page(
        url
    )

    if response is None:

        print(
            f"Chapter {number}: "
            f"Failed to fetch."
        )

        return None

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    content = extract_chapter_content(
        soup
    )

    if not content:

        print(
            f"Chapter {number}: "
            f"Content not found."
        )

        return None

    title = chapter.get(
        "title",
        f"Chapter {number}"
    )

    result = {

        "chapter_number":
            number,

        "title":
            title,

        "date":
            "",

        "views":
            0,

        "is_locked":
            False,

        "url":
            url,

        "content":
            content,

        "scrape_status":
            "success"

    }

    print(
        f"Chapter {number}: "
        f"Successfully scraped."
    )

    return result


# ============================================================
# JSON
# ============================================================

def load_existing_json(
    path
):

    if not os.path.exists(path):
        return None

    try:

        with open(
            path,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(
                file
            )

    except Exception:

        return None


def save_json(
    path,
    data
):

    with open(
        path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=4,
            ensure_ascii=False
        )


# ============================================================
# CLEAN EXISTING CHAPTERS
# ============================================================

def build_existing_chapters(
    existing_data
):

    existing_chapters = {}

    if not existing_data:
        return existing_chapters

    for chapter in existing_data.get(
        "chapters",
        []
    ):

        number = chapter.get(
            "chapter_number"
        )

        if number:

            try:

                number = int(
                    number
                )

                existing_chapters[
                    number
                ] = chapter

            except ValueError:
                pass

    return existing_chapters


# ============================================================
# SCRAPE NOVEL
# ============================================================

def scrape_novel(
    novel_url
):

    print("=" * 60)
    print("PROCESSING NOVEL")
    print("=" * 60)

    print(
        f"URL: {novel_url}"
    )

    response = fetch_page(
        novel_url
    )

    if response is None:

        print(
            "Could not fetch novel page."
        )

        return None

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    # --------------------------------------------------------
    # METADATA
    # --------------------------------------------------------

    title = extract_title(
        soup
    )

    author = extract_author(
        soup
    )

    genre = extract_genre(
        soup
    )

    status = extract_status(
        soup
    )

    synopsis = extract_synopsis(
        soup
    )

    cover_image = extract_cover(
        soup
    )

    print()
    print(
        f"Title: {title}"
    )

    print(
        f"Author: {author}"
    )

    print(
        f"Genre: {genre}"
    )

    print(
        f"Status: {status}"
    )

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    json_path = get_json_path(
        title
    )

    print()
    print(
        f"JSON File: {json_path}"
    )

    existing_data = load_existing_json(
        json_path
    )

    existing_chapters = build_existing_chapters(
        existing_data
    )

    if existing_data:

        print()
        print(
            "Existing JSON found."
        )

        print(
            f"Existing chapters: "
            f"{len(existing_chapters)}"
        )

    # --------------------------------------------------------
    # CHAPTER DISCOVERY
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("SEARCHING FOR CHAPTERS")
    print("=" * 60)

    chapter_list = get_chapter_list(
        soup,
        novel_url
    )

    if not chapter_list:

        print(
            "No chapters found."
        )

        return None

    print(
        f"Chapters Found: "
        f"{len(chapter_list)}"
    )

    # --------------------------------------------------------
    # VALID CHAPTER NUMBERS
    # --------------------------------------------------------

    valid_numbers = {
        chapter["chapter_number"]
        for chapter in chapter_list
    }

    # Remove bogus old chapters
    existing_chapters = {
        number: chapter
        for number, chapter
        in existing_chapters.items()
        if number in valid_numbers
    }

    # --------------------------------------------------------
    # DETERMINE WHAT TO SCRAPE
    # --------------------------------------------------------

    chapters_to_scrape = []

    for chapter in chapter_list:

        number = chapter[
            "chapter_number"
        ]

        existing = existing_chapters.get(
            number
        )

        if existing:

            content = existing.get(
                "content",
                ""
            )

            status_value = existing.get(
                "scrape_status",
                ""
            )

            if (
                content
                and status_value == "success"
            ):

                continue

        chapters_to_scrape.append(
            chapter
        )

    print()
    print("=" * 60)
    print("CHAPTERS TO SCRAPE")
    print("=" * 60)

    print(
        f"Total: "
        f"{len(chapters_to_scrape)}"
    )

    if not chapters_to_scrape:

        print(
            "Everything is already up to date."
        )

    # --------------------------------------------------------
    # SCRAPE
    # --------------------------------------------------------

    successful = 0
    failed = 0

    for index, chapter in enumerate(
        chapters_to_scrape,
        start=1
    ):

        print()
        print(
            f"[{index}/"
            f"{len(chapters_to_scrape)}]"
        )

        result = scrape_chapter(
            chapter
        )

        number = chapter[
            "chapter_number"
        ]

        if result:

            existing_chapters[
                number
            ] = result

            successful += 1

        else:

            if number not in existing_chapters:

                existing_chapters[
                    number
                ] = {

                    "chapter_number":
                        number,

                    "title":
                        chapter["title"],

                    "date":
                        "",

                    "views":
                        0,

                    "is_locked":
                        False,

                    "url":
                        chapter["url"],

                    "content":
                        "",

                    "scrape_status":
                        "failed"
                }

            failed += 1

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    final_chapters = sorted(
        existing_chapters.values(),
        key=lambda x:
            int(
                x.get(
                    "chapter_number",
                    0
                )
            )
    )

    # --------------------------------------------------------
    # FINAL DATA
    # --------------------------------------------------------

    final_data = {

        "source_website":
            "CrushReadNovel",

        "source_url":
            novel_url,

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

    save_json(
        json_path,
        final_data
    )

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    success_count = sum(
        1
        for chapter
        in final_chapters
        if chapter.get(
            "scrape_status"
        ) == "success"
    )

    failed_count = sum(
        1
        for chapter
        in final_chapters
        if chapter.get(
            "scrape_status"
        ) != "success"
    )

    print()
    print("=" * 60)
    print("SCRAPING SUMMARY")
    print("=" * 60)

    print(
        f"Title: {title}"
    )

    print(
        f"Total Chapters: "
        f"{len(final_chapters)}"
    )

    print(
        f"Successful Chapters: "
        f"{success_count}"
    )

    print(
        f"Failed Chapters: "
        f"{failed_count}"
    )

    print(
        f"Last Updated: "
        f"{final_data['last_updated']}"
    )

    print()
    print(
        "JSON file updated successfully:"
    )

    print(
        os.path.abspath(
            json_path
        )
    )

    print("=" * 60)

    return final_data


# ============================================================
# FASTAPI / BACKEND FUNCTION
# ============================================================

def process_url(
    novel_url
):
    """
    Function used by FastAPI backend.

    It performs the same scraping process
    without requiring input().
    """

    return scrape_novel(
        novel_url
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("NOVEL SCRAPER")
    print("=" * 60)

    print()
    print(
        "Enter multiple URLs separated by commas."
    )

    print()

    urls_input = input(
        "Enter Novel URLs: "
    ).strip()

    if not urls_input:

        print(
            "No URL entered."
        )

        return

    urls = [
        url.strip()
        for url
        in urls_input.split(",")
        if url.strip()
    ]

    for url in urls:

        print()

        try:

            scrape_novel(
                url
            )

        except KeyboardInterrupt:

            print()
            print(
                "Stopped by user."
            )

            break

        except Exception as e:

            print()
            print(
                "Unexpected error:"
            )

            print(
                str(e)
            )

    print()
    print("=" * 60)
    print("ALL URLS PROCESSED")
    print("=" * 60)


# ============================================================
# PROGRAM START
# ============================================================

if __name__ == "__main__":

    main()