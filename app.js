// ==========================================
// 0. SUPABASE INITIALIZATION
// (client is named "db" because the CDN already uses the global name "supabase")
// ==========================================
const SUPABASE_URL = 'https://kkwgodtsatrmnvssojxt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_h9RjSCZ_8sHwA0RNhp3GOw_kxdoT_gn';
let db = null;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase client initialized");
    } else {
        console.error("Supabase SDK missing from HTML!");
    }
} catch (err) {
    console.error("Supabase initialization error:", err);
}

// ==========================================
// 1. GAME CONFIG (edit these to add content)
// Icon names come from icons.js
// ==========================================
const SAVED_NAME_KEY = "gamehub_username";
const MAX_BADGES = 3; // how many badges a player can show at once

// gain(ctx) = how much progress a finished game adds.
// ctx = { gameId, score, win, extra, xp, coins }
const MISSIONS = [
    { id: "play3",         icon: "game",  title: "Play 3 games",                    target: 3,   reward: 50,  gain: () => 1 },
    { id: "play8",         icon: "fire",  title: "Play 8 games",                    target: 8,   reward: 120, gain: () => 1 },
    { id: "win1",          icon: "trophy", title: "Win a game",                     target: 1,   reward: 30,  gain: c => (c.win ? 1 : 0) },
    { id: "win4",          icon: "crown", title: "Win 4 games",                     target: 4,   reward: 90,  gain: c => (c.win ? 1 : 0) },
    { id: "win_tictactoe", icon: "cross", title: "Win Tic-Tac-Toe",                 target: 1,   reward: 30,  gain: c => (c.gameId === "tictactoe" && c.win ? 1 : 0) },
    { id: "guess_win",     icon: "dice",  title: "Win Guess Number",                target: 1,   reward: 40,  gain: c => (c.gameId === "guessnumber" && c.win ? 1 : 0) },
    { id: "memory_done",   icon: "cards", title: "Finish Matching Cards",           target: 1,   reward: 40,  gain: c => (c.gameId === "matching" && c.win ? 1 : 0) },
    { id: "reaction_fast", icon: "bolt",  title: "Average under 400ms in Reaction", target: 1,   reward: 60,  gain: c => (c.gameId === "reaction" && c.extra.avg && c.extra.avg < 400 ? 1 : 0) },
    { id: "code_crack",    icon: "key",   title: "Crack the secret code",           target: 1,   reward: 50,  gain: c => (c.gameId === "codebreaker" && c.win ? 1 : 0) },
    { id: "trivia5",       icon: "orb",   title: "Get 5 trivia answers right",      target: 5,   reward: 50,  gain: c => (c.gameId === "trivia" ? (c.extra.correct || 0) : 0) },
    { id: "score500",      icon: "gem",   title: "Score 500+ in one game",          target: 1,   reward: 70,  gain: c => (c.score >= 500 ? 1 : 0) },
    { id: "xp200",         icon: "star",  title: "Earn 200 XP today",               target: 200, reward: 80,  gain: c => c.xp }
];

// test(ctx) returns true once earned. ctx is null outside of a finished game.
const ACHIEVEMENTS = [
    { id: "first_win",   icon: "medal",   name: "First Win",           desc: "Win your first game",                  reward: 50,  test: () => currentPlayer.wins >= 1 },
    { id: "wins_10",     icon: "trophy",  name: "Champion",            desc: "Win 10 games",                         reward: 150, test: () => currentPlayer.wins >= 10 },
    { id: "wins_25",     icon: "sword",   name: "Unstoppable",         desc: "Win 25 games",                         reward: 300, test: () => currentPlayer.wins >= 25 },
    { id: "veteran",     icon: "game",    name: "Arcade Veteran",      desc: "Play 10 games",                        reward: 100, test: () => currentPlayer.games_played >= 10 },
    { id: "games_50",    icon: "fire",    name: "Arcade Legend",       desc: "Play 50 games",                        reward: 300, test: () => currentPlayer.games_played >= 50 },
    { id: "lvl3",        icon: "star",    name: "Rising Star",         desc: "Reach Level 3",                        reward: 150, test: () => currentPlayer.level >= 3 },
    { id: "lvl5",        icon: "arrowup", name: "High Flyer",          desc: "Reach Level 5",                        reward: 250, test: () => currentPlayer.level >= 5 },
    { id: "lvl10",       icon: "gem",     name: "Elite",               desc: "Reach Level 10",                       reward: 600, test: () => currentPlayer.level >= 10 },
    { id: "xp_1000",     icon: "bolt",    name: "XP Hunter",           desc: "Gain 1000 XP",                         reward: 200, test: () => currentPlayer.xp >= 1000 },
    { id: "xp_5000",     icon: "crown",   name: "XP Master",           desc: "Gain 5000 XP",                         reward: 800, test: () => currentPlayer.xp >= 5000 },
    { id: "coins_500",   icon: "cash",    name: "Piggy Bank",          desc: "Hold 500 coins at once",               reward: 100, test: () => currentPlayer.coins >= 500 },
    { id: "shopper",     icon: "basket",  name: "Shopper",             desc: "Buy your first item",                  reward: 25,  test: () => ownedItems.size >= 1 },
    { id: "collector",   icon: "chest",   name: "Collector",           desc: "Own 5 store items",                    reward: 200, test: () => ownedItems.size >= 5 },
    { id: "explorer",    icon: "map",     name: "Explorer",            desc: "Play all 6 games",                     reward: 250, test: () => playedGames.size >= Object.keys(GAME_LIST).length },
    { id: "ttt_pro",     icon: "cross",   name: "Tic-Tac-Pro",         desc: "Win Tic-Tac-Toe in just 3 moves",      reward: 100, test: c => !!c && c.gameId === "tictactoe" && c.win && c.extra.moves === 3 },
    { id: "mind_reader", icon: "orb",     name: "Mind Reader",         desc: "Guess the number in 4 tries or fewer", reward: 150, test: c => !!c && c.gameId === "guessnumber" && c.win && c.extra.attempts <= 4 },
    { id: "photographic",icon: "cards",   name: "Photographic Memory", desc: "Finish Matching in 12 moves or fewer", reward: 200, test: c => !!c && c.gameId === "matching" && c.win && c.extra.moves <= 12 },
    { id: "lightning",   icon: "bolt",    name: "Lightning Reflexes",  desc: "Average under 300ms in Reaction Rush", reward: 200, test: c => !!c && c.gameId === "reaction" && c.extra.avg && c.extra.avg < 300 },
    { id: "cracker",     icon: "key",     name: "Master Cracker",      desc: "Crack the code in 3 tries or fewer",   reward: 200, test: c => !!c && c.gameId === "codebreaker" && c.win && c.extra.attempts <= 3 },
    { id: "genius",      icon: "orb",     name: "Trivia Genius",       desc: "Answer every trivia question right",   reward: 250, test: c => !!c && c.gameId === "trivia" && c.extra.correct === c.extra.total },
    { id: "high_roller", icon: "dice",    name: "High Roller",         desc: "Score 800+ in a single game",          reward: 150, test: c => !!c && c.score >= 800 },
    { id: "daily_champ", icon: "scroll",  name: "Daily Champion",      desc: "Claim every daily mission in a day",   reward: 300, test: () => MISSIONS.every(m => missionState[m.id] && missionState[m.id].claimed) }
];

