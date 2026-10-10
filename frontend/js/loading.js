
document.addEventListener("DOMContentLoaded", async () => {
    const placeholder = document.getElementById("loader-placeholder");
    const loaderShown = sessionStorage.getItem("eternalLoaderShown");

    // Loader has already played in this tab session
    if (loaderShown) {
        if (placeholder) {
            placeholder.remove();
        }

        return;
    }

    // Mark it before loading to prevent repeated playback
    sessionStorage.setItem("eternalLoaderShown", "true");

    if (!placeholder) {
        return;
    }

    try {
        // Always load from the Flask-served frontend HTML folder
        const response = await fetch("/html/loading.html");

        if (!response.ok) {
            throw new Error(`Loader request failed: ${response.status}`);
        }

        const html = await response.text();
        placeholder.outerHTML = html;

        const loader = document.getElementById("eternal-loader");

        if (!loader) {
            return;
        }

        document.body.style.overflow = "hidden";

        // Preserve the existing loader timing
        setTimeout(() => {
            loader.style.transition = "opacity 0.8s ease";
            loader.style.opacity = "0";
        }, 6000);

        setTimeout(() => {
            loader.remove();
            document.body.style.overflow = "auto";
        }, 6800);

    } catch (error) {
        console.error("ETERNAL LOADER ERROR:", error);

        if (placeholder && placeholder.isConnected) {
            placeholder.remove();
        }

        document.body.style.overflow = "auto";
    }
});
