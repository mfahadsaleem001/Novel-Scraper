const API_URL = "http://127.0.0.1:5000";

// ============================================================
// PUBLIC NOVEL FILTER DATA
// ============================================================

let allNovels = [];
let selectedGenre = "all";

// ============================================================
// READER DATA
// ============================================================

let currentChapters = [];
let currentChapterIndex = -1;

// ============================================================
// PAGE DETECTION
// ============================================================

const currentPage = window.location.pathname;

// Home Page
if (
    currentPage.endsWith("index.html") ||
    currentPage === "/" ||
    currentPage.endsWith("/")
) {
    initializeHomePage();
}

// Scraper Page
if (currentPage.endsWith("scraper.html")) {
    initializeScraperPage();
}

// Novel Page
if (currentPage.endsWith("novel.html")) {
    initializeNovelPage();
}

// ============================================================
// HOME PAGE
// ============================================================

function initializeHomePage() {
    loadNovels();
}

// ============================================================
// SCRAPER PAGE
// ============================================================

function initializeScraperPage() {
    const form =
        document.getElementById("scrapeForm");

    if (form) {
        form.addEventListener(
            "submit",
            handleScrape
        );
    }

    loadManualNovels();
}

// ============================================================
// SCRAPE NOVEL
// ============================================================

async function handleScrape(event) {
    event.preventDefault();

    const urlInput =
        document.getElementById("novelUrl");

    const button =
        document.getElementById("scrapeButton");

    const buttonText =
        document.getElementById("buttonText");

    const buttonIcon =
        document.getElementById("buttonIcon");

    if (!urlInput) {
        return;
    }

    const url =
        urlInput.value.trim();

    // --------------------------------------------------------
    // URL VALIDATION
    // --------------------------------------------------------

    if (!url) {
        showMessage(
            "Please enter a novel URL.",
            "error"
        );
        return;
    }

    try {
        new URL(url);
    } catch {
        showMessage(
            "Please enter a valid URL.",
            "error"
        );
        return;
    }

    // --------------------------------------------------------
    // LOADING STATE
    // --------------------------------------------------------

    if (button) {
        button.disabled = true;
        button.style.opacity = "0.7";
        button.style.cursor = "wait";
    }

    if (buttonIcon) {
        buttonIcon.textContent = "⏳";
    }

    if (buttonText) {
        buttonText.textContent = "Scraping...";
    }

    showMessage(
        "⏳ Scraping novel... Please wait.",
        "loading"
    );

    try {

        // ----------------------------------------------------
        // SEND REQUEST
        // ----------------------------------------------------

        const response =
            await fetch(
                `${API_URL}/scrape`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: url
                    })
                }
            );

        // ----------------------------------------------------
        // READ RESPONSE
        // ----------------------------------------------------

        let data;

        try {
            data =
                await response.json();
        } catch {
            throw new Error(
                "Server returned an invalid response."
            );
        }

        // ----------------------------------------------------
        // CHECK RESPONSE
        // ----------------------------------------------------

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Failed to scrape novel."
            );
        }

        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        showMessage(
            "Novel scraped successfully!",
            "success"
        );

        urlInput.value = "";

        // ----------------------------------------------------
        // SHOW SCRAPED NOVEL
        // ----------------------------------------------------

        if (data.novel) {
            showScrapedNovel(
                data.novel,
                data.filename
            );
        }

        // ----------------------------------------------------
        // RELOAD NOVEL LIST
        // ----------------------------------------------------

        await loadNovels();


    } catch (error) {

        console.error(
            "Scrape Error:",
            error
        );

        showMessage(
            `❌ ${error.message}`,
            "error"
        );

    } finally {

        // ----------------------------------------------------
        // RESET BUTTON
        // ----------------------------------------------------

        if (button) {
            button.disabled = false;
            button.style.opacity = "1";
            button.style.cursor = "pointer";
        }

        if (buttonIcon) {
            buttonIcon.textContent = "🔍";
        }

        if (buttonText) {
            buttonText.textContent = "Read Novel";
        }
    }
}

// ============================================================
// SHOW SCRAPED NOVEL
// ============================================================