// slot: name | frame | badge | theme.  css = class (or theme name) it applies.
const STORE_SECTIONS = [
    { slot: "name",  title: "Name Colors",    icon: "star" },
    { slot: "frame", title: "Avatar Frames",  icon: "medal" },
    { slot: "badge", title: "Badges",         icon: "gem" },
    { slot: "theme", title: "App Themes",     icon: "orb" }
];

// Badges = the 32 creature images in the /badges folder (b01.webp ... b32.webp).
// [name, price]. The order matches the image numbers.
const BADGE_DEFS = [
    ["Stone Guard", 400],   ["Victory Ears", 1800], ["Sun Bloom", 250],    ["Night Beak", 300],
    ["Ember Chick", 150],   ["Lily Hat", 200],      ["Grin Brawler", 250], ["Pond Sprite", 150],
    ["Dream Puff", 500],    ["Honey Trio", 350],    ["Sky Chirp", 200],    ["Panda Punk", 700],
    ["Grumpy Moss", 100],   ["Wood Eye", 150],      ["Snow Bunny", 450],   ["Leaf Sprout", 100],
    ["Flame Pup", 400],     ["Deep Roar", 600],     ["Grumpy Bear", 800],  ["Cactus Pal", 350],
    ["Sand Armor", 300],    ["Patch Balloon", 500], ["Cotton Cloud", 900], ["Spark Mouse", 1200],
    ["Frost Hood", 450],    ["Red Peeper", 250],    ["Spike Crab", 1000],  ["Horn Blob", 600],
    ["Cheeky Bear", 200],   ["Wish Star", 2500],    ["Bored Leaf", 150],   ["Teal Swoop", 1500]
];
const BADGE_ITEMS = BADGE_DEFS.map(([name, price], i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: "badge_" + n, slot: "badge", name, price, img: "badges/b" + n + ".webp" };
});

const STORE_ITEMS = [
    { id: "neon_red",       slot: "name",  name: "Neon Red Name",   price: 300,  css: "name-red" },
    { id: "neon_blue",      slot: "name",  name: "Neon Blue Name",  price: 300,  css: "name-blue" },
    { id: "neon_green",     slot: "name",  name: "Neon Green Name", price: 300,  css: "name-green" },
    { id: "gold_name",      slot: "name",  name: "Golden Name",     price: 800,  css: "name-gold" },
    { id: "rainbow_name",   slot: "name",  name: "Rainbow Name",    price: 1500, css: "name-rainbow" },

    { id: "cyber_frame",    slot: "frame", name: "Cyber Frame",     price: 200,  css: "frame-cyber" },
    { id: "fire_frame",     slot: "frame", name: "Fire Frame",      price: 450,  css: "frame-fire" },
    { id: "ice_frame",      slot: "frame", name: "Ice Frame",       price: 450,  css: "frame-ice" },
    { id: "rainbow_frame",  slot: "frame", name: "Rainbow Frame",   price: 1200, css: "frame-rainbow" },

    ...BADGE_ITEMS,

    { id: "theme_ocean",    slot: "theme", name: "Ocean Theme",     price: 500,  css: "ocean",  swatch: "linear-gradient(135deg,#0EA5E9,#22D3EE)" },
    { id: "theme_sunset",   slot: "theme", name: "Sunset Theme",    price: 500,  css: "sunset", swatch: "linear-gradient(135deg,#FB7185,#FBBF24)" },
    { id: "theme_forest",   slot: "theme", name: "Forest Theme",    price: 500,  css: "forest", swatch: "linear-gradient(135deg,#22C55E,#A3E635)" },
    { id: "theme_candy",    slot: "theme", name: "Candy Theme",     price: 500,  css: "candy",  swatch: "linear-gradient(135deg,#F472B6,#67E8F9)" },
    { id: "theme_galaxy",   slot: "theme", name: "Galaxy Theme",    price: 900,  css: "galaxy", swatch: "linear-gradient(135deg,#07051A,#8B5CF6,#F0ABFC)" }
];

// ==========================================
// 2. STATE
// ==========================================
let currentPlayer = null;
let unlockedAchievements = new Set();
let ownedItems = new Set();
let equipped = { name: null, frame: null, theme: null, badges: [] };
let missionState = {};
let missionDate = null;
let bestScores = {};
let playedGames = new Set();
let leaderboardMode = "xp";
let lastCoins = null;
let achChain = Promise.resolve();
let buying = false;

