const API_URL = "http://127.0.0.1:5000";

let allNovels = [];
let selectedGenre = "all";
let currentChapters = [];
let currentChapterIndex = -1;
let currentNovelId = null;
let currentNovelFilename = "";
let currentNovelSaved = false;

const currentPage = window.location.pathname;


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    if (
        currentPage.endsWith("index.html") ||
        currentPage === "/" ||
        currentPage.endsWith("/")
    ) {
        initializeHomePage();
    }

    if (currentPage.endsWith("scraper.html")) {
        initializeScraperPage();
    }

    if (currentPage.endsWith("novel.html")) {
        initializeNovelPage();
    }
});


// ============================================================
// HOME PAGE
// ============================================================

async function initializeHomePage() {

    await loadNovels();

    createGenreFilters();

    const searchInput =
        document.getElementById("searchInput");

    if (searchInput && !searchInput.dataset.bound) {

        searchInput.dataset.bound = "true";

        searchInput.addEventListener(
            "input",
            function () {

                displayFilteredNovels(
                    this.value.trim()
                );

            }
        );
    }
}


// ============================================================
// LOAD NOVELS
// ============================================================

async function loadNovels() {

    const container =
        document.getElementById(
            "novelsContainer"
        );

    if (container) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Loading novels...</p>
            </div>
        `;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );

        if (!response.ok) {

            throw new Error(
                "Could not load novels"
            );
        }

        allNovels =
            await response.json();

        console.log(
            "Novels loaded:",
            allNovels
        );

        displayFilteredNovels("");

    } catch (error) {

        console.error(
            "Load Novels Error:",
            error
        );

        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load novels</h3>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }
}


// ============================================================
// DISPLAY FILTERED NOVELS
// ============================================================

function displayFilteredNovels(
    searchTerm = ""
) {

    const container =
        document.getElementById(
            "novelsContainer"
        );

    if (!container) {

        console.error(
            "novelsContainer not found."
        );

        return;
    }

    const normalizedSearch =
        searchTerm.toLowerCase();

    let filteredNovels =
        allNovels.filter(
            novel => {

                const matchesSearch =
                    !normalizedSearch ||
                    (
                        novel.title || ""
                    )
                        .toLowerCase()
                        .includes(
                            normalizedSearch
                        ) ||
                    (
                        novel.author || ""
                    )
                        .toLowerCase()
                        .includes(
                            normalizedSearch
                        );

                const matchesGenre =
                    selectedGenre === "all" ||
                    (
                        novel.genre || ""
                    )
                        .toLowerCase()
                        .includes(
                            selectedGenre.toLowerCase()
                        );

                return (
                    matchesSearch &&
                    matchesGenre
                );
            }
        );

    if (!filteredNovels.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No novels found</h3>
                <p>Try another search or genre.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    filteredNovels.forEach(
        novel => {

            container.appendChild(
                createNovelCard(novel)
            );

        }
    );
}


// ============================================================
// CREATE NOVEL CARD
// ============================================================

function createNovelCard(
    novel
) {

    const card =
        document.createElement("div");

    card.className =
        "novel-card";

    const cover =
        novel.cover_image
            ? (
                novel.cover_image.startsWith("/")
                    ? `${API_URL}${novel.cover_image}`
                    : novel.cover_image
            )
            : "";

    card.innerHTML = `
        <div class="novel-cover-wrapper">

            ${
                cover
                    ? `
                        <img
                            class="novel-cover"
                            src="${escapeHtml(cover)}"
                            alt="${escapeHtml(
                                novel.title || "Novel"
                            )}"
                            onerror="this.style.display='none'"
                        >
                    `
                    : `
                        <div class="novel-cover-placeholder">
                            NA
                        </div>
                    `
            }

        </div>

        <div class="novel-card-content">

            <h3>
                ${escapeHtml(
                    novel.title || "Untitled Novel"
                )}
            </h3>

            <p>
                ${escapeHtml(
                    novel.author || "Unknown Author"
                )}
            </p>

            <div class="novel-card-actions">

                <button
                    type="button"
                    class="read-novel-btn"
                >
                    Read
                </button>

            </div>

        </div>
    `;

    const readButton =
        card.querySelector(
            ".read-novel-btn"
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
            ".edit-novel-btn"
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

    return card;
}


// ============================================================
// GENRE FILTERS
// ============================================================

function createGenreFilters() {

    const container =
        document.getElementById(
            "genreFilters"
        );

    if (!container) {
        return;
    }

    const genres = new Set();

    allNovels.forEach(
        novel => {

            if (!novel.genre) {
                return;
            }

            novel.genre
                .split(",")
                .map(
                    genre => genre.trim()
                )
                .filter(Boolean)
                .forEach(
                    genre =>
                        genres.add(genre)
                );
        }
    );

    container.innerHTML = "";

    const allButton =
        document.createElement("button");

    allButton.type = "button";

    allButton.className =
        "genre-filter active";

    allButton.textContent =
        "All";

    allButton.addEventListener(
        "click",
        function () {

            selectedGenre = "all";

            document
                .querySelectorAll(
                    ".genre-filter"
                )
                .forEach(
                    button =>
                        button.classList.remove(
                            "active"
                        )
                );

            this.classList.add(
                "active"
            );

            const searchInput =
                document.getElementById(
                    "searchInput"
                );

            displayFilteredNovels(
                searchInput
                    ? searchInput.value.trim()
                    : ""
            );
        }
    );

    container.appendChild(
        allButton
    );

    Array.from(genres)
        .sort()
        .forEach(
            genre => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "genre-filter";

                button.textContent =
                    genre;

                button.addEventListener(
                    "click",
                    function () {

                        selectedGenre =
                            genre;

                        document
                            .querySelectorAll(
                                ".genre-filter"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );

                        this.classList.add(
                            "active"
                        );

                        const searchInput =
                            document.getElementById(
                                "searchInput"
                            );

                        displayFilteredNovels(
                            searchInput
                                ? searchInput.value.trim()
                                : ""
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
// OPEN NOVEL
// ============================================================

function openNovel(
    filename
) {

    if (!filename) {
        return;
    }

    window.location.href =
        `novel.html?file=${encodeURIComponent(
            filename
        )}`;
}


// ============================================================
// EDIT NOVEL
// ============================================================

function editNovel(
    filename
) {

    if (!filename) {
        return;
    }

    window.location.href =
        `edit_novel.html?file=${encodeURIComponent(
            filename
        )}`;
}


// ============================================================
// SCRAPER PAGE
// ============================================================

function initializeScraperPage() {

    const form =
        document.getElementById(
            "scrapeForm"
        );

    if (!form) {
        return;
    }

    if (!form.dataset.bound) {

        form.dataset.bound = "true";

        form.addEventListener(
            "submit",
            handleScrape
        );
    }

    loadManualNovels();
}


// ============================================================
// HANDLE SCRAPE
// ============================================================

async function handleScrape(
    event
) {

    event.preventDefault();

    const urlInput =
        document.getElementById(
            "url"
        );

    if (!urlInput) {
        return;
    }

    const url =
        urlInput.value.trim();

    if (!url) {

        showMessage(
            "Please enter a novel URL.",
            "error"
        );

        return;
    }

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        showMessage(
            "Admin login required.",
            "error"
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/scrape`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        url: url
                    })
                }
            );

        const data =
            await response.json();

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "admin_login.html";

            return;
        }

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Scraping failed"
            );
        }

        showMessage(
            data.message ||
            "Novel scraped successfully.",
            "success"
        );

        urlInput.value = "";

        await loadNovels();

    } catch (error) {

        console.error(
            "Scrape Error:",
            error
        );

        showMessage(
            error.message ||
            "Scraping failed.",
            "error"
        );
    }
}


