// ============================================================
// USER SIGN IN
// PASSWORD SHOW / HIDE
// ============================================================

const signinPassword =
    document.getElementById("signinPassword");

const toggleSigninPassword =
    document.getElementById(
        "toggleSigninPassword"
    );


// ============================================================
// PASSWORD TOGGLE
// ============================================================

if (
    signinPassword &&
    toggleSigninPassword
) {

    toggleSigninPassword.addEventListener(
        "click",
        function () {

            if (
                signinPassword.type ===
                "password"
            ) {

                signinPassword.type = "text";

                toggleSigninPassword.textContent =
                    "🙈";

                toggleSigninPassword.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                signinPassword.type =
                    "password";

                toggleSigninPassword.textContent =
                    "👁";

                toggleSigninPassword.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }
        }
    );
}