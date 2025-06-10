// script.js

/**
 * SortingVisualizer Class
 * Main class that handles the visualization of various sorting algorithms
 */
class SortingVisualizer {
    constructor() {
        // Array to be sorted
        this.array = [];
        
        // Configuration
        this.arraySize = 50;
        this.animationSpeed = 50;
        
        // State management
        this.isRunning = false;
        this.isPaused = false;
        this.isSorted = false;
        this.shouldStop = false;
        
        // Statistics
        this.comparisons = 0;
        this.swaps = 0;
        
        // Algorithm definitions with metadata
        this.algorithms = {
            bubble: {
                name: 'Bubble Sort',
                complexity: 'O(n²)',
                description: 'Bubble Sort compares adjacent elements and swaps them if they are in the wrong order. This process is repeated until the array is sorted.'
            },
            selection: {
                name: 'Selection Sort',
                complexity: 'O(n²)',
                description: 'Selection Sort finds the minimum element in the unsorted portion and places it at the beginning. This process is repeated for the remaining array.'
            },
            insertion: {
                name: 'Insertion Sort',
                complexity: 'O(n²)',
                description: 'Insertion Sort builds the sorted array one element at a time by inserting each element into its correct position.'
            },
            quick: {
                name: 'Quick Sort',
                complexity: 'O(n log n)',
                description: 'Quick Sort picks a pivot and partitions the array into elements smaller and larger than the pivot, then recursively sorts the partitions.'
            },
            merge: {
                name: 'Merge Sort',
                complexity: 'O(n log n)',
                description: 'Merge Sort divides the array into two halves, recursively sorts them, and then merges them into a sorted array.'
            },
            heap: {
                name: 'Heap Sort',
                complexity: 'O(n log n)',
                description: 'Heap Sort builds a max-heap from the array and repeatedly extracts the maximum element, rebuilding the heap each time.'
            }
        };
        
        this.init();
    }
    
    /**
     * Initialize the visualizer
     */
    init() {
        this.cacheDOMElements();
        this.attachEventListeners();
        this.syncSliderValues();
        this.generateRandomArray();
        this.updateAlgorithmInfo();
    }
    
    /**
     * Sync slider values with their display
     */
    syncSliderValues() {
        // Sync array size
        this.arraySize = parseInt(this.arraySizeSlider.value);
        this.sizeValue.textContent = this.arraySize;
        
        // Sync animation speed
        this.animationSpeed = parseInt(this.speedSlider.value);
        this.speedValue.textContent = this.animationSpeed;
    }
    
