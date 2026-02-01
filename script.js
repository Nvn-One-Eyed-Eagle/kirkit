/* ==========================================================================
   videoStore.js — IndexedDB wrapper for match video storage
   Include this via <script src="videoStore.js"></script> BEFORE match.js
   ========================================================================== */

const VideoDB = (() => {
    const DB_NAME = "cricketVideos";
    const STORE  = "videos";
    const VERSION = 1;

    let db = null;

    // Returns a promise that resolves once the DB connection is ready
    function getDB() {
        if (db) return Promise.resolve(db);

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, VERSION);

            req.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE)) {
                    database.createObjectStore(STORE); // key = videoId string
                }
            };

            req.onsuccess  = (e) => { db = e.target.result; resolve(db); };
            req.onerror    = (e) => reject(e.target.error);
        });
    }

    // Save a base64 video string, returns the generated ID
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

    // Retrieve a base64 video string by ID
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

    // Delete a single video by ID
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

    // Delete ALL videos (e.g. after match is fully over)
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
   CONFIG & INITIALIZATION
   ========================================================================== */
const team1 = JSON.parse(localStorage.getItem("team1"));
const team2 = JSON.parse(localStorage.getItem("team2"));
const over = JSON.parse(localStorage.getItem("overs"));

if (!team1 || !team2) {
    alert("Teams not selected!");
}

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");
const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");
const previewBtn = document.getElementById("previewBtn");
const previewVideos = document.getElementById("previewVideos");

const outPlayers = {};

// --- Camera/Video UI Elements ---
const video = document.getElementById("camera");
const status = document.getElementById("status");
const recordBtn = document.getElementById("record");
const stopBtn = document.getElementById("stop");
const abandonBtn = document.getElementById("abandon");

/* ==========================================================================
   GAME STATE
   ========================================================================== */
let players = team1;
let inningsCompleted = 0;
let strikeSet = false;
let allset = false;
let wicketFallen = false;

const inning_score = {};
let overVideos = [];          // now stores IndexedDB IDs (not base64)
let lastBallVideoID = null;   // ✅ RENAMED: stores the DB id, not the blob
let inning = localStorage.getItem("inning");

/* ==========================================================================
   VIDEO RECORDING MODULE
   ========================================================================== */
let stream;
let recorder;
let chunks = [];
let isRecording = false;
let isPaused = false;
let discard = false;

function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// Init Camera (Back Camera)
(async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: true
        });
        video.srcObject = stream;
        status.textContent = "Back camera ready";
    } catch (err) {
        status.textContent = "Camera access failed";
        console.error(err);
    }
})();

function next() {
    strike.innerText = "";
    nonstrike.innerText = "";
    strikeSet = false;
    allset = false;
    wicketFallen = false;
    document.querySelector("#bating").innerText = "Team 2";

    players = players === team1 ? team2 : team1;

    renderPlayers();
    update();
}

if (inning === '2') next();

function startRecording() {
    chunks = [];
    discard = false;

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
    };

    // ✅ CHANGED: save blob to IndexedDB, store only the ID in memory
    recorder.onstop = async () => {
        if (discard) return;

        const blob = new Blob(chunks, { type: "video/webm" });
        const base64Video = await blobToBase64(blob);

        // Save to IndexedDB and get back a lightweight ID
        const videoID = await VideoDB.save(base64Video);

        lastBallVideoID = videoID;

        overVideos.push(videoID);

        // keep only last 6 balls (1 over)
        if (overVideos.length > 6) {
            overVideos.shift();
        }

        status.textContent = "Ball recorded";
    };

    recorder.start();
    isRecording = true;
    isPaused = false;
    recordBtn.textContent = "⏸";
    status.textContent = "Recording…";
}

