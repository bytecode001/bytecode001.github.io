// Ensure the script runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // Select all filter buttons and portfolio items
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    // Function to filter portfolio items
    const filterItems = (category) => {
        portfolioItems.forEach(item => {
            // If 'all' is selected or item's category matches the filter, display it
            if (category === 'all' || item.getAttribute('data-category') === category) {
                item.style.display = 'block';
                // Add a fade-in animation
                item.classList.add('fade-in');
            } else {
                item.style.display = 'none';
                item.classList.remove('fade-in');
            }
        });
    };

    // Add click event listener to each filter button
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add 'active' class to the clicked button
            button.classList.add('active');
            // Get the filter category from data attribute
            const filterValue = button.getAttribute('data-filter');
            // Call the filter function
            filterItems(filterValue);
        });
    });

    // Initial call to display all items
    filterItems('all');
});
