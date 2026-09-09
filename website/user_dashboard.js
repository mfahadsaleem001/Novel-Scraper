/* ============================================================
   NOVEL ARCHIVE — USER DASHBOARD
   ============================================================ */

const API_URL = "http://127.0.0.1:5000";

let allDashboardNovels = [];

const userToken =
    localStorage.getItem("user_token");


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const welcomeMessage =
    document.getElementById("welcomeMessage");

const sidebarUserName =
    document.getElementById("sidebarUserName");

const sidebarAvatar =
    document.getElementById("sidebarAvatar");

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

const totalNovels =
    document.getElementById("totalNovels");

const totalChapters =
    document.getElementById("totalChapters");

const ongoingNovels =
    document.getElementById("ongoingNovels");

const completedNovels =
    document.getElementById("completedNovels");


/* ============================================================
   AUTH CHECK
   ============================================================ */

if (!userToken) {

    window.location.href =
        "user_login.html";
}


/* ============================================================
   LOGOUT
   ============================================================ */

function logoutUser() {

    localStorage.removeItem("user_token");

    localStorage.removeItem("user_data");

    localStorage.removeItem("novelArchiveUserName");

    localStorage.removeItem("novelArchiveUserEmail");

    window.location.href =
        "user_login.html";
}


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logoutUser
    );
}


/* ============================================================
   LOAD USER PROFILE
   ============================================================ */

async function loadUserProfile() {

    if (!userToken) {
        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/user/profile`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${userToken}`
                    }
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            logoutUser();

            return;
        }


        if (!response.ok) {

            throw new Error(
                "Unable to load profile."
            );
        }


        const data =
            await response.json();


        const user =
            data.user || data;


        const userName =
            user.name || "Reader";


        const userEmail =
            user.email || "";


        /* ================================================
           HERO
           ================================================ */

        if (welcomeMessage) {

            welcomeMessage.textContent =
                `Welcome Back, ${userName}`;
        }


        /* ================================================
           SIDEBAR
           ================================================ */

        if (sidebarUserName) {

            sidebarUserName.textContent =
                userName;
        }


        if (sidebarAvatar) {

            sidebarAvatar.textContent =
                userName
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "R";
        }


        /* ================================================
           SAVE USER DATA
           ================================================ */

        localStorage.setItem(
            "user_data",
            JSON.stringify(user)
        );

        localStorage.setItem(
            "novelArchiveUserName",
            userName
        );

        localStorage.setItem(
            "novelArchiveUserEmail",
            userEmail
        );

    }

    catch (error) {

        console.error(
            "Profile Error:",
            error
        );

        /*
         * Do not immediately logout here.
         * The token may still be valid while the
         * profile endpoint temporarily fails.
         */

        const savedUser =
            localStorage.getItem(
                "user_data"
            );


        if (savedUser) {

            try {

                const user =
                    JSON.parse(savedUser);


                const userName =
                    user.name || "Reader";


                if (welcomeMessage) {

                    welcomeMessage.textContent =
                        `Welcome Back, ${userName}`;
                }


                if (sidebarUserName) {

                    sidebarUserName.textContent =
                        userName;
                }


                if (sidebarAvatar) {

                    sidebarAvatar.textContent =
                        userName
                            .trim()
                            .charAt(0)
                            .toUpperCase() || "R";
                }

            }
            catch (parseError) {

                console.error(
                    "Saved User Data Error:",
                    parseError
                );
            }
        }
    }
}


/* ============================================================
   LOAD NOVELS
   ============================================================ */