let currentGameId = null;
let gameCleanup = null;
let runToken = 0;
let gameFinished = false;

function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

function itemById(id) { return STORE_ITEMS.find(i => i.id === id) || null; }
function gameIdByName(name) {
    return Object.keys(GAME_LIST).find(id => GAME_LIST[id].name === name) || null;
}

// ----- Badge helpers -----
function badgeTier(price) {
    if (price >= 1500) return { id: "legendary", label: "Legendary" };
    if (price >= 700) return { id: "epic", label: "Epic" };
    if (price >= 300) return { id: "rare", label: "Rare" };
    return { id: "common", label: "Common" };
}

function badgeImg(it, size = "") {
    return `<img class="badge-img ${size}" src="${it.img}" alt="${escapeHtml(it.name)}" title="${escapeHtml(it.name)}" loading="lazy" draggable="false">`;
}

function ownedBadgeCount() {
    return BADGE_ITEMS.filter(b => ownedItems.has(b.id)).length;
}

// Badges + collected count shown to the right of a player's name on the leaderboard
function badgesHtml(eq) {
    if (!eq || typeof eq !== "object") return "";
    const ids = Array.isArray(eq.badges) ? eq.badges : [];
    const imgs = ids.map(id => itemById(id)).filter(it => it && it.slot === "badge")
        .slice(0, MAX_BADGES).map(it => badgeImg(it)).join("");
    const count = Number(eq.badgeCount) || 0;
    const pill = count > 0 ? `<span class="badge-count" title="${count} badges collected">${ico("gem")} ${count}</span>` : "";
    return imgs || pill ? `<span class="rank-badges">${imgs}${pill}</span>` : "";
}

// ==========================================
// 3. STARTUP
// ==========================================
function showWelcomeModal() {
    const modal = document.getElementById("welcome-modal");
    if (modal) modal.style.display = "flex";
}
function hideWelcomeModal() {
    const modal = document.getElementById("welcome-modal");
    if (modal) modal.style.display = "none";
}

function showFatal(msg) {
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#B91C1C;color:#fff;padding:12px 16px;font:700 14px sans-serif;text-align:center";
    bar.textContent = msg;
    document.body.appendChild(bar);
}

document.addEventListener("DOMContentLoaded", async () => {
    let savedName = null;
    try { savedName = localStorage.getItem(SAVED_NAME_KEY); } catch (e) {}

    // Show the name popup FIRST, so a problem further down can never hide it
    if (!savedName || !db) showWelcomeModal();
    if (!db) showFatal("Could not load the Supabase library. Check your internet connection.");

    if (typeof GAME_LIST === "undefined") {
        showFatal("games.js did not load. Make sure the file is named exactly games.js and is in the same folder as index.html on Vercel.");
        return;
    }

    if (typeof ico === "undefined") {
        showFatal("icons.js did not load. Make sure icons.js is in the same folder as index.html on Vercel.");
        return;
    }

    if (!document.getElementById("games-grid")) {
        showFatal("index.html is the old version. Replace it with the new one and redeploy.");
        return;
    }

    const on = (id, evt, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(evt, fn);
    };

    on("username-input", "keydown", e => { if (e.key === "Enter") registerNewPlayer(); });
    on("games-grid", "click", e => {
        const card = e.target.closest("[data-game]");
        if (card) launchGame(card.dataset.game);
    });
    on("leaderboard-tabs", "click", e => {
        const chip = e.target.closest("[data-mode]");
        if (!chip) return;
        leaderboardMode = chip.dataset.mode;
        renderLeaderboardTabs();
        loadLeaderboard();
    });
    on("store-list", "click", e => {
        const b = e.target.closest("[data-action]");
        if (!b) return;
        const id = b.dataset.item;
        if (b.dataset.action === "buy") buyItem(id);
        else if (b.dataset.action === "equip") equipItem(id);
        else if (b.dataset.action === "unequip") unequipItem(id);
    });

    try {
        renderGames();
        renderLeaderboardTabs();
        renderStore();
        renderAchievements();
        renderMissions();
    } catch (err) {
        console.error(err);
        showFatal("Startup error: " + err.message);
    }

    if (savedName && db) {
        try {
            const ok = await loginPlayer(savedName, true);
            if (!ok) showWelcomeModal();
        } catch (err) {
            console.error(err);
            showWelcomeModal();
        }
    }
});

// ==========================================
// 4. LOGIN + LOADING SAVED DATA
// ==========================================
async function loginPlayer(username, silent = false) {
    if (!db) {
        if (!silent) showNotification("Database connection unavailable.", "error");
        return false;
    }

    try {
        const { data: existing, error: selErr } = await db
            .from("profiles").select("*").eq("username", username).maybeSingle();
        if (selErr) throw selErr;

        let profile = existing;
        if (!profile) {
            const { data: created, error: insErr } = await db
                .from("profiles").insert([{ username: username }]).select().single();
            if (insErr) throw insErr;
            profile = created;
        }

        const xp = profile.xp || 0;
        currentPlayer = {
            ...profile,
            xp: xp,
            level: Math.max(profile.level || 0, Math.floor(xp / 100)),
            coins: profile.coins || 0,
            games_played: profile.games_played || 0,
            wins: profile.wins || 0
        };

        try { localStorage.setItem(SAVED_NAME_KEY, username); } catch (e) {}

        await Promise.all([loadAchievements(), loadInventory(), loadMissions(), loadScores()]);
        loadEquipped(profile);

        hideWelcomeModal();
        updateUI();
        renderGames();
        renderStore();
        renderAchievements();
        renderMissions();
        loadLeaderboard();
        showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");

        // Unlock anything already earned (e.g. XP you had before this update)
        const before = currentPlayer.coins;
        await checkAchievements(null);
        if (currentPlayer.coins !== before) { updateUI(); renderAchievements(); await saveProfile(); }
        return true;
    } catch (error) {
        console.error("Database Error:", error);
        if (!silent) showNotification("DB error: " + (error.message || "unknown"), "error");
        return false;
    }
}

