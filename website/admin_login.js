const passwordInput =
    document.getElementById(
        "adminPassword"
    );

const togglePassword =
    document.getElementById(
        "togglePassword"
    );

if (
    passwordInput &&
    togglePassword
) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type =
                    "text";

                togglePassword.textContent =
                    "🙈";

                togglePassword.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                passwordInput.type =
                    "password";

                togglePassword.textContent =
                    "👁";

                togglePassword.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }
        }
    );
}


const adminLoginForm =
    document.getElementById(
        "adminLoginForm"
    );

if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const message =
                document.getElementById(
                    "loginMessage"
                );

            if (message) {

                message.textContent =
                    "Authentication will be connected next.";

                message.style.color =
                    "#6f1d3a";
            }
        }
    );
}