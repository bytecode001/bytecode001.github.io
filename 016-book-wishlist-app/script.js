// Add event listener to the "Add" button
document.getElementById('add-button').addEventListener('click', function() {
    const bookInput = document.getElementById('book-input');
    const bookTitle = bookInput.value.trim();

    // Check if the input is not empty
    if (bookTitle !== "") {
        const bookList = document.getElementById('book-list');

        // Create a new list item for the book
        const li = document.createElement('li');
        li.className = 'book-item';

        // Create a span to hold the book title
        const span = document.createElement('span');
        span.textContent = bookTitle;

        // Create a remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';

        // Add event listener to remove the book when the button is clicked
        removeButton.addEventListener('click', function() {
            li.classList.add('fade-out');
            li.addEventListener('animationend', function() {
                bookList.removeChild(li);
            });
        });

        // Append the title and button to the list item
        li.appendChild(span);
        li.appendChild(removeButton);

        // Add the list item to the book list
        bookList.appendChild(li);

        // Clear the input field and refocus it
        bookInput.value = '';
        bookInput.focus();
    }
});