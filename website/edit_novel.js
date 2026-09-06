const API_URL = "http://127.0.0.1:5000";

// ============================================================
// GET URL PARAMETERS
// ============================================================

const params = new URLSearchParams(window.location.search);

const novelId = params.get("id");
const filename = params.get("file");

// ============================================================
// ADMIN AUTH
// ============================================================

const adminToken =
    sessionStorage.getItem("adminToken");

if (!adminToken) {
    window.location.href = "admin_login.html";
}

// ============================================================
// ELEMENTS
// ============================================================

const form =
    document.getElementById("editNovelForm");

const novelIdInput =
    document.getElementById("novelId");

const titleInput =
    document.getElementById("title");

const authorInput =
    document.getElementById("author");

const genreInput =
    document.getElementById("genre");

const statusInput =
    document.getElementById("status");

const synopsisInput =
    document.getElementById("synopsis");

const coverImageInput =
    document.getElementById("coverImage");

const coverPreview =
    document.getElementById("coverPreview");

const coverPlaceholder =
    document.getElementById("coverPlaceholder");

const sourceWebsiteInput =
    document.getElementById("sourceWebsite");

const sourceUrlInput =
    document.getElementById("sourceUrl");

const chaptersContainer =
    document.getElementById("chaptersContainer");

const addChapterButton =
    document.getElementById("addChapterButton");

const saveNovelButton =
    document.getElementById("saveNovelButton");

const messageBox =
    document.getElementById("message");

// ============================================================
// CURRENT NOVEL
// ============================================================

let currentNovel = null;

// IDs of chapters that existed when page was loaded
let originalChapterIds = new Set();

// ============================================================
// INITIAL LOAD
// ============================================================

if (!novelId) {

    showMessage(
        "Novel ID was not provided.",
        "error"
    );

    disableSave();

} else {

    if (novelIdInput) {
        novelIdInput.value = novelId;
    }

    loadNovelForEdit();
}

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

        window.location.href =
            "admin_login.html";

        return true;
    }

    return false;
}

// ============================================================
// LOAD NOVEL
// ============================================================

async function loadNovelForEdit() {
    try {
        showMessage(
            "Loading novel...",
            "info"
        );

        const response = await fetch(
            `${API_URL}/admin/novels/${encodeURIComponent(novelId)}`,
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

        const responseData =
            await response.json();

        if (!response.ok) {
            throw new Error(
                responseData.error ||
                "Could not load novel details."
            );
        }

        // Backend response is:
        // { novel: { ... } }
        const data = responseData.novel;

        if (!data) {
            throw new Error(
                "Novel data was not found in the server response."
            );
        }

        currentNovel = data;

        // ====================================================
        // NOVEL INFORMATION
        // ====================================================

        if (novelIdInput) {
            novelIdInput.value =
                data.id || novelId;
        }

        if (titleInput) {
            titleInput.value =
                data.title || "";
        }

        if (authorInput) {
            authorInput.value =
                data.author || "";
        }

        if (genreInput) {
            genreInput.value =
                data.genre || "";
        }

        if (statusInput) {
            statusInput.value =
                data.status || "";
        }

        if (synopsisInput) {
            synopsisInput.value =
                data.synopsis || "";
        }

        if (sourceWebsiteInput) {
            sourceWebsiteInput.value =
                data.source_website || "";
        }

        if (sourceUrlInput) {
            sourceUrlInput.value =
                data.source_url || "";
        }

        // ====================================================
        // COVER
        // ====================================================

        displayCover(
            data.cover_image
        );

        // ====================================================
        // CHAPTERS
        // ====================================================

        chaptersContainer.innerHTML = "";

        const chapters =
            Array.isArray(data.chapters)
                ? data.chapters
                : [];

        // Store original chapter IDs
        originalChapterIds =
            new Set(
                chapters
                    .filter(
                        chapter => chapter.id
                    )
                    .map(
                        chapter =>
                            String(chapter.id)
                    )
            );

        if (!chapters.length) {
            showEmptyChapters();
        } else {
            chapters.forEach(
                function (chapter) {
                    addChapter(
                        chapter
                    );
                }
            );
        }

        showMessage(
            "",
            "info"
        );

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

        disableSave();
    }
}

// ============================================================
// DISPLAY COVER
// ============================================================

function displayCover(coverUrl) {

    if (!coverUrl) {

        coverPreview.src = "";

        coverPreview.style.display =
            "none";

        coverPlaceholder.style.display =
            "flex";

        return;
    }

    coverPreview.src =
        coverUrl;

    coverPreview.style.display =
        "block";

    coverPlaceholder.style.display =
        "none";

    coverPreview.onerror =
        function () {

            coverPreview.style.display =
                "none";

            coverPlaceholder.style.display =
                "flex";
        };
}

// ============================================================
// NEW COVER PREVIEW
// ============================================================

if (coverImageInput) {

    coverImageInput.addEventListener(
        "change",
        function () {

            const file =
                coverImageInput.files[0];

            if (!file) {
                return;
            }

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                showMessage(
                    "Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP or GIF.",
                    "error"
                );

                coverImageInput.value =
                    "";

                return;
            }

            const previewUrl =
                URL.createObjectURL(file);

            coverPreview.src =
                previewUrl;

            coverPreview.style.display =
                "block";

            coverPlaceholder.style.display =
                "none";
        }
    );
}

