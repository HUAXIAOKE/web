document.querySelectorAll("#nav a").forEach((link) => {
    link.addEventListener("click", function (event) {
        const targetUrl = this.getAttribute("data-href");
        const isExternalLink =
            this.hasAttribute("target") &&
            this.getAttribute("target") === "_blank";

        event.preventDefault();
        const nav = document.getElementById("nav");

        nav.classList.add("animate");

        setTimeout(() => {
            if (isExternalLink) {
                window.open(targetUrl, "_blank", "noopener,noreferrer");
            } else {
                window.location.href = targetUrl;
            }
        }, 700);
    });
});