// ============================================================
// LOAD MANUAL NOVELS
// ============================================================

async function loadManualNovels() {

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );

        if (!response.ok) {
            return;
        }

        const novels =
            await response.json();

        const container =
            document.getElementById(
                "manualNovels"
            );

        if (!container) {
            return;
        }

        const manualNovels =
            novels.filter(
                novel =>
                    novel.is_manual === true
            );

        if (!manualNovels.length) {

            container.innerHTML = `
                <div class="empty-state">
                    No manual novels found.
                </div>
            `;

            return;
        }

        container.innerHTML = "";

        manualNovels.forEach(
            novel => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "manual-novel-item";

                item.innerHTML = `
                    <strong>
                        ${escapeHtml(
                            novel.title ||
                            "Untitled Novel"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            novel.author ||
                            "Unknown Author"
                        )}
                    </span>
                `;

                container.appendChild(
                    item
                );
            }
        );

    } catch (error) {

        console.error(
            "Load Manual Novels Error:",
            error
        );
    }
}


// ============================================================
// NOVEL PAGE
// ============================================================

function initializeNovelPage() {

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

    loadNovel(
        filename
    );

    bindNovelReaderEvents();
}


// ============================================================
// LOAD NOVEL
// ============================================================

async function loadNovel(
    filename
) {

    try {

        const response =
            await fetch(
                `${API_URL}/novel/${encodeURIComponent(
                    filename
                )}`
            );

        if (!response.ok) {

            throw new Error(
                "Novel could not be loaded."
            );
        }

        const novel =
            await response.json();

        currentNovelFilename =
            filename;

        currentNovelId =
            novel.id || null;

        if (!currentNovelId) {

            currentNovelId =
                await findNovelIdByFilename(
                    filename
                );
        }

        setText(
            "novelTitle",
            novel.title ||
            "Untitled Novel"
        );

        setText(
            "novelAuthor",
            novel.author ||
            "Unknown Author"
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
            "novelSynopsis",
            novel.synopsis ||
            "No synopsis available."
        );

        const cover =
            document.getElementById(
                "coverImage"
            );

        if (cover) {

            if (novel.cover_image) {

                cover.src =
                    novel.cover_image.startsWith("/")
                        ? `${API_URL}${novel.cover_image}`
                        : novel.cover_image;

                cover.style.display =
                    "block";

            } else {

                cover.style.display =
                    "none";
            }
        }

        currentChapters =
            Array.isArray(
                novel.chapters
            )
                ? novel.chapters
                : [];

        displayChapters(
            currentChapters
        );

        await loadSavedNovelStatus();

    } catch (error) {

        console.error(
            "Load Novel Error:",
            error
        );

        showNovelError(
            error.message ||
            "Could not load novel."
        );
    }
}


