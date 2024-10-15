// Selecting all form steps and navigation buttons
const formSteps = document.querySelectorAll(".form-step");
const nextBtns = document.querySelectorAll(".btn-next");
const prevBtns = document.querySelectorAll(".btn-prev");
const form = document.getElementById("multi-step-form");
const stepNumbers = document.querySelectorAll(".step-number");

// Object to store the user input data
let formData = {
  email: "",
  username: "",
  address: "",
  city: ""
};

// Index to keep track of the current form step (starting from 0 for Step 1)
let formStepIndex = 0;

// Function to validate email using a regular expression
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic regex to match the email format
  return emailRegex.test(email);
}

// Function to validate password (must be at least 8 characters, with one number, one symbol, and one uppercase letter)
function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password); // Returns true if password meets the criteria
}

// Function to update the circles (step indicators) to reflect the active step
function updateStepCircles() {
  stepNumbers.forEach((step, index) => {
    // Add 'active-step' class to steps that are active or completed
    if (index <= formStepIndex) {
      step.parentElement.classList.add("active-step");
    } else {
      // Remove 'active-step' class from steps that are not yet reached
      step.parentElement.classList.remove("active-step");
    }
  });
}

// Display the first step by default when the form loads
formSteps[formStepIndex].classList.add("form-step-active");

// Event listener for "Next" buttons to navigate forward through the form steps
nextBtns.forEach((button) => {
  button.addEventListener("click", () => {
    // Selecting the error message elements for validation
    const emailError = document.getElementById("email-error");
    const passwordError = document.getElementById("password-error");
    const confirmPasswordError = document.getElementById("confirm-password-error");

    // Validation for Step 1 (email)
    if (formStepIndex === 0) {
      const emailValue = document.getElementById("email").value;
      if (!validateEmail(emailValue)) {
        emailError.textContent = "Please enter a valid email."; // Display error if email is invalid
        return; // Stop if email is invalid
      } else {
        emailError.textContent = ""; // Clear error message if email is valid
      }
    }

    // Validation for Step 2 (password)
    if (formStepIndex === 1) {
      const passwordValue = document.getElementById("password").value;
      const confirmPasswordValue = document.getElementById("confirm-password").value;
      if (!validatePassword(passwordValue)) {
        passwordError.textContent = "Password must be at least 8 characters, include a number, a symbol, and an uppercase letter.";
        return; // Stop if password does not meet the requirements
      } else {
        passwordError.textContent = ""; // Clear error message if password is valid
      }

      // Check if passwords match
      if (passwordValue !== confirmPasswordValue) {
        confirmPasswordError.textContent = "Passwords do not match."; // Display error if passwords don't match
        return; // Stop if passwords do not match
      } else {
        confirmPasswordError.textContent = ""; // Clear error message if passwords match
      }
    }

    // Hide the current step and show the next step
    formSteps[formStepIndex].classList.remove("form-step-active");
    formStepIndex++; // Move to the next step

    // Store the form data when moving to the next step
    if (formStepIndex === 1) {
      formData.email = document.getElementById("email").value; // Save email
      formData.username = document.getElementById("username").value; // Save username
    } else if (formStepIndex === 2) {
      formData.address = document.getElementById("address").value; // Save address
      formData.city = document.getElementById("city").value; // Save city
    }

    // Show the new step
    formSteps[formStepIndex].classList.add("form-step-active");
    updateStepCircles(); // Update the step indicator circles

    // Before showing the review, ensure the address and city are saved and displayed
    if (formStepIndex === 3) {
      // Always update formData when stepping into the review step
      formData.address = document.getElementById("address").value;
      formData.city = document.getElementById("city").value;

      // Show the user input in the review section
      document.getElementById("review-email").textContent = formData.email;
      document.getElementById("review-username").textContent = formData.username;
      document.getElementById("review-address").textContent = formData.address;
      document.getElementById("review-city").textContent = formData.city;
    }
  });
});

// Event listener for "Previous" buttons to navigate backward through the form steps
prevBtns.forEach((button) => {
  button.addEventListener("click", () => {
    formSteps[formStepIndex].classList.remove("form-step-active"); // Hide current step
    formStepIndex--; // Move to the previous step
    formSteps[formStepIndex].classList.add("form-step-active"); // Show previous step
    updateStepCircles(); // Update the step indicator circles
  });
});

// Event listener for form submission
form.addEventListener("submit", (e) => {
  e.preventDefault(); // Prevent the form from submitting normally
  alert("Form submitted successfully!"); // Display a success message
});
