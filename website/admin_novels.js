const API_URL = "http://127.0.0.1:5000";

// ============================================================
// ADMIN AUTH
// ============================================================

const adminToken = sessionStorage.getItem("adminToken");

if (!adminToken) {
    window.location.href = "admin_login.html";
}

// ============================================================
// ELEMENTS
// ============================================================

const searchInput =
    document.getElementById("novelSearch");

const statusFilter =
    document.getElementById("statusFilter");

const novelsContainer =
    document.getElementById("adminNovelsContainer");

// ============================================================
// DATA
// ============================================================

let novels = [];

// ============================================================
// INITIAL LOAD
// ============================================================

loadNovels();

// ============================================================
// AUTH ERROR HANDLER
// ============================================================

function handleAuthError(response) {

    if (
        response.status === 401 ||
        response.status === 403
    ) {
        sessionStorage.removeItem("adminToken");
        sessionStorage.removeItem("adminUser");

        window.location.href = "admin_login.html";

        return true;
    }

    return false;
}

// ============================================================
// LOAD ALL NOVELS
// ============================================================

async function loadNovels() {

    try {

        novelsContainer.innerHTML = `
            <div class="empty-admin-novels">
                <h3>Loading Novels...</h3>
                <p>Please wait while the collection is loaded.</p>
            </div>
        `;

        const response = await fetch(
            `${API_URL}/admin/novels`,
            {
                method: "GET",
                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );

        if (handleAuthError(response)) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Could not load novels."
            );
        }

        novels =
            Array.isArray(data.novels)
                ? data.novels
                : [];

        renderNovels();

    } catch (error) {

        console.error(
            "Load Novels Error:",
            error
        );

        novelsContainer.innerHTML = `
            <div class="empty-admin-novels">
                <h3>Could Not Load Novels</h3>
                <p>${escapeHtml(
                    error.message ||
                    "An unexpected error occurred."
                )}</p>
            </div>
        `;
    }
}

// ============================================================
// RENDER NOVELS
// ============================================================

function renderNovels() {

    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";

    const filteredNovels =
        novels.filter(
            function (novel) {

                const title =
                    String(
                        novel.title || ""
                    ).toLowerCase();

                const author =
                    String(
                        novel.author || ""
                    ).toLowerCase();

                const status =
                    String(
                        novel.status || ""
                    );

                const matchesSearch =
                    !searchTerm ||
                    title.includes(searchTerm) ||
                    author.includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "all" ||
                    status === selectedStatus;

                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );

    if (!filteredNovels.length) {

        novelsContainer.innerHTML = `
            <div class="empty-admin-novels">
                <h3>No Novels Found</h3>
                <p>
                    No novels match your current search or filter.
                </p>
            </div>
        `;

        return;
    }

    novelsContainer.innerHTML =
        filteredNovels
            .map(
                function (novel) {
                    return createNovelCard(novel);
                }
            )
            .join("");
}

// ============================================================
// CREATE NOVEL CARD
// ============================================================

function createNovelCard(novel) {

    const id =
        novel.id;

    const filename =
        novel.filename || "";

    const title =
        novel.title ||
        "Untitled Novel";

    const author =
        novel.author ||
        "Unknown Author";

    const genre =
        novel.genre ||
        "Unknown Genre";

    const status =
        novel.status ||
        "Unknown";

    const totalChapters =
        Number(
            novel.total_chapters || 0
        );

    const cover =
        novel.cover_image || "";

    // --------------------------------------------------------
    // COVER
    // --------------------------------------------------------

    let coverHTML;

    if (cover) {

        coverHTML = `
            <img
                src="${escapeAttribute(cover)}"
                alt="${escapeAttribute(title)}"
                class="admin-novel-cover"
                onerror="this.style.display='none';"
            >
        `;

    } else {

        coverHTML = `
            <div
                class="admin-novel-cover"
                style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-family:Georgia,serif;
                    font-size:22px;
                    color:var(--burgundy);
                "
            >
                NA
            </div>
        `;
    }

    return `
        <article
            class="admin-novel-card"
            data-novel-id="${escapeAttribute(id)}"
        >

            ${coverHTML}

            <div class="admin-novel-info">

                <h3>
                    ${escapeHtml(title)}
                </h3>

                <p>
                    <strong>Author:</strong>
                    ${escapeHtml(author)}
                </p>

                <p>
                    <strong>Genre:</strong>
                    ${escapeHtml(genre)}
                </p>

                <p>
                    <strong>Chapters:</strong>
                    ${totalChapters}
                </p>

                <span class="novel-status">
                    ${escapeHtml(status)}
                </span>

                <div class="admin-novel-actions">

                    <button
                        type="button"
                        class="read-admin-btn"
                        data-filename="${escapeAttribute(filename)}"
                    >
                        Read
                    </button>

                    <button
                        type="button"
                        class="edit-admin-btn"
                        data-id="${escapeAttribute(id)}"
                        data-filename="${escapeAttribute(filename)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="delete-admin-btn"
                        data-id="${escapeAttribute(id)}"
                        data-filename="${escapeAttribute(filename)}"
                        data-title="${escapeAttribute(title)}"
                    >
                        Delete
                    </button>

                </div>

            </div>

        </article>
    `;
}

// ============================================================
// SEARCH
// ============================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {
            renderNovels();
        }
    );
}

