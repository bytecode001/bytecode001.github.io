// Select the card element
const card = document.querySelector('.card');

// Add an event listener for when the mouse moves over the card
card.addEventListener('mousemove', (e) => {
    // Get the card's size and position relative to the viewport
    const cardRect = card.getBoundingClientRect();
    
    // Calculate the position of the mouse relative to the card's top-left corner
    const x = e.clientX - cardRect.left; // X coordinate within the card
    const y = e.clientY - cardRect.top;  // Y coordinate within the card
    
    // Find the center of the card
    const centerX = cardRect.width / 2;
    const centerY = cardRect.height / 2;
    
    // Calculate the rotation angles based on mouse position
    // Multiply by 15 for a stronger tilt effect
    const rotateX = ((y - centerY) / centerY) * 30; // Tilt on the X-axis (up and down)
    const rotateY = ((centerX - x) / centerX) * 30; // Tilt on the Y-axis (left and right)
    
    // Apply the calculated rotation to the card
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

// Add an event listener for when the mouse leaves the card area
card.addEventListener('mouseleave', () => {
    // Reset the card's rotation when the mouse leaves
    card.style.transform = 'rotateX(0) rotateY(0)';
});
