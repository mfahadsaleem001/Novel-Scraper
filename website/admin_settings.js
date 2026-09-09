/* ============================================================
NOVEL ARCHIVE - ADMIN SETTINGS
============================================================ */

const API_URL = "http://127.0.0.1:5000";

const token = sessionStorage.getItem("adminToken");

const siteName =
document.getElementById("siteName");

const siteDescription =
document.getElementById("siteDescription");

const autoSyncEnabled =
document.getElementById("autoSyncEnabled");

const syncInterval =
document.getElementById("syncInterval");

const saveSettingsButton =
document.getElementById("saveSettingsButton");

const logoutButton =
document.getElementById("logoutButton");

const message =
document.getElementById("message");

/* ============================================================
AUTH CHECK
============================================================ */

if (!token) {
window.location.href = "admin_login.html";
}

/* ============================================================
MESSAGE
============================================================ */

function showMessage(text, type = "success") {

message.textContent = text;

message.className =
    `message ${type}`;
}

/* ============================================================
LOAD SETTINGS
============================================================ */

async function loadSettings() {

try {

    const response =
        await fetch(
            `${API_URL}/admin/settings`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        sessionStorage.removeItem(
            "adminToken"
        );

        sessionStorage.removeItem(
            "adminUser"
        );

        window.location.href =
            "admin_login.html";

        return;
    }


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Could not load settings."
        );
    }


    const settings =
        data.settings;


    if (!settings) {

        throw new Error(
            "Settings data not found."
        );
    }


    siteName.value =
        settings.site_name ||
        "Novel Archive";


    siteDescription.value =
        settings.site_description ||
        "";


    autoSyncEnabled.checked =
        Boolean(
            settings.auto_sync_enabled
        );


    syncInterval.value =
        String(
            settings.sync_interval || 30
        );


} catch (error) {

    console.error(
        "Settings loading error:",
        error
    );

    showMessage(
        error.message ||
        "Could not load settings.",
        "error"
    );
}
}

/* ============================================================
SAVE SETTINGS
============================================================ */

async function saveSettings() {

const name =
    siteName.value.trim();

const description =
    siteDescription.value.trim();

const autoSync =
    autoSyncEnabled.checked;

const interval =
    Number(syncInterval.value);


if (!name) {

    showMessage(
        "Site name is required.",
        "error"
    );

    siteName.focus();

    return;
}


saveSettingsButton.disabled =
    true;

saveSettingsButton.textContent =
    "Saving...";


try {

    const response =
        await fetch(
            `${API_URL}/admin/settings`,
            {
                method: "PUT",

                headers: {
                    "Authorization":
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    site_name:
                        name,

                    site_description:
                        description,

                    auto_sync_enabled:
                        autoSync,

                    sync_interval:
                        interval
                })
            }
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        sessionStorage.removeItem(
            "adminToken"
        );

        sessionStorage.removeItem(
            "adminUser"
        );

        window.location.href =
            "admin_login.html";

        return;
    }


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Could not save settings."
        );
    }


    showMessage(
        "Settings saved successfully.",
        "success"
    );


} catch (error) {

    console.error(
        "Settings save error:",
        error
    );

    showMessage(
        error.message ||
        "Could not save settings.",
        "error"
    );


} finally {

    saveSettingsButton.disabled =
        false;

    saveSettingsButton.textContent =
        "Save Settings";
}
}

/* ============================================================
CREATE ACCOUNT SECURITY FORM
============================================================ */

