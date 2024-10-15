// Get references to DOM elements
const workoutForm = document.getElementById('workout-form');
const workoutNameInput = document.getElementById('workout-name');
const caloriesBurnedInput = document.getElementById('calories-burned');
const workoutsList = document.getElementById('workouts');
const totalCaloriesDisplay = document.getElementById('total-calories');

let workouts = []; // Array to store workout data
let totalCalories = 0; // Variable for total calories burned

// Chart.js chart instance for displaying calories burned data
let caloriesChart;

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadWorkouts(); // Load any previously saved workouts
    initChart(); // Initialize the chart
    updateTotalCalories(); // Update the total calories display
});

// Event listener for form submission
workoutForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission
    addWorkout(); // Add the new workout to the list
    workoutForm.reset(); // Clear the form inputs after submission
});

// Load workouts from local storage
function loadWorkouts() {
    const storedWorkouts = localStorage.getItem('workouts'); // Get workouts from storage
    if (storedWorkouts) {
        workouts = JSON.parse(storedWorkouts); // Parse saved workouts
        workouts.forEach(workout => displayWorkout(workout)); // Display each workout
        updateTotalCalories(); // Update total calories
    }
}

// Save workouts to local storage
function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workouts)); // Store workouts array
}

// Add a workout to the list
function addWorkout() {
    const workoutName = workoutNameInput.value.trim(); // Get workout name
    const caloriesBurned = parseInt(caloriesBurnedInput.value.trim()); // Get calories burned
    
    // Validation: Check if inputs are valid
    if (workoutName === '' || isNaN(caloriesBurned) || caloriesBurned <= 0) {
        alert('Please enter valid workout details.');
        return; // Stop execution if invalid
    }

    // Create a new workout object
    const workout = {
        id: Date.now(), // Unique identifier
        name: workoutName, // Workout name
        calories: caloriesBurned // Calories burned
    };

    workouts.push(workout); // Add to workouts array
    displayWorkout(workout); // Display workout in the list
    updateTotalCalories(); // Update total calories
    saveWorkouts(); // Save to local storage
    updateChart(); // Update the chart
}

// Display the workout in the list
function displayWorkout(workout) {
    const li = document.createElement('li'); // Create a list item element
    li.dataset.id = workout.id; // Add unique ID to the element

    // Populate the list item with workout details and a delete button
    li.innerHTML = `
        <span>${workout.name}</span>
        <span>${workout.calories} Calories</span>
        <button class="delete-btn">&times;</button>
    `;

    // Event listener for delete button
    li.querySelector('.delete-btn').addEventListener('click', function() {
        deleteWorkout(workout.id); // Delete the workout on click
    });

    workoutsList.appendChild(li); // Add the list item to the workouts list
}

// Delete a workout by its ID
function deleteWorkout(id) {
    workouts = workouts.filter(workout => workout.id !== id); // Remove from array
    const workoutItem = workoutsList.querySelector(`[data-id='${id}']`); // Get the DOM element
    if (workoutItem) {
        workoutsList.removeChild(workoutItem); // Remove from DOM
    }
    updateTotalCalories(); // Update total calories
    saveWorkouts(); // Save updated list to local storage
    updateChart(); // Update chart with new data
}

// Update the total calories burned display
function updateTotalCalories() {
    totalCalories = workouts.reduce((total, workout) => total + workout.calories, 0); // Sum calories
    totalCaloriesDisplay.textContent = totalCalories; // Update DOM
}

// Initialize the chart using Chart.js
function initChart() {
    const ctx = document.getElementById('caloriesChart').getContext('2d');
    caloriesChart = new Chart(ctx, {
        type: 'bar', // Bar chart type
        data: {
            labels: workouts.map(workout => workout.name), // Workout names as labels
            datasets: [{
                label: 'Calories Burned',
                data: workouts.map(workout => workout.calories), // Calories burned as data
                backgroundColor: 'rgba(39, 174, 96, 0.6)', // Bar color
                borderColor: 'rgba(39, 174, 96, 1)', // Bar border color
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, // Responsive for different screen sizes
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Workout' // X-axis label
                    }
                },
                y: {
                    beginAtZero: true, // Y-axis starts at zero
                    title: {
                        display: true,
                        text: 'Calories Burned' // Y-axis label
                    }
                }
            }
        }
    });
}

// Update the chart with new data
function updateChart() {
    caloriesChart.data.labels = workouts.map(workout => workout.name); // Update labels
    caloriesChart.data.datasets[0].data = workouts.map(workout => workout.calories); // Update data
    caloriesChart.update(); // Refresh the chart
}
