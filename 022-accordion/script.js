// Select all accordion headers
const accordionHeaders = document.querySelectorAll('.accordion-header');

// Loop through each header to add a click event listener
accordionHeaders.forEach(header => {
  header.addEventListener('click', () => {
    // Get the parent .accordion-item of the clicked header
    const accordionItem = header.parentElement;

    // Toggle 'active' class to show or hide content
    accordionItem.classList.toggle('active');

    // Optionally, close all other sections when one is opened
    document.querySelectorAll('.accordion-item').forEach(item => {
      // Check if the item is not the one clicked
      if (item !== accordionItem) {
        // Remove 'active' class from other items
        item.classList.remove('active');
      }
    });
  });
});
