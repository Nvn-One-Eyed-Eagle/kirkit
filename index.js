
/* ==========================================================================
   VideoDB — IndexedDB wrapper (inlined)
   ========================================================================== */
const VideoDB = (() => {
    const DB_NAME = "cricketVideos";
    const STORE  = "videos";
    const VERSION = 1;
    let db = null;

    function getDB() {
        if (db) return Promise.resolve(db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, VERSION);
            req.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE)) {
                    database.createObjectStore(STORE);
                }
            };
            req.onsuccess  = (e) => { db = e.target.result; resolve(db); };
            req.onerror    = (e) => reject(e.target.error);
        });
    }

    async function save(base64Video) {
        const database = await getDB();
        const id = "vid_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
        return new Promise((resolve, reject) => {
            const tx   = database.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const req  = store.put(base64Video, id);
            req.onsuccess = () => resolve(id);
            req.onerror   = (e) => reject(e.target.error);
        });
    }

    async function get(id) {
        const database = await getDB();
        return new Promise((resolve, reject) => {
            const tx   = database.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const req  = store.get(id);
            req.onsuccess = (e) => resolve(e.target.result || null);
            req.onerror   = (e) => reject(e.target.error);
        });
    }

    async function remove(id) {
        const database = await getDB();
        return new Promise((resolve, reject) => {
            const tx   = database.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const req  = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        });
    }

    async function clear() {
        const database = await getDB();
        return new Promise((resolve, reject) => {
            const tx   = database.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const req  = store.clear();
            req.onsuccess = () => resolve();
            req.onerror   = (e) => reject(e.target.error);
        });
    }

    return { save, get, remove, clear };
})();

/* ==========================================================================
   STATE
   ========================================================================== */
let currentCard = 0;
let activeTab = 'fours';
let autoPlayTimer;

/* ==========================================================================
   VIDEO MODAL
   ========================================================================== */
function playVideo(src) {
    const modal  = document.getElementById("video-modal");
    const wrapper = document.getElementById("modal-video-wrapper");
    wrapper.innerHTML = `<video src="${src}" controls autoplay class="w-full rounded-xl"></video>`;
    modal.classList.remove("hidden");
}

function closeVideoModal() {
    const modal  = document.getElementById("video-modal");
    const wrapper = document.getElementById("modal-video-wrapper");
    modal.classList.add("hidden");
    const v = wrapper.querySelector("video");
    if (v) { v.pause(); v.src = ""; }
    wrapper.innerHTML = "";
}

/* ==========================================================================
   DATA
   ========================================================================== */
function loadPlayers() {
    const db = JSON.parse(localStorage.getItem("playersDB")) || {};
    return Object.values(db).map(p => ({
        ...p,
        average: p.balls ? (p.runs / p.balls * 6).toFixed(2) : 0
    }));
}

let players = loadPlayers();

/* ==========================================================================
   RENDER
   ========================================================================== */
async function renderUI() {
    renderCards();
    renderDots();
    await renderVideos();
    updatePlayerCount();
    lucide.createIcons();
}

function updatePlayerCount() {
    document.getElementById('player-count').textContent = players.length;
}

