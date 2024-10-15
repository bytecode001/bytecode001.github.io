const bgImageEl = document.getElementById('bg-image');

window.addEventListener('scroll', ()=>{
    updateImage();
});


function updateImage(){
    bgImageEl.style.opacity = 1 - window.scrollY / 900;
    bgImageEl.style.backgroundSize = 150 - window.scrollY / 12 + '%';
}