function showScrapedNovel(
    novel,
    filename = null
) {
    const section =
        document.getElementById(
            "scrapedNovelSection"
        );

    const container =
        document.getElementById(
            "scrapedNovelResult"
        );

    if (!section || !container) {
        return;
    }

    const cover =
        novel.cover_image ||
        "https://via.placeholder.com/220x300?text=No+Cover";

    const novelFilename =
        filename ||
        novel.filename ||
        "";

    container.innerHTML = `
        <div class="novel-card">

            <img
                src="${escapeHtml(cover)}"
                alt="${escapeHtml(
                    novel.title || "Novel Cover"
                )}"
                class="novel-card-cover"
            >

            <div class="novel-card-content">

                <h3>
                    ${escapeHtml(
                        novel.title ||
                        "Untitled Novel"
                    )}
                </h3>

                <p>
                    <strong>Author:</strong>
                    ${escapeHtml(
                        novel.author ||
                        "Unknown"
                    )}
                </p>

                <p>
                    <strong>Genre:</strong>
                    ${escapeHtml(
                        novel.genre ||
                        "Unknown"
                    )}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHtml(
                        novel.status ||
                        "Unknown"
                    )}
                </p>

                <p>
                    <strong>Chapters:</strong>
                    ${Number(
                        novel.total_chapters ||
                        0
                    )}
                </p>

                <div class="manual-novel-actions">

                    <button
                        type="button"
                        class="read-button"
                        id="scrapedReadButton"
                    >
                        📖 Read Novel
                    </button>

                    <button
                        type="button"
                        class="edit-novel-button"
                        id="scrapedEditButton"
                    >
                        ✏️ Edit
                    </button>

                </div>

            </div>
        </div>
    `;

    const image =
        container.querySelector(
            ".novel-card-cover"
        );

    if (image) {
        image.onerror = function () {
            this.onerror = null;

            this.src =
                "https://via.placeholder.com/220x300?text=No+Cover";
        };
    }

    const readButton =
        document.getElementById(
            "scrapedReadButton"
        );

    if (readButton) {
        readButton.addEventListener(
            "click",
            function () {
                openNovel(novelFilename);
            }
        );
    }

    const editButton =
        document.getElementById(
            "scrapedEditButton"
        );

    if (editButton) {
        editButton.addEventListener(
            "click",
            function () {
                editNovel(novelFilename);
            }
        );
    }

    section.hidden = false;

    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ============================================================
// LOAD ALL NOVELS
// ============================================================

async function loadNovels() {
    const novelsContainer =
        document.getElementById(
            "novelsList"
        );

    const novelCount =
        document.getElementById(
            "novelCount"
        );

    if (!novelsContainer) {
        return;
    }

    // --------------------------------------------------------
    // LOADING
    // --------------------------------------------------------

    novelsContainer.innerHTML = `
        <p class="loading">
            ⏳ Loading novels...
        </p>
    `;

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );

        if (!response.ok) {
            throw new Error(
                "Could not load novels."
            );
        }

        const novels =
            await response.json();

        allNovels = novels;

        createGenreFilters(novels);
        displayFilteredNovels();

        // ----------------------------------------------------
        // NO NOVELS
        // ----------------------------------------------------

        if (
            !Array.isArray(novels) ||
            novels.length === 0
        ) {

            novelsContainer.innerHTML = `
                <p class="empty-message">
                    No novels available yet.
                </p>
            `;

            if (novelCount) {
                novelCount.textContent =
                    "0 Novels";
            }

            return;
        }

        // ----------------------------------------------------
        // UPDATE COUNT
        // ----------------------------------------------------

        if (novelCount) {
            novelCount.textContent =
                `${novels.length} ${
                    novels.length === 1
                        ? "Novel"
                        : "Novels"
                }`;
        }

    } catch (error) {

        console.error(
            "Load Novels Error:",
            error
        );

        novelsContainer.innerHTML = `
            <p class="error-box">
                ❌ Failed to load novels.
                Make sure the backend server is running.
            </p>
        `;

        if (novelCount) {
            novelCount.textContent =
                "0 Novels";
        }
    }
}

// ============================================================
// CREATE NOVEL CARD
// ============================================================

