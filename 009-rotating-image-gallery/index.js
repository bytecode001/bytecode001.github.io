const imageContainerEl = document.querySelector(".image-container");
const prevEl = document.getElementById("prev");
const nextEl = document.getElementById("next");
const btnChangeEl = document.getElementById('changeImageBtn');

let x = 0;
let timer;

btnChangeEl.addEventListener('click', function() {
    // Seleziona tutti gli elementi <img> all'interno del contenitore
    const images = document.querySelectorAll('.image-container img');

    // Itera su ciascuna immagine
    images.forEach(img => {
        // Genera un nuovo ID casuale per l'immagine
        const newId = Math.floor(Math.random() * 1000) + 1; // ID casuale tra 1 e 1000
        // Aggiorna l'attributo src dell'immagine con il nuovo ID
        img.src = `https://picsum.photos/id/${newId}/300/200`;
    });
});


prevEl.addEventListener("click", () => {
    x += 45;
    clearTimeout(timer);
    updateGallery();
});

nextEl.addEventListener("click", () => {
    x -= 45;
    clearTimeout(timer);
    updateGallery();
});


function updateGallery(){
    imageContainerEl.style.transform = `perspective(1000px) rotateY(${x}deg)`;
    timer = setTimeout(() => {
        x -= 45;
        updateGallery();
    }, 3000);
}

updateGallery();