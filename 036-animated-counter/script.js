// Wait for the DOM to be fully loaded before executing the code
document.addEventListener('DOMContentLoaded', () => {
    // Select all elements with the class 'counter'
    const counters = document.querySelectorAll('.counter');

    // Iterate through each 'counter' element found
    counters.forEach(counter => {
        // Function to animate the counter
        const animateCounter = () => {
            // Get the target value from data-target attribute and convert it to a number
            const target = +counter.getAttribute('data-target');
            // Get the current value displayed in the counter and convert it to a number
            const current = +counter.innerText;
            // Calculate the increment for each animation frame
            const increment = target / 200;

            // Check if the current value is less than the target
            if (current < target) {
                // Update the counter text by incrementing the current value
                counter.innerText = Math.ceil(current + increment);
                // Request the next animation frame
                requestAnimationFrame(animateCounter);
            } else {
                // If the current value has reached or surpassed the target
                // Set the counter text to the exact target value
                counter.innerText = target;
                // Add the 'animate' class to trigger CSS animations
                counter.classList.add('animate');
            }
        };

        // Start the counter animation
        animateCounter();
    });
});
