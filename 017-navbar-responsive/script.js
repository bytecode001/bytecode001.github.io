const toggleButton = document.getElementById("toggle-button");
const navbarLinks = document.getElementById("navbar-links");

toggleButton.addEventListener("click", function() {
    navbarLinks.classList.toggle("active");
});
