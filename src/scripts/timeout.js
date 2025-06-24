document.querySelectorAll("#nav a").forEach((link) => {
    link.addEventListener("click", function (event) {
        const isExternalLink =
            this.hasAttribute("target") &&
            this.getAttribute("target") === "_blank";

        if (isExternalLink) {
            event.preventDefault();
            const targetUrl = this.getAttribute("data-href");
            const nav = document.getElementById("nav");

            nav.classList.add("animate");

            setTimeout(() => {
                window.open(targetUrl, "_blank", "noopener,noreferrer");
                nav.classList.remove("animate");
            }, 700);
        }
    });
});