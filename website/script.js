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

    initializeUserHeader();
    initializeLibrarySidebar();

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

function initializeLibrarySidebar() {
    const sidebar = document.getElementById("librarySidebar");
    if (!sidebar) return;
    const token = localStorage.getItem("user_token");
    if (!token) {
        sidebar.remove();
        document.body.classList.remove("library-page");
        return;
    }
    const user = JSON.parse(localStorage.getItem("user_data") || "{}");
    const name = user.name || "Reader";
    sidebar.querySelector("[data-user-name]").textContent = name;
    sidebar.querySelector("[data-user-initial]").textContent = name.charAt(0).toUpperCase();
    sidebar.querySelector("[data-action='logout']").addEventListener("click", () => {
        localStorage.removeItem("user_token");
        localStorage.removeItem("user_data");
        window.location.href = "user_login.html";
    });
}

function initializeUserHeader() {
    const actions = document.getElementById("headerActions");
    if (!actions) return;
    if (!localStorage.getItem("user_token")) {
        actions.innerHTML = '<a href="user_login.html">Sign in</a><a href="user_signup.html" class="header-join">Create account</a>';
        return;
    }
    actions.innerHTML = "";
    const dashboard = document.createElement("a");
    dashboard.href = "user_dashboard.html";
    dashboard.textContent = "My reading";
    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "header-logout";
    logout.textContent = "Logout";
    logout.addEventListener("click", () => {
        localStorage.removeItem("user_token");
        localStorage.removeItem("user_data");
        window.location.href = "index.html";
    });
    actions.append(dashboard, logout);
}


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
// LOAD NOVEL
// ============================================================

