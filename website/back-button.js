// ============================================================
// GLOBAL WEBSITE BACK BUTTON
// ============================================================

(function () {

    // ========================================================
    // CURRENT PAGE
    // ========================================================

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    // ========================================================
    // EXCLUDED PAGES
    // ========================================================

    const excludedPages = [
        "",
        "index.html",
        "admin_login.html",
        "login.html",
        "signup.html",
        "admin_signup.html"
    ];


    if (excludedPages.includes(currentPage)) {
        return;
    }


    // ========================================================
    // PREVENT DUPLICATE BUTTON
    // ========================================================

    if (
        document.getElementById(
            "globalBackButton"
        )
    ) {
        return;
    }


    // ========================================================
    // CREATE BUTTON
    // ========================================================

    const button =
        document.createElement("button");

    button.type = "button";

    button.id =
        "globalBackButton";

    button.className =
        "global-back-button";


    // ========================================================
    // BUTTON CONTENT
    // ========================================================

    button.innerHTML = `
        <span aria-hidden="true">←</span>
        <span>Back</span>
    `;


    // ========================================================
    // BUTTON ACTION
    // ========================================================

    button.addEventListener(
        "click",
        function () {

            if (
                window.history.length > 1
            ) {

                window.history.back();

            } else {

                window.location.href =
                    "index.html";

            }

        }
    );


    // ========================================================
    // INSERT BUTTON
    // ========================================================

    const main =
        document.querySelector("main");


    if (main) {

        main.insertBefore(
            button,
            main.firstChild
        );

    } else {

        document.body.insertBefore(
            button,
            document.body.firstChild
        );

    }

})();