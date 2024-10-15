// Initialize an empty array to store contacts
let contacts = [];

// Wait for the DOM to fully load before running any JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Load contacts from localStorage when the page loads
    loadContacts();

    // Add event listener to the contact form to handle adding new contacts
    document.getElementById('contact-form').addEventListener('submit', addContact);

    // Add event listener to the search input to filter contacts as you type
    document.getElementById('search').addEventListener('input', searchContacts);
});

/**
 * Function to load contacts from localStorage and display them
 */
function loadContacts() {
    // Retrieve contacts from localStorage, or set to an empty array if none exist
    contacts = JSON.parse(localStorage.getItem('contacts')) || [];

    // Display the retrieved contacts on the page
    displayContacts(contacts);
}

/**
 * Function to save the current state of the contacts array to localStorage
 */
function saveContacts() {
    // Store the contacts array in localStorage as a JSON string
    localStorage.setItem('contacts', JSON.stringify(contacts));
}

/**
 * Function to handle adding a new contact
 * @param {Event} e - The event object from the form submission
 */
function addContact(e) {
    // Prevent the default form submission behavior (page reload)
    e.preventDefault();

    // Get the input values from the form
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();

    // Ensure that all fields have been filled out
    if (name && phone && email) {
        // Create a new contact object with a unique ID
        const newContact = {
            id: Date.now(),
            name,
            phone,
            email
        };

        // Add the new contact to the contacts array
        contacts.push(newContact);

        // Save the updated contacts array to localStorage
        saveContacts();

        // Display the updated contact list
        displayContacts(contacts);

        // Clear the form fields after submission
        document.getElementById('contact-form').reset();
    }
}

/**
 * Function to display the list of contacts in the table
 * @param {Array} contactsToDisplay - The array of contacts to display
 */
function displayContacts(contactsToDisplay) {
    // Get the table body element where contacts will be displayed
    const tbody = document.querySelector('#contacts-table tbody');

    // Clear the existing content to avoid duplicates
    tbody.innerHTML = '';

    // Loop through the contacts and create table rows for each
    contactsToDisplay.forEach(contact => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contact.phone}</td>
            <td>${contact.email}</td>
            <td class="action-buttons">
                <button class="edit" onclick="editContact(${contact.id})">Edit</button>
                <button class="delete" onclick="deleteContact(${contact.id})">Delete</button>
            </td>
        `;

        // Append the row to the table body
        tbody.appendChild(row);
    });
}

/**
 * Function to edit a contact by loading its details into the form
 * @param {number} id - The ID of the contact to edit
 */
function editContact(id) {
    // Find the contact in the contacts array using its ID
    const contactToEdit = contacts.find(contact => contact.id === id);

    // If the contact exists, populate the form fields with its data
    if (contactToEdit) {
        document.getElementById('name').value = contactToEdit.name;
        document.getElementById('phone').value = contactToEdit.phone;
        document.getElementById('email').value = contactToEdit.email;

        // Remove the contact from the list so it can be updated when re-added
        deleteContact(id);
    }
}

/**
 * Function to delete a contact from the list
 * @param {number} id - The ID of the contact to delete
 */
function deleteContact(id) {
    // Filter out the contact with the matching ID from the contacts array
    contacts = contacts.filter(contact => contact.id !== id);

    // Save the updated contacts array to localStorage
    saveContacts();

    // Refresh the displayed list of contacts
    displayContacts(contacts);
}

/**
 * Function to search through the contact list based on the user's input
 */
function searchContacts() {
    // Get the search query and convert it to lowercase
    const query = document.getElementById('search').value.toLowerCase();

    // Filter contacts based on the query matching any of the contact's details
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
    );

    // Display the filtered list of contacts
    displayContacts(filteredContacts);
}
