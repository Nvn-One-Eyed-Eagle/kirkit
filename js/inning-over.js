const end = localStorage.getItem("end");
let i = localStorage.getItem("inning");

let team;

if (i === "0") {
    team = JSON.parse(localStorage.getItem("team1"));
} else {
    team = JSON.parse(localStorage.getItem("team2"));
}

const container = document.getElementById("highlights");

Object.entries(team).forEach(([name, player]) => {
    if (typeof player !== "object") return;

    const videos = [
        ...(player.fours || []).map(v => ({ ...v, type: 'FOUR' })),
        ...(player.sixes || []).map(v => ({ ...v, type: 'SIX' }))
    ];

    if (videos.length === 0) return;

    // ===== SECTION =====
    const section = document.createElement("section");
    section.className = "player-section";

    const title = document.createElement("div");
    title.className = "section-title";
    
    const foursCount = (player.fours || []).length;
    const sixesCount = (player.sixes || []).length;
    
    title.innerHTML = `
        <p>${name.toUpperCase()}</p>
        <div class="stats">
            <div class="stat-item">
                <span>Runs:</span>
                <span class="stat-value">${player.runs}</span>
            </div>
            <div class="stat-item">
                <span>Balls:</span>
                <span class="stat-value">${player.balls}</span>
            </div>
            ${foursCount > 0 ? `<div class="stat-item"><span>4s:</span><span class="stat-value">${foursCount}</span></div>` : ''}
            ${sixesCount > 0 ? `<div class="stat-item"><span>6s:</span><span class="stat-value">${sixesCount}</span></div>` : ''}
        </div>
    `;
    section.appendChild(title);

    // ===== CAROUSEL =====
    const carouselContainer = document.createElement("div");
    carouselContainer.className = "carousel-container";

    const carouselTrack = document.createElement("div");
    carouselTrack.className = "carousel-track";

    videos.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "video-card";
        if (idx === 0) card.classList.add("active");

        const vid = document.createElement("video");
        vid.src = item.video;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        
        if (idx === 0) {
            vid.autoplay = true;
            vid.play();
        }

        const overlay = document.createElement("div");
        overlay.className = "video-card-overlay";
        overlay.innerHTML = `<div class="shot-label">${item.type}!</div>`;

        const playIcon = document.createElement("div");
        playIcon.className = "play-icon";
        playIcon.innerHTML = '▶';

        card.appendChild(vid);
        card.appendChild(overlay);
        card.appendChild(playIcon);
        
        card.onclick = () => openLightbox(item.video);

        carouselTrack.appendChild(card);
    });

    carouselContainer.appendChild(carouselTrack);

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className = "auto-play-progress";
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressContainer.appendChild(progressBar);

    // Dots
    const dotsContainer = document.createElement("div");
    dotsContainer.className = "carousel-dots";
    
    videos.forEach((_, idx) => {
        const dot = document.createElement("div");
        dot.className = `dot ${idx === 0 ? 'active' : ''}`;
        dot.onclick = () => goToSlide(idx);
        dotsContainer.appendChild(dot);
    });

    section.appendChild(carouselContainer);
    section.appendChild(progressContainer);
    section.appendChild(dotsContainer);
    container.appendChild(section);

    // ===== AUTO-ROTATION LOGIC =====
    let currentIndex = 0;
    let autoPlayInterval;
    let progressInterval;
    const SLIDE_DURATION = 4000;
    const cards = carouselTrack.querySelectorAll(".video-card");
    const dots = dotsContainer.querySelectorAll(".dot");

    function updateCarousel(index) {
        const totalCards = cards.length;
        const angleStep = 360 / totalCards;
        
        cards.forEach((card, i) => {
            const offset = (i - index + totalCards) % totalCards;
            let angle, translateZ, scale, opacity;

            if (offset === 0) {
                // Active card - front and center
                angle = 0;
                translateZ = 150;
                scale = 1;
                opacity = 1;
                card.classList.add("active");
                const video = card.querySelector("video");
                video.play();
            } else if (offset === 1 || offset === totalCards - 1) {
                // Adjacent cards - visible but smaller
                angle = offset === 1 ? 25 : -25;
                translateZ = 0;
                scale = 0.75;
                opacity = 0.5;
                card.classList.remove("active");
                const video = card.querySelector("video");
                video.pause();
            } else {
                // Hidden cards
                angle = offset * angleStep;
                translateZ = -100;
                scale = 0.5;
                opacity = 0;
                card.classList.remove("active");
                const video = card.querySelector("video");
                video.pause();
            }

            card.style.transform = `
                translate(-50%, -50%)
                rotateY(${angle}deg)
                translateZ(${translateZ}px)
                scale(${scale})
            `;
            card.style.opacity = opacity;
            card.style.zIndex = offset === 0 ? 10 : (5 - Math.abs(offset));
        });

        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });
    }

    function startProgress() {
        let progress = 0;
        progressBar.style.width = "0%";
        
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            progress += 100 / (SLIDE_DURATION / 100);
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 100);
    }

    function goToSlide(index) {
        currentIndex = index;
        updateCarousel(currentIndex);
        startProgress();
        resetAutoPlay();
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % cards.length;
        updateCarousel(currentIndex);
        startProgress();
    }

    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, SLIDE_DURATION);
        startProgress();
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // Initialize
    updateCarousel(0);
    startAutoPlay();

    // Pause on interaction
    carouselContainer.addEventListener("touchstart", () => {
        clearInterval(autoPlayInterval);
        clearInterval(progressInterval);
    });

    carouselContainer.addEventListener("touchend", () => {
        resetAutoPlay();
    });
});

// Show empty state if no highlights
if (container.children.length === 0) {
    container.innerHTML = '<div class="empty-state">No highlights available for this inning</div>';
}

/* ===== LIGHTBOX ===== */

const lightbox = document.getElementById("lightbox");
const lightboxVideo = document.getElementById("lightboxVideo");
const closeBtn = document.getElementById("closeBtn");

function openLightbox(src) {
    lightboxVideo.src = src;
    lightbox.classList.add("active");
    lightboxVideo.play();
}

closeBtn.onclick = () => {
    lightbox.classList.remove("active");
    lightboxVideo.pause();
    lightboxVideo.src = "";
};

lightbox.onclick = (e) => {
    if (e.target === lightbox) closeBtn.click();
};

document.querySelector(".continue").addEventListener("click", () => {
    localStorage.setItem("inning", 2);
    if (end === "true") {
        window.location.href = "matchover.html";
        return;
    }
    window.location.href = "match.html";
});
