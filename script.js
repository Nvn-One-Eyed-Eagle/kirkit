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
// --- Game UI Elements ---
const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");
const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");
const previewBtn = document.getElementById("previewBtn");
const previewVideos = document.getElementById("previewVideos");

// --- Camera/Video UI Elements ---
const video = document.getElementById("camera");
const status = document.getElementById("status");
const recordBtn = document.getElementById("record");
const stopBtn = document.getElementById("stop"); // Note: ID conflict with game 'stop' button if IDs are same
const abandonBtn = document.getElementById("abandon");

/* ==========================================================================
   GAME STATE
   ========================================================================== */
let players = team1; // ⚠️ MUST BE let (inning switch)
let inningsCompleted = 0;
let strikeSet = false;
let allset = false;
let wicketFallen = false;

// Data Storage
const inning_score = {};
let overVideos = []; // stores video URLs

/* ==========================================================================
   VIDEO RECORDING MODULE
   ========================================================================== */
let stream;
let recorder;
let chunks = [];
let isRecording = false;
let isPaused = false;
let discard = false;

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

function startRecording() {
    chunks = [];
    discard = false;

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
        if (discard) return;

        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        overVideos.push(url);

        // keep only last 6 balls (1 over)
        if (overVideos.length > 6) {
            URL.revokeObjectURL(overVideos.shift());
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
        p => typeof players[p] === "object"
    );
}

function isAllOut() {
    return getAvailableBatsmen().length === 0;
}

function getSortedPlayers(playersObj) {
    return Object.entries(playersObj)
        .filter(([_, data]) => typeof data === "object" && "runs" in data)
        .sort((a, b) => b[1].runs - a[1].runs); // descending runs
}

function finalizeOutPlayer() {
    for (const name in players) {
        const p = players[name];
        if (p?.bold) {
            inning_score[name] = p;
            delete players[name];
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
            /* AFTER WICKET */
            if (wicketFallen) {
                if (name === nonstrike.innerText) return;

                strike.innerText = name;
                wicketFallen = false;
                stop.classList.remove("lock");
                update();
                return;
            }

            /* INITIAL SETUP */
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
    content.innerHTML = ""; // clear old content
    document.querySelector(".overlay-title").innerText = `Over : ${players.overs}`
    content.appendChild(givevids());
    enableAutoSwitch(content);
    const box = document.querySelector(".overlay-box");

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
        <span>4s: ${p.fours}</span>
        <span>6s: ${p.sixes}</span>
      </div>
    `;

        document.querySelector(".playerdata").appendChild(card);
    });
}

// --- Video Preview Helpers ---

function givevids() {
    const wrapper = document.createDocumentFragment();

    if (overVideos.length === 0) {
        const msg = document.createElement("div");
        msg.innerText = "No video to show";
        return msg;
    }

    overVideos.forEach(url => {
        const vid = document.createElement("video");
        vid.src = url;
        vid.autoplay = false; // important
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
                next.scrollIntoView({
                    behavior: "smooth",
                    inline: "start"
                });
            }
        });
    });

    // autoplay first video
    if (videos[0]) videos[0].play();
}

/* ==========================================================================
   CORE GAME LOGIC
   ========================================================================== */
function endInning() {
    console.log("Inning Over");
    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock")
    document.querySelector("#bating").innerText = "Team 2";

    // Save remaining players' scores
    for (const name in players) {
        if (typeof players[name] === "object") {
            inning_score[name] = players[name];
        }
    }

    inningsCompleted++;

    // IF BOTH TEAMS HAVE BATTED
    if (inningsCompleted === 2) {
        // Optional: store final scores
        localStorage.setItem("team1", JSON.stringify(team1));
        localStorage.setItem("team2", JSON.stringify(team2));

        //STOP EVERYTHING & REDIRECT
        window.location.href = "matchover.html";
        return;
    }

    // Reset UI + state for next innings
    strike.innerText = "";
    nonstrike.innerText = "";
    strikeSet = false;
    allset = false;
    wicketFallen = false;

    // Switch batting team
    players = players === team1 ? team2 : team1;

    renderPlayers();
    update();
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

        if (run === 4) batter.fours++;
        if (run === 6) batter.sixes++;

        if (run === 1 || run === 3 || players.totalballs % 6 === 0) {
            [strike.innerText, nonstrike.innerText] =
            [nonstrike.innerText, strike.innerText];
        }

        if (players.totalballs % 6 === 0) {
            players.overs++;
            document.querySelector("#overlay").classList.add("activey")
            document.querySelector(".app").classList.add("lock")
            renderOverStats(players);

            if (players.overs === over || isAllOut()) {
                endInning();
                return;
            }
        }

        update();
        butts.classList.add("lock");
        document.querySelector("#radialBtn").classList.add("lock")
        document.querySelector(".display").classList.remove("lock");
    });
});

// --- Scoring: Wicket Button ---
document.querySelector(".bold-btn").addEventListener("click", () => {
    const outPlayer = strike.innerText;

    players.wicket++;
    players[outPlayer].balls++;
    players.totalballs++;
    players[outPlayer].bold = true;

    stop.classList.add("lock");
    update();

    finalizeOutPlayer();
    if (isAllOut()) {
        endInning();
        return;
    }

    const remaining = getAvailableBatsmen();

    if (remaining.length === 1 && remaining[0] === nonstrike.innerText) {
        strike.innerText = nonstrike.innerText;
        nonstrike.innerText = "";
        wicketFallen = false;
        stop.classList.remove("lock");
        butts.classList.add("lock");
        document.querySelector("#radialBtn").classList.add("lock")
        document.querySelector(".display").classList.remove("lock");
        update();
        return;
    }

    wicketFallen = true;
    strike.innerText = "Select...";
    renderPlayers();
    butts.classList.add("lock");
    document.querySelector("#radialBtn").classList.add("lock")
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
        document.querySelector("#overlay").classList.add("activey")
        document.querySelector(".app").classList.add("lock")
        renderOverStats(players);

        if (players.overs === over || isAllOut()) {
            endInning();
            return;
        }
    }

    update();
    document.querySelector("#radialBtn").classList.add("lock")
    document.querySelector(".display").classList.remove("lock");
});

// --- Overlay Control ---
document.querySelector("#cont").addEventListener("click", () => {
    document.querySelector("#overlay").classList.remove("activey");
    document.querySelector(".app").classList.remove("lock")
    overVideos.length = 0;
});

// --- Preview Button ---
previewBtn.addEventListener("click", () => {
    previewVideos.innerHTML = "";

    if (overVideos.length === 0) {
        alert("No videos recorded for this over");
        return;
    }

    overVideos.forEach(url => {
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