function createAccountSecurityForm() {

const securityCard =
    document.querySelector(
        ".settings-section:nth-of-type(3) .settings-card"
    );


if (!securityCard) {
    return;
}


if (
    document.getElementById(
        "accountSecurityForm"
    )
) {
    return;
}


const securityForm =
    document.createElement("div");


securityForm.id =
    "accountSecurityForm";


securityForm.innerHTML = `

    <div
        style="
            margin-top: 28px;
            padding-top: 28px;
            border-top: 1px solid var(--border-color, #ded4c8);
        "
    >

        <div style="margin-bottom: 22px;">

            <p
                style="
                    margin: 0 0 6px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: var(--novel-gold, #b18a52);
                "
            >
                ACCOUNT
            </p>

            <h4
                style="
                    margin: 0 0 6px;
                    font-size: 18px;
                "
            >
                Administrator Account
            </h4>

            <p
                style="
                    margin: 0;
                    color: var(--novel-muted, #756c67);
                "
            >
                Update your administrator email and password.
            </p>

        </div>


        <!-- ADMIN EMAIL -->

        <div
            style="
                margin-bottom: 22px;
            "
        >

            <label
                for="adminEmail"
                style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                "
            >
                Admin Email
            </label>

            <input
                type="email"
                id="adminEmail"
                placeholder="Enter admin email"
                autocomplete="email"
                style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 13px 14px;
                    border: 1px solid var(--border-color, #ded4c8);
                    border-radius: 10px;
                    background: var(--novel-paper, #fffdf8);
                    color: var(--novel-charcoal, #292525);
                    font-size: 15px;
                "
            >

        </div>


        <!-- CURRENT PASSWORD -->

        <div
            style="
                margin-bottom: 16px;
            "
        >

            <label
                for="currentPassword"
                style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                "
            >
                Current Password
            </label>

            <input
                type="password"
                id="currentPassword"
                placeholder="Enter current password"
                autocomplete="current-password"
                style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 13px 14px;
                    border: 1px solid var(--border-color, #ded4c8);
                    border-radius: 10px;
                    background: var(--novel-paper, #fffdf8);
                    color: var(--novel-charcoal, #292525);
                    font-size: 15px;
                "
            >

        </div>


        <!-- NEW PASSWORD -->

        <div
            style="
                margin-bottom: 16px;
            "
        >

            <label
                for="newPassword"
                style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                "
            >
                New Password
            </label>

            <input
                type="password"
                id="newPassword"
                placeholder="Enter new password"
                autocomplete="new-password"
                style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 13px 14px;
                    border: 1px solid var(--border-color, #ded4c8);
                    border-radius: 10px;
                    background: var(--novel-paper, #fffdf8);
                    color: var(--novel-charcoal, #292525);
                    font-size: 15px;
                "
            >

        </div>


        <!-- CONFIRM PASSWORD -->

        <div
            style="
                margin-bottom: 22px;
            "
        >

            <label
                for="confirmPassword"
                style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                "
            >
                Confirm New Password
            </label>

            <input
                type="password"
                id="confirmPassword"
                placeholder="Confirm new password"
                autocomplete="new-password"
                style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 13px 14px;
                    border: 1px solid var(--border-color, #ded4c8);
                    border-radius: 10px;
                    background: var(--novel-paper, #fffdf8);
                    color: var(--novel-charcoal, #292525);
                    font-size: 15px;
                "
            >

        </div>


        <button
            type="button"
            id="updateAccountButton"
            class="save-button"
        >
            Update Account
        </button>

    </div>
`;


securityCard.appendChild(
    securityForm
);


loadAdminProfile();

}

/* ============================================================
LOAD ADMIN PROFILE
============================================================ */

