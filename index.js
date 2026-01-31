
// --- State Management ---
let currentCard = 0;
let activeTab = 'fours'; // 'fours' or 'sixes'
let autoPlayTimer;


function playVideo(src) {
    const modal = document.getElementById("video-modal");
    modal.innerHTML = `
      <video src="${src}" controls autoplay class="w-full rounded-xl"></video>
    `;
    modal.classList.remove("hidden");
}

// Data Source
function loadPlayers() {
    const db = JSON.parse(localStorage.getItem("playersDB")) || {};
    return Object.values(db).map(p => ({
        ...p,
        average: p.balls ? (p.runs / p.balls * 6).toFixed(2) : 0
    }));
}

let players = loadPlayers();


// --- Render Functions ---

function renderUI() {
    renderCards();
    renderDots();
    renderVideos();
    lucide.createIcons(); // Refresh icons after DOM updates
}

function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    players.forEach((player, index) => {
        const offset = (index - currentCard + players.length) % players.length;
        
        let classes = 'absolute top-0 left-1/2 transform -translate-x-1/2 card-transition ';
        let zIndex = 10;
        
        // Logic derived from React component
        const isActive = offset === 0;
        const isPrev = offset === players.length - 1;
        const isNext = offset === 1;

        if (isActive) {
            classes += 'z-30 scale-100 opacity-100';
        } else if (isNext) {
            classes += 'z-20 scale-90 opacity-60 translate-x-8 translate-y-4';
        } else if (isPrev) {
            classes += 'z-20 scale-90 opacity-60 -translate-x-8 translate-y-4';
        } else {
            classes += 'z-10 scale-75 opacity-0';
        }

        const cardHTML = `
            <div class="${classes}" style="width: 90%; max-width: 350px;">
                <div class="bg-gradient-to-br from-white to-gray-100 rounded-3xl shadow-2xl overflow-hidden border-4 border-yellow-400">
                    <div class="relative h-64 overflow-hidden">
                        <img src="${player.image}" alt="${player.name}" class="w-full h-full object-cover">
                        <div class="absolute top-4 right-4 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-sm flex items-center">
                            <i data-lucide="star" class="w-4 h-4 mr-1"></i>
                            LEGEND
                        </div>
                    </div>
                    <div class="p-6">
                        <h3 class="text-2xl font-black text-gray-900 mb-4 text-center">${player.name}</h3>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-blue-500 rounded-xl p-3 text-white text-center">
                                <div class="text-2xl font-bold">${player.matches}</div>
                                <div class="text-xs opacity-90">Matches</div>
                            </div>
                            <div class="bg-green-500 rounded-xl p-3 text-white text-center">
                                <div class="text-2xl font-bold">${player.runs}</div>
                                <div class="text-xs opacity-90">Runs</div>
                            </div>
                            <div class="bg-orange-500 rounded-xl p-3 text-white text-center">
                                <div class="text-2xl font-bold">${player.highScore}</div>
                                <div class="text-xs opacity-90">High Score</div>
                            </div>
                            <div class="bg-purple-500 rounded-xl p-3 text-white text-center">
                                <div class="text-2xl font-bold">${player.average}</div>
                                <div class="text-xs opacity-90">Average</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}
function senddata(playersList = players) {
    const matchObject = playersList.reduce((acc, player) => {
        const key = player.name.toLowerCase().replace(/\s+/g, "");

        acc[key] = {
            runs: 0,
            balls: 0,
            fours: [],
            sixes: [],
            bold: false,
            highScore: 0,
            image: player.image ?? null,
            matches: 0
        };

        return acc;
    }, { ...initialMatchState });

    localStorage.setItem("matchData", JSON.stringify(matchObject));

}
function renderDots() {
    const container = document.getElementById('dots-container');
    container.innerHTML = '';

    players.forEach((_, index) => {
        const isActive = index === currentCard;
        const widthClass = isActive ? 'w-8 bg-yellow-400' : 'w-3 bg-white/50 hover:bg-white/80';
        
        const dot = document.createElement('button');
        dot.className = `h-3 rounded-full transition-all ${widthClass}`;
        dot.onclick = () => {
            currentCard = index;
            resetTimer();
            renderUI();
        };
        container.appendChild(dot);
    });
}

function renderVideos() {
    const currentPlayer = players[currentCard];
    const videoGrid = document.getElementById('video-grid');
    videoGrid.innerHTML = '';

    // Update tab styles
    const tabFours = document.getElementById('tab-fours');
    const tabSixes = document.getElementById('tab-sixes');
    
    if(activeTab === 'fours') {
        tabFours.className = 'px-6 py-3 rounded-full font-bold transition-all bg-yellow-400 text-black scale-110';
        tabSixes.className = 'px-6 py-3 rounded-full font-bold transition-all bg-white/20 text-white hover:bg-white/30';
    } else {
        tabFours.className = 'px-6 py-3 rounded-full font-bold transition-all bg-white/20 text-white hover:bg-white/30';
        tabSixes.className = 'px-6 py-3 rounded-full font-bold transition-all bg-yellow-400 text-black scale-110';
    }

    const videos = currentPlayer[activeTab];

    videos.forEach((v, i) => {
        videoGrid.innerHTML += `
        <div onclick="playVideo('${v.video}')"
            class="bg-black rounded-xl p-2 cursor-pointer">
            <video src="${v.video}" class="w-full h-32 object-cover rounded"></video>
            <p class="text-white text-xs text-center mt-1">
            Over ${v.over}.${v.ball}
            </p>
        </div>
        `;
    });

}

// --- Logic & Event Handlers ---

function nextCard() {
    currentCard = (currentCard + 1) % players.length;
    renderUI();
}

function prevCard() {
    currentCard = (currentCard - 1 + players.length) % players.length;
    renderUI();
}

function switchTab(tab) {
    activeTab = tab;
    renderVideos(); // Only need to re-render videos part
    lucide.createIcons();
}

// Add Player Logic
const showAddBtn = document.getElementById('show-add-btn');
const addPlayerForm = document.getElementById('add-player-form');
const cancelAddBtn = document.getElementById('cancel-add-btn');
const submitAddBtn = document.getElementById('submit-add-btn');

showAddBtn.addEventListener('click', () => {
    showAddBtn.classList.add('hidden');
    addPlayerForm.classList.remove('hidden');
});

cancelAddBtn.addEventListener('click', () => {
    addPlayerForm.classList.add('hidden');
    showAddBtn.classList.remove('hidden');
    clearForm();
});

function clearForm() {
    document.getElementById('inp-name').value = '';
    capturedImage = null;

    photoPreview.src = '';
    photoPreview.classList.add("hidden");
    cameraText.classList.remove("hidden");

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}


const cameraBox = document.getElementById("camera-box");
const video = document.getElementById("camera");
const photoPreview = document.getElementById("photo-preview");
const cameraText = document.getElementById("camera-text");
const captureBtn = document.getElementById("capture-btn");

let stream;
let capturedImage = null;

cameraBox.addEventListener("click", async () => {
    if (stream) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = stream;
        video.classList.remove("hidden");
        cameraText.classList.add("hidden");
        captureBtn.classList.remove("hidden");

    } catch (err) {
        alert("Camera access denied");
    }
});

captureBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    capturedImage = canvas.toDataURL("image/png");

    photoPreview.src = capturedImage;
    photoPreview.classList.remove("hidden");
    video.classList.add("hidden");
    captureBtn.classList.add("hidden");

    // Stop camera
    stream.getTracks().forEach(track => track.stop());
    stream = null;
});


submitAddBtn.addEventListener('click', () => {
    const name = document.getElementById('inp-name').value;

    if (!name || !capturedImage) {
        alert('Please enter name and capture image');
        return;
    }

    const newPlayer = {
        name,
        image: capturedImage, // real camera image
        matches: 0,
        runs: 0,
        highScore: 0,
        average: 0,
        fours: [],
        sixes: []
    };

    players.push(newPlayer);

    addPlayerForm.classList.add('hidden');
    showAddBtn.classList.remove('hidden');
    clearForm();

    resetTimer();
    renderUI();
});


// Navigation Buttons
document.getElementById('next-btn').addEventListener('click', () => {
    nextCard();
    resetTimer();
});

document.getElementById('prev-btn').addEventListener('click', () => {
    prevCard();
    resetTimer();
});

// Auto-rotation timer
function startTimer() {
    autoPlayTimer = setInterval(nextCard, 4000);
}

function resetTimer() {
    clearInterval(autoPlayTimer);
    startTimer();
}

// Modal Logic
function openVideoModal(thumbnail, title) {
    const modal = document.getElementById('video-modal');
    document.getElementById('modal-image').src = thumbnail;
    document.getElementById('modal-title').textContent = title;
    modal.classList.remove('hidden');
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.add('hidden');
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    players = loadPlayers(); 
    renderUI();
    startTimer();
});


// 1. Define the global match stats (the counters that sit at the bottom)
const initialMatchState = {
    overs: 0,
    totalballs: 0,
    totalruns: 0,
    wicket: 0
};

document.querySelector("#btn").addEventListener("click", () => {
    senddata();
    window.location.href = "team.html";
})





