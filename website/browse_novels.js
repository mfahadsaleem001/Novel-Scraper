/* ============================================================
   NOVEL ARCHIVE - BROWSE NOVELS
   ============================================================ */

const API_URL = "http://127.0.0.1:5000";

let allNovels = [];
let filteredNovels = [];


/* ============================================================
   INITIALIZE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        initializeBrowsePage();
    }
);


/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */

function initializeBrowsePage() {

    const searchInput =
        document.getElementById("searchInput");

    const genreFilter =
        document.getElementById("genreFilter");

    const clearFilters =
        document.getElementById("clearFilters");

    const retryButton =
        document.getElementById("retryButton");


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {
                applyFilters();
            }
        );

    }


    if (genreFilter) {

        genreFilter.addEventListener(
            "change",
            function () {
                applyFilters();
            }
        );

    }


    if (clearFilters) {

        clearFilters.addEventListener(
            "click",
            function () {

                if (searchInput) {
                    searchInput.value = "";
                }

                if (genreFilter) {
                    genreFilter.value = "all";
                }

                applyFilters();

            }
        );

    }


    if (retryButton) {

        retryButton.addEventListener(
            "click",
            function () {
                loadNovels();
            }
        );

    }


    loadNovels();
}


/* ============================================================
   LOAD ALL NOVELS
   ============================================================ */