async function registerNewPlayer() {
    const usernameInput = document.getElementById("username-input");
    if (!usernameInput) return;
    const username = usernameInput.value.trim();
    if (!username) {
        showNotification("Please enter a username!", "error");
        return;
    }
    await loginPlayer(username);
}

function switchPlayer() {
    try { localStorage.removeItem(SAVED_NAME_KEY); } catch (e) {}
    location.reload();
}

async function loadAchievements() {
    unlockedAchievements = new Set();
    try {
        const { data, error } = await db.from("player_achievements").select("achievement_id").eq("player_id", currentPlayer.id);
        if (error) throw error;
        (data || []).forEach(r => unlockedAchievements.add(r.achievement_id));
    } catch (err) { console.error("Load achievements error:", err); }
}

async function loadInventory() {
    ownedItems = new Set();
    try {
        const { data, error } = await db.from("player_inventory").select("item_id").eq("player_id", currentPlayer.id);
        if (error) throw error;
        // Only count items that still exist in the store (old emoji badges are gone)
        (data || []).forEach(r => { if (itemById(r.item_id)) ownedItems.add(r.item_id); });
    } catch (err) { console.error("Load inventory error:", err); }
}

async function loadScores() {
    bestScores = {};
    playedGames = new Set();
    try {
        const { data, error } = await db.from("game_scores").select("game_name, score")
            .eq("player_id", currentPlayer.id).order("score", { ascending: false }).limit(1000);
        if (error) throw error;
        (data || []).forEach(r => {
            const id = gameIdByName(r.game_name);
            if (!id) return;
            playedGames.add(id);
            if (!(id in bestScores) || r.score > bestScores[id]) bestScores[id] = r.score;
        });
    } catch (err) { console.error("Load scores error:", err); }
}

async function loadMissions() {
    missionDate = todayKey();
    missionState = {};
    MISSIONS.forEach(m => { missionState[m.id] = { progress: 0, claimed: false }; });

    try {
        const { data, error } = await db.from("player_missions")
            .select("mission_id, progress, claimed")
            .eq("player_id", currentPlayer.id).eq("mission_date", missionDate);
        if (error) throw error;
        (data || []).forEach(r => {
            if (missionState[r.mission_id]) {
                missionState[r.mission_id] = { progress: r.progress || 0, claimed: !!r.claimed };
            }
        });
    } catch (err) {
        console.error("Load missions error:", err);
        showNotification("Missions unavailable: " + (err.message || "run the SQL"), "error");
    }
    renderMissions();
}

function loadEquipped(profile) {
    let eq = null;
    if (profile.equipped && typeof profile.equipped === "object") eq = profile.equipped;
    if (!eq || Object.keys(eq).length === 0) {
        try { eq = JSON.parse(localStorage.getItem("gamehub_equipped_" + currentPlayer.username) || "null"); } catch (e) { eq = null; }
    }
    eq = eq || {};
    const ok = id => (id && ownedItems.has(id) && itemById(id)) ? id : null;
    equipped = {
        name: ok(eq.name),
        frame: ok(eq.frame),
        theme: ok(eq.theme),
        badges: Array.isArray(eq.badges)
            ? eq.badges.filter(id => ok(id)).slice(0, MAX_BADGES)
            : []
    };
}

// ==========================================
// 5. SAVING TO SUPABASE
// ==========================================
async function saveProfile() {
    if (!db || !currentPlayer) return false;
    const { error } = await db.from("profiles").update({
        xp: currentPlayer.xp,
        level: currentPlayer.level,
        coins: currentPlayer.coins,
        games_played: currentPlayer.games_played,
        wins: currentPlayer.wins
    }).eq("id", currentPlayer.id);

    if (error) {
        console.error("Save profile error:", error);
        showNotification("Could not save progress: " + error.message, "error");
        return false;
    }
    return true;
}

async function saveEquipped() {
    if (!currentPlayer) return;
    // badgeCount lets the leaderboard show how many badges a player has collected
    const payload = { ...equipped, badgeCount: ownedBadgeCount() };
    try { localStorage.setItem("gamehub_equipped_" + currentPlayer.username, JSON.stringify(payload)); } catch (e) {}
    if (!db) return;
    const { error } = await db.from("profiles").update({ equipped: payload }).eq("id", currentPlayer.id);
    if (error) console.warn("Equipped items not saved to the database (did you run the SQL step?):", error.message);
}

async function saveMissions(ids) {
    if (!db || !currentPlayer || ids.length === 0) return true;
    const rows = ids.map(id => ({
        player_id: currentPlayer.id,
        mission_id: id,
        mission_date: missionDate,
        progress: missionState[id].progress,
        claimed: missionState[id].claimed
    }));
    const { error } = await db.from("player_missions").upsert(rows, { onConflict: "player_id,mission_id,mission_date" });
    if (error) {
        console.error("Save missions error:", error);
        showNotification("Could not save missions: " + error.message, "error");
        return false;
    }
    return true;
}

async function saveGameScore(gameId, score) {
    if (!db || !currentPlayer) return;
    const { error } = await db.from("game_scores").insert([{
        player_id: currentPlayer.id,
        game_name: GAME_LIST[gameId].name,
        score: Math.round(score) || 0
    }]);
    if (error) console.error("Save score error:", error);
}

