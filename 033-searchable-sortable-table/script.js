// Sample data array containing objects representing each table row
const data = [
    { name: 'Alice Johnson', age: 30, country: 'USA' },
    { name: 'Bryan Smith', age: 22, country: 'Canada' },
    { name: 'Charlotte Brown', age: 25, country: 'UK' },
    { name: 'David Wilson', age: 28, country: 'Australia' },
    { name: 'Evelyn Garcia', age: 35, country: 'Spain' },
    // Additional data objects can be added here
];

/**
 * Renders the table rows based on the provided data array.
 * @param {Array} data - Array of data objects to display in the table.
 */
function renderTable(data) {
    // Select the table body element where rows will be inserted
    const tableBody = document.querySelector('#dataTable tbody');
    // Clear any existing content in the table body to avoid duplication
    tableBody.innerHTML = '';

    // Iterate over each item in the data array
    data.forEach(item => {
        // Create a new table row element
        const row = document.createElement('tr');

        // Iterate over each property (column) in the data object
        for (let key in item) {
            // Create a new table data cell for each property
            const cell = document.createElement('td');
            // Set the text content of the cell to the property's value
            cell.textContent = item[key];
            // Append the cell to the current row
            row.appendChild(cell);
        }

        // Append the completed row to the table body
        tableBody.appendChild(row);
    });
}

// Initial render of the table using the full data array
renderTable(data);

/**
 * Handles the search functionality by filtering the data array
 * based on the user's input and re-rendering the table.
 */
function handleSearch() {
    // Get the current search query and convert it to lowercase for case-insensitive matching
    const query = searchInput.value.toLowerCase();

    // Filter the data array to include only items that match the search query
    const filteredData = data.filter(item => {
        // Check if any property value in the item includes the search query
        return Object.values(item).some(
            val => String(val).toLowerCase().includes(query)
        );
    });

    // Re-render the table using the filtered data array
    renderTable(filteredData);
}

// Reference to the search input field in the DOM
const searchInput = document.getElementById('searchInput');
// Add an event listener to handle input changes in the search field
searchInput.addEventListener('keyup', handleSearch);

/**
 * Handles the sorting functionality by sorting the data array
 * based on the selected column and re-rendering the table.
 * @param {Event} event - The click event triggered by clicking a table header.
 */
function handleSort(event) {
    // Reference to the clicked header element
    const header = event.target;
    // Get the column to sort by from the data attribute
    const column = header.getAttribute('data-column');
    // Get the current sort order (asc or desc) from the data attribute
    const order = header.getAttribute('data-order');

    // Determine the new sort order by toggling the current order
    const newOrder = order === 'desc' ? 'asc' : 'desc';
    // Update the data-order attribute with the new sort order
    header.setAttribute('data-order', newOrder);

    // Create a sorted copy of the data array to avoid mutating the original
    const sortedData = [...data].sort((a, b) => {
        // Compare the two items based on the selected column
        if (a[column] > b[column]) {
            // Return 1 or -1 based on the sort order
            return newOrder === 'asc' ? 1 : -1;
        } else if (a[column] < b[column]) {
            return newOrder === 'asc' ? -1 : 1;
        } else {
            // Return 0 if the values are equal
            return 0;
        }
    });

    // Re-render the table using the sorted data array
    renderTable(sortedData);
}

// Select all table header cells that are sortable
const headers = document.querySelectorAll('th');
// Add a click event listener to each header cell to enable sorting
headers.forEach(header => header.addEventListener('click', handleSort));