async function loadDashboardNovels() {

    try {

        const response =
            await fetch(
                `${API_URL}/novels`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load novels."
            );
        }


        const data =
            await response.json();


        /*
         * Support both:
         *
         * [ ...novels ]
         *
         * and
         *
         * { novels: [ ...novels ] }
         */

        let novels = [];


        if (Array.isArray(data)) {

            novels = data;

        }
        else if (
            data &&
            Array.isArray(data.novels)
        ) {

            novels = data.novels;

        }
        else if (
            data &&
            Array.isArray(data.data)
        ) {

            novels = data.data;
        }


        allDashboardNovels =
            novels;


        updateDashboardStats(
            allDashboardNovels
        );


        displayRecentNovels(
            allDashboardNovels
        );

    }

    catch (error) {

        console.error(
            "Novel Loading Error:",
            error
        );


        if (recentNovels) {

            recentNovels.innerHTML = `
                <div class="loading-state">
                    Unable to load novels right now.
                </div>
            `;
        }
    }
}


/* ============================================================
   DASHBOARD STATS
   ============================================================ */

function updateDashboardStats(
    novels
) {

    const safeNovels =
        Array.isArray(novels)
            ? novels
            : [];


    /* TOTAL NOVELS */

    if (totalNovels) {

        totalNovels.textContent =
            safeNovels.length;
    }


    /* TOTAL CHAPTERS */

    let chapterCount = 0;


    safeNovels.forEach(
        novel => {

            const chapters =
                novel.chapters;


            if (Array.isArray(chapters)) {

                chapterCount +=
                    chapters.length;
            }

            else if (
                typeof novel.chapter_count ===
                "number"
            ) {

                chapterCount +=
                    novel.chapter_count;
            }

            else if (
                typeof novel.total_chapters ===
                "number"
            ) {

                chapterCount +=
                    novel.total_chapters;
            }

        }
    );


    if (totalChapters) {

        totalChapters.textContent =
            chapterCount;
    }


    /* ONGOING / COMPLETED */

    let ongoing = 0;

    let completed = 0;


    safeNovels.forEach(
        novel => {

            const status =
                String(
                    novel.status || ""
                )
                    .trim()
                    .toLowerCase();


            if (
                status.includes("complete") ||
                status.includes("completed") ||
                status.includes("finished")
            ) {

                completed++;

            }
            else {

                ongoing++;
            }

        }
    );


    if (ongoingNovels) {

        ongoingNovels.textContent =
            ongoing;
    }


    if (completedNovels) {

        completedNovels.textContent =
            completed;
    }
}


/* ============================================================
   RECENT NOVELS
   ============================================================ */

function displayRecentNovels(
    novels
) {

    if (!recentNovels) {
        return;
    }


    if (
        !Array.isArray(novels) ||
        novels.length === 0
    ) {

        recentNovels.innerHTML = `
            <div class="loading-state">
                No novels available yet.
            </div>
        `;

        return;
    }


    /*
     * Existing API order is preserved.
     * Last five are treated as recently added.
     */

    const recent =
        novels
            .slice(-5)
            .reverse();


    recentNovels.innerHTML = "";


    recent.forEach(
        novel => {

            const card =
                createDashboardNovelCard(
                    novel
                );


            recentNovels.appendChild(
                card
            );
        }
    );


    attachNovelButtons(
        recentNovels
    );
}


/* ============================================================
   CREATE NOVEL CARD
   ============================================================ */