// ==========================================
// 6. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    if (!currentPlayer) return;
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    setText("ui-username", currentPlayer.username);
    setText("ui-avatar", currentPlayer.username ? currentPlayer.username.charAt(0).toUpperCase() : "P");
    setText("ui-level", currentPlayer.level);
    setText("ui-xp", currentPlayer.xp);
    setText("ui-coins", currentPlayer.coins);

    const bar = document.getElementById("ui-xpbar");
    if (bar) bar.style.width = (currentPlayer.xp % 100) + "%";

    const wallet = document.getElementById("ui-wallet");
    if (wallet && lastCoins !== null && lastCoins !== currentPlayer.coins) {
        wallet.classList.remove("bump");
        void wallet.offsetWidth;
        wallet.classList.add("bump");
    }
    lastCoins = currentPlayer.coins;

    applyCosmetics();
    renderProfile();
}

function applyCosmetics() {
    const nameEl = document.getElementById("ui-username");
    const avatarEl = document.getElementById("ui-avatar");
    const badgeEl = document.getElementById("ui-badge");

    const nameItem = itemById(equipped.name);
    const frameItem = itemById(equipped.frame);
    const themeItem = itemById(equipped.theme);

    if (nameEl) nameEl.className = nameItem ? nameItem.css : "";
    if (avatarEl) avatarEl.className = "avatar" + (frameItem ? " " + frameItem.css : "");
    if (badgeEl) {
        badgeEl.innerHTML = equipped.badges.map(id => itemById(id)).filter(Boolean)
            .map(it => badgeImg(it, "sm")).join("");
    }
    document.body.dataset.theme = themeItem ? themeItem.css : "";
}

function switchTab(targetId, navElement) {
    document.querySelectorAll("main .view-section").forEach(sec => sec.classList.remove("active"));
    const target = document.getElementById(targetId);
    if (target) target.classList.add("active");

    if (navElement) {
        document.querySelectorAll(".nav-item").forEach(nav => nav.classList.remove("active"));
        navElement.classList.add("active");
    }

    if (targetId === "view-leaderboard") loadLeaderboard();
    if (targetId === "view-missions" && currentPlayer && missionDate !== todayKey()) loadMissions();
}

// ----- Games grid -----
function renderGames() {
    const grid = document.getElementById("games-grid");
    if (!grid) return;
    grid.innerHTML = Object.entries(GAME_LIST).map(([id, g], i) => `
        <div class="game-card" data-game="${id}" style="--g1:${g.colors[0]};--g2:${g.colors[1]};animation-delay:${i * 0.25}s">
            <span class="game-emoji">${ico(g.icon)}</span>
            <h4>${escapeHtml(g.name)}</h4>
            <span class="game-tag">${escapeHtml(g.tag)}</span>
            <div class="game-best">${bestScores[id] !== undefined ? ico("star") + " Best: " + bestScores[id] : "Not played yet"}</div>
        </div>`).join("");
}

// ----- Leaderboard -----
function renderLeaderboardTabs() {
    const box = document.getElementById("leaderboard-tabs");
    if (!box) return;
    const tabs = [
        { id: "xp", label: "XP", icon: "star" },
        { id: "wins", label: "Wins", icon: "trophy" },
        ...Object.entries(GAME_LIST).map(([id, g]) => ({ id, label: g.name, icon: g.icon }))
    ];
    box.innerHTML = tabs.map(t =>
        `<button class="chip ${t.id === leaderboardMode ? "active" : ""}" data-mode="${t.id}">${ico(t.icon)} ${escapeHtml(t.label)}</button>`).join("");
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list || !db) return;
    const mode = leaderboardMode;

    try {
        let rows = [];

        if (mode === "xp" || mode === "wins") {
            const query = cols => db.from("profiles").select(cols).order(mode, { ascending: false }).limit(20);
            let res = await query("username, xp, level, wins, equipped");
            if (res.error) res = await query("username, xp, level, wins"); // equipped column missing
            if (res.error) throw res.error;
            rows = (res.data || []).map(p => ({
                name: p.username,
                eq: p.equipped,
                main: mode === "xp" ? `${p.xp || 0} XP` : `${p.wins || 0} wins`,
                sub: `Level ${p.level || 0} • ${mode === "xp" ? (p.wins || 0) + " wins" : (p.xp || 0) + " XP"}`
            }));
        } else {
            const g = GAME_LIST[mode];
            const query = cols => db.from("game_scores").select(cols)
                .eq("game_name", g.name).order("score", { ascending: false }).limit(200);
            let res = await query("score, player_id, profiles(username, equipped)");
            if (res.error) res = await query("score, player_id, profiles(username)");
            if (res.error) throw res.error;
            const seen = new Set();
            (res.data || []).forEach(r => {
                if (seen.has(r.player_id)) return;
                seen.add(r.player_id);
                rows.push({
                    name: (r.profiles && r.profiles.username) || "Unknown",
                    eq: r.profiles && r.profiles.equipped,
                    main: `${r.score} pts`,
                    sub: "Best score"
                });
            });
            rows = rows.slice(0, 20);
        }

        if (mode !== leaderboardMode) return; // user switched tabs while loading

        if (rows.length === 0) {
            list.innerHTML = `<p class="empty-note">No scores yet. Be the first!</p>`;
            return;
        }

        list.innerHTML = rows.map((r, i) => {
            const isMe = currentPlayer && r.name === currentPlayer.username;
            const top = i < 3 ? ` top${i + 1}` : "";
            return `
            <div class="rank-row${top}${isMe ? " me" : ""}">
                <div class="rank-pos">${i < 3 ? rankIcon(i + 1) : "#" + (i + 1)}</div>
                <div class="rank-info">
                    <div class="rank-name"><h4>${escapeHtml(r.name)}</h4>${badgesHtml(r.eq)}</div>
                    <p>${escapeHtml(r.sub)}</p>
                </div>
                <div class="rank-main">${escapeHtml(r.main)}</div>
            </div>`;
        }).join("");
    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = `<p class="empty-note">Could not load rankings.</p>`;
    }
}

