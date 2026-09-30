document.addEventListener("DOMContentLoaded", () => {

    const loaderShown =
        sessionStorage.getItem("eternalLoaderShown");

    const placeholder =
        document.getElementById("loader-placeholder");


    /* Already shown this session */

    if (loaderShown) {

        placeholder.remove();

        return;

    }


    sessionStorage.setItem(
        "eternalLoaderShown",
        "true"
    );


    fetch("loading.html")
        .then(response => response.text())

        .then(html => {

            placeholder.outerHTML = html;

            const loader =
                document.getElementById("eternal-loader");

            /* Your existing timers continue here... */

            setTimeout(() => {

                loader.style.transition =
                    "opacity 0.8s ease";

                loader.style.opacity = "0";

            }, 6000);


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

            placeholder.remove();

        });

});