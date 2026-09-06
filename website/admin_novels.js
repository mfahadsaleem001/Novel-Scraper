const API_URL = "http://127.0.0.1:5000";

let allAdminNovels = [];


async function loadAdminNovels() {

    const container =
        document.getElementById(
            "adminNovelsContainer"
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

        allAdminNovels =
            await response.json();

        renderAdminNovels(
            allAdminNovels
        );

    } catch (error) {

        console.error(
            "Admin Novels Error:",
            error
        );

        container.innerHTML = `
            <div class="empty-admin-novels">

                <h3>
                    Failed to load novels
                </h3>

                <p>
                    Please make sure the backend server is running.
                </p>

            </div>
        `;

    }

}


function renderAdminNovels(
    novels
) {

    const container =
        document.getElementById(
            "adminNovelsContainer"
        );

    if (!container) {
        return;
    }


    if (!novels.length) {

        container.innerHTML = `
            <div class="empty-admin-novels">

                <h3>
                    No novels found
                </h3>

                <p>
                    Your collection does not contain any matching novels.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        novels
            .map(
                function (novel) {

                    const cover =
                        novel.cover_image ||
                        "https://via.placeholder.com/90x120?text=No+Cover";


                    return `
                        <article
                            class="admin-novel-card"
                        >

                            <img
                                class="admin-novel-cover"
                                src="${escapeHtml(cover)}"
                                alt="${escapeHtml(
                                    novel.title ||
                                    "Novel Cover"
                                )}"
                                onerror="
                                    this.onerror=null;
                                    this.src='https://via.placeholder.com/90x120?text=No+Cover';
                                "
                            >


                            <div class="admin-novel-info">

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
                                    <strong>Chapters:</strong>
                                    ${Number(
                                        novel.total_chapters ||
                                        0
                                    )}
                                </p>

                                <span
                                    class="novel-status"
                                >
                                    ${escapeHtml(
                                        novel.status ||
                                        "Unknown"
                                    )}
                                </span>


                                <div
                                    class="admin-novel-actions"
                                >

                                    <button
                                        type="button"
                                        class="read-admin-btn"
                                        onclick="readAdminNovel('${encodeURIComponent(
                                            novel.filename
                                        )}')"
                                    >
                                        📖 Read
                                    </button>

                                    <button
                                        type="button"
                                        class="edit-admin-btn"
                                        onclick="editAdminNovel('${encodeURIComponent(
                                            novel.filename
                                        )}')"
                                    >
                                        ✏️ Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="delete-admin-btn"
                                        onclick="deleteAdminNovel('${encodeURIComponent(
                                            novel.filename
                                        )}')"
                                    >
                                        🗑️ Delete
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");

}


function readAdminNovel(
    encodedFilename
) {

    const filename =
        decodeURIComponent(
            encodedFilename
        );

    window.location.href =
        `novel.html?file=${encodeURIComponent(
            filename
        )}`;

}


function editAdminNovel(
    encodedFilename
) {

    const filename =
        decodeURIComponent(
            encodedFilename
        );

    window.location.href =
        `edit_novel.html?file=${encodeURIComponent(
            filename
        )}`;

}


function deleteAdminNovel(
    encodedFilename
) {

    const filename =
        decodeURIComponent(
            encodedFilename
        );

    const novel =
        allAdminNovels.find(
            item =>
                item.filename === filename
        );

    if (!novel) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${novel.title}"?\n\nThis action will permanently remove the novel.`
        );

    if (!confirmed) {
        return;
    }


    alert(
        "Delete functionality will be connected to the backend next."
    );

}


function applyNovelFilters() {

    const searchInput =
        document.getElementById(
            "novelSearch"
        );

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const search =
        (
            searchInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        statusFilter?.value ||
        "all";


    const filtered =
        allAdminNovels.filter(
            function (novel) {

                const title =
                    String(
                        novel.title || ""
                    ).toLowerCase();

                const author =
                    String(
                        novel.author || ""
                    ).toLowerCase();

                const novelStatus =
                    String(
                        novel.status || ""
                    );


                const matchesSearch =
                    title.includes(search) ||
                    author.includes(search);


                const matchesStatus =
                    status === "all" ||
                    novelStatus === status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderAdminNovels(
        filtered
    );

}


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


document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadAdminNovels();


        const searchInput =
            document.getElementById(
                "novelSearch"
            );

        const statusFilter =
            document.getElementById(
                "statusFilter"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                applyNovelFilters
            );

        }


        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                applyNovelFilters
            );

        }

    }
);