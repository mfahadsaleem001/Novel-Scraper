// ============================================================
// USER PROFILE
// NOVEL ARCHIVE
// ============================================================


// ============================================================
// ELEMENTS
// ============================================================

const profileName =
    document.getElementById(
        "profileName"
    );


const profileEmail =
    document.getElementById(
        "profileEmail"
    );


const profileAvatar =
    document.getElementById(
        "profileAvatar"
    );


const sidebarAvatar =
    document.getElementById(
        "sidebarAvatar"
    );


const sidebarUserName =
    document.getElementById(
        "sidebarUserName"
    );


const profileNameInput =
    document.getElementById(
        "profileNameInput"
    );


const profileEmailInput =
    document.getElementById(
        "profileEmailInput"
    );


const saveProfileButton =
    document.getElementById(
        "saveProfileButton"
    );


const profileMessage =
    document.getElementById(
        "profileMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const changePasswordButton =
    document.getElementById(
        "changePasswordButton"
    );


const myReadingLink =
    document.getElementById(
        "myReadingLink"
    );


const myReadingButton =
    document.getElementById(
        "myReadingButton"
    );


// ============================================================
// GET USER DATA
// ============================================================

function getUserName() {

    return (
        localStorage.getItem(
            "novelArchiveUserName"
        ) ||
        "Reader"
    );

}


function getUserEmail() {

    return (
        localStorage.getItem(
            "novelArchiveUserEmail"
        ) ||
        ""
    );

}


// ============================================================
// GET USER INITIAL
// ============================================================

function getUserInitial(
    name
) {

    const cleanName =
        String(name || "")
            .trim();


    if (!cleanName) {
        return "U";
    }


    return cleanName
        .charAt(0)
        .toUpperCase();

}


// ============================================================
// LOAD PROFILE
// ============================================================

function loadProfile() {

    const name =
        getUserName();


    const email =
        getUserEmail();


    const initial =
        getUserInitial(name);


    // --------------------------------------------------------
    // PROFILE OVERVIEW
    // --------------------------------------------------------

    if (profileName) {

        profileName.textContent =
            name;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email ||
            "No email available";

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            initial;

    }


    // --------------------------------------------------------
    // SIDEBAR
    // --------------------------------------------------------

    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            initial;

    }


    if (sidebarUserName) {

        sidebarUserName.textContent =
            name;

    }


    // --------------------------------------------------------
    // FORM
    // --------------------------------------------------------

    if (profileNameInput) {

        profileNameInput.value =
            name === "Reader"
                ? ""
                : name;

    }


    if (profileEmailInput) {

        profileEmailInput.value =
            email;

    }

}


// ============================================================
// SAVE PROFILE
// ============================================================

if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        function () {

            const newName =
                profileNameInput
                    ?.value
                    .trim();


            const newEmail =
                profileEmailInput
                    ?.value
                    .trim();


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (!newName) {

                showProfileMessage(
                    "Please enter your name.",
                    "error"
                );

                return;
            }


            if (!newEmail) {

                showProfileMessage(
                    "Please enter your email.",
                    "error"
                );

                return;
            }


            // ------------------------------------------------
            // SAVE TEMPORARILY
            // ------------------------------------------------

            localStorage.setItem(
                "novelArchiveUserName",
                newName
            );


            localStorage.setItem(
                "novelArchiveUserEmail",
                newEmail
            );


            // ------------------------------------------------
            // REFRESH PROFILE
            // ------------------------------------------------

            loadProfile();


            showProfileMessage(
                "Profile updated successfully.",
                "success"
            );

        }
    );

}


// ============================================================
// PROFILE MESSAGE
// ============================================================

function showProfileMessage(
    message,
    type
) {

    if (!profileMessage) {
        return;
    }


    profileMessage.textContent =
        message;


    profileMessage.className =
        `profile-message ${type}`;


    setTimeout(
        function () {

            if (profileMessage) {

                profileMessage.textContent =
                    "";

                profileMessage.className =
                    "profile-message";

            }

        },
        2500
    );

}


// ============================================================
// CHANGE PASSWORD
// ============================================================

if (changePasswordButton) {

    changePasswordButton.addEventListener(
        "click",
        function () {

            alert(
                "Password change will be connected to the backend later."
            );

        }
    );

}


// ============================================================
// MY READING
// ============================================================

function openMyReadingMessage(
    event
) {

    if (event) {

        event.preventDefault();

    }


    alert(
        "My Reading section will be connected next."
    );

}


if (myReadingLink) {

    myReadingLink.addEventListener(
        "click",
        openMyReadingMessage
    );

}


if (myReadingButton) {

    myReadingButton.addEventListener(
        "click",
        openMyReadingMessage
    );

}


// ============================================================
// LOGOUT
// ============================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "novelArchiveUserName"
            );


            localStorage.removeItem(
                "novelArchiveUserEmail"
            );


            window.location.href =
                "user_signin.html";

        }
    );

}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadProfile();

    }
);