// ============================================================
// EMPTY CHAPTERS
// ============================================================

function showEmptyChapters() {

    chaptersContainer.innerHTML = `
        <div class="empty-chapters">
            <div class="empty-chapters-icon">
                ≡
            </div>

            <h4>
                No chapters found
            </h4>

            <p>
                Add a chapter using the button above.
            </p>
        </div>
    `;
}

// ============================================================
// ADD CHAPTER FORM
// ============================================================

function addChapter(chapter = null) {

    // Remove empty message if present
    const emptyMessage =
        chaptersContainer.querySelector(
            ".empty-chapters"
        );

    if (emptyMessage) {
        emptyMessage.remove();
    }

    const chapterDiv =
        document.createElement("div");

    chapterDiv.className =
        "chapter-form";

    // Existing chapter
    if (
        chapter &&
        chapter.id
    ) {

        chapterDiv.dataset.chapterId =
            String(chapter.id);
    }

    const chapterNumber =
        chapter &&
        chapter.chapter_number
            ? chapter.chapter_number
            : getNextChapterNumber();

    const chapterTitle =
        chapter
            ? chapter.title || ""
            : `Chapter ${chapterNumber}`;

    const chapterContent =
        chapter
            ? chapter.content || ""
            : "";

    const chapterDate =
        chapter
            ? chapter.date || ""
            : "";

    const chapterUrl =
        chapter
            ? chapter.url || ""
            : "";

    const isLocked =
        chapter
            ? Boolean(chapter.is_locked)
            : false;

    chapterDiv.innerHTML = `

        <div class="chapter-header">

            <h3>
                Chapter ${escapeHtml(
                    chapterNumber
                )}
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
                    value="${escapeAttribute(
                        chapterNumber
                    )}"
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
                    value="${escapeAttribute(
                        chapterTitle
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
                chapterContent
            )}</textarea>

        </div>

        <div class="form-row">

            <div class="form-group">

                <label>
                    Chapter Date
                </label>

                <input
                    type="text"
                    class="chapter-date"
                    value="${escapeAttribute(
                        chapterDate
                    )}"
                    placeholder="Optional"
                >

            </div>

            <div class="form-group">

                <label>
                    Chapter URL
                </label>

                <input
                    type="text"
                    class="chapter-url"
                    value="${escapeAttribute(
                        chapterUrl
                    )}"
                    placeholder="Optional"
                >

            </div>

        </div>

        <div class="chapter-lock-row">

            <label>

                <input
                    type="checkbox"
                    class="chapter-locked"
                    ${isLocked ? "checked" : ""}
                >

                Lock Chapter

            </label>

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
// GET NEXT CHAPTER NUMBER
// ============================================================

function getNextChapterNumber() {

    const chapterElements =
        chaptersContainer.querySelectorAll(
            ".chapter-form"
        );

    let highestNumber = 0;

    chapterElements.forEach(
        function (chapter) {

            const input =
                chapter.querySelector(
                    ".chapter-number"
                );

            const number =
                parseInt(
                    input?.value,
                    10
                );

            if (
                Number.isInteger(number) &&
                number > highestNumber
            ) {

                highestNumber =
                    number;
            }
        }
    );

    return highestNumber + 1;
}

// ============================================================
// ADD NEW CHAPTER BUTTON
// ============================================================

if (addChapterButton) {

    addChapterButton.addEventListener(
        "click",
        function () {

            const nextNumber =
                getNextChapterNumber();

            addChapter({
                chapter_number:
                    nextNumber,

                title:
                    `Chapter ${nextNumber}`,

                content: ""
            });

            updateChapterHeadings();

            const newChapter =
                chaptersContainer.lastElementChild;

            if (newChapter) {

                newChapter.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                const titleField =
                    newChapter.querySelector(
                        ".chapter-title"
                    );

                if (titleField) {
                    titleField.focus();
                }
            }
        }
    );
}

// ============================================================
// CHAPTER ACTIONS
// ============================================================

chaptersContainer.addEventListener(
    "click",
    function (event) {

        // ====================================================
        // EDIT CHAPTER
        // ====================================================

        const editButton =
            event.target.closest(
                ".edit-chapter-btn"
            );

        if (editButton) {

            const chapter =
                editButton.closest(
                    ".chapter-form"
                );

            if (!chapter) {
                return;
            }

            const titleField =
                chapter.querySelector(
                    ".chapter-title"
                );

            if (titleField) {

                titleField.focus();

                titleField.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            return;
        }

        // ====================================================
        // REMOVE CHAPTER
        // ====================================================

        const removeButton =
            event.target.closest(
                ".remove-chapter-btn"
            );

        if (removeButton) {

            const chapter =
                removeButton.closest(
                    ".chapter-form"
                );

            if (!chapter) {
                return;
            }

            const titleField =
                chapter.querySelector(
                    ".chapter-title"
                );

            const chapterTitle =
                titleField
                    ? titleField.value
                    : "this chapter";

            const confirmed =
                confirm(
                    `Remove "${chapterTitle}"?\n\nThe chapter will be deleted when you save the novel.`
                );

            if (!confirmed) {
                return;
            }

            chapter.remove();

            updateChapterHeadings();

            const remaining =
                chaptersContainer.querySelectorAll(
                    ".chapter-form"
                );

            if (!remaining.length) {
                showEmptyChapters();
            }
        }
    }
);

// ============================================================
// UPDATE CHAPTER HEADINGS
// ============================================================

function updateChapterHeadings() {

    const chapters =
        chaptersContainer.querySelectorAll(
            ".chapter-form"
        );

    chapters.forEach(
        function (chapter) {

            const heading =
                chapter.querySelector(
                    "h3"
                );

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
// SAVE NOVEL
// ============================================================

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (!currentNovel) {

                showMessage(
                    "Novel data has not loaded yet.",
                    "error"
                );

                return;
            }

            const id =
                currentNovel.id;

            if (!id) {

                showMessage(
                    "Novel ID is missing.",
                    "error"
                );

                return;
            }

            // =================================================
            // NOVEL DATA
            // =================================================

            const title =
                titleInput.value.trim();

            const author =
                authorInput.value.trim();

            const genre =
                genreInput.value.trim();

            const status =
                statusInput.value;

            const synopsis =
                synopsisInput.value.trim();

            const sourceWebsite =
                sourceWebsiteInput.value.trim();

            const sourceUrl =
                sourceUrlInput.value.trim();

            if (!title) {

                showMessage(
                    "Novel title is required.",
                    "error"
                );

                titleInput.focus();

                return;
            }

            // =================================================
            // COLLECT CHAPTERS
            // =================================================

            const chapterElements =
                chaptersContainer.querySelectorAll(
                    ".chapter-form"
                );

            const chapters = [];

            chapterElements.forEach(
                function (chapterElement) {

                    const numberInput =
                        chapterElement.querySelector(
                            ".chapter-number"
                        );

                    const titleField =
                        chapterElement.querySelector(
                            ".chapter-title"
                        );

                    const contentInput =
                        chapterElement.querySelector(
                            ".chapter-content"
                        );

                    const dateInput =
                        chapterElement.querySelector(
                            ".chapter-date"
                        );

                    const urlInput =
                        chapterElement.querySelector(
                            ".chapter-url"
                        );

                    const lockedInput =
                        chapterElement.querySelector(
                            ".chapter-locked"
                        );

                    chapters.push({

                        id:
                            chapterElement.dataset.chapterId ||
                            null,

                        chapter_number:
                            parseInt(
                                numberInput?.value,
                                10
                            ),

                        title:
                            titleField
                                ? titleField.value.trim()
                                : "",

                        content:
                            contentInput
                                ? contentInput.value.trim()
                                : "",

                        date:
                            dateInput
                                ? dateInput.value.trim()
                                : "",

                        url:
                            urlInput
                                ? urlInput.value.trim()
                                : "",

                        is_locked:
                            lockedInput
                                ? lockedInput.checked
                                : false
                    });
                }
            );

            // =================================================
            // VALIDATE CHAPTERS
            // =================================================

            for (
                const chapter of chapters
            ) {

                if (
                    !Number.isInteger(
                        chapter.chapter_number
                    ) ||
                    chapter.chapter_number < 1
                ) {

                    showMessage(
                        "Chapter number must be greater than 0.",
                        "error"
                    );

                    return;
                }

                if (!chapter.title) {

                    showMessage(
                        "Chapter title is required.",
                        "error"
                    );

                    return;
                }

                if (!chapter.content) {

                    showMessage(
                        "Chapter content is required.",
                        "error"
                    );

                    return;
                }
            }

            // =================================================
            // CHECK DUPLICATE NUMBERS
            // =================================================

            const chapterNumbers =
                chapters.map(
                    chapter =>
                        chapter.chapter_number
                );

            if (
                new Set(chapterNumbers).size !==
                chapterNumbers.length
            ) {

                showMessage(
                    "Duplicate chapter numbers are not allowed.",
                    "error"
                );

                return;
            }

            // =================================================
            // DISABLE SAVE
            // =================================================

            saveNovelButton.disabled =
                true;

            saveNovelButton.textContent =
                "Saving Changes...";

            showMessage(
                "Saving changes...",
                "info"
            );

            try {

                // =============================================
                // 1. UPDATE NOVEL
                // =============================================

                const novelResponse =
                    await fetch(
                        `${API_URL}/admin/novels/${id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${adminToken}`
                            },

                            body:
                                JSON.stringify({

                                    title,

                                    author,

                                    genre,

                                    status,

                                    synopsis,

                                    source_website:
                                        sourceWebsite,

                                    source_url:
                                        sourceUrl
                                })
                        }
                    );

                if (
                    handleAuthError(
                        novelResponse
                    )
                ) {
                    return;
                }

                const novelResult =
                    await novelResponse.json();

                if (!novelResponse.ok) {

                    throw new Error(
                        novelResult.error ||
                        "Failed to update novel."
                    );
                }

                // =============================================
                // 2. COVER
                // =============================================

                const selectedCover =
                    coverImageInput.files[0];

                if (selectedCover) {

                    const formData =
                        new FormData();

                    formData.append(
                        "cover",
                        selectedCover
                    );

                    const coverResponse =
                        await fetch(
                            `${API_URL}/admin/novels/${id}/cover`,
                            {
                                method: "POST",

                                headers: {
                                    "Authorization":
                                        `Bearer ${adminToken}`
                                },

                                body:
                                    formData
                            }
                        );

                    if (
                        handleAuthError(
                            coverResponse
                        )
                    ) {
                        return;
                    }

                    const coverResult =
                        await coverResponse.json();

                    if (!coverResponse.ok) {

                        throw new Error(
                            coverResult.error ||
                            "Failed to upload cover."
                        );
                    }
                }

                // =============================================
                // 3. UPDATE EXISTING / ADD NEW CHAPTERS
                // =============================================

                const currentChapterIds =
                    new Set();

                for (
                    const chapter of chapters
                ) {

                    // =========================================
                    // EXISTING CHAPTER
                    // =========================================

                    if (chapter.id) {

                        currentChapterIds.add(
                            String(chapter.id)
                        );

                        const chapterResponse =
                            await fetch(
                                `${API_URL}/admin/novels/${id}/chapters/${chapter.id}`,
                                {
                                    method: "PUT",

                                    headers: {
                                        "Content-Type":
                                            "application/json",

                                        "Authorization":
                                            `Bearer ${adminToken}`
                                    },

                                    body:
                                        JSON.stringify({

                                            chapter_number:
                                                chapter.chapter_number,

                                            title:
                                                chapter.title,

                                            content:
                                                chapter.content,

                                            date:
                                                chapter.date,

                                            url:
                                                chapter.url,

                                            is_locked:
                                                chapter.is_locked
                                        })
                                }
                            );

                        if (
                            handleAuthError(
                                chapterResponse
                            )
                        ) {
                            return;
                        }

                        const chapterResult =
                            await chapterResponse.json();

                        if (
                            !chapterResponse.ok
                        ) {

                            throw new Error(
                                chapterResult.error ||
                                "Failed to update chapter."
                            );
                        }

                    } else {

                        // =====================================
                        // NEW CHAPTER
                        // =====================================

                        const addResponse =
                            await fetch(
                                `${API_URL}/admin/novels/${id}/chapters`,
                                {
                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json",

                                        "Authorization":
                                            `Bearer ${adminToken}`
                                    },

                                    body:
                                        JSON.stringify({

                                            chapter_number:
                                                chapter.chapter_number,

                                            title:
                                                chapter.title,

                                            content:
                                                chapter.content,

                                            date:
                                                chapter.date,

                                            url:
                                                chapter.url,

                                            is_locked:
                                                chapter.is_locked
                                        })
                                }
                            );

                        if (
                            handleAuthError(
                                addResponse
                            )
                        ) {
                            return;
                        }

                        const addResult =
                            await addResponse.json();

                        if (!addResponse.ok) {

                            throw new Error(
                                addResult.error ||
                                "Failed to add chapter."
                            );
                        }
                    }
                }

                // =============================================
                // 4. DELETE REMOVED CHAPTERS
                // =============================================

                for (
                    const originalId
                    of originalChapterIds
                ) {

                    if (
                        !currentChapterIds.has(
                            originalId
                        )
                    ) {

                        const deleteResponse =
                            await fetch(
                                `${API_URL}/admin/novels/${id}/chapters/${originalId}`,
                                {
                                    method: "DELETE",

                                    headers: {
                                        "Authorization":
                                            `Bearer ${adminToken}`
                                    }
                                }
                            );

                        if (
                            handleAuthError(
                                deleteResponse
                            )
                        ) {
                            return;
                        }

                        const deleteResult =
                            await deleteResponse.json();

                        if (
                            !deleteResponse.ok
                        ) {

                            throw new Error(
                                deleteResult.error ||
                                "Failed to delete chapter."
                            );
                        }
                    }
                }

                // =============================================
                // SUCCESS
                // =============================================

                showMessage(
                    "Novel updated successfully!",
                    "success"
                );

                alert(
                    "Novel updated successfully!"
                );

                window.location.href =
                    "admin_novels.html";

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

                saveNovelButton.disabled =
                    false;

                saveNovelButton.textContent =
                    "Save Changes";
            }
        }
    );
}

// ============================================================
// MESSAGE
// ============================================================

function showMessage(
    message,
    type
) {

    if (!messageBox) {
        return;
    }

    messageBox.textContent =
        message || "";

    if (type === "success") {

        messageBox.style.color =
            "#86efac";

    } else if (type === "error") {

        messageBox.style.color =
            "#fca5a5";

    } else {

        messageBox.style.color =
            "";
    }
}

// ============================================================
// DISABLE SAVE
// ============================================================

function disableSave() {

    if (saveNovelButton) {

        saveNovelButton.disabled =
            true;
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