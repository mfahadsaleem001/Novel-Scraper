const API_URL = "http://127.0.0.1:5000";

// ============================================================
// GET FILE NAME
// ============================================================

const params = new URLSearchParams(
    window.location.search
);

const filename = params.get("file");

// ============================================================
// ELEMENTS
// ============================================================

const form =
    document.getElementById("editNovelForm");

const chaptersContainer =
    document.getElementById(
        "chaptersContainer"
    );

const addChapterBtn =
    document.getElementById(
        "addChapterBtn"
    );

const saveButton =
    document.getElementById(
        "saveNovelBtn"
    );

const cancelBtn =
    document.getElementById(
        "cancelBtn"
    );

const messageBox =
    document.getElementById(
        "editNovelMessage"
    );

// ============================================================
// CHECK FILE
// ============================================================

if (!filename) {

    showMessage(
        "Novel file was not specified.",
        "error"
    );

} else {

    loadNovelForEdit();

}

// ============================================================
// LOAD NOVEL
// ============================================================

async function loadNovelForEdit() {

    try {

        const response =
            await fetch(
                `${API_URL}/novel/${encodeURIComponent(
                    filename
                )}`
            );

        const novel =
            await response.json();

        if (!response.ok) {

            throw new Error(
                novel.error ||
                "Could not load novel."
            );

        }

        // ====================================================
        // LOAD NOVEL INFORMATION
        // ====================================================

        document.getElementById(
            "novelTitle"
        ).value =
            novel.title || "";

        document.getElementById(
            "novelAuthor"
        ).value =
            novel.author || "";

        document.getElementById(
            "novelGenre"
        ).value =
            novel.genre || "";

        document.getElementById(
            "novelStatus"
        ).value =
            novel.status || "Ongoing";

        document.getElementById(
            "novelSynopsis"
        ).value =
            novel.synopsis || "";

        document.getElementById(
            "coverImage"
        ).value =
            novel.cover_image || "";

        // ====================================================
        // LOAD CHAPTERS
        // ====================================================

        chaptersContainer.innerHTML = "";

        const chapters =
            Array.isArray(novel.chapters)
                ? novel.chapters
                : [];

        chapters.forEach(
            function (chapter) {

                addChapter(
                    chapter.chapter_number,
                    chapter.title,
                    chapter.content
                );

            }
        );

        updateChapterHeadings();

    } catch (error) {

        console.error(
            "Edit Load Error:",
            error
        );

        showMessage(
            error.message ||
            "Could not load novel.",
            "error"
        );

        if (saveButton) {

            saveButton.disabled = true;

        }

    }

}

// ============================================================
// ADD CHAPTER
// ============================================================

function addChapter(
    number,
    title,
    content
) {

    const chapterDiv =
        document.createElement("div");

    chapterDiv.className =
        "chapter-form";

    chapterDiv.innerHTML = `
        <div class="chapter-header">

            <h3>
                Chapter ${escapeHtml(number)}
            </h3>

        </div>

        <div class="form-row">

            <div class="form-group">

                <label>
                    Chapter Number
                </label>

                <input
                    type="number"
                    class="chapter-number"
                    value="${escapeHtml(number)}"
                    min="1"
                    required
                >

            </div>

            <div class="form-group">

                <label>
                    Chapter Title
                </label>

                <input
                    type="text"
                    class="chapter-title"
                    value="${escapeHtml(
                        title || ""
                    )}"
                    required
                >

            </div>

        </div>

        <div class="form-group">

            <label>
                Chapter Content
            </label>

            <textarea
                class="chapter-content"
                rows="12"
                required
            >${escapeHtml(
                content || ""
            )}</textarea>

        </div>

        <div class="chapter-actions">

            <button
                type="button"
                class="edit-chapter-btn"
            >
                ✏️ Edit Chapter
            </button>

            <button
                type="button"
                class="remove-chapter-btn"
            >
                🗑 Remove Chapter
            </button>

        </div>
    `;

    chaptersContainer.appendChild(
        chapterDiv
    );

}

// ============================================================
// ADD NEW CHAPTER BUTTON
// ============================================================

addChapterBtn.addEventListener(
    "click",
    function () {

        const chapters =
            document.querySelectorAll(
                ".chapter-form"
            );

        const nextNumber =
            chapters.length + 1;

        addChapter(
            nextNumber,
            `Chapter ${nextNumber}`,
            ""
        );

        updateChapterHeadings();

        // Scroll to new chapter

        const newChapter =
            chaptersContainer.lastElementChild;

        if (newChapter) {

            newChapter.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            const titleInput =
                newChapter.querySelector(
                    ".chapter-title"
                );

            if (titleInput) {

                titleInput.focus();

            }

        }

    }
);

