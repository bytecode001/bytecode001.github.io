// Select all tab links and tab content elements
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');

// Loop through each tab link and add a click event listener
tabLinks.forEach(link => {
    link.addEventListener('click', () => {
        // Remove 'active' class from all tab links and tab contents
        tabLinks.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add 'active' class to the clicked tab and its corresponding content
        link.classList.add('active');
        document.getElementById(link.getAttribute('data-tab')).classList.add('active');
    });
});
