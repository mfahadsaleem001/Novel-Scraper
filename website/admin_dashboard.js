const API_URL = "http://127.0.0.1:5000";

// =====================================================
// LOAD ADMIN DASHBOARD DATA
// =====================================================

async function loadDashboardData() {
try {
const token = sessionStorage.getItem("adminToken");
    if (!token) {
        console.error("Admin token not found.");
        window.location.href = "admin_login.html";
        return;
    }

    const response = await fetch(
        `${API_URL}/admin/dashboard`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }
    );

    // =================================================
    // HANDLE UNAUTHORIZED ACCESS
    // =================================================

    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminUser");

        window.location.href = "admin_login.html";
        return;
    }

    if (!response.ok) {
        throw new Error(
            `Dashboard request failed: ${response.status}`
        );
    }

    const data = await response.json();

    console.log("Dashboard data:", data);

    // =================================================
    // GET REAL STATISTICS
    // =================================================

    const totalNovels = Number(data.total_novels ?? 0);
    const totalChapters = Number(data.total_chapters ?? 0);
    const ongoingNovels = Number(data.ongoing_novels ?? 0);
    const completedNovels = Number(data.completed_novels ?? 0);

    // =================================================
    // UPDATE STAT CARDS
    // =================================================

    const statNumbers =
        document.querySelectorAll(".stat-number");

    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = totalNovels;
        statNumbers[1].textContent = totalChapters;
        statNumbers[2].textContent = ongoingNovels;
        statNumbers[3].textContent = completedNovels;
    }

    // =================================================
    // LOAD RECENT NOVELS
    // =================================================

    loadRecentNovels(
        Array.isArray(data.recent_novels)
            ? data.recent_novels
            : []
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

function loadRecentNovels(novels) {
const container =
document.querySelector(".recent-novels");

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

container.innerHTML = `
    <div class="recent-novels-list">

        ${novels
            .map(
                (novel) => {

                    const chapterCount =
                        Number(
                            novel.total_chapters ?? 0
                        );

                    const cover =
                        novel.cover_image ||
                        "https://via.placeholder.com/70x95?text=No+Cover";

                    return `
                        <div class="recent-novel-item">

                            <div class="recent-novel-cover">
                                <img
                                    src="${escapeHtml(cover)}"
                                    alt="Novel Cover"
                                    onerror="
                                        this.onerror=null;
                                        this.src='https://via.placeholder.com/70x95?text=No+Cover';
                                    "
                                >
                            </div>

                            <div class="recent-novel-info">

                                <h3>
                                    ${escapeHtml(
                                        novel.title ||
                                        "Untitled Novel"
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        novel.author ||
                                        "Unknown Author"
                                    )}
                                </p>

                                <span>
                                    ${chapterCount}
                                    ${
                                        chapterCount === 1
                                            ? "Chapter"
                                            : "Chapters"
                                    }
                                </span>

                            </div>

                        </div>
                    `;
                }
            )
            .join("")}

    </div>
`;

}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {
return String(value)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, "&quot;")
.replace(/'/g, "'");
}

// =====================================================
// ADMIN DASHBOARD NAVIGATION
// =====================================================

document.addEventListener(
"DOMContentLoaded",
function () {

    // =================================================
    // LOAD DASHBOARD DATA
    // =================================================

    loadDashboardData();


    // =================================================
    // SIDEBAR NAVIGATION
    // =================================================

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

                    // Dashboard
                    if (text === "Dashboard") {
                        window.location.href =
                            "admin_dashboard.html";
                    }

                    // All Novels
                    if (text === "All Novels") {
                        window.location.href =
                            "admin_novels.html";
                    }

                    // Scrape Novel
                    if (text === "Scrape Novel") {
                        window.location.href =
                            "scraper.html";
                    }

                    // Add Novel
                    if (text === "Add Novel") {
                        window.location.href =
                            "manual_novel.html";
                    }

                    // Users
                    if (text === "Users") {
                        window.location.href =
                            "admin_users.html";
                    }

                    // Settings
                    if (text === "Settings") {
                        window.location.href =
                            "admin_settings.html";
                    }
                }
            );
        }
    );


    // =================================================
    // QUICK ACTION BUTTONS
    // =================================================

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

                    // Scrape Novel
                    if (title === "Scrape Novel") {
                        window.location.href =
                            "scraper.html";
                    }

                    // Add Novel
                    if (title === "Add Novel") {
                        window.location.href =
                            "manual_novel.html";
                    }

                    // View Novels
                    if (title === "View Novels") {
                        window.location.href =
                            "admin_novels.html";
                    }
                }
            );
        }
    );


    // =================================================
    // VIEW ALL BUTTON
    // =================================================

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


    // =================================================
    // LOGOUT BUTTON
    // =================================================

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
