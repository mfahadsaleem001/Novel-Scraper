const API_URL = "http://127.0.0.1:5000";

const userToken = localStorage.getItem("user_token");

if (!userToken) {
window.location.href = "user_login.html";
}

/* ============================================================
HELPERS
============================================================ */

function getStoredUser() {

try {
    return JSON.parse(
        localStorage.getItem("user_data") || "{}"
    );
} catch (error) {
    return {};
}

}

function getInitials(name) {

if (!name) {
    return "U";
}

const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

if (words.length === 1) {
    return words[0]
        .charAt(0)
        .toUpperCase();
}

return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
).toUpperCase();

}

function showMessage(
element,
message,
type
) {

if (!element) {
    return;
}

element.textContent = message;

element.className =
    "form-message";

if (type) {
    element.classList.add(type);
}

}

/* ============================================================
USER DISPLAY
============================================================ */

function updateUserDisplay(user) {
const name =
    user.name ||
    user.username ||
    "Reader";

const avatar =
    document.getElementById(
        "sidebarAvatar"
    );

const sidebarName =
    document.getElementById(
        "sidebarUserName"
    );

if (avatar) {
    avatar.textContent =
        getInitials(name);
}

if (sidebarName) {
    sidebarName.textContent =
        name;
}

}

/* ============================================================
LOAD PROFILE
============================================================ */

async function loadUserProfile() {
const storedUser =
    getStoredUser();

updateUserDisplay(
    storedUser
);

try {

    const response =
        await fetch(
            `${API_URL}/user/profile`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${userToken}`
                }
            }
        );

    if (response.status === 401 ||
        response.status === 403) {

        localStorage.removeItem(
            "user_token"
        );

        localStorage.removeItem(
            "user_data"
        );

        window.location.href =
            "user_login.html";

        return;
    }

    if (!response.ok) {
        return;
    }

    const data =
        await response.json();

    const user =
        data.user || data;

    updateUserDisplay(user);

    const nameInput =
        document.getElementById(
            "profileName"
        );

    const emailInput =
        document.getElementById(
            "profileEmail"
        );

    if (nameInput) {
        nameInput.value =
            user.name || "";
    }

    if (emailInput) {
        emailInput.value =
            user.email || "";
    }

    localStorage.setItem(
        "user_data",
        JSON.stringify(user)
    );

} catch (error) {

    const nameInput =
        document.getElementById(
            "profileName"
        );

    const emailInput =
        document.getElementById(
            "profileEmail"
        );

    if (nameInput) {
        nameInput.value =
            storedUser.name || "";
    }

    if (emailInput) {
        emailInput.value =
            storedUser.email || "";
    }
}

}

/* ============================================================
UPDATE PROFILE
============================================================ */

async function updateProfile(event) {

event.preventDefault();

const nameInput =
    document.getElementById(
        "profileName"
    );

const emailInput =
    document.getElementById(
        "profileEmail"
    );

const message =
    document.getElementById(
        "profileMessage"
    );

const button =
    document.getElementById(
        "saveProfileButton"
    );

const name =
    nameInput.value.trim();

const email =
    emailInput.value.trim();

if (!name || !email) {

    showMessage(
        message,
        "Name and email are required.",
        "error"
    );

    return;
}

button.disabled = true;

button.textContent =
    "Saving...";

showMessage(
    message,
    "",
    ""
);

try {

    const response =
        await fetch(
            `${API_URL}/user/profile`,
            {
                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${userToken}`
                },

                body: JSON.stringify({
                    name,
                    email
                })
            }
        );

    const data =
        await response.json();

    if (response.status === 401 ||
        response.status === 403) {

        localStorage.removeItem(
            "user_token"
        );

        localStorage.removeItem(
            "user_data"
        );

        window.location.href =
            "user_login.html";

        return;
    }

    if (!response.ok) {

        showMessage(
            message,
            data.message ||
            data.error ||
            "Unable to update profile.",
            "error"
        );

        return;
    }

    const updatedUser =
        data.user || {
            ...getStoredUser(),
            name,
            email
        };

    localStorage.setItem(
        "user_data",
        JSON.stringify(updatedUser)
    );

    updateUserDisplay(
        updatedUser
    );

    showMessage(
        message,
        data.message ||
        "Profile updated successfully.",
        "success"
    );

} catch (error) {

    showMessage(
        message,
        "Unable to connect to the server.",
        "error"
    );

} finally {

    button.disabled = false;

    button.textContent =
        "Save Changes";
}

}

/* ============================================================
CHANGE PASSWORD
============================================================ */

async function changePassword(event) {

event.preventDefault();

const currentPassword =
    document.getElementById(
        "currentPassword"
    ).value;

const newPassword =
    document.getElementById(
        "newPassword"
    ).value;

const confirmPassword =
    document.getElementById(
        "confirmPassword"
    ).value;

const message =
    document.getElementById(
        "passwordMessage"
    );

const button =
    document.getElementById(
        "changePasswordButton"
    );

if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword
) {

    showMessage(
        message,
        "Please complete all password fields.",
        "error"
    );

    return;
}

if (newPassword.length < 6) {

    showMessage(
        message,
        "New password must be at least 6 characters.",
        "error"
    );

    return;
}

if (newPassword !== confirmPassword) {

    showMessage(
        message,
        "New passwords do not match.",
        "error"
    );

    return;
}

button.disabled = true;

button.textContent =
    "Updating...";

showMessage(
    message,
    "",
    ""
);

try {

    const response =
        await fetch(
            `${API_URL}/user/change-password`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${userToken}`
                },

                body: JSON.stringify({
                    current_password:
                        currentPassword,

                    new_password:
                        newPassword
                })
            }
        );

    const data =
        await response.json();

    if (response.status === 401 ||
        response.status === 403) {

        localStorage.removeItem(
            "user_token"
        );

        localStorage.removeItem(
            "user_data"
        );

        window.location.href =
            "user_login.html";

        return;
    }

    if (!response.ok) {

        showMessage(
            message,
            data.message ||
            data.error ||
            "Unable to change password.",
            "error"
        );

        return;
    }

    document.getElementById(
        "passwordForm"
    ).reset();

    showMessage(
        message,
        data.message ||
        "Password changed successfully.",
        "success"
    );

} catch (error) {

    showMessage(
        message,
        "Unable to connect to the server.",
        "error"
    );

} finally {

    button.disabled = false;

    button.textContent =
        "Update Password";
}

}

/* ============================================================
LOGOUT
============================================================ */

function logoutUser() {
localStorage.removeItem(
    "user_token"
);

localStorage.removeItem(
    "user_data"
);

window.location.href =
    "user_login.html";

}

/* ============================================================
INITIALIZE
============================================================ */

function initializeProfile() {
const profileForm =
    document.getElementById(
        "profileForm"
    );

const passwordForm =
    document.getElementById(
        "passwordForm"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const mobileLogoutButton =
    document.getElementById(
        "mobileLogoutButton"
    );

if (profileForm) {
    profileForm.addEventListener(
        "submit",
        updateProfile
    );
}

if (passwordForm) {
    passwordForm.addEventListener(
        "submit",
        changePassword
    );
}

if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        logoutUser
    );
}

if (mobileLogoutButton) {
    mobileLogoutButton.addEventListener(
        "click",
        logoutUser
    );
}

loadUserProfile();


}

initializeProfile();