// ----- Missions -----
function renderMissions() {
    const list = document.getElementById("missions-list");
    if (!list) return;

    let claimedCount = 0;
    list.innerHTML = MISSIONS.map(m => {
        const st = missionState[m.id] || { progress: 0, claimed: false };
        if (st.claimed) claimedCount++;
        const done = st.progress >= m.target;
        const pct = Math.min(100, Math.round((st.progress / m.target) * 100));

        let action = "";
        if (st.claimed) action = `<button class="btn btn-small btn-owned" style="width:auto;padding:8px 14px;margin:0" disabled>Claimed</button>`;
        else if (done) action = `<button class="btn btn-small btn-claim" style="margin:0" onclick="claimMission('${m.id}')">Claim!</button>`;

        return `
        <div class="mission-card ${st.claimed ? "claimed" : ""} ${done && !st.claimed ? "ready" : ""}">
            <div class="mission-icon">${ico(m.icon)}</div>
            <div class="mission-info">
                <h4>${escapeHtml(m.title)}</h4>
                <p>${Math.min(st.progress, m.target)}/${m.target} Completed</p>
                <div class="mission-bar"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <div class="mission-right">
                <div class="mission-reward">${ico("coin")} ${m.reward}</div>
                ${action}
            </div>
        </div>`;
    }).join("");

    const summary = document.getElementById("missions-summary");
    if (summary) summary.textContent = `${claimedCount}/${MISSIONS.length} claimed today • Resets at midnight`;
}

async function claimMission(id) {
    const def = MISSIONS.find(m => m.id === id);
    const st = missionState[id];
    if (!currentPlayer || !def || !st || st.claimed || st.progress < def.target) return;

    // Mark claimed first so a double tap can't pay out twice
    st.claimed = true;
    currentPlayer.coins += def.reward;
    updateUI();
    renderMissions();

    const saved = await saveMissions([id]);
    if (!saved) {
        st.claimed = false;
        currentPlayer.coins -= def.reward;
        updateUI();
        renderMissions();
        return;
    }

    showNotification(`Mission reward claimed: +${def.reward} Coins`, "success");
    confetti(30);
    await checkAchievements(null); // e.g. Daily Champion
    updateUI();
    renderAchievements();
    await saveProfile();
}

// ----- Achievements + Profile -----
function renderAchievements() {
    const list = document.getElementById("achievements-list");
    if (!list) return;

    list.innerHTML = ACHIEVEMENTS.map(a => {
        const unlocked = unlockedAchievements.has(a.id);
        return unlocked
            ? `<div class="card unlocked"><span class="ach-emoji">${ico(a.icon)}</span><h4>${escapeHtml(a.name)}</h4><p>${escapeHtml(a.desc)}</p><div class="ach-reward">${ico("check")} +${a.reward} ${ico("coin")}</div></div>`
            : `<div class="card locked"><span class="ach-emoji">${ico("lock")}</span><h4>${escapeHtml(a.name)}</h4><p>${escapeHtml(a.desc)}</p><div class="ach-reward">+${a.reward} ${ico("coin")}</div></div>`;
    }).join("");

    const count = document.getElementById("achievements-count");
    if (count) count.textContent = `${unlockedAchievements.size}/${ACHIEVEMENTS.length}`;
}

function renderProfile() {
    const stats = document.getElementById("profile-stats");
    const bests = document.getElementById("profile-bests");
    if (!stats || !bests || !currentPlayer) return;

    const p = currentPlayer;
    const rate = p.games_played ? Math.round((p.wins / p.games_played) * 100) : 0;
    stats.innerHTML = `
        <div class="stat-grid">
            <div class="stat-tile"><b>${p.level}</b><span>LEVEL</span></div>
            <div class="stat-tile"><b>${p.xp}</b><span>TOTAL XP</span></div>
            <div class="stat-tile"><b>${p.coins}</b><span>COINS</span></div>
            <div class="stat-tile"><b>${p.games_played}</b><span>GAMES</span></div>
            <div class="stat-tile"><b>${p.wins}</b><span>WINS</span></div>
            <div class="stat-tile"><b>${rate}%</b><span>WIN RATE</span></div>
        </div>`;

    // Equipped badge showcase
    const showcase = document.getElementById("profile-badges");
    const items = equipped.badges.map(id => itemById(id)).filter(Boolean);
    if (showcase) {
        let html = "";
        for (let i = 0; i < MAX_BADGES; i++) {
            const it = items[i];
            if (it) {
                const t = badgeTier(it.price);
                html += `<div class="showcase-slot">${badgeImg(it, "lg")}<h4>${escapeHtml(it.name)}</h4><span class="tier tier-${t.id}">${t.label}</span></div>`;
            } else {
                html += `<div class="showcase-slot empty">${ico("gem")}<small>Empty slot</small></div>`;
            }
        }
        showcase.innerHTML = html;
    }
    const bc = document.getElementById("badges-count");
    if (bc) bc.textContent = `${items.length}/${MAX_BADGES}`;
    const bt = document.getElementById("badges-total");
    if (bt) bt.textContent = `${ownedBadgeCount()}/${BADGE_ITEMS.length} badges collected. Get more in the Store!`;

    bests.innerHTML = Object.entries(GAME_LIST).map(([id, g]) => `
        <div class="best-row"><span>${ico(g.icon)} ${escapeHtml(g.name)}</span><span>${bestScores[id] !== undefined ? bestScores[id] : "–"}</span></div>`).join("");
}

// ----- Store -----
function previewHtml(it) {
    if (it.slot === "name") return `<div class="store-preview"><span class="${it.css}" style="font-size:1.5rem">Name</span></div>`;
    if (it.slot === "frame") return `<div class="store-preview"><div class="avatar ${it.css}">A</div></div>`;
    return `<div class="store-preview"><div class="theme-swatch" style="background:${it.swatch}"></div></div>`;
}

