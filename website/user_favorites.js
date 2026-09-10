const API_URL = "http://127.0.0.1:5000";

const token = localStorage.getItem("user_token");

function clearUserSession() {
localStorage.removeItem("user_token");
localStorage.removeItem("user_data");
}

function coverUrl(value) {
if (!value) {
return "";
}


if (typeof value === "string" && value.startsWith("/")) {
    return `${API_URL}${value}`;
}

return value;


}

function getNovelFilename(novel) {
if (!novel || typeof novel !== "object") {
return "";
}


return (
    novel.filename ||
    novel.novel_filename ||
    novel.file_name ||
    novel.file ||
    novel.json_filename ||
    novel.json_file ||
    ""
);


}

function getSavedNovelId(novel) {
if (!novel || typeof novel !== "object") {
return "";
}


return (
    novel.novel_id ||
    novel.id ||
    novel.novelId ||
    ""
);


}

function parseSavedNovels(data) {
if (Array.isArray(data)) {
return data;
}


if (data && Array.isArray(data.saved_novels)) {
    return data.saved_novels;
}

if (data && Array.isArray(data.saved)) {
    return data.saved;
}

if (data && Array.isArray(data.data)) {
    return data.data;
}

return [];


}

function emptyState() {
return `         <div class="saved-empty-state">             <div class="empty-icon">♡</div>             <h3>No saved novels yet</h3>             <p>Explore the library and save the stories you want to return to.</p>             <a href="browse_novels.html" class="primary-action">Browse Library</a>         </div>
    `;
}

async function loadSavedNovels() {
const container = document.getElementById("savedNovels");
const count = document.getElementById("savedNovelCount");


if (!container || !count) {
    console.error("Saved novels elements were not found.");
    return;
}

if (!token) {
    window.location.href = "user_login.html";
    return;
}

container.innerHTML = `
    <div class="saved-empty-state">
        <p>Loading your saved novels…</p>
    </div>
`;

try {
    const response = await fetch(`${API_URL}/user/saved`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        clearUserSession();
        window.location.href = "user_login.html";
        return;
    }

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Invalid server response.");
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            "Unable to load saved novels."
        );
    }

    const novels = parseSavedNovels(data);

    count.textContent = novels.length;

    if (!novels.length) {
        container.innerHTML = emptyState();
        return;
    }

    container.innerHTML = "";

    novels.forEach((novel) => {
        const card = document.createElement("article");

        card.className = "saved-novel-card";

        const cover = novel.cover_image || novel.cover || "";

        const image = cover
            ? `<img src="${coverUrl(cover)}" alt="">`
            : "<span>NA</span>";

        card.innerHTML = `
            <div class="saved-novel-cover">
                ${image}
            </div>

            <div class="saved-novel-copy">

                <h3></h3>

                <p></p>

                <small></small>

                <div>
                    <button
                        type="button"
                        class="secondary-action read-button"
                    >
                        Read
                    </button>

                    <button
                        type="button"
                        class="remove-saved"
                    >
                        Remove
                    </button>
                </div>

            </div>
        `;

        card.querySelector("h3").textContent =
            novel.title || "Untitled Novel";

        card.querySelector("p").textContent =
            novel.author || "Unknown Author";

        card.querySelector("small").textContent =
            `${novel.genre || "Uncategorized"} · ${novel.total_chapters || 0} chapters`;

        card.querySelector(".read-button").addEventListener(
            "click",
            () => {
                const filename = getNovelFilename(novel);

                if (!filename) {
                    alert("Novel file information is unavailable.");
                    console.warn(
                        "Saved novel filename missing:",
                        novel
                    );
                    return;
                }

                window.location.href =
                    `novel.html?file=${encodeURIComponent(filename)}`;
            }
        );

        card.querySelector(".remove-saved").addEventListener(
            "click",
            async () => {
                const novelId = getSavedNovelId(novel);

                if (!novelId) {
                    alert("Novel ID is unavailable.");
                    console.warn(
                        "Saved novel ID missing:",
                        novel
                    );
                    return;
                }

                const removeButton =
                    card.querySelector(".remove-saved");

                removeButton.disabled = true;
                removeButton.textContent = "Removing...";

                try {
                    const result = await fetch(
                        `${API_URL}/user/saved/${novelId}`,
                        {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );

                    if (
                        result.status === 401 ||
                        result.status === 403
                    ) {
                        clearUserSession();
                        window.location.href =
                            "user_login.html";
                        return;
                    }

                    if (!result.ok) {
                        let errorData = {};

                        try {
                            errorData = await result.json();
                        } catch (_) {
                            errorData = {};
                        }

                        throw new Error(
                            errorData.error ||
                            errorData.message ||
                            "Unable to remove saved novel."
                        );
                    }

                    await loadSavedNovels();

                } catch (error) {
                    console.error(
                        "Remove Saved Novel Error:",
                        error
                    );

                    removeButton.disabled = false;
                    removeButton.textContent = "Remove";

                    alert(
                        error.message ||
                        "Unable to remove saved novel."
                    );
                }
            }
        );

        container.appendChild(card);
    });

} catch (error) {
    console.error(
        "Saved Novels Error:",
        error
    );

    count.textContent = "0";

    container.innerHTML = `
        <div class="saved-empty-state">
            <h3>Unable to load saved novels</h3>
            <p>Please try again shortly.</p>
        </div>
    `;
}


}

document.addEventListener("DOMContentLoaded", () => {
const user = JSON.parse(
localStorage.getItem("user_data") || "{}"
);


const sidebarUserName =
    document.getElementById("sidebarUserName");

const logoutButton =
    document.getElementById("logoutButton");

if (sidebarUserName) {
    sidebarUserName.textContent =
        user.name || "Reader";
}

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        clearUserSession();
        window.location.href =
            "user_login.html";
    });
}

loadSavedNovels();


});