// ============================================================
// FIND NOVEL ID BY FILENAME
// ============================================================

async function findNovelIdByFilename(
    filename
) {

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );

        if (!response.ok) {
            return null;
        }

        const novels =
            await response.json();

        const match =
            novels.find(
                novel =>
                    novel.filename === filename
            );

        return match
            ? (
                match.id ||
                null
            )
            : null;

    } catch (error) {

        console.error(
            "Find Novel ID Error:",
            error
        );

        return null;
    }
}


// ============================================================
// LOAD SAVED NOVEL STATUS
// ============================================================

async function loadSavedNovelStatus() {

    currentNovelSaved =
        false;

    updateSaveNovelButton(
        false
    );

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {
        return;
    }

    if (!currentNovelId) {

        console.warn(
            "Cannot load saved status: novel ID missing."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/user/saved`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user_data"
            );

            return;
        }

        if (!response.ok) {

            console.error(
                "Saved Status Error:",
                response.status
            );

            return;
        }

        const data =
            await response.json();

        const savedNovels =
            Array.isArray(
                data.saved_novels
            )
                ? data.saved_novels
                : [];

        currentNovelSaved =
            savedNovels.some(
                item =>
                    Number(
                        item.novel_id
                    ) === Number(
                        currentNovelId
                    )
            );

        updateSaveNovelButton(
            currentNovelSaved
        );

    } catch (error) {

        console.error(
            "Load Saved Status Error:",
            error
        );
    }
}


// ============================================================
// UPDATE SAVE BUTTON
// ============================================================

function updateSaveNovelButton(
    isSaved
) {

    const button =
        document.getElementById(
            "saveNovelBtn"
        );

    if (!button) {
        return;
    }

    if (isSaved) {

        button.textContent =
            "Saved";

        button.classList.add(
            "saved"
        );

        button.setAttribute(
            "aria-label",
            "Remove novel from saved stories"
        );

    } else {

        button.textContent =
            "Save";

        button.classList.remove(
            "saved"
        );

        button.setAttribute(
            "aria-label",
            "Save novel"
        );
    }
}


// ============================================================
// TOGGLE SAVED NOVEL
// ============================================================

async function toggleSavedNovel() {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {

        window.location.href =
            "user_login.html";

        return;
    }

    if (!currentNovelId) {

        showMessage(
            "Novel information is not available.",
            "error"
        );

        return;
    }

    try {

        let response;

        if (currentNovelSaved) {

            response =
                await fetch(
                    `${API_URL}/user/saved/${currentNovelId}`,
                    {
                        method: "DELETE",

                        headers: {
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );

        } else {

            response =
                await fetch(
                    `${API_URL}/user/saved`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            novel_id:
                                Number(
                                    currentNovelId
                                )
                        })
                    }
                );
        }

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user_data"
            );

            window.location.href =
                "user_login.html";

            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not update saved story."
            );
        }

        currentNovelSaved =
            !currentNovelSaved;

        updateSaveNovelButton(
            currentNovelSaved
        );

        showMessage(
            currentNovelSaved
                ? "Novel saved to your library."
                : "Novel removed from your saved stories.",
            "success"
        );

    } catch (error) {

        console.error(
            "Toggle Saved Novel Error:",
            error
        );

        showMessage(
            error.message ||
            "Could not update saved story.",
            "error"
        );
    }
}


// ============================================================
// SAVE READING HISTORY
// ============================================================

async function saveReadingHistory(
    chapter
) {

    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {
        return;
    }

    if (!currentNovelId) {

        console.warn(
            "Reading history not saved: novel ID missing."
        );

        return;
    }

    if (!chapter) {

        console.warn(
            "Reading history not saved: chapter missing."
        );

        return;
    }

    const chapterId =
        chapter.id || null;

    const chapterNumber =
        chapter.chapter_number || null;

    if (!chapterNumber) {

        console.warn(
            "Reading history not saved: chapter number missing."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/user/reading-history`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        novel_id:
                            Number(
                                currentNovelId
                            ),

                        chapter_id:
                            chapterId
                                ? Number(
                                    chapterId
                                )
                                : null,

                        chapter_number:
                            Number(
                                chapterNumber
                            )
                    })
                }
            );

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "user_data"
            );

            return;
        }

        if (!response.ok) {

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );

            console.error(
                "Reading History Save Failed:",
                data.error ||
                response.statusText
            );

            return;
        }

        const data =
            await response.json();

        console.log(
            "Reading history saved:",
            data
        );

    } catch (error) {

        console.error(
            "Save Reading History Error:",
            error
        );
    }
}


