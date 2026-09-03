const chaptersContainer =
    document.getElementById("chaptersContainer");

const addChapterBtn =
    document.getElementById("addChapterBtn");

const manualNovelForm =
    document.getElementById("manualNovelForm");

const cancelBtn =
    document.getElementById("cancelBtn");

const messageBox =
    document.getElementById("manualNovelMessage");

const coverImageInput =
    document.getElementById("coverImage");

const coverPreview =
    document.getElementById("coverPreview");


let chapterCount = 1;


// ===============================
// COVER IMAGE PREVIEW
// ===============================

coverImageInput.addEventListener("change", function () {

    const file = coverImageInput.files[0];

    if (!file) {
        coverPreview.src = "";
        coverPreview.style.display = "none";
        return;
    }

    if (!file.type.startsWith("image/")) {

        alert("Please select an image file.");

        coverImageInput.value = "";

        coverPreview.src = "";
        coverPreview.style.display = "none";

        return;
    }

    const imageURL =
        URL.createObjectURL(file);

    coverPreview.src = imageURL;

    coverPreview.style.display = "block";
});


// ===============================
// ADD CHAPTER
// ===============================

addChapterBtn.addEventListener("click", function () {

    chapterCount++;

    const chapterDiv =
        document.createElement("div");

    chapterDiv.className = "chapter-form";

    chapterDiv.innerHTML = `

        <div class="chapter-header">

            <h3>Chapter ${chapterCount}</h3>

            <button
                type="button"
                class="remove-chapter-btn"
            >
                Remove
            </button>

        </div>


        <div class="form-row">

            <div class="form-group">

                <label>Chapter Number</label>

                <input
                    type="number"
                    class="chapter-number"
                    value="${chapterCount}"
                    min="1"
                    required
                >

            </div>


            <div class="form-group">

                <label>Chapter Title</label>

                <input
                    type="text"
                    class="chapter-title"
                    value="Chapter ${chapterCount}"
                    placeholder="Chapter title"
                    required
                >

            </div>

        </div>


        <div class="form-group">

            <label>Chapter Content</label>

            <textarea
                class="chapter-content"
                rows="12"
                placeholder="Write your chapter content here..."
                required
            ></textarea>

        </div>

    `;

    chaptersContainer.appendChild(chapterDiv);

    updateChapterHeadings();
});


// ===============================
// REMOVE CHAPTER
// ===============================

chaptersContainer.addEventListener("click", function (event) {

    if (
        event.target.classList.contains(
            "remove-chapter-btn"
        )
    ) {

        const chapterForms =
            document.querySelectorAll(".chapter-form");

        // At least one chapter must remain
        if (chapterForms.length <= 1) {

            alert(
                "A novel must have at least one chapter."
            );

            return;
        }

        event.target
            .closest(".chapter-form")
            .remove();

        updateChapterHeadings();
    }

});


// ===============================
// UPDATE CHAPTER HEADINGS
// ===============================

function updateChapterHeadings() {

    const chapterForms =
        document.querySelectorAll(".chapter-form");

    chapterForms.forEach(
        (chapter, index) => {

            const heading =
                chapter.querySelector("h3");

            if (heading) {
                heading.textContent =
                    `Chapter ${index + 1}`;
            }

        }
    );

}


// ===============================
// SAVE NOVEL
// ===============================

manualNovelForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        messageBox.innerHTML = "";

        const title =
            document
                .getElementById("novelTitle")
                .value
                .trim();

        const author =
            document
                .getElementById("novelAuthor")
                .value
                .trim();

        const genre =
            document
                .getElementById("novelGenre")
                .value
                .trim();

        const status =
            document
                .getElementById("novelStatus")
                .value;

        const synopsis =
            document
                .getElementById("novelSynopsis")
                .value
                .trim();


        // ===============================
        // GET COVER IMAGE
        // ===============================

        const coverFile =
            coverImageInput.files[0];


        // ===============================
        // GET CHAPTERS
        // ===============================

        const chapterForms =
            document.querySelectorAll(
                ".chapter-form"
            );

        const chapters = [];


        chapterForms.forEach(
            function (chapter) {

                const chapterNumber =
                    chapter
                        .querySelector(
                            ".chapter-number"
                        )
                        .value;

                const chapterTitle =
                    chapter
                        .querySelector(
                            ".chapter-title"
                        )
                        .value
                        .trim();

                const chapterContent =
                    chapter
                        .querySelector(
                            ".chapter-content"
                        )
                        .value
                        .trim();


                chapters.push({

                    chapter_number:
                        Number(chapterNumber),

                    title:
                        chapterTitle,

                    content:
                        chapterContent

                });

            }
        );


        // ===============================
        // VALIDATION
        // ===============================

        if (!title) {

            alert(
                "Please enter the novel title."
            );

            return;
        }


        if (chapters.length === 0) {

            alert(
                "Please add at least one chapter."
            );

            return;
        }


        // ===============================
        // CREATE FORMDATA
        // ===============================

        const formData =
            new FormData();


        formData.append(
            "title",
            title
        );

        formData.append(
            "author",
            author
        );

        formData.append(
            "genre",
            genre
        );

        formData.append(
            "status",
            status
        );

        formData.append(
            "synopsis",
            synopsis
        );


        // Chapters JSON
        formData.append(
            "chapters",
            JSON.stringify(chapters)
        );


        // Cover Image
        if (coverFile) {

            formData.append(
                "cover_image",
                coverFile
            );

        }


        // ===============================
        // DISABLE BUTTON
        // ===============================

        const saveButton =
            document.getElementById(
                "saveNovelBtn"
            );

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";


        // ===============================
        // SEND TO BACKEND
        // ===============================

        try {

            const response =
                await fetch(
                    "http://127.0.0.1:5000/manual-novel",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Failed to save novel."
                );

            }


            // ===============================
            // SUCCESS
            // ===============================

            messageBox.innerHTML = `
                <div class="success-box">
                    ✅ Novel saved successfully!
                </div>
            `;


            // Reset form
            manualNovelForm.reset();


            // Reset chapters
            chaptersContainer.innerHTML = `

                <div class="chapter-form">

                    <div class="chapter-header">

                        <h3>Chapter 1</h3>

                        <button
                            type="button"
                            class="remove-chapter-btn"
                        >
                            Remove
                        </button>

                    </div>


                    <div class="form-row">

                        <div class="form-group">

                            <label>
                                Chapter Number
                            </label>

                            <input
                                type="number"
                                class="chapter-number"
                                value="1"
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
                                value="Chapter 1"
                                placeholder="Chapter title"
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
                            placeholder="Write your chapter content here..."
                            required
                        ></textarea>

                    </div>

                </div>

            `;


            chapterCount = 1;


            // Reset cover preview
            coverPreview.src = "";

            coverPreview.style.display =
                "none";


        } catch (error) {

            console.error(
                "Save Novel Error:",
                error
            );


            messageBox.innerHTML = `
                <div class="error-box">
                    ❌ ${error.message}
                </div>
            `;

        } finally {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Novel";

        }

    }
);


// ===============================
// CANCEL
// ===============================

cancelBtn.addEventListener(
    "click",
    function () {

        window.location.href =
            "scraper.html";

    }
);