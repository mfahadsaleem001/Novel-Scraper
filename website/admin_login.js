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
    async function (event) {

        event.preventDefault();

        const message =
            document.getElementById(
                "loginMessage"
            );

        const emailInput =
            document.getElementById(
                "adminEmail"
            );

        const email =
            emailInput
                ? emailInput.value.trim()
                : "";

        const password =
            passwordInput
                ? passwordInput.value
                : "";

        if (!email || !password) {

            if (message) {
                message.textContent =
                    "Email and password are required.";

                message.style.color =
                    "#6f1d3a";
            }

            return;
        }

        if (message) {
            message.textContent =
                "Signing in...";

            message.style.color =
                "#756c67";
        }

        try {

            const response =
                await fetch(
                    "http://127.0.0.1:5000/admin/login",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                if (message) {
                    message.textContent =
                        data.error ||
                        "Login failed.";

                    message.style.color =
                        "#6f1d3a";
                }

                return;
            }

            if (message) {
                message.textContent =
                    "Login successful. Redirecting...";

                message.style.color =
                    "#4a1026";
            }

            /*
             * Temporary storage of admin information.
             * Token-based protection will be added
             * in the authentication security step.
             */
            sessionStorage.setItem(
                "adminToken",
                data.token
            );
            sessionStorage.setItem(
                "adminUser",
                JSON.stringify(data.user)
            );

            setTimeout(function () {

                window.location.href =
                    "admin_dashboard.html";

            }, 500);

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            if (message) {
                message.textContent =
                    "Unable to connect to the server.";

                message.style.color =
                    "#6f1d3a";
            }
        }
    }
);

}