function createNovelCard(novel) {

    const card =
        document.createElement("div");

    card.className =
        "novel-card";


    const cover =
        novel.cover_image ||
        "https://via.placeholder.com/220x300?text=No+Cover";


    card.innerHTML = `
        <img
            src="${escapeHtml(cover)}"
            alt="${escapeHtml(
                novel.title || "Novel Cover"
            )}"
            class="novel-card-cover"
        >

        <div class="novel-card-content">

            <h3>
                ${escapeHtml(
                    novel.title ||
                    "Untitled Novel"
                )}
            </h3>

            <p>
                <strong>Author:</strong>
                ${escapeHtml(
                    novel.author ||
                    "Unknown"
                )}
            </p>

            <p>
                <strong>Genre:</strong>
                ${escapeHtml(
                    novel.genre ||
                    "Unknown"
                )}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHtml(
                    novel.status ||
                    "Unknown"
                )}
            </p>

            <p>
                <strong>Chapters:</strong>
                ${Number(
                    novel.total_chapters ||
                    0
                )}
            </p>

            <div class="novel-card-actions">

                <button
                    class="read-button"
                    type="button"
                >
                    📖 Read
                </button>

                <button
                    class="edit-button"
                    type="button"
                >
                    ✏️ Edit
                </button>

            </div>

        </div>
    `;


    // ========================================================
    // READ BUTTON
    // ========================================================

    const readButton =
        card.querySelector(
            ".read-button"
        );

    if (readButton) {

        readButton.addEventListener(
            "click",
            function () {

                if (!novel.filename) {

                    console.error(
                        "Novel filename is missing:",
                        novel
                    );

                    return;
                }


                window.location.href =
                    `novel.html?file=${encodeURIComponent(
                        novel.filename
                    )}`;

            }
        );
    }


    // ========================================================
    // EDIT BUTTON
    // ========================================================

    const editButton =
        card.querySelector(
            ".edit-button"
        );

    if (editButton) {

        editButton.addEventListener(
            "click",
            function () {

                if (!novel.filename) {
                    return;
                }

                editNovel(
                    novel.filename
                );

            }
        );
    }


    // ========================================================
    // IMAGE FALLBACK
    // ========================================================

    const image =
        card.querySelector(
            ".novel-card-cover"
        );

    if (image) {

        image.onerror =
            function () {

                this.onerror = null;

                this.src =
                    "https://via.placeholder.com/220x300?text=No+Cover";
            };
    }


    return card;
}
// ============================================================
// NOVEL PAGE
// ============================================================

async function initializeNovelPage() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const filename =
        params.get("file");

    if (!filename) {

        showNovelError(
            "Novel file was not specified."
        );

        return;
    }

    await loadNovel(filename);
}


// ============================================================
// LOAD SINGLE NOVEL
// ============================================================

async function loadNovel(filename) {

    const loading =
        document.getElementById(
            "loading"
        );

    const content =
        document.getElementById(
            "novelContent"
        );

    const error =
        document.getElementById(
            "error"
        );


    // --------------------------------------------------------
    // SHOW LOADING
    // --------------------------------------------------------

    if (loading) {

        loading.style.display =
            "block";
    }

    if (content) {

        content.style.display =
            "none";
    }

    if (error) {

        error.style.display =
            "none";
    }


    try {

        const response =
            await fetch(
                `${API_URL}/novel/${encodeURIComponent(
                    filename
                )}`
            );


        let novel;


        try {

            novel =
                await response.json();

        } catch {

            throw new Error(
                "Server returned an invalid response."
            );
        }


        if (!response.ok) {

            throw new Error(
                novel.error ||
                "Novel not found."
            );
        }


        // ----------------------------------------------------
        // NOVEL INFORMATION
        // ----------------------------------------------------

        setText(
            "novelTitle",
            novel.title ||
            "Untitled Novel"
        );

        setText(
            "novelAuthor",
            novel.author ||
            "Unknown"
        );

        setText(
            "novelGenre",
            novel.genre ||
            "Unknown"
        );

        setText(
            "novelStatus",
            novel.status ||
            "Unknown"
        );

        setText(
            "novelChapters",
            novel.total_chapters ||
            0
        );

        setText(
            "novelSynopsis",
            novel.synopsis ||
            "No synopsis available."
        );


        // ----------------------------------------------------
        // COVER IMAGE
        // ----------------------------------------------------

        const cover =
            document.getElementById(
                "coverImage"
            );

        if (cover) {

            cover.src =
                novel.cover_image ||
                "https://via.placeholder.com/300x420?text=No+Cover";

            cover.alt =
                novel.title ||
                "Novel Cover";

            cover.onerror =
                function () {

                    this.onerror = null;

                    this.src =
                        "https://via.placeholder.com/300x420?text=No+Cover";
                };
        }


        // ----------------------------------------------------
        // CHAPTERS
        // ----------------------------------------------------

        const chapters =
            Array.isArray(
                novel.chapters
            )
                ? novel.chapters
                : [];

        currentChapters =
            chapters;

        currentChapterIndex =
            -1;

        displayChapters(
            chapters
        );


        // ----------------------------------------------------
        // SHOW CONTENT
        // ----------------------------------------------------

        if (loading) {

            loading.style.display =
                "none";
        }

        if (content) {

            content.style.display =
                "block";
        }

    } catch (err) {

        console.error(
            "Novel Error:",
            err
        );

        if (loading) {

            loading.style.display =
                "none";
        }

        showNovelError(
            err.message ||
            "Failed to load novel."
        );
    }
}

// ============================================================
// DISPLAY CHAPTERS
// ============================================================

