const API_URL =
"http://127.0.0.1:5000";

// =====================================================
// LOAD ADMIN DASHBOARD DATA
// =====================================================

async function loadDashboardData() {

    try {

        // ==================================================
        // GET ADMIN TOKEN
        // ==================================================

        const token =
            sessionStorage.getItem("adminToken");


        // ==================================================
        // CHECK TOKEN
        // ==================================================

        if (!token) {

            console.error(
                "Admin token not found."
            );

            window.location.href =
                "admin_login.html";

            return;
        }


        // ==================================================
        // REQUEST DASHBOARD DATA
        // ==================================================

        const response =
            await fetch(
                `${API_URL}/admin/dashboard`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        // ==================================================
        // HANDLE UNAUTHORIZED ACCESS
        // ==================================================

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


        // ==================================================
        // CHECK RESPONSE
        // ==================================================

        if (!response.ok) {

            throw new Error(
                "Could not load dashboard data."
            );
        }


        // ==================================================
        // GET JSON DATA
        // ==================================================

        const data =
            await response.json();


        // ==================================================
        // BASIC STATISTICS
        // ==================================================

        const totalNovels =
            Number(
                data.total_novels || 0
            );

        const totalChapters =
            Number(
                data.total_chapters || 0
            );

        const ongoingNovels =
            Number(
                data.ongoing_novels || 0
            );

        const completedNovels =
            Number(
                data.completed_novels || 0
            );


        // ==================================================
        // UPDATE STAT CARDS
        // ==================================================

        const statNumbers =
            document.querySelectorAll(
                ".stat-number"
            );


        if (statNumbers[0]) {

            statNumbers[0].textContent =
                totalNovels;
        }


        if (statNumbers[1]) {

            statNumbers[1].textContent =
                totalChapters;
        }


        if (statNumbers[2]) {

            statNumbers[2].textContent =
                ongoingNovels;
        }


        if (statNumbers[3]) {

            statNumbers[3].textContent =
                completedNovels;
        }


        // ==================================================
        // RECENT NOVELS
        // ==================================================

        loadRecentNovels(
            data.recent_novels || []
        );


    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

    }

}

// =====================================================
// LOAD RECENT NOVELS
// =====================================================

function loadRecentNovels(
novels
) {

const container =
    document.querySelector(
        ".recent-novels"
    );


if (!container) {

    return;

}


if (!novels.length) {

    container.innerHTML = `

        <div class="empty-collection">

            <div class="empty-icon">
                ◇
            </div>

            <h3>
                Your collection is empty
            </h3>

            <p>
                Scrape or add your first
                novel to begin building
                your collection.
            </p>

        </div>

    `;

    return;

}


// Backend already returns
// the latest 5 novels.

const recentNovels =
    novels;


container.innerHTML = `

    <div class="recent-novels-list">

        ${recentNovels
            .map(
                novel => `

                    <div class="recent-novel-item">

                        <div class="recent-novel-cover">

                            <img
                                src="${
                                    novel.cover_image ||
                                    "https://via.placeholder.com/70x95?text=No+Cover"
                                }"
                                alt="Novel Cover"
                                onerror="
                                    this.onerror=null;
                                    this.src='https://via.placeholder.com/70x95?text=No+Cover';
                                "
                            >

                        </div>


                        <div class="recent-novel-info">

                            <h3>
                                ${
                                    escapeHtml(
                                        novel.title ||
                                        "Untitled Novel"
                                    )
                                }
                            </h3>


                            <p>
                                ${
                                    escapeHtml(
                                        novel.author ||
                                        "Unknown Author"
                                    )
                                }
                            </p>


                            <span>
                                ${
                                    Number(
                                        novel.total_chapters ||
                                        0
                                    )
                                }
                                ${
                                    Number(
                                        novel.total_chapters ||
                                        0
                                    ) === 1
                                        ? "Chapter"
                                        : "Chapters"
                                }
                            </span>

                        </div>

                    </div>

                `
            )
            .join("")}

    </div>

`;

}

// =====================================================
// ESCAPE HTML
// =====================================================

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

// =====================================================
// LOAD DASHBOARD
// =====================================================

document.addEventListener(
"DOMContentLoaded",
function () {

    loadDashboardData();

}

);

// =====================================================
// ADMIN DASHBOARD NAVIGATION
// =====================================================

document.addEventListener(
"DOMContentLoaded",
function () {

    // -------------------------------------------------
    // Sidebar navigation
    // -------------------------------------------------

    const navItems =
        document.querySelectorAll(
            ".admin-navigation .nav-item"
        );


    navItems.forEach(
        function (item) {

            const text =
                item
                    .querySelector(
                        "span:last-child"
                    )
                    ?.textContent
                    .trim();


            item.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    if (
                        text ===
                        "Dashboard"
                    ) {

                        window.location.href =
                            "admin_dashboard.html";

                    }


                    if (
                        text ===
                        "All Novels"
                    ) {

                        window.location.href =
                            "admin_novels.html";

                    }


                    if (
                        text ===
                        "Scrape Novel"
                    ) {

                        window.location.href =
                            "scraper.html";

                    }


                    if (
                        text ===
                        "Add Novel"
                    ) {

                        window.location.href =
                            "manual_novel.html";

                    }


                    if (
                        text ===
                        "Users"
                    ) {

                        alert(
                            "User management will be added next."
                        );

                    }


                    if (
                        text ===
                        "Settings"
                    ) {

                        alert(
                            "Settings will be added next."
                        );

                    }

                }
            );

        }
    );


    // -------------------------------------------------
    // Quick Action buttons
    // -------------------------------------------------

    const actionCards =
        document.querySelectorAll(
            ".action-card"
        );


    actionCards.forEach(
        function (card) {

            const title =
                card
                    .querySelector(
                        "strong"
                    )
                    ?.textContent
                    .trim();


            card.addEventListener(
                "click",
                function () {


                    if (
                        title ===
                        "Scrape Novel"
                    ) {

                        window.location.href =
                            "scraper.html";

                    }


                    if (
                        title ===
                        "Add Novel"
                    ) {

                        window.location.href =
                            "manual_novel.html";

                    }


                    if (
                        title ===
                        "View Novels"
                    ) {

                        window.location.href =
                            "admin_novels.html";

                    }

                }
            );

        }
    );


    // -------------------------------------------------
    // View All button
    // -------------------------------------------------

    const viewAllButton =
        document.querySelector(
            ".view-all-button"
        );


    if (viewAllButton) {

        viewAllButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "admin_novels.html";

            }
        );

    }


    // -------------------------------------------------
    // Logout button
    // -------------------------------------------------

    const logoutButton =
        document.querySelector(
            ".logout-button"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {
                
                sessionStorage.removeItem(
                    "adminToken"
                );

                sessionStorage.removeItem(
                    "adminUser"
                );
                
                window.location.href =
                    "admin_login.html";

            }
        );

    }

}
);