// ============================================================
// DISPLAY CHAPTERS
// ============================================================

function displayChapters(
    chapters
) {

    const container =
        document.getElementById(
            "chapterList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(chapters) ||
        !chapters.length
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No chapters available.
            </div>
        `;

        return;
    }

    chapters.forEach(
        (chapter, index) => {

            const item =
                document.createElement(
                    "button"
                );

            item.type = "button";

            item.className =
                "chapter-item";

            item.dataset.index =
                index;

            item.innerHTML = `
                <span class="chapter-number">
                    Chapter
                    ${escapeHtml(
                        String(
                            chapter.chapter_number ||
                            index + 1
                        )
                    )}
                </span>

                <span class="chapter-title">
                    ${escapeHtml(
                        chapter.title ||
                        `Chapter ${
                            chapter.chapter_number ||
                            index + 1
                        }`
                    )}
                </span>
            `;

            item.addEventListener(
                "click",
                function () {

                    openChapter(
                        index
                    );

                }
            );

            container.appendChild(
                item
            );
        }
    );
}


// ============================================================
// OPEN CHAPTER
// ============================================================

async function openChapter(
    chapterOrIndex
) {

    let index = -1;

    if (
        typeof chapterOrIndex ===
        "number"
    ) {

        index =
            chapterOrIndex;

    } else if (
        chapterOrIndex &&
        typeof chapterOrIndex ===
        "object"
    ) {

        index =
            currentChapters.indexOf(
                chapterOrIndex
            );
    }

    if (
        index < 0 ||
        index >= currentChapters.length
    ) {

        return;
    }

    currentChapterIndex =
        index;

    const chapter =
        currentChapters[index];

    const readerTitle =
        document.getElementById(
            "readerChapterTitle"
        );

    const readerContent =
        document.getElementById(
            "readerContent"
        );

    if (readerTitle) {

        readerTitle.textContent =
            chapter.title ||
            `Chapter ${
                chapter.chapter_number ||
                index + 1
            }`;
    }

    if (readerContent) {

        readerContent.innerHTML =
            formatChapterContent(
                chapter.content ||
                ""
            );
    }

    await saveReadingHistory(
        chapter
    );

    updateReaderNavigation();

    populateReaderChapterList();

    const modal =
        document.getElementById(
            "chapterReader"
        );

    if (modal) {

        modal.classList.add(
            "active"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// READER NAVIGATION
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

    if (previousButton) {

        previousButton.disabled =
            currentChapterIndex <= 0;
    }

    if (nextButton) {

        nextButton.disabled =
            currentChapterIndex >=
            currentChapters.length - 1;
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

    openChapter(
        currentChapterIndex - 1
    );
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

    openChapter(
        currentChapterIndex + 1
    );
}


// ============================================================
// POPULATE READER CHAPTER LIST
// ============================================================

function populateReaderChapterList() {

    const container =
        document.getElementById(
            "readerChapterList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    currentChapters.forEach(
        (chapter, index) => {

            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";

            button.className =
                "reader-chapter-item";

            if (
                index ===
                currentChapterIndex
            ) {

                button.classList.add(
                    "active"
                );
            }

            button.innerHTML = `
                <span>
                    Chapter
                    ${escapeHtml(
                        String(
                            chapter.chapter_number ||
                            index + 1
                        )
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        chapter.title ||
                        ""
                    )}
                </span>
            `;

            button.addEventListener(
                "click",
                function () {

                    openChapter(
                        index
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
// TOGGLE CHAPTER LIST
// ============================================================

function toggleChapterList() {

    const list =
        document.getElementById(
            "readerChapterList"
        );

    if (!list) {
        return;
    }

    list.classList.toggle(
        "active"
    );
}


// ============================================================
// CLOSE READER
// ============================================================

function closeReader() {

    const modal =
        document.getElementById(
            "chapterReader"
        );

    if (modal) {

        modal.classList.remove(
            "active"
        );
    }
}


// ============================================================
// BIND READER EVENTS
// ============================================================

function bindNovelReaderEvents() {

    const previousButton =
        document.getElementById(
            "previousChapter"
        );

    if (
        previousButton &&
        !previousButton.dataset.bound
    ) {

        previousButton.dataset.bound =
            "true";

        previousButton.addEventListener(
            "click",
            openPreviousChapter
        );
    }

    const nextButton =
        document.getElementById(
            "nextChapter"
        );

    if (
        nextButton &&
        !nextButton.dataset.bound
    ) {

        nextButton.dataset.bound =
            "true";

        nextButton.addEventListener(
            "click",
            openNextChapter
        );
    }

    const closeButton =
        document.getElementById(
            "closeReader"
        );

    if (
        closeButton &&
        !closeButton.dataset.bound
    ) {

        closeButton.dataset.bound =
            "true";

        closeButton.addEventListener(
            "click",
            closeReader
        );
    }

    const chapterToggle =
        document.getElementById(
            "toggleChapterList"
        );

    if (
        chapterToggle &&
        !chapterToggle.dataset.bound
    ) {

        chapterToggle.dataset.bound =
            "true";

        chapterToggle.addEventListener(
            "click",
            toggleChapterList
        );
    }

    const saveButton =
        document.getElementById(
            "saveNovelBtn"
        );

    if (
        saveButton &&
        !saveButton.dataset.bound
    ) {

        saveButton.dataset.bound =
            "true";

        saveButton.addEventListener(
            "click",
            toggleSavedNovel
        );
    }

    if (!document.body.dataset.readerKeysBound) {

        document.body.dataset.readerKeysBound =
            "true";

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeReader();
                }

                if (
                    event.key ===
                    "ArrowLeft"
                ) {

                    openPreviousChapter();
                }

                if (
                    event.key ===
                    "ArrowRight"
                ) {

                    openNextChapter();
                }
            }
        );
    }

    const modal =
        document.getElementById(
            "chapterReader"
        );

    if (
        modal &&
        !modal.dataset.bound
    ) {

        modal.dataset.bound =
            "true";

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeReader();
                }
            }
        );
    }
}


// ============================================================
// FORMAT CHAPTER CONTENT
// ============================================================

function formatChapterContent(
    content
) {

    if (!content) {
        return "";
    }

    let cleaned =
        String(content);

    const unwantedPatterns = [

        /Listen mode uses high-quality English narration and is reserved for Premium members\.?/gi,

        /Listen mode uses high-quality English narration and is reserved for Premium members/gi,

        /reserved for Premium members/gi,

        /high-quality English narration/gi
    ];

    unwantedPatterns.forEach(
        pattern => {

            cleaned =
                cleaned.replace(
                    pattern,
                    ""
                );
        }
    );

    cleaned =
        cleaned.replace(
            /^\s*chapter\s+\d+[\s:.-].*?\n/i,
            ""
        );

    cleaned =
        cleaned.trim();

    if (
        /<[^>]+>/.test(
            cleaned
        )
    ) {

        return cleaned;
    }

    return escapeHtml(
        cleaned
    )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .replace(
            /\n/g,
            "<br>"
        );
}


// ============================================================
// SHOW NOVEL ERROR
// ============================================================

function showNovelError(
    message
) {

    const title =
        document.getElementById(
            "novelTitle"
        );

    if (title) {

        title.textContent =
            "Unable to Load Novel";
    }

    const content =
        document.getElementById(
            "novelSynopsis"
        );

    if (content) {

        content.textContent =
            message ||
            "An error occurred while loading this novel.";
    }
}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return;
    }

    element.textContent =
        value == null
            ? ""
            : value;
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value == null
            ? ""
            : value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showMessage(
    message,
    type = "info"
) {

    let messageBox =
        document.getElementById(
            "globalMessage"
        );

    if (!messageBox) {

        messageBox =
            document.createElement(
                "div"
            );

        messageBox.id =
            "globalMessage";

        document.body.appendChild(
            messageBox
        );
    }

    messageBox.textContent =
        message;

    messageBox.className =
        `global-message ${type}`;

    messageBox.classList.add(
        "show"
    );

    window.clearTimeout(
        messageBox._hideTimer
    );

    messageBox._hideTimer =
        window.setTimeout(
            function () {

                messageBox.classList.remove(
                    "show"
                );

            },
            3000
        );
}


// ============================================================
// COMPATIBILITY FUNCTIONS
// ============================================================

function editManualNovel(
    filename
) {

    editNovel(
        filename
    );
}