function displayChapters(chapters) {

    const container =
        document.getElementById(
            "chaptersList"
        );

    const count =
        document.getElementById(
            "chapterCount"
        );

    if (!container) {
        return;
    }

    // --------------------------------------------------------
    // CHAPTER COUNT
    // --------------------------------------------------------

    if (count) {

        count.textContent =
            `${chapters.length} ${
                chapters.length === 1
                    ? "Chapter"
                    : "Chapters"
            }`;

    }

    container.innerHTML = "";

    // --------------------------------------------------------
    // NO CHAPTERS
    // --------------------------------------------------------

    if (chapters.length === 0) {

        container.innerHTML = `
            <p class="empty-message">
                No chapters available.
            </p>
        `;

        return;
    }

    // --------------------------------------------------------
    // CHAPTER BUTTONS
    // --------------------------------------------------------

    chapters.forEach(
        chapter => {

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "chapter-button";

            button.type =
                "button";

            const chapterNumber =
                chapter.chapter_number ?? "";

            // ------------------------------------------------
            // PROFESSIONAL CHAPTER BUTTON
            // ------------------------------------------------

            button.innerHTML = `

                <span class="chapter-number">
                    ${escapeHtml(
                        String(chapterNumber)
                    )}
                </span>

                <span class="chapter-info">

                    <span class="chapter-label">
                        CHAPTER
                    </span>

                    <span class="chapter-title">
                        ${escapeHtml(
                            String(chapterNumber)
                        )}
                    </span>

                </span>

                <span
                    class="chapter-arrow"
                    aria-hidden="true"
                >
                    →
                </span>

            `;

            // ------------------------------------------------
            // OPEN CHAPTER
            // ------------------------------------------------

            button.addEventListener(
                "click",
                () => {

                    openChapter(
                        chapter
                    );

                }
            );

            // ------------------------------------------------
            // ADD BUTTON TO CONTAINER
            // ------------------------------------------------

            container.appendChild(
                button
            );

        }
    );

}

// ============================================================
// OPEN CHAPTER
// ============================================================

function openChapter(chapter) {
    const modal =
        document.getElementById(
            "readerModal"
        );

    const title =
        document.getElementById(
            "readerTitle"
        );

    const content =
        document.getElementById(
            "readerContent"
        );

    // --------------------------------------------------------
    // CHECK ELEMENTS
    // --------------------------------------------------------

    if (
        !modal ||
        !title ||
        !content
    ) {
        console.error(
            "Reader modal, title, or content element not found."
        );

        return;
    }

    // --------------------------------------------------------
    // FIND CURRENT CHAPTER
    // --------------------------------------------------------

    currentChapterIndex =
        currentChapters.findIndex(
            item =>
                String(
                    item.chapter_number
                ) ===
                String(
                    chapter.chapter_number
                )
        );

    // --------------------------------------------------------
    // CHAPTER TITLE
    // --------------------------------------------------------

    title.textContent =
        `Chapter ${chapter.chapter_number}`;

    // --------------------------------------------------------
    // CHAPTER CONTENT
    // --------------------------------------------------------

    content.innerHTML =
        formatChapterContent(
            chapter.content || ""
        );

    // --------------------------------------------------------
    // UPDATE READER NAVIGATION
    // --------------------------------------------------------

    updateReaderNavigation();

    // --------------------------------------------------------
    // UPDATE CHAPTER LIST
    // --------------------------------------------------------

    populateReaderChapterList();

    // --------------------------------------------------------
    // CLOSE CHAPTER LIST IF OPEN
    // --------------------------------------------------------

    const chapterList =
        document.getElementById(
            "readerChapterList"
        );

    if (chapterList) {
        chapterList.style.display =
            "none";
    }

    const readerContent =
        document.getElementById(
            "readerContent"
        );

    const readerNavigation =
        document.querySelector(
            ".reader-navigation"
        );

    if (readerContent) {
        readerContent.style.display =
            "block";
    }

    if (readerNavigation) {
        readerNavigation.style.display =
            "grid";
    }

    // --------------------------------------------------------
    // SHOW MODAL
    // --------------------------------------------------------

    modal.style.display =
        "flex";

    // Prevent background scrolling
    document.body.style.overflow =
        "hidden";

    // Start chapter from top
    content.scrollTop =
        0;

    // Also scroll reader box to top
    const readerBox =
        document.querySelector(
            ".reader-box"
        );

    if (readerBox) {
        readerBox.scrollTop =
            0;
    }
}

// ============================================================
// UPDATE READER NAVIGATION
// ============================================================