function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    players.forEach((player, index) => {
        const offset = (index - currentCard + players.length) % players.length;

        let classes = 'absolute top-0 left-1/2 transform -translate-x-1/2 card-transition ';

        const isActive = offset === 0;
        const isPrev   = offset === players.length - 1;
        const isNext   = offset === 1;

        if (isActive)      classes += 'z-30 scale-100 opacity-100';
        else if (isNext)   classes += 'z-20 scale-90 opacity-60 translate-x-8 translate-y-4';
        else if (isPrev)   classes += 'z-20 scale-90 opacity-60 -translate-x-8 translate-y-4';
        else               classes += 'z-10 scale-75 opacity-0';

        container.innerHTML += `
            <div class="${classes}" style="width: 90%; max-width: 320px;">
                <div class="player-card-bg rounded-2xl shadow-2xl overflow-hidden">
                    <div class="player-card-img relative h-48">
                        <img src="${player.image}" alt="${player.name}" class="w-full h-full object-cover">
                        <div class="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-lg">
                            <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                            ACTIVE
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="text-xl font-black text-white mb-3">${player.name}</h3>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="stat-box rounded-lg p-2.5 text-center">
                                <div class="text-lg font-bold text-emerald-400">${player.matches}</div>
                                <div class="text-xs text-white/60 font-medium">Matches</div>
                            </div>
                            <div class="stat-box rounded-lg p-2.5 text-center">
                                <div class="text-lg font-bold text-blue-400">${player.runs}</div>
                                <div class="text-xs text-white/60 font-medium">Runs</div>
                            </div>
                            <div class="stat-box rounded-lg p-2.5 text-center">
                                <div class="text-lg font-bold text-amber-400">${player.highScore}</div>
                                <div class="text-xs text-white/60 font-medium">High Score</div>
                            </div>
                            <div class="stat-box rounded-lg p-2.5 text-center">
                                <div class="text-lg font-bold text-purple-400">${player.average}</div>
                                <div class="text-xs text-white/60 font-medium">Average</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
        const widthClass = isActive ? 'w-8 bg-emerald-400' : 'w-3 bg-white/30 hover:bg-white/50';

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

async function renderVideos() {
    const currentPlayer = players[currentCard];
    const videoGrid = document.getElementById('video-grid');
    videoGrid.innerHTML = '';

    // Update tab button styles
    const tabFours = document.getElementById('tab-fours');
    const tabSixes = document.getElementById('tab-sixes');

    if (activeTab === 'fours') {
        tabFours.className = 'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30';
        tabSixes.className = 'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all glass-effect text-white/70 border border-white/10 hover:bg-white/10';
    } else {
        tabFours.className = 'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all glass-effect text-white/70 border border-white/10 hover:bg-white/10';
        tabSixes.className = 'flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30';
    }

    const rawVideos = currentPlayer[activeTab] || [];

    const resolved = [];
    for (const v of rawVideos) {
        const src = await VideoDB.get(v.video).catch(() => null);
        if (src) resolved.push({ src, over: v.over, ball: v.ball });
    }

    resolved.forEach(item => {
        const card = document.createElement("div");
        card.className = "bg-black/50 border border-white/10 rounded-lg p-2 cursor-pointer video-hover";
        card.onclick = () => playVideo(item.src);

        card.innerHTML = `
            <video src="${item.src}" class="w-full h-28 object-cover rounded" muted></video>
            <p class="text-white/80 text-xs text-center mt-1.5 font-medium">Over ${item.over}.${item.ball}</p>
        `;

        videoGrid.appendChild(card);
    });
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */
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
    renderVideos();
    lucide.createIcons();
}

/* ==========================================================================
   ADD PLAYER
   ========================================================================== */
const showAddBtn   = document.getElementById('show-add-btn');
const addPlayerForm = document.getElementById('add-player-form');
const cancelAddBtn  = document.getElementById('cancel-add-btn');
const submitAddBtn  = document.getElementById('submit-add-btn');

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

const cameraBox     = document.getElementById("camera-box");
const video         = document.getElementById("camera");
const photoPreview  = document.getElementById("photo-preview");
const cameraText    = document.getElementById("camera-text");
const captureBtn    = document.getElementById("capture-btn");

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
    const MAX_WIDTH  = 300;
    const MAX_HEIGHT = 300;
    const QUALITY    = 0.6;

    let width  = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
    } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
    }

    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    capturedImage = canvas.toDataURL("image/jpeg", QUALITY);

    photoPreview.src = capturedImage;
    photoPreview.classList.remove("hidden");
    video.classList.add("hidden");
    captureBtn.classList.add("hidden");

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
        image: capturedImage,
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

/* ==========================================================================
   NAV BUTTONS & TIMER
   ========================================================================== */
document.getElementById('next-btn').addEventListener('click', () => { nextCard(); resetTimer(); });
document.getElementById('prev-btn').addEventListener('click', () => { prevCard(); resetTimer(); });

function startTimer()  { autoPlayTimer = setInterval(nextCard, 4000); }
function resetTimer()  { clearInterval(autoPlayTimer); startTimer(); }

/* ==========================================================================
   BOOT
   ========================================================================== */
const initialMatchState = {
    overs: 0,
    totalballs: 0,
    totalruns: 0,
    wicket: 0
};

document.querySelector("#btn").addEventListener("click", () => {
    senddata();
    window.location.href = "team.html";
});

window.addEventListener('DOMContentLoaded', () => {
    players = loadPlayers();
    renderUI();
    startTimer();
});