function createDashboardNovelCard(
    novel
) {

    const card =
        document.createElement("article");


    card.className =
        "dashboard-novel-card";


    /* ========================================================
       DATA
       ======================================================== */

    const title =
        novel.title ||
        novel.name ||
        "Untitled Novel";


    const author =
        novel.author ||
        "Unknown";


    const status =
        novel.status ||
        "Ongoing";


    const genre =
        novel.genre ||
        "";


    const cover =
        novel.cover_image ||
        novel.cover ||
        "https://via.placeholder.com/400x600?text=No+Cover";


    const chapters =
        Array.isArray(novel.chapters)
            ? novel.chapters.length
            : (
                Number(
                    novel.chapter_count ||
                    novel.total_chapters ||
                    0
                ) || 0
            );


    /*
     * Try different possible filename/id fields.
     */

    const filename =
        novel.filename ||
        novel.file_name ||
        novel.json_file ||
        novel.id ||
        novel.slug ||
        "";


    /* ========================================================
       CARD HTML
       ======================================================== */

    card.innerHTML = `

        <img
            src="${escapeHtml(cover)}"
            alt="${escapeHtml(title)} cover"
            class="dashboard-novel-cover"
            loading="lazy"
            onerror="
                this.onerror=null;
                this.src='https://via.placeholder.com/400x600?text=No+Cover';
            "
        >


        <div class="dashboard-novel-info">

            <h3 class="dashboard-novel-title">
                ${escapeHtml(title)}
            </h3>


            <p class="dashboard-novel-author">
                ${escapeHtml(author)}
            </p>


            <div class="dashboard-novel-meta">

                <span>
                    ${escapeHtml(status)}
                </span>

                <span>
                    ${chapters} Chapters
                </span>

                ${
                    genre
                        ? `
                            <span>
                                ${escapeHtml(genre)}
                            </span>
                          `
                        : ""
                }

            </div>


            <button
                type="button"
                class="dashboard-read-button"
                data-novel="${escapeHtml(filename)}"
            >
                Read Novel
            </button>

        </div>
    `;


    return card;
}


/* ============================================================
   NOVEL BUTTONS
   ============================================================ */

function attachNovelButtons(
    container
) {

    const buttons =
        container.querySelectorAll(
            ".dashboard-read-button"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const novel =
                        button.dataset.novel;


                    if (!novel) {

                        console.warn(
                            "Novel identifier missing."
                        );

                        return;
                    }


                    window.location.href =
                        `novel.html?novel=${encodeURIComponent(
                            novel
                        )}`;
                }
            );
        }
    );
}


/* ============================================================
   SEARCH
   ============================================================ */

function performDashboardSearch() {

    if (!dashboardSearch) {
        return;
    }


    const query =
        dashboardSearch.value
            .trim()
            .toLowerCase();


    /*
     * Empty search:
     * hide search results and show recent novels.
     */

    if (!query) {

        if (searchResultsSection) {

            searchResultsSection.style.display =
                "none";
        }


        if (recentNovels) {

            recentNovels.parentElement
                .style.display = "";
        }


        return;
    }


    const filtered =
        allDashboardNovels.filter(
            novel => {

                const title =
                    String(
                        novel.title ||
                        novel.name ||
                        ""
                    ).toLowerCase();


                const author =
                    String(
                        novel.author ||
                        ""
                    ).toLowerCase();


                const genre =
                    String(
                        novel.genre ||
                        ""
                    ).toLowerCase();


                const status =
                    String(
                        novel.status ||
                        ""
                    ).toLowerCase();


                return (
                    title.includes(query) ||
                    author.includes(query) ||
                    genre.includes(query) ||
                    status.includes(query)
                );
            }
        );


    displaySearchResults(
        filtered
    );
}


/* ============================================================
   DISPLAY SEARCH RESULTS
   ============================================================ */

function displaySearchResults(
    novels
) {

    if (!searchResultsSection ||
        !searchResults) {

        return;
    }


    searchResultsSection.style.display =
        "block";


    searchResults.innerHTML =
        "";


    if (
        !Array.isArray(novels) ||
        novels.length === 0
    ) {

        searchResults.innerHTML = `
            <div class="loading-state">
                No novels found matching your search.
            </div>
        `;

        return;
    }


    novels.forEach(
        novel => {

            searchResults.appendChild(
                createDashboardNovelCard(
                    novel
                )
            );
        }
    );


    attachNovelButtons(
        searchResults
    );


    searchResultsSection.scrollIntoView(
        {
            behavior: "smooth",
            block: "start"
        }
    );
}


/* ============================================================
   SEARCH EVENTS
   ============================================================ */

if (dashboardSearch) {

    dashboardSearch.addEventListener(
        "input",
        performDashboardSearch
    );
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(
    value
) {

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

async function initializeDashboard() {

    /*
     * Profile and novels can load independently.
     */

    await Promise.allSettled(
        [
            loadUserProfile(),
            loadDashboardNovels()
        ]
    );
}


initializeDashboard();