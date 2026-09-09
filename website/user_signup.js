const signupForm = document.getElementById("userSignupForm");

const signupButton = document.getElementById("signupButton");

const signupMessage = document.getElementById("signupMessage");

const API_BASE_URL = "http://127.0.0.1:5000";

signupForm.addEventListener(
"submit",
async function (event) {

    event.preventDefault();

    const name =
        document
            .getElementById("name")
            .value
            .trim();

    const email =
        document
            .getElementById("email")
            .value
            .trim()
            .toLowerCase();

    const password =
        document
            .getElementById("password")
            .value;

    const confirmPassword =
        document
            .getElementById("confirmPassword")
            .value;

    signupMessage.textContent = "";
    signupMessage.style.color = "";

    if (
        !name ||
        !email ||
        !password ||
        !confirmPassword
    ) {
        signupMessage.textContent =
            "Please complete all fields.";

        signupMessage.style.color =
            "var(--burgundy)";

        return;
    }

    if (password.length < 6) {
        signupMessage.textContent =
            "Password must contain at least 6 characters.";

        signupMessage.style.color =
            "var(--burgundy)";

        return;
    }

    if (password !== confirmPassword) {
        signupMessage.textContent =
            "Passwords do not match.";

        signupMessage.style.color =
            "var(--burgundy)";

        return;
    }

    signupButton.disabled = true;

    signupButton.textContent =
        "Creating Account...";

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/user/signup`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            signupMessage.textContent =
                data.error ||
                "Could not create account.";

            signupMessage.style.color =
                "var(--burgundy)";

            return;
        }

        signupMessage.textContent =
            "Account created successfully. Redirecting to sign in...";

        signupMessage.style.color =
            "var(--gold)";

        setTimeout(
            function () {

                window.location.href =
                    "user_login.html";

            },
            800
        );

    } catch (error) {

        console.error(
            "User Signup Error:",
            error
        );

        signupMessage.textContent =
            "Unable to connect to the server.";

        signupMessage.style.color =
            "var(--burgundy)";

    } finally {

        signupButton.disabled = false;

        signupButton.textContent =
            "Create Account";
    }
}
);