function togglePause() {
    if (!isRecording) return;

    if (!isPaused) {
        recorder.pause();
        isPaused = true;
        recordBtn.textContent = "▶";
        status.textContent = "Paused";
    } else {
        recorder.resume();
        isPaused = false;
        recordBtn.textContent = "⏸";
        status.textContent = "Recording…";
    }
}

function stopAndSave() {
    if (!isRecording) return;
    discard = false;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
}

function abandonRecording() {
    if (!isRecording) return;
    discard = true;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
    status.textContent = "Recording abandoned";
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */
function getAvailableBatsmen() {
    return Object.keys(players).filter(
        p => typeof players[p] === "object" && !players[p].bold
    );
}

function isAllOut() {
    return getAvailableBatsmen().length === 0;
}

function getSortedPlayers(playersObj) {
    return Object.entries(playersObj)
        .filter(([_, data]) => typeof data === "object" && "runs" in data)
        .sort((a, b) => b[1].runs - a[1].runs);
}

function finalizeOutPlayer() {
    for (const name in players) {
        const p = players[name];
        if (p?.bold) {
            outPlayers[name] = p;
            inning_score[name] = p;
        }
    }
}

/* ==========================================================================
   UI RENDERING FUNCTIONS
   ========================================================================== */
function update() {
    info.innerText = `Wic : ${players.wicket}`;
    oinfo.innerHTML = `
    Over : ${players.overs}
    &nbsp;&nbsp; Ball : ${players.totalballs - players.overs * 6}
    &nbsp;&nbsp; Run : ${players.totalruns}
  `;
}

function renderPlayers() {
    const parent = document.querySelector("#teamplayer");
    if (!parent) return;

    parent.innerHTML = "";

    for (const name of getAvailableBatsmen()) {
        const div = document.createElement("div");
        div.className = "team-player";
        div.innerText = name;

        if (wicketFallen && name === nonstrike.innerText) {
            div.classList.add("disabled");
        }

        div.addEventListener("click", () => {
            if (wicketFallen) {
                if (name === nonstrike.innerText) return;
                strike.innerText = name;
                wicketFallen = false;
                stop.classList.remove("lock");
                update();
                return;
            }

            if (!strikeSet) {
                strike.innerText = name;
                stop.classList.remove("lock");
                strikeSet = true;
            } else if (strike.innerText !== name) {
                nonstrike.innerText = name;
                allset = true;
                document.querySelector(".display").classList.remove("lock");
            }

            update();
        });

        parent.appendChild(div);
    }
}

function renderOverStats(playersObj) {
    const content = document.querySelector(".overlay-content");
    content.innerHTML = "";
    document.querySelector(".overlay-title").innerText = `Over : ${players.overs}`;

    // ✅ CHANGED: resolve IDs → base64 asynchronously, then render videos
    resolveVideoIDs(overVideos).then(base64Videos => {
        content.appendChild(givevids(base64Videos));
        enableAutoSwitch(content);
    });

    const sortedPlayers = getSortedPlayers(playersObj);

    sortedPlayers.forEach(([name, p]) => {
        const card = document.createElement("div");
        card.className = "player-card";

        card.innerHTML = `
      <div class="player-row">
        <span class="player-name">${name.toUpperCase()}</span>
        <span class="player-score">${p.runs} (${p.balls})</span>
        <span class="player-status ${p.bold ? "out" : "notout"}">
          ${p.bold ? "OUT" : "NOT OUT"}
        </span>
      </div>
      <div class="player-meta">
        <span>4s: ${p.fours.length}</span>
        <span>6s: ${p.sixes.length}</span>
      </div>
    `;

        document.querySelector(".playerdata").appendChild(card);
    });
}

// ✅ NEW: batch-resolve an array of video IDs into base64 strings
async function resolveVideoIDs(ids) {
    const results = [];
    for (const id of ids) {
        const base64 = await VideoDB.get(id);
        if (base64) results.push(base64);
    }
    return results;
}

// ✅ CHANGED: now receives resolved base64 array as a parameter
function givevids(base64Videos) {
    const wrapper = document.createDocumentFragment();

    if (!base64Videos || base64Videos.length === 0) {
        const msg = document.createElement("div");
        msg.innerText = "No video to show";
        return msg;
    }

    base64Videos.forEach(url => {
        const vid = document.createElement("video");
        vid.src = url;
        vid.autoplay = false;
        vid.muted = true;
        vid.controls = true;
        vid.playsInline = true;
        vid.preload = "metadata";
        wrapper.appendChild(vid);
    });

    return wrapper;
}

function enableAutoSwitch(container) {
    const videos = container.querySelectorAll("video");

    videos.forEach((vid, index) => {
        vid.addEventListener("ended", () => {
            const next = videos[index + 1];
            if (next) {
                next.play();
                next.scrollIntoView({ behavior: "smooth", inline: "start" });
            }
        });
    });

    if (videos[0]) videos[0].play();
}

/* ==========================================================================
   CORE GAME LOGIC
   ========================================================================== */

// ✅ NEW: strips video blobs from player data before saving to localStorage
// The fours/sixes arrays keep their ID references (which are tiny strings),
// so the highlights page can resolve them later from IndexedDB.
function sanitizeForStorage(teamObj) {
    // fours and sixes already contain only IDs now (not base64),
    // so no transformation needed — just return a clean copy.
    // This function exists as a safety net in case any stale base64 sneaks in.
    const safe = JSON.parse(JSON.stringify(teamObj));
    for (const key in safe) {
        const p = safe[key];
        if (typeof p !== "object" || !p) continue;
        if (Array.isArray(p.fours)) {
            p.fours = p.fours.map(entry =>
                typeof entry === "object" && entry.video && entry.video.length > 100
                    ? { ...entry, video: "[removed]" }  // fallback strip
                    : entry
            );
        }
        if (Array.isArray(p.sixes)) {
            p.sixes = p.sixes.map(entry =>
                typeof entry === "object" && entry.video && entry.video.length > 100
                    ? { ...entry, video: "[removed]" }
                    : entry
            );
        }
    }
    return safe;
}

function endInning() {
    console.log("Inning Over");
    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock");

    for (const name in players) {
        if (typeof players[name] === "object") {
            inning_score[name] = players[name];
        }
    }

    inningsCompleted++;
    const b = localStorage.getItem("inning");
    if (b === '2') localStorage.setItem("end", true);

    if (inningsCompleted === 2 || inningsCompleted === 1) {
        // ✅ CHANGED: sanitize before writing — keeps localStorage small
        localStorage.setItem("team1", JSON.stringify(sanitizeForStorage(team1)));
        localStorage.setItem("team2", JSON.stringify(sanitizeForStorage(team2)));

        window.location.href = "inning-over.html";
        return;
    }
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */

// --- Video Control Events ---
recordBtn.onclick = () => {
    if (!isRecording) startRecording();
    else togglePause();
};
stopBtn.onclick = stopAndSave;
abandonBtn.onclick = abandonRecording;

// --- Radial Menu ---
document.getElementById("radialBtn").addEventListener("click", () => {
    document.getElementById("radialMenu").classList.toggle("active");
});

// --- Scoring: Run Buttons ---
document.querySelectorAll(".square, .circle").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!allset) return;

        const run = +btn.innerText;
        const batter = players[strike.innerText];

        players.totalballs++;
        players.totalruns += run;

        batter.runs += run;
        batter.balls++;

        // ✅ CHANGED: store the video ID, not the base64 blob
        if (run === 4 && lastBallVideoID) {
            batter.fours.push({
                video: lastBallVideoID,
                over: players.overs,
                ball: players.totalballs
            });
        }

        if (run === 6 && lastBallVideoID) {
            batter.sixes.push({
                video: lastBallVideoID,
                over: players.overs,
                ball: players.totalballs
            });
        }

        if (run === 1 || run === 3 || players.totalballs % 6 === 0) {
            [strike.innerText, nonstrike.innerText] =
                [nonstrike.innerText, strike.innerText];
        }

        if (players.totalballs % 6 === 0) {
            players.overs++;
            document.querySelector("#overlay").classList.add("activey");
            document.querySelector(".app").classList.add("lock");
            renderOverStats(players);

            if (players.overs === over || isAllOut()) {
                endInning();
                return;
            }
        }

        update();
        butts.classList.add("lock");
        document.querySelector("#radialBtn").classList.add("lock");
        document.querySelector(".display").classList.remove("lock");
    });
});

