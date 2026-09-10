/* ============================================================
   NOVEL ARCHIVE - ADMIN USERS
   ============================================================ */

const API_BASE_URL = "http://127.0.0.1:5000";

const adminToken = sessionStorage.getItem("adminToken");

const usersTableBody =
    document.getElementById("usersTableBody");

const totalUsers =
    document.getElementById("totalUsers");

const totalAdmins =
    document.getElementById("totalAdmins");

const normalUsers =
    document.getElementById("normalUsers");

const userSearch =
    document.getElementById("userSearch");

const message =
    document.getElementById("message");

const logoutButton =
    document.getElementById("logoutButton");

const settingsLink =
    document.getElementById("settingsLink");


let allUsers = [];


/* ============================================================
   AUTH CHECK
   ============================================================ */

if (!adminToken) {

    window.location.href = "admin_login.html";

}


/* ============================================================
   MESSAGE
   ============================================================ */

function showMessage(text, type = "error") {

    message.textContent = text;

    message.className = `message ${type}`;

}


function clearMessage() {

    message.textContent = "";

    message.className = "message";

}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return div.innerHTML;

}


/* ============================================================
   UPDATE STATS
   ============================================================ */

function updateStats(users) {

    const admins = users.filter(
        user =>
            String(user.role).toLowerCase() === "admin"
    );

    const normal = users.filter(
        user =>
            String(user.role).toLowerCase() !== "admin"
    );

    totalUsers.textContent = users.length;

    totalAdmins.textContent = admins.length;

    normalUsers.textContent = normal.length;

}


/* ============================================================
   RENDER USERS
   ============================================================ */

function renderUsers(users) {

    if (!users.length) {

        usersTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty"
                >
                    No users found.
                </td>
            </tr>
        `;

        return;
    }


    usersTableBody.innerHTML = users.map(
        user => {

            const role =
                String(user.role || "user")
                    .toLowerCase();

            const roleClass =
                role === "admin"
                    ? "role-admin"
                    : "role-user";

            return `
                <tr>

                    <td>
                        <span class="user-id">
                            #${escapeHtml(user.id)}
                        </span>
                    </td>

                    <td>
                        <span class="user-name">
                            ${escapeHtml(user.name || "Unnamed")}
                        </span>
                    </td>

                    <td>
                        <span class="user-email">
                            ${escapeHtml(user.email || "—")}
                        </span>
                    </td>

                    <td>
                        <span
                            class="role-badge ${roleClass}"
                        >
                            ${escapeHtml(role)}
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDate(user.created_at)
                        )}
                    </td>

                </tr>
            `;
        }
    ).join("");

}


/* ============================================================
   LOAD USERS
   ============================================================ */

async function loadUsers() {

    clearMessage();

    usersTableBody.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="loading"
            >
                Loading users...
            </td>
        </tr>
    `;


    try {

        const response = await fetch(
            `${API_BASE_URL}/admin/users`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${adminToken}`
                }
            }
        );


        if (response.status === 401) {

            sessionStorage.removeItem("adminToken");

            sessionStorage.removeItem("adminUser");

            window.location.href =
                "admin_login.html";

            return;
        }


        if (response.status === 403) {

            showMessage(
                "Admin access required."
            );

            return;
        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to load users."
            );

        }


        allUsers =
            Array.isArray(data.users)
                ? data.users
                : [];


        updateStats(allUsers);

        renderUsers(allUsers);


    } catch (error) {

        console.error(
            "Users loading error:",
            error
        );


        usersTableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty"
                >
                    Unable to load users.
                </td>
            </tr>
        `;


        showMessage(
            error.message ||
            "Unable to load users."
        );

    }

}


/* ============================================================
   SEARCH
   ============================================================ */

userSearch.addEventListener(
    "input",
    function () {

        const search =
            this.value
                .trim()
                .toLowerCase();


        if (!search) {

            renderUsers(allUsers);

            return;
        }


        const filtered =
            allUsers.filter(
                user => {

                    const name =
                        String(
                            user.name || ""
                        ).toLowerCase();

                    const email =
                        String(
                            user.email || ""
                        ).toLowerCase();

                    const role =
                        String(
                            user.role || ""
                        ).toLowerCase();

                    const id =
                        String(
                            user.id || ""
                        ).toLowerCase();


                    return (
                        name.includes(search) ||
                        email.includes(search) ||
                        role.includes(search) ||
                        id.includes(search)
                    );

                }
            );


        renderUsers(filtered);

    }
);


/* ============================================================
   LOGOUT
   ============================================================ */

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

/* ============================================================
   INITIAL LOAD
   ============================================================ */

loadUsers();