// ============================================================
// CHAPTER ACTIONS
// ============================================================

chaptersContainer.addEventListener(
    "click",
    function (event) {

        // ----------------------------------------------------
        // EDIT CHAPTER
        // ----------------------------------------------------

        if (
            event.target.classList.contains(
                "edit-chapter-btn"
            )
        ) {

            const chapter =
                event.target.closest(
                    ".chapter-form"
                );

            if (!chapter) {
                return;
            }

            const titleInput =
                chapter.querySelector(
                    ".chapter-title"
                );

            if (titleInput) {

                titleInput.focus();

                titleInput.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

            return;

        }

        // ----------------------------------------------------
        // REMOVE CHAPTER
        // ----------------------------------------------------

        if (
            event.target.classList.contains(
                "remove-chapter-btn"
            )
        ) {

            const chapters =
                document.querySelectorAll(
                    ".chapter-form"
                );

            if (chapters.length <= 1) {

                alert(
                    "At least one chapter is required."
                );

                return;

            }

            const chapter =
                event.target.closest(
                    ".chapter-form"
                );

            if (chapter) {

                chapter.remove();

            }

            updateChapterHeadings();

        }

    }
);

// ============================================================
// UPDATE CHAPTER HEADINGS
// ============================================================

function updateChapterHeadings() {

    const chapters =
        document.querySelectorAll(
            ".chapter-form"
        );

    chapters.forEach(
        function (chapter) {

            const heading =
                chapter.querySelector("h3");

            const numberInput =
                chapter.querySelector(
                    ".chapter-number"
                );

            if (
                heading &&
                numberInput
            ) {

                heading.textContent =
                    `Chapter ${numberInput.value}`;

            }

        }
    );

}

// ============================================================
// SAVE CHANGES
// ============================================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const title =
            document.getElementById(
                "novelTitle"
            ).value.trim();

        const author =
            document.getElementById(
                "novelAuthor"
            ).value.trim();

        const genre =
            document.getElementById(
                "novelGenre"
            ).value.trim();

        const status =
            document.getElementById(
                "novelStatus"
            ).value;

        const synopsis =
            document.getElementById(
                "novelSynopsis"
            ).value.trim();

        const coverImage =
            document.getElementById(
                "coverImage"
            ).value.trim();

        // ----------------------------------------------------
        // COLLECT CHAPTERS
        // ----------------------------------------------------

        const chapterElements =
            document.querySelectorAll(
                ".chapter-form"
            );

        const chapters = [];

        chapterElements.forEach(
            function (chapter) {

                chapters.push({

                    chapter_number:
                        parseInt(
                            chapter.querySelector(
                                ".chapter-number"
                            ).value
                        ),

                    title:
                        chapter.querySelector(
                            ".chapter-title"
                        ).value.trim(),

                    content:
                        chapter.querySelector(
                            ".chapter-content"
                        ).value.trim()

                });

            }
        );

        // ----------------------------------------------------
        // BUTTON LOADING
        // ----------------------------------------------------

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving Changes...";

        messageBox.textContent = "";

        try {

            const response =
                await fetch(
                    `${API_URL}/manual-novel/${encodeURIComponent(
                        filename
                    )}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            title: title,

                            author: author,

                            genre: genre,

                            status: status,

                            synopsis: synopsis,

                            cover_image:
                                coverImage,

                            chapters:
                                chapters

                        })

                    }
                );

            const result =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to update novel."
                );

            }

            showMessage(
                "Novel updated successfully!",
                "success"
            );

            alert(
                "Novel updated successfully!"
            );

            // ------------------------------------------------
            // RETURN TO SCRAPER PAGE
            // ------------------------------------------------

            window.location.href =
                "scraper.html";

        } catch (error) {

            console.error(
                "Edit Novel Error:",
                error
            );

            showMessage(
                error.message ||
                "Could not update novel.",
                "error"
            );

        } finally {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Changes";

        }

    }
);

// ============================================================
// CANCEL
// ============================================================

cancelBtn.addEventListener(
    "click",
    function () {

        window.location.href =
            "scraper.html";

    }
);

// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type
) {

    messageBox.textContent =
        message;

    messageBox.style.color =
        type === "success"
            ? "#86efac"
            : "#fca5a5";

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