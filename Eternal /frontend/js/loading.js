/* =========================================================
   ETERNAL LOADER — ONCE PER SESSION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const loaderShown =
        sessionStorage.getItem("eternalLoaderShown");

    /* If already shown during this session, do nothing */
    if (loaderShown) {
        return;
    }

    /* Mark it as shown */
    sessionStorage.setItem(
        "eternalLoaderShown",
        "true"
    );


    /* Load the loader */
    fetch("loading.html")
        .then(response => {

            if (!response.ok) {

                throw new Error(
                    "Could not load loading.html: " +
                    response.status
                );

            }

            return response.text();

        })

        .then(html => {

            document.body.insertAdjacentHTML(
                "afterbegin",
                html
            );

            const loader =
                document.getElementById("eternal-loader");

            if (!loader) {

                throw new Error(
                    "ETERNAL loader element not found."
                );

            }


            /* Start fade after 8.5 seconds */

            setTimeout(() => {

                loader.style.transition =
                    "opacity 0.8s ease";

                loader.style.opacity = "0";

            }, 6000);


            /* Remove completely */

            setTimeout(() => {

                loader.remove();

                document.body.style.overflow = "auto";

            }, 6500);

        })

        .catch(error => {

            console.error(
                "ETERNAL LOADER ERROR:",
                error
            );

        });

});