// --- Scoring: Wicket Button ---
document.querySelector(".bold-btn").addEventListener("click", () => {
    if (!allset) return;

    const outPlayer = strike.innerText;

    players.wicket++;
    players[outPlayer].balls++;
    players.totalballs++;
    players[outPlayer].bold = true;

    stop.classList.add("lock");
    finalizeOutPlayer();

    const remaining = getAvailableBatsmen();

    if (remaining.length === 1) {
        strike.innerText = remaining[0];
        nonstrike.innerText = "";
        allset = true;
        wicketFallen = false;
        update();
    }

    if (remaining.length === 0) {
        endInning();
        return;
    }

    const isOverEnd = players.totalballs % 6 === 0;

    if (isAllOut()) {
        endInning();
        return;
    }

    if (isOverEnd) {
        players.overs++;
        document.querySelector("#overlay").classList.add("activey");
        document.querySelector(".app").classList.add("lock");
        renderOverStats(players);

        if (players.overs === over) {
            endInning();
            return;
        }

        update();
        return;
    }

    wicketFallen = true;
    strike.innerText = "Select...";
    renderPlayers();

    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock");
    document.querySelector(".display").classList.remove("lock");

    update();
});

// --- Game Control: Stop Button ---
stop.addEventListener("click", () => {
    document.querySelector("#radialBtn").classList.remove("lock");
    if (!allset) return;
    infoContainer.classList.remove("locked");
    butts.classList.remove("lock");
    document.querySelector(".display").classList.add("lock");
});