async function loadNovels() {

    const loading =
        document.getElementById("loading");

    const error =
        document.getElementById("error");

    const emptyState =
        document.getElementById("emptyState");

    const novelsGrid =
        document.getElementById("novelsGrid");


    if (loading) {
        loading.style.display = "block";
    }


    if (error) {
        error.style.display = "none";
    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    if (novelsGrid) {
        novelsGrid.innerHTML = "";
    }


    try {

        console.log(
            "Loading all novels from:",
            `${API_URL}/novels`
        );


        const response = await fetch(
            `${API_URL}/novels`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Browse novels response:",
            data
        );


        /*
         * Backend may return:
         *
         * [
         *     {...},
         *     {...}
         * ]
         *
         * OR:
         *
         * {
         *     novels: [...]
         * }
         *
         * OR:
         *
         * {
         *     data: [...]
         * }
         */


        if (Array.isArray(data)) {

            allNovels = data;

        } else if (
            data &&
            Array.isArray(data.novels)
        ) {

            allNovels = data.novels;

        } else if (
            data &&
            Array.isArray(data.data)
        ) {

            allNovels = data.data;

        } else {

            allNovels = [];

        }


        /*
         * Make sure only valid object records
         * are kept.
         */

        allNovels =
            allNovels.filter(
                function (novel) {

                    return (
                        novel &&
                        typeof novel === "object"
                    );

                }
            );


        /*
         * IMPORTANT:
         *
         * Do NOT limit the novels here.
         *
         * All novels returned by the backend
         * will be displayed.
         */

        filteredNovels =
            [...allNovels];


        updateNovelCount(
            allNovels.length
        );


        populateGenres(
            allNovels
        );


        renderNovels(
            filteredNovels
        );


        if (loading) {
            loading.style.display = "none";
        }


    } catch (err) {

        console.error(
            "Failed to load novels:",
            err
        );


        if (loading) {
            loading.style.display = "none";
        }


        if (error) {

            error.style.display = "block";


            const errorMessage =
                document.getElementById(
                    "errorMessage"
                );


            if (errorMessage) {

                errorMessage.textContent =
                    err.message ||
                    "Unable to load novels.";

            }

        }

    }

}


/* ============================================================
   UPDATE TOTAL NOVEL COUNT
   ============================================================ */

function updateNovelCount(count) {

    const countElement =
        document.getElementById(
            "novelCount"
        );


    if (countElement) {

        countElement.textContent =
            Number.isFinite(count)
                ? count
                : 0;

    }

}


/* ============================================================
   POPULATE GENRES
   ============================================================ */

function populateGenres(novels) {

    const genreFilter =
        document.getElementById(
            "genreFilter"
        );


    if (!genreFilter) {
        return;
    }


    const genres =
        new Set();


    novels.forEach(
        function (novel) {

            const genreValue =
                novel.genre;


            if (
                typeof genreValue === "string" &&
                genreValue.trim()
            ) {

                const parts =
                    genreValue.split(",");


                parts.forEach(
                    function (part) {

                        const genre =
                            part.trim();


                        if (genre) {

                            genres.add(
                                genre
                            );

                        }

                    }
                );

            }

        }
    );


    const sortedGenres =
        Array.from(genres).sort(
            function (a, b) {

                return a.localeCompare(
                    b
                );

            }
        );


    /*
     * Keep the default option.
     */

    genreFilter.innerHTML = `
        <option value="all">
            All Genres
        </option>
    `;


    sortedGenres.forEach(
        function (genre) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                genre;


            option.textContent =
                genre;


            genreFilter.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   APPLY SEARCH + FILTER
   ============================================================ */

function applyFilters() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const genreFilter =
        document.getElementById(
            "genreFilter"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedGenre =
        genreFilter
            ? genreFilter.value
            : "all";


    filteredNovels =
        allNovels.filter(
            function (novel) {

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


                const status =
                    String(
                        novel.status || ""
                    ).toLowerCase();


                const matchesSearch =
                    !searchTerm ||
                    title.includes(
                        searchTerm
                    ) ||
                    author.includes(
                        searchTerm
                    ) ||
                    genre.includes(
                        searchTerm
                    ) ||
                    status.includes(
                        searchTerm
                    );


                const matchesGenre =
                    selectedGenre === "all" ||
                    genre
                        .split(",")
                        .map(
                            function (item) {

                                return item
                                    .trim();

                            }
                        )
                        .includes(
                            selectedGenre
                                .toLowerCase()
                        );


                return (
                    matchesSearch &&
                    matchesGenre
                );

            }
        );


    renderNovels(
        filteredNovels
    );

}


/* ============================================================
   RENDER NOVELS
   ============================================================ */

function renderNovels(novels) {

    const novelsGrid =
        document.getElementById(
            "novelsGrid"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!novelsGrid) {
        return;
    }


    novelsGrid.innerHTML = "";


    if (
        !Array.isArray(novels) ||
        novels.length === 0
    ) {

        if (emptyState) {
            emptyState.style.display =
                "block";
        }

        return;

    }


    if (emptyState) {
        emptyState.style.display =
            "none";
    }


    novels.forEach(
        function (novel) {

            const card =
                createNovelCard(
                    novel
                );


            if (card) {

                novelsGrid.appendChild(
                    card
                );

            }

        }
    );

}


/* ============================================================
   GET NOVEL FILENAME
   ============================================================ */

function getNovelFilename(novel) {

    if (!novel || typeof novel !== "object") {
        return "";
    }


    /*
     * Support the common filename fields
     * used by the backend.
     */

    return (
        novel.filename ||
        novel.file_name ||
        novel.file ||
        novel.json_filename ||
        novel.json_file ||
        ""
    );

}


/* ============================================================
   CREATE NOVEL CARD
   ============================================================ */

function createNovelCard(novel) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "novel-card";


    /* ========================================================
       COVER
    ========================================================= */


    const cover =
        document.createElement(
            "div"
        );


    cover.className =
        "novel-cover";


    if (
        novel.cover_image &&
        typeof novel.cover_image === "string"
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            novel.cover_image;


        image.alt =
            novel.title ||
            "Novel Cover";


        image.loading =
            "lazy";


        image.onerror =
            function () {

                image.remove();


                const placeholder =
                    document.createElement(
                        "div"
                    );


                placeholder.className =
                    "cover-placeholder";


                placeholder.textContent =
                    "◇";


                cover.appendChild(
                    placeholder
                );

            };


        cover.appendChild(
            image
        );

    } else {

        const placeholder =
            document.createElement(
                "div"
            );


        placeholder.className =
            "cover-placeholder";


        placeholder.textContent =
            "◇";


        cover.appendChild(
            placeholder
        );

    }


    /* ========================================================
       CARD BODY
    ========================================================= */


    const body =
        document.createElement(
            "div"
        );


    body.className =
        "novel-card-body";


    /* ========================================================
       TITLE
    ========================================================= */


    const title =
        document.createElement(
            "h2"
        );


    title.className =
        "novel-title";


    title.textContent =
        novel.title ||
        "Untitled Novel";


    /* ========================================================
       AUTHOR
    ========================================================= */


    const author =
        document.createElement(
            "p"
        );


    author.className =
        "novel-author";


    author.textContent =
        novel.author
            ? `By ${novel.author}`
            : "Unknown Author";


    /* ========================================================
       META
    ========================================================= */


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "novel-meta";


    if (novel.genre) {

        const genre =
            document.createElement(
                "span"
            );


        genre.textContent =
            novel.genre;


        meta.appendChild(
            genre
        );

    }


    if (novel.status) {

        const status =
            document.createElement(
                "span"
            );


        status.textContent =
            novel.status;


        meta.appendChild(
            status
        );

    }


    /* ========================================================
       READ BUTTON
    ========================================================= */


    const readButton =
        document.createElement(
            "a"
        );


    readButton.className =
        "read-button";


    readButton.textContent =
        "Read Novel";


    const filename =
        getNovelFilename(
            novel
        );


    /*
     * The existing novel.html page expects:
     *
     * novel.html?file=filename
     */


    if (filename) {

        readButton.href =
            `novel.html?file=${encodeURIComponent(
                filename
            )}`;

    } else {

        /*
         * If there is no filename, do not create
         * a broken URL.
         */

        readButton.href =
            "#";


        readButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                console.warn(
                    "Novel has no filename:",
                    novel
                );

                alert(
                    "This novel cannot be opened because its file information is missing."
                );

            }
        );

    }


    /* ========================================================
       APPEND CARD CONTENT
    ========================================================= */


    body.appendChild(
        title
    );


    body.appendChild(
        author
    );


    body.appendChild(
        meta
    );


    body.appendChild(
        readButton
    );


    card.appendChild(
        cover
    );


    card.appendChild(
        body
    );


    return card;

}