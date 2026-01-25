
// --- State Management ---
let currentCard = 0;
let activeTab = 'fours'; // 'fours' or 'sixes'
let autoPlayTimer;

// Data Source
const players = [
    {
        name: "Mirdul",
        image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400",
        matches: 0,
        runs: 0,
        highScore: 0,
        average: 0,
        fours: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=300", title: "Cover Drive vs Australia" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300", title: "Flick Shot vs England" }
        ],
        sixes: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=300", title: "Pull Shot vs Pakistan" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=300", title: "Straight Six vs SA" }
        ]
    },
    {
        name: "Amit",
        image: "https://images.unsplash.com/photo-1546608235-3310a2494cdf?w=400",
        matches: 0,
        runs: 0,
        highScore: 0,
        average: 0,
        fours: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300", title: "Square Cut vs WI" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=300", title: "Drive vs NZ" }
        ],
        sixes: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=300", title: "Hook Shot vs Aus" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=300", title: "Lofted Drive vs Eng" }
        ]
    },
    {
        name: "Mohit",
        image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400",
        matches: 0,
        runs: 0,
        highScore: 0,
        average: 0,
        fours: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=300", title: "Helicopter Shot vs Pak" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300", title: "Flick vs SL" }
        ],
        sixes: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=300", title: "Winning Six 2011 WC" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=300", title: "Helicopter Six vs Aus" }
        ]
    },

    {
        name: "Nitin",
        image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400",
        matches: 0,
        runs: 0,
        highScore: 0,
        average: 0,
        fours: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=300", title: "Helicopter Shot vs Pak" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300", title: "Flick vs SL" }
        ],
        sixes: [
            { id: 1, thumbnail: "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=300", title: "Winning Six 2011 WC" },
            { id: 2, thumbnail: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=300", title: "Helicopter Six vs Aus" }
        ]
    }

];

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

    const videos = currentPlayer[activeTab] || [];
    
    videos.forEach(video => {
        const html = `
            <div class="relative group cursor-pointer" onclick="openVideoModal('${video.thumbnail}', '${video.title}')">
                <div class="relative rounded-xl overflow-hidden shadow-lg transform transition-transform group-hover:scale-105">
                    <img src="${video.thumbnail}" alt="${video.title}" class="w-full h-32 object-cover">
                    <div class="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all flex items-center justify-center">
                        <div class="bg-white/90 rounded-full p-3">
                            <i data-lucide="play" class="w-6 h-6 text-red-600 fill-red-600"></i>
                        </div>
                    </div>
                </div>
                <p class="text-white text-xs mt-2 text-center font-medium">${video.title}</p>
            </div>
        `;
        videoGrid.innerHTML += html;
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
    document.querySelectorAll('#add-player-form input').forEach(inp => inp.value = '');
}

submitAddBtn.addEventListener('click', () => {
    const name = document.getElementById('inp-name').value;
    const image = document.getElementById('inp-image').value;
    const matches = document.getElementById('inp-matches').value;
    const runs = document.getElementById('inp-runs').value;
    const highScore = document.getElementById('inp-highscore').value;
    const average = document.getElementById('inp-average').value;

    if (!name || !image || !matches || !runs || !highScore || !average) {
        alert('Please fill all fields');
        return;
    }

    const newPlayer = {
        name,
        image,
        matches: parseInt(matches),
        runs: parseInt(runs),
        highScore: parseInt(highScore),
        average: parseFloat(average),
        fours: [], // Empty arrays for new players as per prompt
        sixes: []
    };

    players.push(newPlayer);
    
    // Close form and update UI
    addPlayerForm.classList.add('hidden');
    showAddBtn.classList.remove('hidden');
    clearForm();
    
    // Reset timer so it doesn't jump immediately after add
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
    window.location.href = "pages/team.html";
})