// --- Scoring: Dot Ball ---
document.querySelector(".dot-btn")?.addEventListener("click", () => {
    if (!allset) return;
    butts.classList.add("lock");
    document.getElementById("radialMenu").classList.toggle("active");

    players.totalballs++;
    players[strike.innerText].balls++;

    if (players.totalballs % 6 === 0) {
        [strike.innerText, nonstrike.innerText] =
            [nonstrike.innerText, strike.innerText];

        players.overs++;
        document.querySelector("#overlay").classList.add("activey");
        document.querySelector(".app").classList.add("lock");
        renderOverStats(players);

        if (players.overs === over || isAllOut()) {
            endInning();
            return;
        }
    }

    update();
    document.querySelector("#radialBtn").classList.add("lock");
    document.querySelector(".display").classList.remove("lock");
});

// --- Overlay Control ---
document.querySelector("#cont").addEventListener("click", () => {
    document.querySelector("#overlay").classList.remove("activey");
    document.querySelector(".app").classList.remove("lock");

    overVideos.length = 0;
    lastBallVideoID = null;   // ✅ RENAMED
});

// --- Preview Button ---
previewBtn.addEventListener("click", async () => {
    previewVideos.innerHTML = "";

    if (overVideos.length === 0) {
        alert("No videos recorded for this over");
        return;
    }

    // ✅ CHANGED: resolve IDs before rendering
    const base64Videos = await resolveVideoIDs(overVideos);

    base64Videos.forEach(url => {
        const vid = document.createElement("video");
        vid.src = url;
        vid.controls = true;
        vid.playsInline = true;
        previewVideos.appendChild(vid);
    });
});

/* ==========================================================================
   INITIAL RENDER
   ========================================================================== */
renderPlayers();