function updateReaderNavigation() {
    const previousButton =
        document.getElementById(
            "previousChapter"
        );

    const nextButton =
        document.getElementById(
            "nextChapter"
        );

    if (
        !previousButton ||
        !nextButton
    ) {
        return;
    }

    // --------------------------------------------------------
    // FIRST CHAPTER
    // --------------------------------------------------------

    if (
        currentChapterIndex <= 0
    ) {

        previousButton.disabled =
            true;

        previousButton.style.visibility =
            "hidden";

    } else {

        previousButton.disabled =
            false;

        previousButton.style.visibility =
            "visible";
    }

    // --------------------------------------------------------
    // LAST CHAPTER
    // --------------------------------------------------------

    if (
        currentChapterIndex >=
        currentChapters.length - 1
    ) {

        nextButton.disabled =
            true;

        nextButton.style.visibility =
            "hidden";

    } else {

        nextButton.disabled =
            false;

        nextButton.style.visibility =
            "visible";
    }
}

// ============================================================
// PREVIOUS CHAPTER
// ============================================================

function openPreviousChapter() {
    if (
        currentChapterIndex <= 0
    ) {
        return;
    }

    const previousChapter =
        currentChapters[
            currentChapterIndex - 1
        ];

    if (previousChapter) {
        openChapter(
            previousChapter
        );
    }
}

// ============================================================
// NEXT CHAPTER
// ============================================================

function openNextChapter() {
    if (
        currentChapterIndex < 0 ||
        currentChapterIndex >=
            currentChapters.length - 1
    ) {
        return;
    }

    const nextChapter =
        currentChapters[
            currentChapterIndex + 1
        ];

    if (nextChapter) {
        openChapter(
            nextChapter
        );
    }
}

// ============================================================
// POPULATE READER CHAPTER LIST
// ============================================================

function populateReaderChapterList() {
    const container =
        document.getElementById(
            "readerChapters"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(currentChapters) ||
        currentChapters.length === 0
    ) {

        container.innerHTML = `
            <p class="empty-message">
                No chapters available.
            </p>
        `;

        return;
    }

    currentChapters.forEach(
        (chapter, index) => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "reader-chapter-item";

            if (
                index === currentChapterIndex
            ) {
                button.classList.add(
                    "active"
                );
            }

            button.innerHTML = `
                <span>
                    Chapter
                    ${escapeHtml(
                        chapter.chapter_number
                    )}
                </span>

                <span>
                    →
                </span>
            `;

            button.addEventListener(
                "click",
                () => {
                    openChapter(
                        chapter
                    );
                }
            );

            container.appendChild(
                button
            );
        }
    );
}

// ============================================================
// OPEN / CLOSE CHAPTER LIST
// ============================================================

function toggleChapterList() {
    const chapterList =
        document.getElementById(
            "readerChapterList"
        );

    const readerContent =
        document.getElementById(
            "readerContent"
        );

    const readerNavigation =
        document.querySelector(
            ".reader-navigation"
        );

    if (!chapterList) {
        return;
    }

    const isOpen =
        chapterList.style.display ===
        "block";

    if (isOpen) {

        // ----------------------------------------------------
        // CLOSE CHAPTER LIST
        // ----------------------------------------------------

        chapterList.style.display =
            "none";

        // Show chapter content
        if (readerContent) {
            readerContent.style.display =
                "block";
        }

        // Show navigation
        if (readerNavigation) {
            readerNavigation.style.display =
                "grid";
        }

    } else {

        // ----------------------------------------------------
        // OPEN CHAPTER LIST
        // ----------------------------------------------------

        chapterList.style.display =
            "block";

        // Hide chapter content completely
        if (readerContent) {
            readerContent.style.display =
                "none";
        }

        // Hide reader navigation
        if (readerNavigation) {
            readerNavigation.style.display =
                "none";
        }

        // Make sure chapter list is updated
        populateReaderChapterList();
    }
}

// ============================================================
// CLOSE READER
// ============================================================

function closeReader() {
    const modal =
        document.getElementById(
            "readerModal"
        );

    if (!modal) {
        return;
    }

    modal.style.display =
        "none";

    document.body.style.overflow =
        "";

    const content =
        document.getElementById(
            "readerContent"
        );

    if (content) {
        content.innerHTML =
            "";

        content.style.display =
            "block";
    }

    const chapterList =
        document.getElementById(
            "readerChapterList"
        );

    if (chapterList) {
        chapterList.style.display =
            "none";
    }

    const readerNavigation =
        document.querySelector(
            ".reader-navigation"
        );

    if (readerNavigation) {
        readerNavigation.style.display =
            "grid";
    }

    currentChapterIndex =
        -1;
}

