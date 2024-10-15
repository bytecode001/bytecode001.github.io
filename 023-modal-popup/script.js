// Get modal element using its ID
const modal = document.getElementById('modal');

// Get the button that opens the modal
const openModalBtn = document.getElementById('openModal');

// Get the close button (X) inside the modal
const closeModalBtn = document.getElementById('closeModal');

// Get the close button inside the modal content (for extra closure option)
const closeModalBtnInside = document.querySelector('.close-modal-btn');

// Function to open the modal when the button is clicked
openModalBtn.addEventListener('click', () => {
  modal.style.display = 'flex'; // Display the modal by setting its display to flex
});

// Function to close the modal when the (X) button is clicked
closeModalBtn.addEventListener('click', () => {
  modal.style.display = 'none'; // Hide the modal by setting its display to none
});

// Function to close the modal when the close button inside modal content is clicked
closeModalBtnInside.addEventListener('click', () => {
  modal.style.display = 'none'; // Hide the modal
});

// Function to close the modal when clicking outside the modal content
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none'; // Hide the modal if user clicks outside the modal content
  }
});

// Handle form submission (this is simulated for the tutorial)
document.getElementById('subscribeForm').addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent the default form submission behavior
  alert('Thank you for subscribing! 🎉 Your free gift is on the way! 🎁'); // Simulated response
  modal.style.display = 'none'; // Hide the modal after the form is submitted
});
