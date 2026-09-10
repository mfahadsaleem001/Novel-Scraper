const API_URL = "http://127.0.0.1:5000";

const userToken = localStorage.getItem("user_token");

if (!userToken) {
    window.location.href = "user_login.html";
}

let currentUser = {};
let readingHistory = [];
let savedNovels = [];


/* =========================================================
   USER DATA
========================================================= */

function getStoredUser() {

    try {

        return JSON.parse(
            localStorage.getItem("user_data")
        ) || {};

    } catch (error) {

        return {};

    }

}


function getInitials(name) {

    if (!name) {
        return "U";
    }

    const parts = name
        .trim()
        .split(/\s+/);

    if (parts.length === 1) {

        return parts[0]
            .charAt(0)
            .toUpperCase();

    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();

}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   LOAD READING DATA FROM BACKEND
========================================================= */

async function loadLocalReadingData() {

    readingHistory = [];
    savedNovels = [];


    /* =====================================================
       READING HISTORY
    ===================================================== */

    try {

        const historyResponse = await fetch(
            API_URL + "/user/reading-history",
            {
                method: "GET",
                headers: {
                    "Authorization":
                        "Bearer " + userToken
                }
            }
        );


        if (
            historyResponse.status === 401 ||
            historyResponse.status === 403
        ) {

            localStorage.removeItem("user_token");
            localStorage.removeItem("user_data");

            window.location.href =
                "user_login.html";

            return;

        }


        if (historyResponse.ok) {

            const historyData =
                await historyResponse.json();


            if (
                Array.isArray(
                    historyData.reading_history
                )
            ) {

                readingHistory =
                    historyData.reading_history;

            } else if (
                Array.isArray(historyData.history)
            ) {

                readingHistory =
                    historyData.history;

            } else if (
                Array.isArray(historyData.data)
            ) {

                readingHistory =
                    historyData.data;

            } else {

                readingHistory = [];

            }

        } else {

            console.error(
                "Could not load reading history:",
                historyResponse.status
            );

        }

    } catch (error) {

        console.error(
            "Reading history request failed:",
            error
        );

    }


    /* =====================================================
       SAVED NOVELS
    ===================================================== */

    try {

        const savedResponse = await fetch(
            API_URL + "/user/saved",
            {
                method: "GET",
                headers: {
                    "Authorization":
                        "Bearer " + userToken
                }
            }
        );


        if (
            savedResponse.status === 401 ||
            savedResponse.status === 403
        ) {

            localStorage.removeItem("user_token");
            localStorage.removeItem("user_data");

            window.location.href =
                "user_login.html";

            return;

        }


        if (savedResponse.ok) {

            const savedData =
                await savedResponse.json();


            if (
                Array.isArray(
                    savedData.saved_novels
                )
            ) {

                savedNovels =
                    savedData.saved_novels;

            } else if (
                Array.isArray(savedData.saved)
            ) {

                savedNovels =
                    savedData.saved;

            } else if (
                Array.isArray(savedData.data)
            ) {

                savedNovels =
                    savedData.data;

            } else {

                savedNovels = [];

            }

        } else {

            console.error(
                "Could not load saved novels:",
                savedResponse.status
            );

        }

    } catch (error) {

        console.error(
            "Saved novels request failed:",
            error
        );

    }

}


/* =========================================================
   USER DISPLAY
========================================================= */

function updateUserDisplay() {

    const name =
        currentUser.name ||
        currentUser.full_name ||
        currentUser.fullName ||
        "Reader";


    const sidebarName =
        document.getElementById(
            "sidebarUserName"
        );


    const sidebarAvatar =
        document.getElementById(
            "sidebarAvatar"
        );


    if (sidebarName) {

        sidebarName.textContent =
            name;

    }


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            getInitials(name);

    }

}


/* =========================================================
   EMPTY STATE
========================================================= */

function createEmptyState(
    title,
    description,
    buttonText,
    buttonAction
) {

    let html = "";


    html +=
        '<div class="empty-state">';


    html +=
        '<div class="empty-mark">';

    html += "NA";

    html += "</div>";


    html += "<h4>";

    html +=
        escapeHtml(title);

    html += "</h4>";


    html += "<p>";

    html +=
        escapeHtml(description);

    html += "</p>";


    if (
        buttonText &&
        buttonAction === "browse"
    ) {

        html +=
            '<a href="browse_novels.html" class="primary-button">';

        html +=
            escapeHtml(buttonText);

        html += "</a>";

    }


    html += "</div>";


    return html;

}


/* =========================================================
   NOVEL HELPERS
========================================================= */