function badgeCard(it) {
    const owned = ownedItems.has(it.id);
    const isOn = equipped.badges.includes(it.id);
    const t = badgeTier(it.price);
    let btn;
    if (!owned) btn = `<button class="btn btn-small" data-action="buy" data-item="${it.id}">${ico("coin")} ${it.price}</button>`;
    else if (isOn) btn = `<button class="btn btn-small btn-on" data-action="unequip" data-item="${it.id}">Equipped</button>`;
    else btn = `<button class="btn btn-small btn-equip" data-action="equip" data-item="${it.id}">Equip</button>`;
    return `<div class="badge-card ${owned ? "owned" : ""}"><span class="tier tier-${t.id}">${t.label}</span>${badgeImg(it)}<h4>${escapeHtml(it.name)}</h4>${btn}</div>`;
}

function renderStore() {
    const list = document.getElementById("store-list");
    if (!list) return;

    list.innerHTML = STORE_SECTIONS.map(sec => {
        const items = STORE_ITEMS.filter(i => i.slot === sec.slot);
        const pill = sec.slot === "badge" ? `<span class="count-pill">${ownedBadgeCount()}/${items.length}</span>` : "";
        const head = `<h3 class="store-section-title">${ico(sec.icon)} ${sec.title} ${pill}</h3>`;

        if (sec.slot === "badge") {
            return head +
                `<p class="section-sub">Equip up to ${MAX_BADGES}. They show next to your name on the leaderboard.</p>` +
                `<div class="badge-grid">${items.map(badgeCard).join("")}</div>`;
        }

        const cards = items.map(it => {
            const owned = ownedItems.has(it.id);
            const isOn = equipped[it.slot] === it.id;
            let btn;
            if (!owned) btn = `<button class="btn btn-small" data-action="buy" data-item="${it.id}">${ico("coin")} ${it.price}</button>`;
            else if (isOn) btn = `<button class="btn btn-small btn-on" data-action="unequip" data-item="${it.id}">Equipped</button>`;
            else btn = `<button class="btn btn-small btn-equip" data-action="equip" data-item="${it.id}">Equip</button>`;
            return `<div class="store-card ${owned ? "owned" : ""}">${previewHtml(it)}<h4>${escapeHtml(it.name)}</h4>${btn}</div>`;
        }).join("");
        return `${head}<div class="grid-2">${cards}</div>`;
    }).join("");
}

function afterEquipChange() {
    applyCosmetics();
    renderStore();
    renderProfile();
    saveEquipped();
}

function equipItem(id) {
    const it = itemById(id);
    if (!it || !ownedItems.has(id)) return;

    if (it.slot === "badge") {
        if (equipped.badges.includes(id)) return;
        if (equipped.badges.length >= MAX_BADGES) {
            showNotification(`You can equip up to ${MAX_BADGES} badges. Unequip one first.`, "error");
            return;
        }
        equipped.badges.push(id);
    } else {
        equipped[it.slot] = id;
    }

    afterEquipChange();
    showNotification(`Equipped ${it.name}!`, "success");
}

function unequipItem(id) {
    const it = itemById(id);
    if (!it) return;
    if (it.slot === "badge") equipped.badges = equipped.badges.filter(b => b !== id);
    else equipped[it.slot] = null;
    afterEquipChange();
}

async function buyItem(itemId) {
    if (!currentPlayer || buying) return;

    const item = itemById(itemId);
    if (!item) return;
    if (ownedItems.has(itemId)) { showNotification("You already own this item!", "error"); return; }
    if (currentPlayer.coins < item.price) { showNotification("Not enough coins! Play games to earn more.", "error"); return; }

    buying = true;
    try {
        currentPlayer.coins -= item.price;
        const savedCoins = await saveProfile();
        if (!savedCoins) {
            currentPlayer.coins += item.price;
            updateUI();
            return;
        }

        const { error } = await db.from("player_inventory").insert([{ player_id: currentPlayer.id, item_id: itemId }]);
        if (error) {
            console.error("Save purchase error:", error);
            showNotification("Purchase failed: " + error.message, "error");
            currentPlayer.coins += item.price;
            await saveProfile();
            updateUI();
            return;
        }

        ownedItems.add(itemId);
        // auto-equip new purchases (badges only if there is a free slot)
        if (item.slot === "badge") {
            if (equipped.badges.length < MAX_BADGES) equipped.badges.push(itemId);
        } else {
            equipped[item.slot] = itemId;
        }
        showNotification(`Purchased ${item.name}!`, "success");
        confetti(35);
        saveEquipped();

        await checkAchievements(null); // Shopper, Collector
        updateUI();
        renderStore();
        renderAchievements();
        await saveProfile();
    } finally {
        buying = false;
    }
}

// ==========================================
// 7. PLAYING GAMES
// ==========================================
function launchGame(gameId) {
    if (!currentPlayer) {
        showNotification("Enter your name first!", "error");
        showWelcomeModal();
        return;
    }

    const game = GAME_LIST[gameId];
    const overlay = document.getElementById("view-active-game");
    const title = document.getElementById("active-game-title");
    const area = document.getElementById("game-board-area");
    if (!game || !overlay || !area) return;

    if (gameCleanup) { gameCleanup(); gameCleanup = null; }

    overlay.classList.add("active-flex");
    if (title) title.innerHTML = `${ico(game.icon)} ${escapeHtml(game.name)}`;
    area.innerHTML = "";

    currentGameId = gameId;
    gameFinished = false;
    const token = ++runToken;

    gameCleanup = game.start(area, result => {
        if (token !== runToken || gameFinished) return;
        gameFinished = true;
        handleGameEnd(gameId, result);
    }) || null;
}

