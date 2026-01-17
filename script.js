/* =========================
   DOM ELEMENTS
========================= */

const team1 = JSON.parse(localStorage.getItem("team1"));
const team2 = JSON.parse(localStorage.getItem("team2"));
const over = JSON.parse(localStorage.getItem("overs"));

if (!team1 || !team2) {
  alert("Teams not selected!");
}

let players = team1; // ⚠️ MUST BE let (inning switch)

const strike = document.querySelector(".player-box");
const nonstrike = document.querySelector(".nstrike");
const infoContainer = document.getElementById("infoContainer");
const stop = document.querySelector("#stop");
const butts = document.querySelector(".runs");

const info = document.querySelector("#wic");
const oinfo = document.querySelector("#otherinfo");

let inningsCompleted = 0; 

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
   RADIAL MENU
========================= */
document.getElementById("radialBtn").addEventListener("click", () => {
  document.getElementById("radialMenu").classList.toggle("active");
});


/* =========================
   MATCH DATA
========================= */

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
function isAllOut() {
  return getAvailableBatsmen().length === 0;
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
        stop.classList.remove("lock");
        update();
        return;
      }

      /* INITIAL SETUP */
      if (!strikeSet) {
        strike.innerText = name;
        stop.classList.remove("lock");
        strikeSet = true;
      } 
      else if (strike.innerText !== name) {
        nonstrike.innerText = name;
        allset = true;
        document.querySelector(".display").classList.remove("lock");
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
   END INNING
========================= */
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

  // 👉 IF BOTH TEAMS HAVE BATTED
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

    if (players.totalballs % 6 === 0) {
      players.overs++;

    if (players.overs === 1 || isAllOut()) {
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

/* =========================
   WICKET BUTTON
========================= */
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

/* =========================
   STOP BUTTON
========================= */
stop.addEventListener("click", () => {
  document.querySelector("#radialBtn").classList.remove("lock");
  if (!allset) return;
  infoContainer.classList.remove("locked");
  butts.classList.remove("lock");
  document.querySelector(".display").classList.add("lock");
});

/* =========================
   DOT BALL
========================= */
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

  if (players.overs === over || isAllOut()) {
    endInning();
    return;
  }
  }

  update();
  document.querySelector("#radialBtn").classList.add("lock")
  document.querySelector(".display").classList.remove("lock");
});
