// Seleziona tutti gli elementi con la classe "panel" nel documento e li memorizza in una costante 'panels'.
const panels = document.querySelectorAll(".panel");

// Itera su ogni elemento 'panel' all'interno della NodeList 'panels'.
panels.forEach(panel => {
    // Aggiunge un event listener a ciascun 'panel'. L'evento da ascoltare è il "click".
    panel.addEventListener("click", () => {
        // Quando il pannello viene cliccato, esegue due funzioni.
        removeClassActive(); // Chiama la funzione 'removeClassActive' per rimuovere la classe "active" da tutti i pannelli.
        panel.classList.add("active"); // Aggiunge la classe "active" al pannello che è stato cliccato.
    });
});

// Definisce la funzione 'removeClassActive'.
function removeClassActive() {
    // Itera di nuovo su tutti i 'panel'.
    panels.forEach(panel => {
        // Rimuove la classe "active" da ogni pannello. Questo serve per assicurarsi che solo il pannello cliccato sia "attivo".
        panel.classList.remove("active");
    });
}
