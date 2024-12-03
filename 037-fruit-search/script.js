// Get references to DOM elements
const searchInput = document.getElementById('search-input'); // Search input field
const suggestionsPanel = document.getElementById('suggestions'); // Suggestions dropdown container
const messageDisplay = document.getElementById('message-display'); // Area to display messages or emojis

// Shortened list of fruit suggestions with available emojis
const suggestions = [
    'Apple',
    'Avocado',
    'Banana',
    'Blueberry',
    'Cherry',
    'Coconut',
    'Grape',
    'Kiwi',
    'Lemon',
    'Mango',
    'Melon',
    'Orange',
    'Peach',
    'Pear',
    'Pineapple',
    'Strawberry',
    'Watermelon'
];

// Mapping of fruit names to their corresponding emojis
const fruitEmojis = {
    'Apple': '🍎',
    'Avocado': '🥑',
    'Banana': '🍌',
    'Blueberry': '🫐',
    'Cherry': '🍒',
    'Coconut': '🥥',
    'Grape': '🍇',
    'Kiwi': '🥝',
    'Lemon': '🍋',
    'Mango': '🥭',
    'Melon': '🍈',
    'Orange': '🍊',
    'Peach': '🍑',
    'Pear': '🍐',
    'Pineapple': '🍍',
    'Strawberry': '🍓',
    'Watermelon': '🍉'
};

// Listen for input events on the search field
searchInput.addEventListener('input', function(event) {
    const input = searchInput.value.trim(); // Get the current input value, trimmed of whitespace
    const inputLower = input.toLowerCase(); // Convert input to lowercase for case-insensitive comparison
    suggestionsPanel.innerHTML = ''; // Clear previous suggestions
    messageDisplay.textContent = ''; // Clear previous messages or emojis

    if (input) { // Check if input is not empty
        // Filter suggestions based on input
        const filteredSuggestions = suggestions.filter(function(suggestion) {
            return suggestion.toLowerCase().startsWith(inputLower); // Return suggestions that start with input
        });

        if (filteredSuggestions.length > 0) {
            suggestionsPanel.classList.add('active'); // Show suggestions dropdown
            filteredSuggestions.forEach(function(suggested) {
                const div = document.createElement('div'); // Create a div for each suggestion
                div.textContent = suggested; // Set the text content
                div.classList.add('suggestion-item'); // Add class for styling
                // Add click event listener to populate the search input with the clicked suggestion
                div.addEventListener('click', function() {
                    selectFruit(suggested); // Call function to handle selection
                });
                suggestionsPanel.appendChild(div); // Add suggestion to the dropdown
            });
        } else {
            suggestionsPanel.classList.remove('active'); // Hide suggestions dropdown if no matches
        }
    } else {
        suggestionsPanel.classList.remove('active'); // Hide suggestions dropdown if input is empty
        messageDisplay.textContent = ''; // Clear message display
    }
});

// Function to handle fruit selection
function selectFruit(fruitName) {
    searchInput.value = fruitName; // Set the input value to the selected fruit
    suggestionsPanel.innerHTML = ''; // Clear suggestions
    suggestionsPanel.classList.remove('active'); // Hide suggestions dropdown
    displayEmoji(fruitName); // Display the corresponding emoji
}

// Function to display the emoji
function displayEmoji(fruitName) {
    const emoji = fruitEmojis[fruitName]; // Get the emoji from the mapping
    messageDisplay.textContent = emoji ? emoji : ''; // Display emoji or empty string if not found
}

// Listen for 'Enter' key press on the input field
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') { // Check if 'Enter' key is pressed
        event.preventDefault(); // Prevent default behavior (e.g., form submission)
        const inputValue = searchInput.value.trim(); // Get the input value
        const inputValueLower = inputValue.toLowerCase(); // Convert to lowercase for comparison

        // Check if the input matches any fruit in the suggestions (case-insensitive)
        const matchedFruit = suggestions.find(function(fruit) {
            return fruit.toLowerCase() === inputValueLower; // Return true if a match is found
        });

        if (matchedFruit) {
            selectFruit(matchedFruit); // Select the fruit if found
        } else {
            messageDisplay.textContent = 'Fruit not in the list'; // Display message if not found
            suggestionsPanel.classList.remove('active'); // Hide suggestions dropdown
        }
    }
});