function getNovelId(novel) {

    if (
        !novel ||
        typeof novel !== "object"
    ) {

        return null;

    }


    return (
        novel.id ||
        novel.novel_id ||
        novel.novelId ||
        null
    );

}


function getNovelFilename(novel) {

    if (
        !novel ||
        typeof novel !== "object"
    ) {

        return "";

    }


    return (
        novel.filename ||
        novel.novel_filename ||
        novel.file_name ||
        novel.file ||
        novel.json_filename ||
        novel.json_file ||
        ""
    );

}


function getNovelTitle(novel) {

    if (
        !novel ||
        typeof novel !== "object"
    ) {

        return "Untitled Novel";

    }


    return (
        novel.title ||
        novel.novel_title ||
        novel.name ||
        "Untitled Novel"
    );

}


function getNovelAuthor(novel) {

    if (
        !novel ||
        typeof novel !== "object"
    ) {

        return "Unknown Author";

    }


    return (
        novel.author ||
        novel.novel_author ||
        novel.author_name ||
        "Unknown Author"
    );

}


function getNovelCover(novel) {

    if (
        !novel ||
        typeof novel !== "object"
    ) {

        return "";

    }


    return (
        novel.cover_image ||
        novel.novel_cover ||
        novel.cover ||
        novel.cover_url ||
        novel.image ||
        ""
    );

}


function getChapterInfo(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {

        return "Continue reading";

    }


    if (
        item.last_chapter_number !== null &&
        item.last_chapter_number !== undefined &&
        item.last_chapter_number !== ""
    ) {

        return (
            "Chapter " +
            item.last_chapter_number
        );

    }


    return (
        item.chapter_title ||
        item.chapter_name ||
        item.chapter ||
        item.chapter_number ||
        "Continue reading"
    );

}


/* =========================================================
   OPEN NOVEL
========================================================= */

function openNovel(novel) {

    const filename =
        getNovelFilename(novel);


    if (filename) {

        window.location.href =
            "novel.html?file=" +
            encodeURIComponent(filename);

        return;

    }


    console.warn(
        "Novel filename is missing:",
        novel
    );


    window.location.href =
        "browse_novels.html";

}


/* =========================================================
   READING CARD
========================================================= */

function createReadingCard(item) {

    const novel =
        item && item.novel
            ? item.novel
            : item;


    const title =
        getNovelTitle(novel);


    const author =
        getNovelAuthor(novel);


    const cover =
        getNovelCover(novel);


    const chapter =
        getChapterInfo(item);


    const novelId =
        getNovelId(novel);


    const filename =
        getNovelFilename(novel);


    let html = "";


    html +=
        '<article class="reading-card"';


    if (novelId !== null) {

        html +=
            ' data-novel-id="' +
            escapeHtml(novelId) +
            '"';

    }


    html += ">";


    html +=
        '<div class="reading-cover">';


    if (cover) {

        html +=
            '<img src="' +
            escapeHtml(cover) +
            '" alt="' +
            escapeHtml(title) +
            ' cover">';

    } else {

        html +=
            '<div class="reading-cover-placeholder">';

        html += "NA";

        html += "</div>";

    }


    html += "</div>";


    html +=
        '<div class="reading-content">';


    html +=
        '<div class="reading-title">';

    html +=
        escapeHtml(title);

    html += "</div>";


    html +=
        '<div class="reading-author">';

    html +=
        escapeHtml(author);

    html += "</div>";


    html +=
        '<div class="reading-meta">';

    html +=
        escapeHtml(chapter);

    html += "</div>";


    html +=
        '<button type="button" class="reading-action" data-novel-file="' +
        escapeHtml(filename) +
        '">';

    html += "Open Novel";

    html += "</button>";


    html += "</div>";


    html += "</article>";


    return html;

}


/* =========================================================
   CONTINUE READING
========================================================= */