// ============================================================
// READER EVENTS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // ----------------------------------------------------
        // CLOSE READER
        // ----------------------------------------------------

        const closeButton =
            document.getElementById(
                "closeReader"
            );

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();

                    closeReader();
                }
            );
        }

        // ----------------------------------------------------
        // PREVIOUS CHAPTER
        // ----------------------------------------------------

        const previousButton =
            document.getElementById(
                "previousChapter"
            );

        if (previousButton) {
            previousButton.addEventListener(
                "click",
                function () {
                    openPreviousChapter();
                }
            );
        }

        // ----------------------------------------------------
        // NEXT CHAPTER
        // ----------------------------------------------------

        const nextButton =
            document.getElementById(
                "nextChapter"
            );

        if (nextButton) {
            nextButton.addEventListener(
                "click",
                function () {
                    openNextChapter();
                }
            );
        }

        // ----------------------------------------------------
        // CHAPTER LIST
        // ----------------------------------------------------

        const chapterListButton =
            document.getElementById(
                "chapterListButton"
            );

        if (chapterListButton) {
            chapterListButton.addEventListener(
                "click",
                function () {
                    toggleChapterList();
                }
            );
        }

        // ----------------------------------------------------
        // CLOSE CHAPTER LIST
        // ----------------------------------------------------

        const closeChapterListButton =
            document.getElementById(
                "closeChapterList"
            );

        if (closeChapterListButton) {
            closeChapterListButton.addEventListener(
                "click",
                function () {
                    toggleChapterList();
                }
            );
        }
    }
);

// ============================================================
// CLOSE MODAL OUTSIDE
// ============================================================

document.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "readerModal"
            );

        if (!modal) {
            return;
        }

        if (
            event.target === modal
        ) {
            closeReader();
        }
    }
);

// ============================================================
// ESC KEY
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            const modal =
                document.getElementById(
                    "readerModal"
                );

            if (
                modal &&
                modal.style.display ===
                    "flex"
            ) {
                closeReader();
            }
        }
    }
);

// ============================================================
// FORMAT CHAPTER CONTENT
// ============================================================

function formatChapterContent(content) {

    if (!content) {
        return `
            <p class="empty-message">
                Chapter content is not available.
            </p>
        `;
    }

    let text =
        String(content);

    // --------------------------------------------------------
    // REMOVE "THANK YOU FOR READING" ADVERTISEMENT
    // --------------------------------------------------------

    text = text.replace(
        /Thank you for reading on CrushNovels\s*!.*?support!/gis,
        ""
    );

    // --------------------------------------------------------
    // REMOVE FOLLOW NEW EPISODES MESSAGE
    // --------------------------------------------------------

    text = text.replace(
        /Follow new episodes on the CrushnovelS?\.Com/gi,
        ""
    );

    // --------------------------------------------------------
    // REMOVE GOODNOVEL PROMOTIONS
    // --------------------------------------------------------

    text = text.replace(
        /Our website offers a complete collection of GoodNovel novels\s*\.?/gi,
        ""
    );

    text = text.replace(
        /Readers can easily search and read any GoodNovel story online\s*\.?/gi,
        ""
    );

    text = text.replace(
        /Click here to browse all GoodNovel short novels/gi,
        ""
    );

    // --------------------------------------------------------
    // REMOVE OTHER ADVERTISEMENTS
    // --------------------------------------------------------

    text = text.replace(
        /Register for membership to remove ads\s*\.?/gi,
        ""
    );

    text = text.replace(
        /Share novels to remove ads and enjoy ad-free reading!/gi,
        ""
    );

    // --------------------------------------------------------
    // REMOVE WEBSITE BRANDING
    // --------------------------------------------------------

    text = text.replace(
        /By\s+CrushNovels/gi,
        ""
    );

    text = text.replace(
        /By\s+CrushReadNovel/gi,
        ""
    );

    // --------------------------------------------------------
    // REMOVE LISTEN MODE MESSAGE
    // --------------------------------------------------------

    text = text.replace(
        /Listen mode uses high-quality English narration and is reserved for Premium members\.?/gi,
        ""
    );

    // --------------------------------------------------------
    // REMOVE NOVEL TITLE + CHAPTER HEADING
    // --------------------------------------------------------

    text = text.replace(
        /^.*?\bChapter\s+\d+\b\s*/i,
        ""
    );

    // --------------------------------------------------------
    // NORMALIZE LINE BREAKS
    // --------------------------------------------------------

    text =
        text.replace(
            /\r\n/g,
            "\n"
        );

    text =
        text.replace(
            /\r/g,
            "\n"
        );

    // --------------------------------------------------------
    // SPLIT ORIGINAL PARAGRAPHS
    // --------------------------------------------------------

    const paragraphs =
        text
            .split(/\n\s*\n+/)
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(
                paragraph =>
                    paragraph.length > 0
            );

    // --------------------------------------------------------
    // FALLBACK FOR SINGLE LINE BREAKS
    // --------------------------------------------------------

    if (
        paragraphs.length === 1
    ) {

        const lines =
            text
                .split(/\n/)
                .map(
                    line =>
                        line.trim()
                )
                .filter(
                    line =>
                        line.length > 0
                );

        if (
            lines.length > 1
        ) {

            return lines
                .map(
                    paragraph => `
                        <p>
                            ${escapeHtml(
                                paragraph
                            )}
                        </p>
                    `
                )
                .join("");
        }
    }

    // --------------------------------------------------------
    // CREATE HTML PARAGRAPHS
    // --------------------------------------------------------

    return paragraphs
        .map(
            paragraph => `
                <p>
                    ${escapeHtml(
                        paragraph
                    )}
                </p>
            `
        )
        .join("");
}

