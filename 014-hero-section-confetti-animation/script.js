// Get references to the button and canvas elements
const confettiBtn = document.getElementById('confetti-btn');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// Set canvas dimensions to match the viewport
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

// Define the number of confetti pieces
const confettiCount = 300;
const confetti = []; // Array to store confetti pieces
let animationId; // To store the animation frame ID
let isAnimating = false; // Track whether the animation is running

// Function to generate a random number between a range
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Initialize confetti pieces with random properties
function initConfetti() {
    confetti.length = 0; // Clear existing confetti
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: random(0, confettiCanvas.width), // Random x position
            y: random(0, confettiCanvas.height) - confettiCanvas.height, // Start above the canvas
            r: random(2, 6), // Random radius (size)
            d: random(15, 25), // Random density (affects falling speed)
            color: `hsl(${random(0, 360)}, 100%, 50%)`, // Random color
            tilt: random(-10, 10), // Random tilt angle
            tiltAngleIncremental: random(0.05, 0.12), // Speed of tilt change
            tiltAngle: 0 // Initial tilt angle
        });
    }
}

// Function to draw confetti pieces on the canvas
function drawConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); // Clear the canvas
    confetti.forEach((c, i) => {
        c.tiltAngle += c.tiltAngleIncremental; // Increase tilt angle
        c.y += (Math.cos(c.d) + 1 + c.r) / 2; // Update y position (falling effect)
        c.x += Math.sin(c.d); // Update x position (drift effect)

        // Draw the confetti piece
        ctx.beginPath();
        ctx.lineWidth = c.r;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r / 4, c.y);
        ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r / 4);
        ctx.stroke();

        // Reset confetti piece if it falls below the canvas
        if (c.y > confettiCanvas.height) {
            confetti[i] = {
                x: random(0, confettiCanvas.width),
                y: random(0, confettiCanvas.height) - confettiCanvas.height,
                r: c.r,
                d: c.d,
                color: c.color,
                tilt: c.tilt,
                tiltAngleIncremental: c.tiltAngleIncremental,
                tiltAngle: c.tiltAngle
            };
        }
    });
}

// Function to update the confetti animation
function updateConfetti() {
    drawConfetti(); // Draw confetti pieces
    animationId = requestAnimationFrame(updateConfetti); // Request the next frame
}

// Function to fade out confetti when stopping the animation
function fadeOutConfetti() {
    confettiCanvas.style.transition = "opacity 1.5s ease-out"; // Smooth fade-out
    confettiCanvas.style.opacity = 0; // Set opacity to 0 (invisible)
    setTimeout(() => {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); // Clear the canvas
        confettiCanvas.style.opacity = 1; // Reset opacity for next time
    }, 1500); // 1.5 seconds to match the transition duration
}

// Function to toggle confetti animation on/off
function toggleConfetti() {
    if (isAnimating) {
        fadeOutConfetti(); // Fade out and stop animation
        cancelAnimationFrame(animationId); // Stop the animation
        confettiBtn.textContent = "Get Started"; // Update button text
    } else {
        initConfetti(); // Initialize confetti pieces
        updateConfetti(); // Start the animation
        confettiBtn.textContent = "Stop"; // Update button text
    }
    isAnimating = !isAnimating; // Toggle the animation state
}

// Add event listener to the button to trigger toggleConfetti on click
confettiBtn.addEventListener('click', toggleConfetti);