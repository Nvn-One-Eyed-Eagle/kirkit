import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔑 Supabase credentials
const SUPABASE_URL = "https://hxcppdpnofgzlmtpehxe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UtTJdatuwjcxjahaFrhzmA_ues-x2bo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const addBtn = document.getElementById("addPlayerBtn");
const logBtn = document.getElementById("logPlayersBtn");

// ADD PLAYER
addBtn.addEventListener("click", async () => {
  const name = document.getElementById("playerName").value.trim();
  const imageFile = document.getElementById("playerImage").files[0];

  if (!name || !imageFile) {
    alert("Enter name and image");
    return;
  }

  try {
    // 1️⃣ Upload image to Supabase Storage
    const filePath = `images/${Date.now()}_${imageFile.name}`;

    const { error: uploadError } = await supabase
      .storage
      .from("players")
      .upload(filePath, imageFile);

    if (uploadError) throw uploadError;

    // 2️⃣ Get public URL
    const { data } = supabase
      .storage
      .from("players")
      .getPublicUrl(filePath);

    const imageURL = data.publicUrl;

    // 3️⃣ Insert into database
    const { error: dbError } = await supabase
      .from("players")
      .insert({
        name,
        image: imageURL,
        four_videos: [],
        six_videos: []
      });

    if (dbError) throw dbError;

    alert("Player added");
    document.getElementById("playerName").value = "";
    document.getElementById("playerImage").value = "";

  } catch (err) {
    console.error(err);
    alert("Error adding player");
  }
});

// LOG PLAYERS
logBtn.addEventListener("click", async () => {
  const { data, error } = await supabase
    .from("players")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  console.log("Players in DB:", data);
});
