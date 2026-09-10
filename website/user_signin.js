const signinForm = document.getElementById("signinForm");
const signinMessage = document.getElementById("signinMessage");

if (signinForm) {
    signinForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("signinEmail").value.trim().toLowerCase();
        const password = document.getElementById("signinPassword").value;
        const button = signinForm.querySelector("button[type='submit']");
        signinMessage.textContent = "";
        button.disabled = true;
        try {
            const response = await fetch("http://127.0.0.1:5000/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok || !data.token) {
                throw new Error(data.error || "Unable to sign in.");
            }
            localStorage.setItem("user_token", data.token);
            localStorage.setItem("user_data", JSON.stringify(data.user || {}));
            signinMessage.textContent = "Signed in successfully. Redirecting…";
            window.setTimeout(() => { window.location.href = "user_dashboard.html"; }, 400);
        } catch (error) {
            signinMessage.textContent = error.message || "Unable to connect to the server.";
        } finally {
            button.disabled = false;
        }
    });
}
