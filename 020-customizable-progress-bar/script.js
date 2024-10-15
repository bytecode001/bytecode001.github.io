let interval;  // Stores the interval ID for controlling the animation
let startTime; // Stores the time when the animation starts

function startProgress() {
  // Get references to the relevant elements in the DOM
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const timer = document.getElementById('timer');
  const completionText = document.getElementById('completionText');
  const userTimeInput = document.getElementById('timeInput').value;

  // Convert the user input (in seconds) to milliseconds
  let totalDuration = parseInt(userTimeInput) * 1000;

  // If the input is not valid or less than 1 second, default to 4 seconds
  if (isNaN(totalDuration) || totalDuration < 1000) {
    totalDuration = 4000;
  }

  // Hide the completion message before starting the progress
  completionText.classList.add('hidden');

  // Clear any previous intervals to prevent conflicts
  clearInterval(interval);
  startTime = Date.now();  // Record the start time of the progress

  // Set the CSS transition to smoothly animate the width of the progress bar
  progressBar.style.transition = `width ${totalDuration}ms linear`;
  progressBar.style.width = '0%';  // Reset the progress bar width to 0%

  // Use setInterval to update the progress bar and percentage text in real-time
  interval = setInterval(() => {
    const elapsedTime = Date.now() - startTime;  // Calculate the time elapsed since the start
    const percentage = Math.min((elapsedTime / totalDuration) * 100, 100);  // Calculate progress percentage

    // Update the progress text and the timer display
    progressText.textContent = Math.floor(percentage) + '%';
    timer.textContent = `Time: ${(elapsedTime / 1000).toFixed(1)}s`;

    // If the progress reaches 100%, stop the interval and show the completion message
    if (percentage >= 100) {
      clearInterval(interval);
      completionText.classList.remove('hidden');  // Show the "Progress Completed" message
    }
  }, 40);  // Update the progress every 40 milliseconds

  // Trigger the CSS animation to expand the progress bar
  setTimeout(() => {
    progressBar.style.width = '100%';
  }, 0);
}

function resetProgress() {
  // Stop the interval if it's running
  clearInterval(interval);

  // Get references to the relevant elements
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const timer = document.getElementById('timer');
  const completionText = document.getElementById('completionText');

  // Reset the progress bar, percentage text, and timer display
  progressBar.style.transition = '';  // Remove the transition to instantly reset
  progressBar.style.width = '0%';  // Reset the progress bar width to 0%
  progressText.textContent = '0%';  // Reset the percentage text to 0%
  timer.textContent = 'Time: 0s';  // Reset the timer display
  completionText.classList.add('hidden');  // Hide the completion message
}