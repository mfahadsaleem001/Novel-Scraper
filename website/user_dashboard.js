const API_URL = "http://127.0.0.1:5000";

let allDashboardNovels = [];


/* ============================================================
   ELEMENTS
   ============================================================ */

const welcomeMessage =
    document.getElementById("welcomeMessage");

const recentNovels =
    document.getElementById("recentNovels");

const dashboardSearch =
    document.getElementById("dashboardSearch");

const searchResultsSection =
    document.getElementById("searchResultsSection");

const searchResults =
    document.getElementById("searchResults");

const logoutButton =
    document.getElementById("logoutButton");


/* ============================================================
   LOAD USER NAME
   ============================================================ */

function loadUserName() {

    const userName =
        localStorage.getItem("novelArchiveUserName");

    if (welcomeMessage && userName) {
        welcomeMessage.textContent =
            `Welcome Back, ${userName}`;
    }
}


/* ============================================================
   LOAD NOVELS
   ============================================================ */

async function loadDashboardNovels() {

    try {

        const response =
            await fetch(`${API_URL}/novels`);

        if (!response.ok) {
            throw new Error("Could not load novels.");
        }

        const novels =
            await response.json();

        allDashboardNovels =
            Array.isArray(novels) ? novels : [];

        updateDashboardStats(
            allDashboardNovels
        );

        displayRecentNovels(
            allDashboardNovels
        );

    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

        if (recentNovels) {

            recentNovels.innerHTML = `
                <div class="dashboard-loading">
                    Unable to load novels right now.
                </div>
            `;
        }
    }
}


/* ============================================================
   DASHBOARD STATS
   ============================================================ */

function updateDashboardStats(novels) {

    const totalNovelElement =
        document.getElementById("totalNovels");

    const totalChapterElement =
        document.getElementById("totalChapters");

    const ongoingElement =
        document.getElementById("ongoingNovels");

    const completedElement =
        document.getElementById("completedNovels");


    const totalNovels =
        novels.length;


    const totalChapters =
        novels.reduce(
            (total, novel) =>
                total +
                Number(novel.total_chapters || 0),
            0
        );


    const ongoingNovels =
        novels.filter(
            novel =>
                String(
                    novel.status || ""
                ).toLowerCase() === "ongoing"
        ).length;


    const completedNovels =
        novels.filter(
            novel =>
                String(
                    novel.status || ""
                ).toLowerCase() === "completed"
        ).length;


    if (totalNovelElement) {
        totalNovelElement.textContent =
            totalNovels;
    }

    if (totalChapterElement) {
        totalChapterElement.textContent =
            totalChapters;
    }

    if (ongoingElement) {
        ongoingElement.textContent =
            ongoingNovels;
    }

    if (completedElement) {
        completedElement.textContent =
            completedNovels;
    }
}


/* ============================================================
   RECENT NOVELS
   ============================================================ */

function displayRecentNovels(novels) {

    if (!recentNovels) {
        return;
    }


    if (!novels.length) {

        recentNovels.innerHTML = `
            <div class="dashboard-loading">
                No novels are available yet.
            </div>
        `;

        return;
    }


    const recent =
        novels
            .slice(-5)
            .reverse();


    recentNovels.innerHTML =
        recent
            .map(
                novel =>
                    createDashboardNovelCard(novel)
            )
            .join("");


    attachNovelButtons(
        recentNovels
    );
}


/* ============================================================
   NOVEL CARD
   ============================================================ */

function createDashboardNovelCard(novel) {

    const cover =
        novel.cover_image ||
        "https://via.placeholder.com/220x330?text=No+Cover";


    const title =
        novel.title ||
        "Untitled Novel";


    const author =
        novel.author ||
        "Unknown Author";


    const status =
        novel.status ||
        "Unknown";


    const chapters =
        Number(
            novel.total_chapters || 0
        );


    const filename =
        novel.filename || "";


    return `
        <article
            class="novel-card"
            data-filename="${escapeHtml(filename)}"
        >

            <img
                src="${escapeHtml(cover)}"
                alt="${escapeHtml(title)}"
                class="novel-cover"
            >

            <div class="novel-card-content">

                <h3>
                    ${escapeHtml(title)}
                </h3>

                <p class="novel-author">
                    ${escapeHtml(author)}
                </p>

                <div class="novel-meta">

                    <span class="novel-status">
                        ${escapeHtml(status)}
                    </span>

                    <span class="novel-chapters">
                        ${chapters} Chapters
                    </span>

                </div>

                <button
                    type="button"
                    class="novel-read-button"
                    data-filename="${escapeHtml(filename)}"
                >
                    Read Novel
                </button>

            </div>

        </article>
    `;
}


/* ============================================================
   NOVEL BUTTONS
   ============================================================ */

function attachNovelButtons(container) {

    const buttons =
        container.querySelectorAll(
            ".novel-read-button"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const filename =
                    button.dataset.filename;


                if (!filename) {
                    return;
                }


                window.location.href =
                    `novel.html?novel=${encodeURIComponent(filename)}`;
            }
        );
    });


    const images =
        container.querySelectorAll(
            ".novel-cover"
        );


    images.forEach(image => {

        image.addEventListener(
            "error",
            function () {

                this.onerror = null;

                this.src =
                    "https://via.placeholder.com/220x330?text=No+Cover";
            }
        );
    });
}


/* ============================================================
   SEARCH
   ============================================================ */

if (dashboardSearch) {

    dashboardSearch.addEventListener(
        "input",
        function () {

            const searchTerm =
                dashboardSearch.value
                    .trim()
                    .toLowerCase();


            if (!searchTerm) {

                hideSearchResults();

                return;
            }


            const filteredNovels =
                allDashboardNovels.filter(
                    novel => {

                        const title =
                            String(
                                novel.title || ""
                            ).toLowerCase();


                        const author =
                            String(
                                novel.author || ""
                            ).toLowerCase();


                        const genre =
                            String(
                                novel.genre || ""
                            ).toLowerCase();


                        return (
                            title.includes(searchTerm) ||
                            author.includes(searchTerm) ||
                            genre.includes(searchTerm)
                        );
                    }
                );


            displaySearchResults(
                filteredNovels
            );
        }
    );
}


/* ============================================================
   SEARCH RESULTS
   ============================================================ */

function displaySearchResults(novels) {

    if (
        !searchResultsSection ||
        !searchResults
    ) {
        return;
    }


    searchResultsSection.classList.add(
        "visible"
    );


    if (!novels.length) {

        searchResults.innerHTML = `
            <div class="dashboard-loading">
                No novels found for your search.
            </div>
        `;

        return;
    }


    searchResults.innerHTML =
        novels
            .map(
                novel =>
                    createDashboardNovelCard(novel)
            )
            .join("");


    attachNovelButtons(
        searchResults
    );
}


/* ============================================================
   HIDE SEARCH RESULTS
   ============================================================ */

function hideSearchResults() {

    if (!searchResultsSection) {
        return;
    }


    searchResultsSection.classList.remove(
        "visible"
    );
}


/* ============================================================
   LOGOUT
   ============================================================ */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "novelArchiveUserName"
            );

            localStorage.removeItem(
                "novelArchiveUserEmail"
            );

            window.location.href =
                "user_signin.html";
        }
    );
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(value) {

    return String(value)
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


/* ============================================================
   INITIALIZE DASHBOARD
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadUserName();

        loadDashboardNovels();
    }
);