async function loadAdminProfile() {

const adminEmail =
    document.getElementById(
        "adminEmail"
    );


if (!adminEmail) {
    return;
}


try {

    const response =
        await fetch(
            `${API_URL}/admin/profile`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


    /*
     * If the existing backend does not provide
     * GET /admin/profile, keep the email field
     * available for manual entry.
     */

    if (!response.ok) {
        return;
    }


    const data =
        await response.json();


    if (data.user) {

        adminEmail.value =
            data.user.email ||
            "";
    }


    if (data.email) {

        adminEmail.value =
            data.email;
    }


} catch (error) {

    console.warn(
        "Could not load admin profile:",
        error
    );
}
}

/* ============================================================
UPDATE ADMIN EMAIL
============================================================ */

async function updateAdminEmail(email) {

const response =
    await fetch(
        `${API_URL}/admin/profile`,
        {
            method: "PUT",

            headers: {
                "Authorization":
                    `Bearer ${token}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                email: email
            })
        }
    );


if (
    response.status === 401 ||
    response.status === 403
) {

    sessionStorage.removeItem(
        "adminToken"
    );

    sessionStorage.removeItem(
        "adminUser"
    );

    window.location.href =
        "admin_login.html";

    return false;
}


const data =
    await response.json();


if (!response.ok) {

    throw new Error(
        data.error ||
        "Could not update admin email."
    );
}


return true;
}

/* ============================================================
UPDATE ADMIN PASSWORD
============================================================ */

async function updateAdminPassword(
currentPassword,
newPassword
) {

const response =
    await fetch(
        `${API_URL}/admin/reset-password`,
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${token}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                current_password:
                    currentPassword,

                new_password:
                    newPassword
            })
        }
    );


if (
    response.status === 401 ||
    response.status === 403
) {

    sessionStorage.removeItem(
        "adminToken"
    );

    sessionStorage.removeItem(
        "adminUser"
    );

    window.location.href =
        "admin_login.html";

    return false;
}


const data =
    await response.json();


if (!response.ok) {

    throw new Error(
        data.error ||
        "Could not update password."
    );
}


return true;
}

/* ============================================================
UPDATE ACCOUNT
============================================================ */

async function updateAccount() {

const adminEmail =
    document.getElementById(
        "adminEmail"
    );

const currentPassword =
    document.getElementById(
        "currentPassword"
    );

const newPassword =
    document.getElementById(
        "newPassword"
    );

const confirmPassword =
    document.getElementById(
        "confirmPassword"
    );

const updateButton =
    document.getElementById(
        "updateAccountButton"
    );


if (!adminEmail) {
    return;
}


const email =
    adminEmail.value.trim();

const current =
    currentPassword.value;

const newPass =
    newPassword.value;

const confirm =
    confirmPassword.value;


/* ========================================================
   EMAIL VALIDATION
   ======================================================== */

if (!email) {

    showMessage(
        "Admin email is required.",
        "error"
    );

    adminEmail.focus();

    return;
}


const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


if (!emailPattern.test(email)) {

    showMessage(
        "Please enter a valid email address.",
        "error"
    );

    adminEmail.focus();

    return;
}


/* ========================================================
   PASSWORD VALIDATION
   ======================================================== */

const passwordFieldsFilled =
    current ||
    newPass ||
    confirm;


if (passwordFieldsFilled) {

    if (!current) {

        showMessage(
            "Current password is required.",
            "error"
        );

        currentPassword.focus();

        return;
    }


    if (!newPass) {

        showMessage(
            "New password is required.",
            "error"
        );

        newPassword.focus();

        return;
    }


    if (newPass.length < 8) {

        showMessage(
            "New password must be at least 8 characters.",
            "error"
        );

        newPassword.focus();

        return;
    }


    if (newPass !== confirm) {

        showMessage(
            "New passwords do not match.",
            "error"
        );

        confirmPassword.focus();

        return;
    }
}


updateButton.disabled =
    true;

updateButton.textContent =
    "Updating...";


try {

    /* ====================================================
       UPDATE EMAIL
       ==================================================== */

    await updateAdminEmail(email);


    /* ====================================================
       UPDATE PASSWORD ONLY IF ENTERED
       ==================================================== */

    if (passwordFieldsFilled) {

        await updateAdminPassword(
            current,
            newPass
        );
    }


    showMessage(
        passwordFieldsFilled
            ? "Admin email and password updated successfully."
            : "Admin email updated successfully.",
        "success"
    );


    /* ====================================================
       CLEAR PASSWORD FIELDS
       ==================================================== */

    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";


    /* ====================================================
       UPDATE STORED ADMIN USER DATA
       ==================================================== */

    try {

        const storedAdmin =
            sessionStorage.getItem(
                "adminUser"
            );


        if (storedAdmin) {

            const adminUser =
                JSON.parse(
                    storedAdmin
                );

            adminUser.email =
                email;

            sessionStorage.setItem(
                "adminUser",
                JSON.stringify(
                    adminUser
                )
            );
        }

    } catch (storageError) {

        console.warn(
            "Could not update session admin data:",
            storageError
        );
    }


} catch (error) {

    console.error(
        "Account update error:",
        error
    );

    showMessage(
        error.message ||
        "Could not update account.",
        "error"
    );


} finally {

    updateButton.disabled =
        false;

    updateButton.textContent =
        "Update Account";
}
}

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
SAVE BUTTON
============================================================ */

saveSettingsButton.addEventListener(
"click",
saveSettings
);

/* ============================================================
INITIALIZE ACCOUNT SECURITY
============================================================ */

document.addEventListener(
"DOMContentLoaded",
function () {

    createAccountSecurityForm();


    const updateAccountButton =
        document.getElementById(
            "updateAccountButton"
        );


    if (updateAccountButton) {

        updateAccountButton.addEventListener(
            "click",
            updateAccount
        );
    }

}

);

/* ============================================================
LOAD SETTINGS
============================================================ */

loadSettings();