// ============================================================
// SHOW NOVEL ERROR
// ============================================================

function showNovelError(text) {
    const error =
        document.getElementById(
            "error"
        );

    if (!error) {
        return;
    }

    error.textContent =
        `❌ ${text}`;

    error.style.display =
        "block";
}

// ============================================================
// SET TEXT
// ============================================================

function setText(
    elementId,
    value
) {
    const element =
        document.getElementById(
            elementId
        );

    if (element) {
        element.textContent =
            value ?? "";
    }
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {
    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(
            value ?? ""
        );

    return div.innerHTML;
}

// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(
    message,
    type = "info"
) {
    const messageBox =
        document.getElementById(
            "message"
        );

    if (!messageBox) {
        console.log(message);
        return;
    }

    messageBox.textContent =
        message;

    messageBox.className =
        `message ${type}`;
}

// ============================================================
// CREATE DYNAMIC GENRE FILTERS
// ============================================================

function createGenreFilters(novels) {
    const genreFilters =
        document.getElementById(
            "genreFilters"
        );

    if (!genreFilters) {
        return;
    }

    const genres =
        new Set();

    novels.forEach(
        novel => {

            if (!novel.genre) {
                return;
            }

            const novelGenres =
                novel.genre
                    .split(",")
                    .map(
                        genre =>
                            genre.trim()
                    )
                    .filter(
                        genre =>
                            genre
                    );

            novelGenres.forEach(
                genre => {
                    genres.add(
                        genre
                    );
                }
            );
        }
    );

    const sortedGenres =
        Array.from(
            genres
        ).sort();

    genreFilters.innerHTML =
        "";

    const allButton =
        document.createElement(
            "button"
        );

    allButton.type =
        "button";

    allButton.className =
        "genre-button active";

    allButton.dataset.genre =
        "all";

    allButton.textContent =
        "All";

    genreFilters.appendChild(
        allButton
    );

    sortedGenres.forEach(
        genre => {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "genre-button";

            button.dataset.genre =
                genre;

            button.textContent =
                genre;

            genreFilters.appendChild(
                button
            );
        }
    );

    genreFilters.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".genre-button"
                );

            if (!button) {
                return;
            }

            selectedGenre =
                button.dataset.genre;

            document
                .querySelectorAll(
                    ".genre-button"
                )
                .forEach(
                    btn => {
                        btn.classList.remove(
                            "active"
                        );
                    }
                );

            button.classList.add(
                "active"
            );

            displayFilteredNovels();
        }
    );

    const genreCount =
        document.getElementById(
            "genreCount"
        );

    if (genreCount) {
        genreCount.textContent =
            `${sortedGenres.length} Genres`;
    }
}

// ============================================================
// DISPLAY FILTERED NOVELS
// ============================================================

