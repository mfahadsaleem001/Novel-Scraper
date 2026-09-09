const loginForm = document.getElementById("userLoginForm");

const loginButton = document.getElementById("loginButton");

const loginMessage = document.getElementById("loginMessage");

const API_BASE_URL = "http://127.0.0.1:5000";

loginForm.addEventListener("submit", async function (event) {

event.preventDefault();

const email = document
    .getElementById("email")
    .value
    .trim()
    .toLowerCase();

const password = document
    .getElementById("password")
    .value;

loginMessage.textContent = "";
loginMessage.style.color = "";

if (!email || !password) {

    loginMessage.textContent =
        "Email and password are required.";

    loginMessage.style.color =
        "var(--burgundy)";

    return;
}

loginButton.disabled = true;
loginButton.textContent = "Signing In...";

try {

    const response = await fetch(
        `${API_BASE_URL}/user/login`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {

        loginMessage.textContent =
            data.error ||
            "Invalid email or password.";

        loginMessage.style.color =
            "var(--burgundy)";

        return;
    }

    if (!data.token) {

        loginMessage.textContent =
            "Login failed. Authentication token was not received.";

        loginMessage.style.color =
            "var(--burgundy)";

        return;
    }

    localStorage.setItem(
        "user_token",
        data.token
    );

    localStorage.setItem(
        "user_data",
        JSON.stringify(
            data.user || {}
        )
    );

    loginMessage.textContent =
        "Login successful. Redirecting...";

    loginMessage.style.color =
        "var(--gold)";

    setTimeout(function () {

        window.location.href =
            "user_dashboard.html";

    }, 500);

} catch (error) {

    console.error(
        "User Login Error:",
        error
    );

    loginMessage.textContent =
        "Unable to connect to the server.";

    loginMessage.style.color =
        "var(--burgundy)";

} finally {

    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
}

});