// ============================================================
// STATUS FILTER
// ============================================================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        function () {
            renderNovels();
        }
    );
}

// ============================================================
// BUTTON ACTIONS
// ============================================================

novelsContainer.addEventListener(
    "click",
    function (event) {

        // ====================================================
        // READ BUTTON
        // ====================================================

        const readButton =
            event.target.closest(
                ".read-admin-btn"
            );

        if (readButton) {

            const filename =
                readButton.dataset.filename;

            if (!filename) {

                alert(
                    "Novel filename is missing."
                );

                return;
            }

            window.location.href =
                `novel.html?file=${encodeURIComponent(filename)}`;

            return;
        }

        // ====================================================
        // EDIT BUTTON
        // ====================================================

        const editButton =
            event.target.closest(
                ".edit-admin-btn"
            );

        if (editButton) {

            const novelId =
                editButton.dataset.id;

            const filename =
                editButton.dataset.filename;

            if (!novelId) {

                alert(
                    "Novel database ID is missing."
                );

                return;
            }

            /*
             * IMPORTANT
             *
             * We pass the database ID directly.
             *
             * Example:
             *
             * edit_novel.html?id=18&file=novel.json
             *
             * edit_novel.js can now directly call:
             *
             * GET /admin/novels/18
             *
             * without first calling:
             *
             * GET /novel/novel.json
             */

            let editUrl =
                `edit_novel.html?id=${encodeURIComponent(novelId)}`;

            if (filename) {

                editUrl +=
                    `&file=${encodeURIComponent(filename)}`;
            }

            window.location.href =
                editUrl;

            return;
        }

        // ====================================================
        // DELETE BUTTON
        // ====================================================

        const deleteButton =
            event.target.closest(
                ".delete-admin-btn"
            );

        if (deleteButton) {

            const novelId =
                deleteButton.dataset.id;

            const filename =
                deleteButton.dataset.filename;

            const title =
                deleteButton.dataset.title ||
                "this novel";

            deleteNovel(
                novelId,
                filename,
                title
            );
        }
    }
);

// ============================================================
// DELETE NOVEL
// ============================================================

async function deleteNovel(
    novelId,
    filename,
    title
) {

    const confirmed =
        confirm(
            `Are you sure you want to delete "${title}"?\n\nThis will permanently delete the novel and all of its chapters.`
        );

    if (!confirmed) {
        return;
    }

    if (!filename) {

        alert(
            "Novel filename is missing."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_URL}/novel/${encodeURIComponent(filename)}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization":
                            `Bearer ${adminToken}`
                    }
                }
            );

        if (handleAuthError(response)) {
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not delete novel."
            );
        }

        alert(
            data.message ||
            "Novel deleted successfully."
        );

        // Remove from local list
        novels =
            novels.filter(
                function (novel) {

                    return String(novel.id) !==
                        String(novelId);
                }
            );

        renderNovels();

    } catch (error) {

        console.error(
            "Delete Novel Error:",
            error
        );

        alert(
            error.message ||
            "Could not delete novel."
        );
    }
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}

// ============================================================
// ESCAPE ATTRIBUTE
// ============================================================

function escapeAttribute(value) {

    return escapeHtml(value)
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}