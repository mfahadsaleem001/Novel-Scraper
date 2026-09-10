const API_BASE_URL = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", function () {

const signupForm = document.getElementById("userSignupForm");
const signupButton = document.getElementById("signupButton");
const signupMessage = document.getElementById("signupMessage");

if (!signupForm || !signupButton || !signupMessage) {
    console.error("Signup form elements were not found.");
    return;
}

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

if (
    !nameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput
) {
    console.error("Signup input elements were not found.");
    return;
}

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = nameInput.value.trim();

    const email = emailInput.value
        .trim()
        .toLowerCase();

    const password = passwordInput.value;

    const confirmPassword = confirmPasswordInput.value;

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

        const response = await fetch(
            `${API_BASE_URL}/user/signup`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {

            signupMessage.textContent =
                data.error ||
                data.message ||
                "Could not create account.";

            signupMessage.style.color =
                "var(--burgundy)";

            return;
        }

        signupMessage.textContent =
            "Account created successfully. Redirecting to sign in...";

        signupMessage.style.color =
            "var(--gold)";

        setTimeout(function () {

            window.location.href =
                "user_login.html";

        }, 800);

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

});

});
