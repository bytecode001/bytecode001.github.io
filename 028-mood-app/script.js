// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // Select all mood buttons using the class 'mood-btn'
    const moodButtons = document.querySelectorAll('.mood-btn');

    // Select the note input area using its ID 'note'
    const noteInput = document.getElementById('note');

    // Select the save button using its ID 'save-btn'
    const saveButton = document.getElementById('save-btn');

    // Select the section where today's mood will be displayed using its ID 'today-mood'
    const todayMood = document.getElementById('today-mood');

    // Select the message that appears after saving the mood using its ID 'save-message'
    const saveMessage = document.getElementById('save-message');

    // Reference the body element to change the background dynamically
    const body = document.body;

    // This variable will store the currently selected mood
    let selectedMood = null;

    // List of all possible moods to easily remove classes when necessary
    const moods = ['happy', 'sad', 'angry', 'tired', 'excited'];

    // Retrieve saved mood, note, and date from localStorage
    const savedMood = localStorage.getItem('mood'); // Fetches the saved mood, if any
    const savedNote = localStorage.getItem('note'); // Fetches the saved note, if any
    const savedDate = localStorage.getItem('date'); // Fetches the date when the data was saved

    // Get today's date in a local format (MM/DD/YYYY or similar, depending on locale)
    const today = new Date().toLocaleDateString();

    // Check if the saved date is today, and if so, load the saved mood and note
    if (savedDate === today) {
        // If a mood is saved for today, display it and apply the corresponding background
        if (savedMood) {
            todayMood.innerHTML = `Your mood: <span>${savedMood}</span>`; // Display the saved mood
            body.classList.remove(...moods); // Remove any existing mood classes from the body
            body.classList.add(savedMood); // Add the saved mood class to change the background
        }
        // If a note is saved, populate the textarea with it
        if (savedNote) {
            noteInput.value = savedNote;
        }
    }

    // Add event listeners to all the mood buttons
    moodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the selected mood from the 'data-mood' attribute of the clicked button
            selectedMood = button.dataset.mood;

            // Remove the 'selected' class from all buttons to clear previous selections
            moodButtons.forEach(btn => btn.classList.remove('selected'));

            // Add the 'selected' class to the clicked button to visually indicate selection
            button.classList.add('selected');

            // Change the background of the body according to the selected mood
            body.classList.remove(...moods); // Remove any existing mood classes
            body.classList.add(selectedMood); // Add the new mood class
        });
    });

    // Add an event listener to the save button to save the mood and note when clicked
    saveButton.addEventListener('click', () => {
        // If no mood is selected, alert the user and stop the function
        if (!selectedMood) {
            alert('Please select a mood.'); // Notify the user to select a mood
            return;
        }

        // Get the note entered by the user
        const note = noteInput.value;

        // Save the selected mood, note, and today's date to localStorage
        localStorage.setItem('mood', selectedMood); // Save the selected mood
        localStorage.setItem('note', note); // Save the entered note
        localStorage.setItem('date', today); // Save today's date

        // Update the 'todayMood' section to reflect the selected mood
        todayMood.innerHTML = `Your mood: <span>${selectedMood}</span>`;

        // Display a success message indicating that the mood has been saved
        saveMessage.textContent = "Your mood has been saved!";
        saveMessage.classList.remove('hidden'); // Show the message (previously hidden)
    });
});
