/* ============================================================
   NOVEL ARCHIVE - ADMIN SETTINGS
   ============================================================ */

const API_URL = "http://127.0.0.1:5000";

const token = sessionStorage.getItem("adminToken");

const siteName = document.getElementById("siteName");
const siteDescription = document.getElementById("siteDescription");
const autoSyncEnabled = document.getElementById("autoSyncEnabled");
const syncInterval = document.getElementById("syncInterval");

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


    saveSettingsButton.disabled = true;

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
   LOAD
   ============================================================ */

loadSettings();