function displayContinueReading() {

    const container =
        document.getElementById(
            "continueReading"
        );


    if (!container) {

        return;

    }


    if (!readingHistory.length) {

        container.innerHTML =
            createEmptyState(
                "Nothing to continue yet",
                "Start reading a novel and your latest reading position will appear here.",
                "Browse Library",
                "browse"
            );

        return;

    }


    const latest =
        readingHistory[0];


    const novel =
        latest && latest.novel
            ? latest.novel
            : latest;


    const title =
        getNovelTitle(novel);


    const cover =
        getNovelCover(novel);


    const chapter =
        getChapterInfo(latest);


    let html = "";


    html +=
        '<div class="continue-card">';


    html +=
        '<div class="continue-cover">';


    if (cover) {

        html +=
            '<img src="' +
            escapeHtml(cover) +
            '" alt="' +
            escapeHtml(title) +
            ' cover">';

    } else {

        html +=
            '<div class="reading-cover-placeholder">';

        html += "NA";

        html += "</div>";

    }


    html += "</div>";


    html +=
        '<div class="continue-info">';


    html +=
        '<div class="continue-label">';

    html += "Continue Reading";

    html += "</div>";


    html +=
        '<div class="continue-title">';

    html +=
        escapeHtml(title);

    html += "</div>";


    html +=
        '<div class="continue-chapter">';

    html +=
        escapeHtml(chapter);

    html += "</div>";


    html += "</div>";


    html +=
        '<button type="button" class="continue-button" id="continueButton">';

    html += "Continue";

    html += "</button>";


    html += "</div>";


    container.innerHTML =
        html;


    const continueButton =
        document.getElementById(
            "continueButton"
        );


    if (continueButton) {

        continueButton.addEventListener(
            "click",
            function () {

                openNovel(novel);

            }
        );

    }

}


/* =========================================================
   READING HISTORY
========================================================= */

function displayReadingHistory() {

    const container =
        document.getElementById(
            "readingHistory"
        );


    if (!container) {

        return;

    }


    if (!readingHistory.length) {

        container.innerHTML =
            createEmptyState(
                "Your reading history is empty",
                "Novels you open will appear here so you can easily return to them.",
                "Browse Library",
                "browse"
            );

        return;

    }


    const items =
        readingHistory.slice(0, 20);


    let html = "";


    items.forEach(
        function (item) {

            html +=
                createReadingCard(item);

        }
    );


    container.innerHTML =
        html;


    attachReadingCardButtons(
        container
    );

}


/* =========================================================
   SAVED STORIES
========================================================= */

function displaySavedNovels() {

    const container =
        document.getElementById(
            "savedStories"
        );


    if (!container) {

        return;

    }


    if (!savedNovels.length) {

        container.innerHTML =
            createEmptyState(
                "No saved stories yet",
                "Save novels from the library to keep them close to your reading space.",
                "Explore Novels",
                "browse"
            );

        return;

    }


    const items =
        savedNovels.slice(0, 20);


    let html = "";


    items.forEach(
        function (item) {

            html +=
                createReadingCard(item);

        }
    );


    container.innerHTML =
        html;


    attachReadingCardButtons(
        container
    );

}


/* =========================================================
   CARD BUTTONS
========================================================= */

function attachReadingCardButtons(
    container
) {

    if (!container) {

        return;

    }


    const buttons =
        container.querySelectorAll(
            ".reading-action"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const filename =
                        button.getAttribute(
                            "data-novel-file"
                        );


                    if (!filename) {

                        window.location.href =
                            "browse_novels.html";

                        return;

                    }


                    window.location.href =
                        "novel.html?file=" +
                        encodeURIComponent(
                            filename
                        );

                }
            );

        }
    );

}


/* =========================================================
   BROWSE LIBRARY
========================================================= */

function browseLibrary() {

    window.location.href =
        "browse_novels.html";

}


/* =========================================================
   CLEAR HISTORY
========================================================= */

async function clearReadingHistory() {

    if (!readingHistory.length) {

        return;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to clear your reading history?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                API_URL +
                "/user/reading-history",
                {
                    method: "DELETE",
                    headers: {
                        "Authorization":
                            "Bearer " +
                            userToken
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

            window.location.href =
                "user_login.html";

            return;

        }


        if (!response.ok) {

            console.error(
                "Could not clear reading history:",
                response.status
            );

            return;

        }


        readingHistory = [];


        displayContinueReading();

        displayReadingHistory();

    } catch (error) {

        console.error(
            "Clear history request failed:",
            error
        );

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutUser() {

    localStorage.removeItem(
        "user_token"
    );

    localStorage.removeItem(
        "user_data"
    );


    window.location.href =
        "user_login.html";

}


/* =========================================================
   EVENTS
========================================================= */

function attachEvents() {

    const clearButton =
        document.getElementById(
            "clearHistoryButton"
        );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearReadingHistory
        );

    }


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutUser
        );

    }


    const mobileLogoutButton =
        document.getElementById(
            "mobileLogoutButton"
        );


    if (mobileLogoutButton) {

        mobileLogoutButton.addEventListener(
            "click",
            logoutUser
        );

    }


    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    '[data-action="browse"]'
                );


            if (button) {

                browseLibrary();

            }

        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeReadingPage() {

    currentUser =
        getStoredUser();


    updateUserDisplay();


    await loadLocalReadingData();


    displayContinueReading();

    displayReadingHistory();

    displaySavedNovels();


    attachEvents();

}


if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeReadingPage
    );

} else {

    initializeReadingPage();

}