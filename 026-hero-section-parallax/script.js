// Select the hamburger icon and the menu from the DOM
const hamburgerIcon = document.querySelector('.hamburger-icon');
const menu = document.querySelector('.menu');

// When the hamburger icon is clicked, toggle the 'active' class on the menu
hamburgerIcon.addEventListener('click', () => {
  // The class 'active' controls whether the menu is visible or hidden
  menu.classList.toggle('active');
});

// Parallax scrolling effect for the hero section
window.addEventListener('scroll', () => {
  // Get the current scroll position
  const scrollPosition = window.pageYOffset;
  // Set a speed for the Parallax effect (0.5 means half the scroll speed)
  const parallaxSpeed = 0.1;
  const hero = document.querySelector('.hero');

  // Move the background image position based on scroll speed
  hero.style.backgroundPositionY = `${scrollPosition * parallaxSpeed}px`;
});