function closeGame() {
    runToken++; // ignore anything a running game tries to report
    if (gameCleanup) { gameCleanup(); gameCleanup = null; }
    currentGameId = null;
    const overlay = document.getElementById("view-active-game");
    if (overlay) overlay.classList.remove("active-flex");
}

async function handleGameEnd(gameId, result) {
    if (gameCleanup) { gameCleanup(); gameCleanup = null; }
    if (!currentPlayer) return;

    // New day since login? Start fresh missions first.
    if (missionDate !== todayKey()) await loadMissions();

    const game = GAME_LIST[gameId];
    const score = Math.max(0, Math.round(result.score || 0));
    const win = !!result.win;

    // --- Rewards: scale with score, bonus for winning ---
    const ratio = Math.min(1, score / game.scoreMax);
    const xp = Math.round(15 + ratio * 75 + (win ? 20 : 0));
    const coins = Math.round(5 + ratio * 40 + (win ? 15 : 0));

    const prevBest = bestScores[gameId];
    const newBest = score > 0 && (prevBest === undefined || score > prevBest);
    if (newBest) bestScores[gameId] = score;
    playedGames.add(gameId);

    currentPlayer.xp += xp;
    currentPlayer.coins += coins;
    currentPlayer.games_played += 1;
    if (win) currentPlayer.wins += 1;

    let leveledUp = false;
    while (currentPlayer.xp >= (currentPlayer.level + 1) * 100) {
        currentPlayer.level += 1;
        leveledUp = true;
    }

    const ctx = { gameId, score, win, extra: result.extra || {}, xp, coins };

    // --- Mission progress ---
    const changedMissions = [];
    MISSIONS.forEach(m => {
        const st = missionState[m.id];
        if (!st || st.progress >= m.target) return;
        const gain = m.gain(ctx) || 0;
        if (gain <= 0) return;
        st.progress = Math.min(m.target, st.progress + gain);
        changedMissions.push(m.id);
        if (st.progress >= m.target) {
            setTimeout(() => showNotification(`Mission complete: ${m.title}! Claim it in Tasks`, "achievement"), 1500);
        }
    });

    // --- Show the result screen right away ---
    renderResultScreen(gameId, result, score, xp, coins, newBest);
    if (win) confetti(70);
    if (leveledUp) {
        confetti(40);
        setTimeout(() => showNotification(`Level Up! You are now Level ${currentPlayer.level}`, "success"), 600);
    }
    updateUI();
    renderMissions();
    renderGames();

    // --- Achievements (saved before their coins are paid) ---
    await checkAchievements(ctx);
    updateUI();
    renderAchievements();

    // --- Save everything to Supabase ---
    await saveProfile();
    await saveMissions(changedMissions);
    await saveGameScore(gameId, score);
    loadLeaderboard();
}

function renderResultScreen(gameId, result, score, xp, coins, newBest) {
    const area = document.getElementById("game-board-area");
    if (!area) return;
    const win = !!result.win;
    area.innerHTML = `
        <div class="result-card ${win ? "win" : "lose"}">
            <div class="result-emoji">${ico(win ? "trophy" : "skull")}</div>
            <h2>${escapeHtml(result.title || (win ? "Victory!" : "Good try!"))}</h2>
            <p class="result-note">${escapeHtml(result.summary || "")}</p>
            <div class="result-score">${score}<small>SCORE</small></div>
            ${newBest ? `<div class="new-best">${ico("star")} New personal best!</div>` : ""}
            <div class="result-rewards"><span>+${xp} XP</span><span>+${coins} ${ico("coin")}</span></div>
            <button class="btn" id="res-again">Play Again</button>
            <button class="btn btn-ghost" id="res-menu">Back to Arcade</button>
        </div>`;
    document.getElementById("res-again").addEventListener("click", () => launchGame(gameId));
    document.getElementById("res-menu").addEventListener("click", closeGame);
}

// Achievement checks run one at a time so rewards can never double-pay
function checkAchievements(ctx) {
    achChain = achChain.then(() => runAchievementCheck(ctx)).catch(err => console.error(err));
    return achChain;
}

async function runAchievementCheck(ctx) {
    if (!currentPlayer || !db) return;

    const earned = ACHIEVEMENTS.filter(a => !unlockedAchievements.has(a.id) && a.test(ctx));
    if (earned.length === 0) return;

    const rows = earned.map(a => ({ player_id: currentPlayer.id, achievement_id: a.id }));
    const { error } = await db.from("player_achievements")
        .upsert(rows, { onConflict: "player_id,achievement_id", ignoreDuplicates: true });

    if (error) {
        console.error("Save achievements error:", error);
        showNotification("Could not save achievement: " + error.message, "error");
        return;
    }

    earned.forEach((a, i) => {
        unlockedAchievements.add(a.id);
        currentPlayer.coins += a.reward;
        setTimeout(() => {
            showNotification(`Achievement Unlocked: ${a.name}! (+${a.reward} Coins)`, "achievement");
            confetti(25);
        }, 800 + i * 700);
    });
}

// ==========================================
// 8. EFFECTS + NOTIFICATIONS
// ==========================================
function confetti(count = 60) {
    const colors = ["#F472B6", "#FBBF24", "#34D399", "#38BDF8", "#A78BFA", "#FB923C"];
    const wrap = document.createElement("div");
    wrap.className = "confetti";
    for (let i = 0; i < count; i++) {
        const p = document.createElement("i");
        p.style.left = Math.random() * 100 + "%";
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = Math.random() * 0.5 + "s";
        p.style.animationDuration = (1.8 + Math.random() * 1.4) + "s";
        wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3600);
}

function showNotification(message, type = "default") {
    const container = document.getElementById("toast-container");
    if (!container) { alert(message); return; }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "orb";
    if (type === "success") icon = "check";
    if (type === "error") icon = "cross";
    if (type === "achievement") icon = "trophy";

    toast.innerHTML = `<i>${ico(icon)}</i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}