function displayFilteredNovels() {
    const novelsContainer =
        document.getElementById(
            "novelsList"
        );

    const novelCount =
        document.getElementById(
            "novelCount"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (!novelsContainer) {
        return;
    }

    // --------------------------------------------------------
    // GET SEARCH TEXT
    // --------------------------------------------------------

    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";

    // --------------------------------------------------------
    // FILTER NOVELS
    // --------------------------------------------------------

    const filteredNovels =
        allNovels.filter(
            novel => {

                const title =
                    (
                        novel.title ||
                        ""
                    ).toLowerCase();

                const author =
                    (
                        novel.author ||
                        ""
                    ).toLowerCase();

                const genres =
                    (
                        novel.genre ||
                        ""
                    )
                        .toLowerCase()
                        .split(",")
                        .map(
                            value =>
                                value.trim()
                        );

                // Search by title OR author
                const matchesSearch =
                    title.includes(
                        searchText
                    ) ||
                    author.includes(
                        searchText
                    );

                // Genre filter
                const matchesGenre =
                    selectedGenre === "all" ||
                    genres.includes(
                        selectedGenre.toLowerCase()
                    );

                return (
                    matchesSearch &&
                    matchesGenre
                );
            }
        );

    // --------------------------------------------------------
    // UPDATE NOVEL COUNT
    // --------------------------------------------------------

    if (novelCount) {
        novelCount.textContent =
            `${filteredNovels.length} ${
                filteredNovels.length === 1
                    ? "Novel"
                    : "Novels"
            }`;
    }

    // --------------------------------------------------------
    // NO RESULTS
    // --------------------------------------------------------

    if (
        filteredNovels.length === 0
    ) {

        novelsContainer.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📚
                </div>

                <h3>
                    No novels found
                </h3>

                <p>
                    Try another title, author, or genre.
                </p>

            </div>
        `;

        return;
    }

    // --------------------------------------------------------
    // DISPLAY FILTERED NOVELS
    // --------------------------------------------------------

    novelsContainer.innerHTML =
        "";

    filteredNovels.forEach(
        novel => {

            const card =
                createNovelCard(
                    novel
                );

            novelsContainer.appendChild(
                card
            );
        }
    );
}

// ============================================================
// SEARCH INPUT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const searchInput =
            document.getElementById(
                "searchInput"
            );

        if (searchInput) {
            searchInput.addEventListener(
                "input",
                function () {
                    displayFilteredNovels();
                }
            );
        }
    }
);

// ============================================================
// LOAD MANUAL NOVELS
// ============================================================

async function loadManualNovels() {

    const container =
        document.getElementById(
            "manualNovelsList"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );

        if (!response.ok) {
            throw new Error(
                "Could not load novels."
            );
        }

        const novels =
            await response.json();

        const manualNovels =
            novels.filter(
                novel =>
                    novel.is_manual === true
            );

        // ----------------------------------------------------
        // NO MANUAL NOVELS
        // ----------------------------------------------------

        if (
            manualNovels.length === 0
        ) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        📚
                    </div>

                    <h3>
                        No manual novels yet
                    </h3>

                    <p>
                        Add your first novel manually.
                    </p>

                </div>
            `;

            return;
        }

        // ----------------------------------------------------
        // DISPLAY MANUAL NOVELS
        // ----------------------------------------------------

        container.innerHTML = "";

        manualNovels.forEach(
            novel => {

                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "novel-card";

                const cover =
                    novel.cover_image ||
                    "https://via.placeholder.com/220x300?text=No+Cover";

                card.innerHTML = `
                    <img
                        src="${escapeHtml(cover)}"
                        alt="${escapeHtml(
                            novel.title ||
                            "Novel Cover"
                        )}"
                        class="novel-card-cover"
                    >

                    <div class="novel-card-content">

                        <h3>
                            ${escapeHtml(
                                novel.title ||
                                "Untitled Novel"
                            )}
                        </h3>

                        <p>
                            <strong>Author:</strong>
                            ${escapeHtml(
                                novel.author ||
                                "Unknown"
                            )}
                        </p>

                        <p>
                            <strong>Genre:</strong>
                            ${escapeHtml(
                                novel.genre ||
                                "Unknown"
                            )}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            ${escapeHtml(
                                novel.status ||
                                "Unknown"
                            )}
                        </p>

                        <p>
                            <strong>Chapters:</strong>
                            ${Number(
                                novel.total_chapters ||
                                0
                            )}
                        </p>

                        <div class="manual-novel-actions">

                            <button
                                type="button"
                                class="read-button"
                            >
                                📖 Read
                            </button>

                            <button
                                type="button"
                                class="edit-novel-button"
                            >
                                ✏️ Edit
                            </button>

                        </div>

                    </div>
                `;

                const readButton =
                    card.querySelector(
                        ".read-button"
                    );

                if (readButton) {
                    readButton.addEventListener(
                        "click",
                        function () {
                            openNovel(
                                novel.filename
                            );
                        }
                    );
                }

                const editButton =
                    card.querySelector(
                        ".edit-novel-button"
                    );

                if (editButton) {
                    editButton.addEventListener(
                        "click",
                        function () {
                            editNovel(
                                novel.filename
                            );
                        }
                    );
                }

                container.appendChild(
                    card
                );
            }
        );

    } catch (error) {

        console.error(
            "Manual Novels Error:",
            error
        );

        container.innerHTML = `
            <p class="error-box">
                ❌ Failed to load manual novels.
            </p>
        `;
    }
}

// ============================================================
// EDIT NOVEL
// ============================================================

function editNovel(filename) {
    if (!filename) {
        return;
    }

    window.location.href =
        `edit_novel.html?file=${encodeURIComponent(
            filename
        )}`;
}

// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================

function editManualNovel(filename) {
    editNovel(filename);
}

