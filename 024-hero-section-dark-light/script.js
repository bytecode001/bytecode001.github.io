// Select the theme toggle button and the body element
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Add event listener to toggle between light and dark mode on button click
themeToggle.addEventListener('click', () => {
  // Toggle the 'dark-mode' class on the body element
  body.classList.toggle('dark-mode');
  
  // Change the text and emoji on the button based on the current theme
  if (body.classList.contains('dark-mode')) {
    themeToggle.textContent = 'Light 🌞'; // Switch to light mode text
  } else {
    themeToggle.textContent = 'Dark 🌙'; // Switch to dark mode text
  }
});
