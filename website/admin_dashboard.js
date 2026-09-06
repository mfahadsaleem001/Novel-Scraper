const API_URL = "http://127.0.0.1:5000";


async function loadDashboardData() {

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


        // ==============================
        // BASIC STATISTICS
        // ==============================

        const totalNovels =
            novels.length;

        const totalChapters =
            novels.reduce(
                (total, novel) =>
                    total +
                    Number(
                        novel.total_chapters || 0
                    ),
                0
            );


        const ongoingNovels =
            novels.filter(
                novel =>
                    String(
                        novel.status || ""
                    ).toLowerCase() ===
                    "ongoing"
            ).length;


        const completedNovels =
            novels.filter(
                novel =>
                    String(
                        novel.status || ""
                    ).toLowerCase() ===
                    "completed"
            ).length;


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


        // ==============================
        // RECENT NOVELS
        // ==============================

        loadRecentNovels(novels);


    } catch (error) {

        console.error(
            "Dashboard Error:",
            error
        );

    }

}


function loadRecentNovels(novels) {

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


    const recentNovels =
        novels.slice(-5).reverse();


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
                                    Chapters
                                </span>

                            </div>

                        </div>
                    `
                )
                .join("")}
        </div>
    `;

}


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

        // Sidebar navigation
        const navItems =
            document.querySelectorAll(
                ".admin-navigation .nav-item"
            );

        navItems.forEach(
            function (item) {

                const text =
                    item
                        .querySelector("span:last-child")
                        ?.textContent
                        .trim();

                item.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        if (text === "Dashboard") {
                            window.location.href =
                                "admin_dashboard.html";
                        }

                        if (text === "All Novels") {
                            window.location.href =
                                "admin_novels.html";
                        }

                        if (text === "Scrape Novel") {
                            window.location.href =
                                "scraper.html";
                        }

                        if (text === "Add Novel") {
                            window.location.href =
                                "manual_novel.html";
                        }

                        if (text === "Users") {
                            alert(
                                "User management will be added next."
                            );
                        }

                        if (text === "Settings") {
                            alert(
                                "Settings will be added next."
                            );

                        }

                    }
                );

            }
        );


        // Quick Action buttons
        const actionCards =
            document.querySelectorAll(
                ".action-card"
            );

        actionCards.forEach(
            function (card) {

                const title =
                    card
                        .querySelector("strong")
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


        // View All button
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


        // Logout button
        const logoutButton =
            document.querySelector(
                ".logout-button"
            );

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "admin_login.html";

                }
            );

        }

    }
);