    /**
     * Cache DOM elements for better performance
     */
    cacheDOMElements() {
        this.barsContainer = document.getElementById('bars-container');
        this.algorithmSelect = document.getElementById('algorithm-select');
        this.arraySizeSlider = document.getElementById('array-size');
        this.speedSlider = document.getElementById('speed-control');
        this.generateBtn = document.getElementById('generate-btn');
        this.sortBtn = document.getElementById('sort-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.sizeValue = document.getElementById('size-value');
        this.speedValue = document.getElementById('speed-value');
        this.comparisonsElement = document.getElementById('comparisons');
        this.swapsElement = document.getElementById('swaps');
        this.complexityElement = document.getElementById('complexity');
        this.algorithmName = document.getElementById('algorithm-name');
        this.algorithmDescription = document.getElementById('algorithm-description');
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateRandomArray());
        this.sortBtn.addEventListener('click', () => this.startSorting());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        this.arraySizeSlider.addEventListener('input', (e) => {
            this.arraySize = parseInt(e.target.value);
            this.sizeValue.textContent = this.arraySize;
            this.generateRandomArray();
        });
        
        this.speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            this.speedValue.textContent = this.animationSpeed;
        });
        
        this.algorithmSelect.addEventListener('change', () => this.updateAlgorithmInfo());
    }
    
    /**
     * Generate a new random array
     */
    generateRandomArray() {
        if (this.isRunning && !this.isPaused) return;
        
        // If generating during pause, stop the current sorting
        if (this.isRunning && this.isPaused) {
            this.shouldStop = true;
            this.isRunning = false;
            this.isPaused = false;
            this.pauseBtn.disabled = true;
            this.pauseBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause';
        }
        
        // Reset all visual states before generating new array
        const bars = this.barsContainer.children;
        for (let i = 0; i < bars.length; i++) {
            bars[i].classList.remove('comparing', 'sorted', 'pivot', 'selected');
        }
        
        this.array = [];
        for (let i = 0; i < this.arraySize; i++) {
            this.array.push(Math.floor(Math.random() * 350) + 10);
        }
        
        this.isSorted = false;
        this.sortBtn.disabled = false;
        this.renderBars();
        this.resetStats();
    }
    
    /**
     * Render the array as bars
     */
    renderBars() {
        this.barsContainer.innerHTML = '';
        const barWidth = (100 / this.arraySize) + '%';
        
        this.array.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${value}px`;
            bar.style.width = barWidth;
            bar.dataset.index = index;
            this.barsContainer.appendChild(bar);
        });
    }
    
    /**
     * Check if the array is sorted
     */
    checkIfSorted() {
        for (let i = 1; i < this.array.length; i++) {
            if (this.array[i] < this.array[i - 1]) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Start the sorting process
     */
    async startSorting() {
        if (this.isRunning || this.isSorted) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.shouldStop = false;
        this.resetStats();
        
        // Update UI state
        this.sortBtn.disabled = true;
        this.generateBtn.disabled = true;
        this.pauseBtn.disabled = false;
        
        const algorithm = this.algorithmSelect.value;
        
        try {
            // Execute the selected sorting algorithm
            switch (algorithm) {
                case 'bubble':
                    await this.bubbleSort();
                    break;
                case 'selection':
                    await this.selectionSort();
                    break;
                case 'insertion':
                    await this.insertionSort();
                    break;
                case 'quick':
                    await this.quickSort(0, this.array.length - 1);
                    break;
                case 'merge':
                    await this.mergeSort(0, this.array.length - 1);
                    break;
                case 'heap':
                    await this.heapSort();
                    break;
            }
            
            // Only mark as sorted if still running (not interrupted)
            if (this.isRunning && !this.shouldStop) {
                await this.markAllSorted();
                this.isSorted = true;
                this.sortBtn.disabled = true;
            }
            
        } catch (error) {
            console.error('Sorting interrupted:', error);
        }
        
        // Reset UI state
        this.isRunning = false;
        this.generateBtn.disabled = false;
        this.pauseBtn.disabled = true;
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        // Enable generate button during pause
        this.generateBtn.disabled = !this.isPaused;
        
        this.pauseBtn.innerHTML = this.isPaused ? 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Resume' : 
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause';
    }
    
    /**
     * Delay function that respects pause state
     */
    async delay() {
        while (this.isPaused && !this.shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Check if should stop
        if (this.shouldStop) {
            throw new Error('Sorting stopped');
        }
        
        return new Promise(resolve => setTimeout(resolve, this.animationSpeed));
    }
    
    /**
     * Swap two elements in the array with animation
     */
    async swap(i, j) {
        if (i === j) return;
        
        const bars = this.barsContainer.children;
        
        // Swap array elements
        const temp = this.array[i];
        this.array[i] = this.array[j];
        this.array[j] = temp;
        
        // Update bar heights
        bars[i].style.height = `${this.array[i]}px`;
        bars[j].style.height = `${this.array[j]}px`;
        
        // Update statistics
        this.swaps++;
        this.updateStats();
    }
    
    /**
     * Compare two elements with animation
     */
    async compare(i, j) {
        // Check if should stop
        if (this.shouldStop) {
            throw new Error('Sorting stopped');
        }
        
        const bars = this.barsContainer.children;
        
        // Highlight bars being compared
        bars[i].classList.add('comparing');
        bars[j].classList.add('comparing');
        
        // Update statistics
        this.comparisons++;
        this.updateStats();
        
        // Wait for animation
        await this.delay();
        
        // Remove highlighting
        bars[i].classList.remove('comparing');
        bars[j].classList.remove('comparing');
    }
    
    /**
     * Bubble Sort Algorithm
     * Time Complexity: O(n²)
     * Space Complexity: O(1)
     */
    async bubbleSort() {
        for (let i = 0; i < this.array.length - 1; i++) {
            for (let j = 0; j < this.array.length - i - 1; j++) {
                // Compare adjacent elements
                await this.compare(j, j + 1);
                
                // Swap if they're in wrong order
                if (this.array[j] > this.array[j + 1]) {
                    await this.swap(j, j + 1);
                }
            }
            // Mark the last element as sorted
            this.markSorted(this.array.length - i - 1);
        }
        // Mark the first element as sorted
        this.markSorted(0);
    }
    
    /**
     * Selection Sort Algorithm
     * Time Complexity: O(n²)
     * Space Complexity: O(1)
     */
    async selectionSort() {
        for (let i = 0; i < this.array.length - 1; i++) {
            let minIdx = i;
            this.markSelected(i);
            
            // Find minimum element in unsorted portion
            for (let j = i + 1; j < this.array.length; j++) {
                await this.compare(minIdx, j);
                
                if (this.array[j] < this.array[minIdx]) {
                    this.unmarkSelected(minIdx);
                    minIdx = j;
                    this.markSelected(minIdx);
                }
            }
            
            // Swap minimum element with first unsorted element
            if (minIdx !== i) {
                await this.swap(i, minIdx);
            }
            
            this.unmarkSelected(minIdx);
            this.markSorted(i);
        }
        this.markSorted(this.array.length - 1);
    }
    
    /**
     * Insertion Sort Algorithm
     * Time Complexity: O(n²)
     * Space Complexity: O(1)
     */
    async insertionSort() {
        for (let i = 1; i < this.array.length; i++) {
            let key = this.array[i];
            let j = i - 1;
            
            this.markSelected(i);
            
            // Move elements greater than key one position ahead
            while (j >= 0 && this.array[j] > key) {
                await this.compare(j, j + 1);
                this.array[j + 1] = this.array[j];
                this.barsContainer.children[j + 1].style.height = `${this.array[j + 1]}px`;
                j--;
                this.swaps++;
                this.updateStats();
            }
            
            // Insert key at correct position
            this.array[j + 1] = key;
            this.barsContainer.children[j + 1].style.height = `${key}px`;
            this.unmarkSelected(i);
            await this.delay();
        }
        
        // Mark all elements as sorted
        for (let i = 0; i < this.array.length; i++) {
            this.markSorted(i);
        }
    }
    
    /**
     * Quick Sort Algorithm
     * Time Complexity: O(n log n) average, O(n²) worst
     * Space Complexity: O(log n)
     */
    async quickSort(low, high) {
        if (low < high) {
            // Find partition index
            const pi = await this.partition(low, high);
            
            // Recursively sort elements before and after partition
            await this.quickSort(low, pi - 1);
            await this.quickSort(pi + 1, high);
        }
        
        // Mark all as sorted when done
        if (low === 0 && high === this.array.length - 1) {
            for (let i = 0; i < this.array.length; i++) {
                this.markSorted(i);
            }
        }
    }
    
    /**
     * Partition function for Quick Sort
     */
    async partition(low, high) {
        // Choose last element as pivot
        const pivot = this.array[high];
        this.markPivot(high);
        
        let i = low - 1;
        
        for (let j = low; j < high; j++) {
            await this.compare(j, high);
            
            // If current element is smaller than pivot
            if (this.array[j] < pivot) {
                i++;
                if (i !== j) {
                    await this.swap(i, j);
                }
            }
        }
        
        // Place pivot in correct position
        await this.swap(i + 1, high);
        this.unmarkPivot(high);
        this.unmarkPivot(i + 1);
        
        return i + 1;
    }
    
    /**
     * Merge Sort Algorithm
     * Time Complexity: O(n log n)
     * Space Complexity: O(n)
     */
    async mergeSort(left, right) {
        if (left < right) {
            const mid = Math.floor((left + right) / 2);
            
            // Sort first and second halves
            await this.mergeSort(left, mid);
            await this.mergeSort(mid + 1, right);
            
            // Merge the sorted halves
            await this.merge(left, mid, right);
        }
        
        // Mark all as sorted when done
        if (left === 0 && right === this.array.length - 1) {
            for (let i = 0; i < this.array.length; i++) {
                this.markSorted(i);
            }
        }
    }
    
    /**
     * Merge function for Merge Sort
     */
    async merge(left, mid, right) {
        // Create temporary arrays
        const leftArray = this.array.slice(left, mid + 1);
        const rightArray = this.array.slice(mid + 1, right + 1);
        
        let i = 0, j = 0, k = left;
        
        // Merge arrays back
        while (i < leftArray.length && j < rightArray.length) {
            await this.compare(left + i, mid + 1 + j);
            
            if (leftArray[i] <= rightArray[j]) {
                this.array[k] = leftArray[i];
                i++;
            } else {
                this.array[k] = rightArray[j];
                j++;
            }
            
            this.barsContainer.children[k].style.height = `${this.array[k]}px`;
            k++;
            await this.delay();
        }
        
        // Copy remaining elements
        while (i < leftArray.length) {
            this.array[k] = leftArray[i];
            this.barsContainer.children[k].style.height = `${this.array[k]}px`;
            i++;
            k++;
            await this.delay();
        }
        
        while (j < rightArray.length) {
            this.array[k] = rightArray[j];
            this.barsContainer.children[k].style.height = `${this.array[k]}px`;
            j++;
            k++;
            await this.delay();
        }
    }
    
    /**
     * Heap Sort Algorithm
     * Time Complexity: O(n log n)
     * Space Complexity: O(1)
     */
    async heapSort() {
        // Build max heap
        for (let i = Math.floor(this.array.length / 2) - 1; i >= 0; i--) {
            await this.heapify(this.array.length, i);
        }
        
        // Extract elements from heap one by one
        for (let i = this.array.length - 1; i > 0; i--) {
            // Move current root to end
            await this.swap(0, i);
            this.markSorted(i);
            
            // Heapify reduced heap
            await this.heapify(i, 0);
        }
        this.markSorted(0);
    }
    
    /**
     * Heapify function for Heap Sort
     */
    async heapify(n, i) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        
        // Check if left child is larger than root
        if (left < n) {
            await this.compare(largest, left);
            if (this.array[left] > this.array[largest]) {
                largest = left;
            }
        }
        
        // Check if right child is larger than largest so far
        if (right < n) {
            await this.compare(largest, right);
            if (this.array[right] > this.array[largest]) {
                largest = right;
            }
        }
        
        // If largest is not root
        if (largest !== i) {
            await this.swap(i, largest);
            
            // Recursively heapify the affected sub-tree
            await this.heapify(n, largest);
        }
    }
    
    /**
     * Visual helper functions
     */
    markSorted(index) {
        this.barsContainer.children[index].classList.add('sorted');
    }
    
    markSelected(index) {
        this.barsContainer.children[index].classList.add('selected');
    }
    
    unmarkSelected(index) {
        this.barsContainer.children[index].classList.remove('selected');
    }
    
    markPivot(index) {
        this.barsContainer.children[index].classList.add('pivot');
    }
    
    unmarkPivot(index) {
        this.barsContainer.children[index].classList.remove('pivot');
    }
    
    /**
     * Animate marking all bars as sorted
     */
    async markAllSorted() {
        for (let i = 0; i < this.array.length; i++) {
            this.markSorted(i);
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.comparisons = 0;
        this.swaps = 0;
        this.updateStats();
    }
    
    /**
     * Update statistics display
     */
    updateStats() {
        this.comparisonsElement.textContent = this.comparisons;
        this.swapsElement.textContent = this.swaps;
    }
    
    /**
     * Update algorithm information panel
     */
    updateAlgorithmInfo() {
        const algorithm = this.algorithms[this.algorithmSelect.value];
        this.algorithmName.textContent = algorithm.name;
        this.algorithmDescription.textContent = algorithm.description;
        this.complexityElement.textContent = algorithm.complexity;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SortingVisualizer();
});