async function loadNovel(filename) {
    const loading = document.getElementById("loading");
    const errorBox = document.getElementById("error");
    const novelContent = document.getElementById("novelContent");

    const titleElement = document.getElementById("novelTitle");
    const authorElement = document.getElementById("novelAuthor");
    const genreElement = document.getElementById("novelGenre");
    const statusElement = document.getElementById("novelStatus");
    const synopsisElement = document.getElementById("novelSynopsis");
    const coverElement = document.getElementById("coverImage");
    const chapterCountElement = document.getElementById("chapterCount");
    const chaptersList = document.getElementById("chaptersList");

    // ============================================================
    // INITIAL UI STATE
    // ============================================================

    if (loading) {
        loading.style.display = "block";
    }

    if (errorBox) {
        errorBox.style.display = "none";
    }

    if (novelContent) {
        novelContent.style.display = "none";
    }

    try {
        // ========================================================
        // VALIDATE FILENAME
        // ========================================================

        if (!filename) {
            throw new Error("Novel file was not specified.");
        }

        console.log("Loading novel:", filename);

        // ========================================================
        // API REQUEST WITH TIMEOUT
        // ========================================================

        const controller = new AbortController();

        const timeout = setTimeout(function () {
            controller.abort();
        }, 15000);

        let response;

        try {
            response = await fetch(
                `${API_URL}/novel/${encodeURIComponent(filename)}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    signal: controller.signal
                }
            );
        } finally {
            clearTimeout(timeout);
        }

        // ========================================================
        // CHECK HTTP RESPONSE
        // ========================================================

        if (!response.ok) {
            throw new Error(
                `Failed to load novel. Server returned ${response.status}.`
            );
        }

        const novel = await response.json();

        console.log("Novel API response:", novel);

        // ========================================================
        // VALIDATE RESPONSE
        // ========================================================

        if (!novel || typeof novel !== "object") {
            throw new Error("Invalid novel data received from server.");
        }

        // ========================================================
        // STORE NOVEL INFORMATION
        // ========================================================

        currentNovelFilename = filename;

        currentNovelId = novel.id || null;

        // ========================================================
        // FALLBACK: FIND NOVEL ID
        // ========================================================

        if (!currentNovelId) {
            try {
                currentNovelId = await findNovelIdByFilename(filename);

                console.log(
                    "Novel ID found using fallback:",
                    currentNovelId
                );
            } catch (idError) {
                console.warn(
                    "Could not find novel ID:",
                    idError
                );
            }
        }

        // ========================================================
        // NOVEL TITLE
        // ========================================================

        if (titleElement) {
            titleElement.textContent =
                novel.title || "Untitled Novel";
        }

        // ========================================================
        // AUTHOR
        // ========================================================

        if (authorElement) {
            authorElement.textContent =
                novel.author || "Unknown Author";
        }

        // ========================================================
        // GENRE
        // ========================================================

        if (genreElement) {
            genreElement.textContent =
                novel.genre || "Unknown Genre";
        }

        // ========================================================
        // STATUS
        // ========================================================

        if (statusElement) {
            statusElement.textContent =
                novel.status || "Unknown";
        }

        // ========================================================
        // SYNOPSIS
        // ========================================================

        if (synopsisElement) {
            synopsisElement.textContent =
                novel.synopsis || "No synopsis available.";
        }

        // ========================================================
        // COVER IMAGE
        // ========================================================

        if (coverElement) {

            if (novel.cover_image) {
                coverElement.src = novel.cover_image;
                coverElement.alt =
                    novel.title || "Novel Cover";

                coverElement.style.display = "block";
            } else {
                coverElement.removeAttribute("src");

                coverElement.alt = "No Cover Available";

                coverElement.style.display = "none";
            }
        }

        // ========================================================
        // CHAPTERS
        // ========================================================

        const chapters = Array.isArray(novel.chapters)
            ? novel.chapters
            : [];

        if (chapterCountElement) {
            chapterCountElement.textContent =
                chapters.length;
        }

        // ========================================================
        // DISPLAY CHAPTERS
        // ========================================================

        if (chaptersList) {

            chaptersList.innerHTML = "";

            if (chapters.length > 0) {

                displayChapters(chapters);

            } else {

                chaptersList.innerHTML = `
                    <div class="no-chapters">
                        No chapters available.
                    </div>
                `;
            }
        }

        // ========================================================
        // IMPORTANT:
        // SHOW NOVEL PAGE BEFORE SAVED REQUEST
        // ========================================================

        if (loading) {
            loading.style.display = "none";
        }

        if (errorBox) {
            errorBox.style.display = "none";
        }

        if (novelContent) {
            novelContent.style.display = "block";
        }

        console.log("Novel page displayed successfully.");

        // ========================================================
        // LOAD SAVED STATUS
        // DO NOT BLOCK THE NOVEL PAGE
        // ========================================================

        loadSavedNovelStatus()
            .catch(function (savedError) {

                console.warn(
                    "Unable to load saved status:",
                    savedError
                );

            });

    } catch (error) {

        // ========================================================
        // ERROR HANDLING
        // ========================================================

        console.error(
            "Error loading novel:",
            error
        );

        if (loading) {
            loading.style.display = "none";
        }

        if (novelContent) {
            novelContent.style.display = "none";
        }

        if (errorBox) {
            errorBox.style.display = "block";
        }

        showNovelError(
            error.name === "AbortError"
                ? "Novel loading timed out. Please try again."
                : error.message || "Unable to load novel."
        );
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
        <div class="novel-card-cover">

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

            <div class="novel-card-meta">
                <span>${escapeHtml(novel.genre || "Uncategorized")}</span>
                <span>${escapeHtml(novel.status || "Unknown")}</span>
                <span>${escapeHtml(String(novel.total_chapters || 0))} chapters</span>
            </div>

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

    setText(
        "genreCount",
        `${genres.size} ${genres.size === 1 ? "Genre" : "Genres"}`
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
            "novelUrl"
        );

    const scrapeButton =
        document.getElementById(
            "scrapeButton"
        );

    const buttonIcon =
        document.getElementById(
            "buttonIcon"
        );

    const buttonText =
        document.getElementById(
            "buttonText"
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
        sessionStorage.getItem(
            "adminToken"
        );

    if (!token) {

        showMessage(
            "Admin login required.",
            "error"
        );

        return;
    }

    // ========================================================
    // SHOW SCRAPING STATUS
    // ========================================================

    if (scrapeButton) {
        scrapeButton.disabled = true;
    }

    if (buttonIcon) {
        buttonIcon.textContent = "⟳";
    }

    if (buttonText) {
        buttonText.textContent =
            "Scraping Novel...";
    }

    showMessage(
        "Scraping novel through the provided URL. Please wait...",
        "success"
    );

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

        // ====================================================
        // HANDLE UNAUTHORIZED ACCESS
        // ====================================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            sessionStorage.removeItem(
                "adminToken"
            );

            sessionStorage.removeItem(
                "adminUser"
            );

            window.location.href =
                "admin_login.html";

            return;
        }

        // ====================================================
        // HANDLE SCRAPING ERROR
        // ====================================================

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Scraping failed."
            );
        }

        // ====================================================
        // SCRAPING SUCCESS
        // ====================================================

        showMessage(
            data.message ||
            "Novel scraped successfully through the provided URL.",
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
            "Scraping failed. Please try again.",
            "error"
        );

    } finally {

        // ====================================================
        // RESTORE BUTTON
        // ====================================================

        if (scrapeButton) {
            scrapeButton.disabled = false;
        }

        if (buttonIcon) {
            buttonIcon.textContent = "⌕";
        }

        if (buttonText) {
            buttonText.textContent =
                "Add Novel";
        }
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
        params.get("file") || params.get("novel");

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

        setText(
            "chapterCount",
            `${currentChapters.length} ${currentChapters.length === 1 ? "Chapter" : "Chapters"}`
        );

        displayChapters(
            currentChapters
        );

        await loadSavedNovelStatus();
        setNovelPageVisibility(true);

    } catch (error) {

        console.error(
            "Load Novel Error:",
            error
        );

        showNovelError(
            error.message ||
            "Could not load novel."
        );
        setNovelPageVisibility(false);
    }
}

function setNovelPageVisibility(isLoaded) {
    const loading = document.getElementById("loading");
    const content = document.getElementById("novelContent");
    const error = document.getElementById("error");
    if (loading) loading.style.display = "none";
    if (content) content.style.display = isLoaded ? "block" : "none";
    if (error) error.style.display = isLoaded ? "none" : "block";
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
            "user_token"
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
                "user_token"
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
            "saveNovelButton"
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
            "user_token"
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
                "user_token"
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
            "user_token"
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
                "user_token"
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
            "chaptersList"
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
            "readerTitle"
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
            "readerModal"
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
            "readerModal"
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
            "chapterListButton"
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
            "saveNovelButton"
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
            "readerModal"
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

function showNovelError(message) {

    const loading = document.getElementById("loading");
    const errorBox = document.getElementById("error");
    const novelContent = document.getElementById("novelContent");
    const titleElement = document.getElementById("novelTitle");
    const synopsisElement = document.getElementById("novelSynopsis");

    if (loading) {
        loading.style.display = "none";
    }

    if (novelContent) {
        novelContent.style.display = "none";
    }

    if (errorBox) {
        errorBox.style.display = "block";

        const errorMessage =
            errorBox.querySelector(".error-message");

        if (errorMessage) {
            errorMessage.textContent = message;
        } else {
            errorBox.textContent = message;
        }
    }

    if (titleElement) {
        titleElement.textContent = "Unable to Load Novel";
    }

    if (synopsisElement) {
        synopsisElement.textContent =
            message || "Something went wrong while loading the novel.";
    }

    console.error("Novel Error:", message);
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
