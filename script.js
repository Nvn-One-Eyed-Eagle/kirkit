/* =========================
   DOM ELEMENTS
========================= */
const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");

const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");


/*===========================*/



const video = document.getElementById("camera");
const status = document.getElementById("status");
const recordBtn = document.getElementById("record");
const stopBtn = document.getElementById("stop");
const abandonBtn = document.getElementById("abandon");

let stream;
let recorder;
let chunks = [];
let isRecording = false;
let isPaused = false;
let discard = false;

// INIT CAMERA (BACK CAMERA)
(async () => {
    try{
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: true
        });
        video.srcObject = stream;
        status.textContent = "Back camera ready";
    }catch(err){
        status.textContent = "Camera access failed";
        console.error(err);
    }
})();

// START RECORDING
function startRecording(){
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

        const a = document.createElement("a");
        a.href = url;
        a.download = "recording.webm";
        a.click();

        URL.revokeObjectURL(url);
        status.textContent = "Video saved";
    };

    recorder.start();
    isRecording = true;
    isPaused = false;
    recordBtn.textContent = "⏸";
    status.textContent = "Recording…";
}

// PAUSE / RESUME
function togglePause(){
    if (!isRecording) return;

    if (!isPaused){
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

// STOP & SAVE
function stopAndSave(){
    if (!isRecording) return;
    discard = false;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
}

// ABANDON
function abandonRecording(){
    if (!isRecording) return;
    discard = true;
    recorder.stop();
    isRecording = false;
    isPaused = false;
    recordBtn.textContent = "▶";
    status.textContent = "Recording abandoned";
}

// EVENTS
recordBtn.onclick = () => {
    if (!isRecording) startRecording();
    else togglePause();
};

stopBtn.onclick = stopAndSave;
abandonBtn.onclick = abandonRecording;





/* =========================
   UI UPDATE
========================= */
function update() {
  info.innerText = `Wic : ${players.wicket}`;
  oinfo.innerHTML = `
    Over : ${players.overs}
    &nbsp;&nbsp; Ball : ${players.totalballs - players.overs * 6}
    &nbsp;&nbsp; Run : ${players.totalruns}
  `;
}

/* =========================
   MATCH DATA
========================= */
function createPlayer() {
  return {
    runs: 0,
    balls: 0,
    sixes: 0,
    fours: 0,
    bold: false,
    get runRate() {
      return this.balls ? (this.runs / this.balls) * 6 : 0;
    }
  };
}

const players = {
  mohit: createPlayer(),
  nitin: createPlayer(),
  amit: createPlayer(),
  mirdul: createPlayer(),

  totalruns: 0,
  totalballs: 0,
  overs: 0,
  wicket: 0
};

const inning_score = {};

/* =========================
   STATE FLAGS
========================= */
let strikeSet = false;
let allset = false;
let wicketFallen = false;

/* =========================
   HELPERS
========================= */
function getAvailableBatsmen() {
  return Object.keys(players).filter(
    p => typeof players[p] === "object"
  );
}

/* =========================
   RENDER PLAYERS
========================= */
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
        update();
        stop.classList.remove("lock")
        return;
      }

      /* INITIAL SETUP */
      if (!strikeSet) {
        strike.innerText = name;
        stop.classList.remove("lock")
        strikeSet = true;
      } else if (strike.innerText !== name) {
        nonstrike.innerText = name;

        allset = true;
      }

      update();
    });

    parent.appendChild(div);
  }
}

renderPlayers();

/* =========================
   FINALIZE OUT PLAYER
========================= */
function finalizeOutPlayer() {
  for (const name in players) {
    const p = players[name];
    if (p?.bold) {
      inning_score[name] = p;
      delete players[name];
    }
  }
}

/* =========================
   RUN BUTTONS
========================= */
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

    if (players.totalballs % 6 === 0) players.overs++;

    update();
    butts.classList.add("lock");
  });
});

/* =========================
   WICKET BUTTON
========================= */
document.querySelector(".bold-btn").addEventListener("click", () => {
  const outPlayer = strike.innerText;
  
  players.wicket++;
  players[outPlayer].balls+=1;
  players.totalballs+=1;
  players[outPlayer].bold = true;
  stop.classList.add("lock")
  update();

  finalizeOutPlayer();

  const remaining = getAvailableBatsmen();

  /* ✅ NO BATSMAN LEFT → PROMOTE NON-STRIKER */
  if (remaining.length === 1 && remaining[0] === nonstrike.innerText) {
    strike.innerText = nonstrike.innerText;
    nonstrike.innerText = "";
    wicketFallen = false;
    stop.classList.remove("lock") 
    butts.classList.add("lock")

    update();
    return;
  }

  /* NORMAL CASE */
  wicketFallen = true;
  strike.innerText = "Select...";

  renderPlayers();
  document.querySelector(".team-players").classList.remove("lock");
  butts.classList.add("lock");

  update();
});

/* =========================
   STOP BUTTON
========================= */
stop.addEventListener("click", () => {
  if (!allset) return;

  infoContainer.classList.remove("locked");
  document.querySelector(".team-players").classList.add("lock");
  butts.classList.remove("lock");
});

/* =========================
   RADIAL MENU
========================= */
document.getElementById("radialBtn").addEventListener("click", () => {
  document.getElementById("radialMenu").classList.toggle("active");
});

/* =========================
   BALL OPTIONS
========================= */
const actions = {
  Dot() {
    if (!allset) return;

    players.totalballs++;
    players[strike.innerText].balls++;

    if (players.totalballs % 6 === 0) {
      [strike.innerText, nonstrike.innerText] =
        [nonstrike.innerText, strike.innerText];
      players.overs++;
    }

    update();
    butts.classList.add("lock");
  }
};

document.querySelectorAll(".option").forEach(item => {
  item.addEventListener("click", () => {
    actions[item.innerText]?.();
    document.getElementById("radialMenu").classList.remove("active");
  });
});
