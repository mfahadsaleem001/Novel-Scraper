// ============================================================
// USER SIGNUP
// NOVEL ARCHIVE
// ============================================================


// ============================================================
// ELEMENTS
// ============================================================

const signupForm =
    document.getElementById("signupForm");

const signupMessage =
    document.getElementById("signupMessage");

const signupPassword =
    document.getElementById("signupPassword");

const signupConfirmPassword =
    document.getElementById(
        "signupConfirmPassword"
    );


// ============================================================
// SIGNUP FORM
// ============================================================

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            // ------------------------------------------------
            // GET FORM VALUES
            // ------------------------------------------------

            const name =
                document
                    .getElementById("signupName")
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById("signupEmail")
                    ?.value
                    .trim();


            const password =
                signupPassword?.value || "";


            const confirmPassword =
                signupConfirmPassword?.value || "";


            // ------------------------------------------------
            // BASIC VALIDATION
            // ------------------------------------------------

            if (
                !name ||
                !email ||
                !password ||
                !confirmPassword
            ) {

                showSignupMessage(
                    "Please fill in all fields.",
                    "error"
                );

                return;
            }


            // ------------------------------------------------
            // PASSWORD MATCH
            // ------------------------------------------------

            if (
                password !==
                confirmPassword
            ) {

                showSignupMessage(
                    "Passwords do not match.",
                    "error"
                );

                return;
            }


            // ------------------------------------------------
            // SAVE USER NAME TEMPORARILY
            // ------------------------------------------------

            localStorage.setItem(
                "novelArchiveUserName",
                name
            );


            // ------------------------------------------------
            // SAVE USER EMAIL TEMPORARILY
            // ------------------------------------------------

            localStorage.setItem(
                "novelArchiveUserEmail",
                email
            );


            // ------------------------------------------------
            // SUCCESS MESSAGE
            // ------------------------------------------------

            showSignupMessage(
                "Account created successfully.",
                "success"
            );


            // ------------------------------------------------
            // GO TO SIGN IN
            // ------------------------------------------------

            setTimeout(
                function () {

                    window.location.href =
                        "user_signin.html";

                },
                1200
            );

        }
    );

}


// ============================================================
// MESSAGE
// ============================================================

function showSignupMessage(
    message,
    type
) {

    if (!signupMessage) {
        return;
    }


    signupMessage.textContent =
        message;


    signupMessage.className =
        `auth-message show ${type}`;

}