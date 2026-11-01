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
// ==========================================
const SAVED_NAME_KEY = "gamehub_username";

const GAMES = {
    tictactoe: "Tic-Tac-Toe",
    guessnumber: "Guess Number"
};

// Daily missions. matches(gameId, isWin) decides if a finished game counts.
const MISSIONS = [
    { id: "play3", title: "Play 3 Games", target: 3, reward: 50,
      matches: (gameId, isWin) => true },
    { id: "win_tictactoe", title: "Win 1 Tic-Tac-Toe", target: 1, reward: 30,
      matches: (gameId, isWin) => isWin && gameId === "tictactoe" }
];

// Achievements. test() returns true once the player has earned it.
const ACHIEVEMENTS = [
    { id: "first_win", name: "First Win", desc: "Win your first game", reward: 50,
      test: () => currentPlayer.wins >= 1 },
    { id: "veteran", name: "Arcade Veteran", desc: "Play 10 games", reward: 100,
      test: () => currentPlayer.games_played >= 10 },
    { id: "rising_star", name: "Rising Star", desc: "Reach Level 3", reward: 150,
      test: () => currentPlayer.level >= 3 },
    { id: "shopper", name: "Shopper", desc: "Buy an item from the store", reward: 25,
      test: () => ownedItems.size >= 1 }
];

const STORE_ITEMS = [
    { id: "neon_red", name: "Neon Red Name", price: 400, color: "#F43F5E" },
    { id: "cyber_frame", name: "Cyber Frame", price: 250, icon: "ph-aperture" }
];

// ==========================================
// 2. STATE
// ==========================================
let currentPlayer = null;
let unlockedAchievements = new Set();
let ownedItems = new Set();
let missionState = {};      // { mission_id: { progress, claimed } }
let missionDate = null;
let currentGameId = null;

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

document.addEventListener("DOMContentLoaded", async () => {
    const input = document.getElementById("username-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") registerNewPlayer();
        });
    }

    renderStore();
    renderAchievements();
    renderMissions();

    let savedName = null;
    try { savedName = localStorage.getItem(SAVED_NAME_KEY); } catch (e) {}

    if (savedName && db) {
        const ok = await loginPlayer(savedName, true);
        if (!ok) showWelcomeModal();
    } else {
        showWelcomeModal();
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
        // Find the player, or create them if new
        const { data: existing, error: selErr } = await db
            .from("profiles")
            .select("*")
            .eq("username", username)
            .maybeSingle();
        if (selErr) throw selErr;

        let profile = existing;
        if (!profile) {
            const { data: created, error: insErr } = await db
                .from("profiles")
                .insert([{ username: username }])
                .select()
                .single();
            if (insErr) throw insErr;
            profile = created;
        }

        currentPlayer = {
            ...profile,
            level: profile.level || 0,
            xp: profile.xp || 0,
            coins: profile.coins || 0,
            games_played: profile.games_played || 0,
            wins: profile.wins || 0
        };

        try { localStorage.setItem(SAVED_NAME_KEY, username); } catch (e) {}

        // Load everything saved for this player
        await Promise.all([loadAchievements(), loadInventory(), loadMissions()]);

        hideWelcomeModal();
        updateUI();
        renderStore();
        renderAchievements();
        renderMissions();
        loadLeaderboard();
        showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");
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

async function loadAchievements() {
    unlockedAchievements = new Set();
    try {
        const { data, error } = await db
            .from("player_achievements")
            .select("achievement_id")
            .eq("player_id", currentPlayer.id);
        if (error) throw error;
        (data || []).forEach(r => unlockedAchievements.add(r.achievement_id));
    } catch (err) {
        console.error("Load achievements error:", err);
    }
}

async function loadInventory() {
    ownedItems = new Set();
    try {
        const { data, error } = await db
            .from("player_inventory")
            .select("item_id")
            .eq("player_id", currentPlayer.id);
        if (error) throw error;
        (data || []).forEach(r => ownedItems.add(r.item_id));
    } catch (err) {
        console.error("Load inventory error:", err);
    }
}

async function loadMissions() {
    missionDate = todayKey();
    missionState = {};
    MISSIONS.forEach(m => { missionState[m.id] = { progress: 0, claimed: false }; });

    try {
        const { data, error } = await db
            .from("player_missions")
            .select("mission_id, progress, claimed")
            .eq("player_id", currentPlayer.id)
            .eq("mission_date", missionDate);
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

// ==========================================
// 5. SAVING TO SUPABASE
// ==========================================
async function saveProfile() {
    if (!db || !currentPlayer) return false;
    const { error } = await db
        .from("profiles")
        .update({
            xp: currentPlayer.xp,
            level: currentPlayer.level,
            coins: currentPlayer.coins,
            games_played: currentPlayer.games_played,
            wins: currentPlayer.wins
        })
        .eq("id", currentPlayer.id);

    if (error) {
        console.error("Save profile error:", error);
        showNotification("Could not save progress: " + error.message, "error");
        return false;
    }
    return true;
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
    const { error } = await db
        .from("player_missions")
        .upsert(rows, { onConflict: "player_id,mission_id,mission_date" });

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
        game_name: GAMES[gameId] || gameId,
        score: Math.round(score) || 0
    }]);
    if (error) console.error("Save score error:", error);
}

// ==========================================
// 6. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    if (!currentPlayer) return;

    const elements = {
        "ui-username": currentPlayer.username,
        "ui-avatar": currentPlayer.username ? currentPlayer.username.charAt(0).toUpperCase() : "P",
        "ui-level": currentPlayer.level,
        "ui-xp": currentPlayer.xp,
        "ui-coins": currentPlayer.coins,
        "stat-games": currentPlayer.games_played,
        "stat-wins": currentPlayer.wins
    };

    for (const [id, val] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    applyCosmetics();
}

function applyCosmetics() {
    const nameEl = document.getElementById("ui-username");
    const avatarEl = document.getElementById("ui-avatar");

    if (nameEl) {
        const neon = ownedItems.has("neon_red");
        nameEl.style.color = neon ? "#F43F5E" : "";
        nameEl.style.textShadow = neon ? "0 0 8px rgba(244, 63, 94, 0.8)" : "";
    }
    if (avatarEl) {
        const frame = ownedItems.has("cyber_frame");
        avatarEl.style.boxShadow = frame ? "0 0 0 3px #13131A, 0 0 14px 3px #10B981" : "";
    }
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
    // New day? Reset the missions.
    if (targetId === "view-missions" && currentPlayer && missionDate !== todayKey()) loadMissions();
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list || !db) return;

    try {
        const { data, error } = await db
            .from("profiles")
            .select("username, xp, level, wins")
            .order("xp", { ascending: false })
            .limit(20);
        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No players yet.</p>`;
            return;
        }

        list.innerHTML = data.map((p, i) => {
            const isMe = currentPlayer && p.username === currentPlayer.username;
            return `
            <div class="mission-card ${isMe ? "me" : ""}">
                <div class="mission-info">
                    <h4>#${i + 1} ${escapeHtml(p.username)}</h4>
                    <p>Level ${p.level || 0} • ${p.wins || 0} wins</p>
                </div>
                <div class="mission-reward">${p.xp || 0} XP</div>
            </div>`;
        }).join("");
    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Could not load rankings.</p>`;
    }
}

// ----- Missions screen -----
function renderMissions() {
    const section = document.getElementById("view-missions");
    if (!section) return;

    const cards = MISSIONS.map(m => {
        const st = missionState[m.id] || { progress: 0, claimed: false };
        const done = st.progress >= m.target;
        const pct = Math.min(100, Math.round((st.progress / m.target) * 100));

        let action;
        if (st.claimed) {
            action = `<button class="btn btn-small btn-owned" disabled>Claimed</button>`;
        } else if (done) {
            action = `<button class="btn btn-small btn-claim" onclick="claimMission('${m.id}')">Claim</button>`;
        } else {
            action = "";
        }

        return `
        <div class="mission-card ${st.claimed ? "claimed" : ""}">
            <div class="mission-info">
                <h4>${escapeHtml(m.title)}</h4>
                <p>${Math.min(st.progress, m.target)}/${m.target} Completed</p>
                <div class="mission-bar"><div class="mission-bar-fill" style="width: ${pct}%;"></div></div>
            </div>
            <div class="mission-right">
                <div class="mission-reward"><i class="ph-fill ph-coin"></i> ${m.reward}</div>
                ${action}
            </div>
        </div>`;
    }).join("");

    section.innerHTML = `<h2 class="section-title">Daily Missions</h2>${cards}`;
}

async function claimMission(id) {
    const def = MISSIONS.find(m => m.id === id);
    const st = missionState[id];
    if (!currentPlayer || !def || !st || st.claimed || st.progress < def.target) return;

    // Mark as claimed right away so a double tap can't pay out twice
    st.claimed = true;
    currentPlayer.coins += def.reward;
    updateUI();
    renderMissions();

    const savedMission = await saveMissions([id]);
    if (!savedMission) {
        // Undo, since the claim never reached the database
        st.claimed = false;
        currentPlayer.coins -= def.reward;
        updateUI();
        renderMissions();
        return;
    }

    showNotification(`Mission reward claimed: +${def.reward} Coins`, "success");
    await saveProfile();
}

// ----- Achievements screen -----
function renderAchievements() {
    const list = document.getElementById("achievements-list");
    if (!list) return;

    list.innerHTML = ACHIEVEMENTS.map(a => {
        const unlocked = unlockedAchievements.has(a.id);
        return unlocked
            ? `<div class="card unlocked">
                   <i class="ph-fill ph-trophy"></i>
                   <h4>${escapeHtml(a.name)}</h4>
                   <p>${escapeHtml(a.desc)}</p>
               </div>`
            : `<div class="card locked">
                   <i class="ph ph-lock"></i>
                   <h4>${escapeHtml(a.name)}</h4>
                   <p>${escapeHtml(a.desc)}</p>
               </div>`;
    }).join("");
}

// ----- Store screen -----
function renderStore() {
    const list = document.getElementById("store-list");
    if (!list) return;

    list.innerHTML = STORE_ITEMS.map(item => {
        const owned = ownedItems.has(item.id);
        const visual = item.color
            ? `<div class="store-icon" style="background: ${item.color};"></div>`
            : `<i class="ph-fill ${item.icon}"></i>`;
        const button = owned
            ? `<button class="btn btn-small btn-owned" disabled>Owned</button>`
            : `<button class="btn btn-small" onclick="buyItem('${item.id}')">${item.price} Coins</button>`;
        return `<div class="card store-item">${visual}<h4>${escapeHtml(item.name)}</h4>${button}</div>`;
    }).join("");
}

// ==========================================
// 7. GAMES
// ==========================================
function launchGame(gameId) {
    if (!currentPlayer) {
        showNotification("Enter your name first!", "error");
        showWelcomeModal();
        return;
    }

    const overlay = document.getElementById("view-active-game");
    const titleElement = document.getElementById("active-game-title");
    const boardArea = document.getElementById("game-board-area");
    if (!overlay || !boardArea) return;

    overlay.classList.add("active-flex");

    if (GAMES[gameId]) {
        currentGameId = gameId;
        if (titleElement) titleElement.textContent = GAMES[gameId];
        boardArea.innerHTML = `
            <div style="text-align: center; width: 100%; max-width: 320px;">
                <p style="margin-bottom: 20px; color: var(--text-muted);">${escapeHtml(GAMES[gameId])} board goes here.</p>
                <button class="btn" style="margin-bottom: 12px;" onclick="awardEndGameRewards(100, true)">Simulate Win (+30 Coins, +50 XP)</button>
                <button class="btn" style="background-color: var(--bg-card);" onclick="awardEndGameRewards(0, false)">Simulate Loss (+10 Coins, +50 XP)</button>
            </div>
        `;
    } else {
        currentGameId = null;
        if (titleElement) titleElement.textContent = "Coming Soon";
        boardArea.innerHTML = `<p style="color: var(--text-muted);">This game is under development.</p>`;
    }
}

function closeGame() {
    currentGameId = null;
    const overlay = document.getElementById("view-active-game");
    if (overlay) overlay.classList.remove("active-flex");
}

// Call this when any game ends: awardEndGameRewards(score, didWin)
async function awardEndGameRewards(score, isWin) {
    if (!currentPlayer || !currentGameId) return;

    const gameId = currentGameId;
    currentGameId = null; // stops double rewards from double taps

    // If the day changed since login, start fresh missions first
    if (missionDate !== todayKey()) await loadMissions();

    // --- Rewards ---
    const xpGained = 50;
    const coinsGained = isWin ? 30 : 10;

    currentPlayer.xp += xpGained;
    currentPlayer.coins += coinsGained;
    currentPlayer.games_played += 1;
    if (isWin) currentPlayer.wins += 1;

    // --- Level up (can level more than once) ---
    let leveledUp = false;
    while (currentPlayer.xp >= (currentPlayer.level + 1) * 100) {
        currentPlayer.level += 1;
        leveledUp = true;
    }

    // --- Mission progress ---
    const changedMissions = [];
    MISSIONS.forEach(m => {
        const st = missionState[m.id];
        if (!st || st.progress >= m.target) return;
        if (m.matches(gameId, isWin)) {
            st.progress += 1;
            changedMissions.push(m.id);
            if (st.progress >= m.target) {
                setTimeout(() => showNotification(`Mission complete: ${m.title}! Claim it in Tasks`, "achievement"), 1400);
            }
        }
    });

    showNotification(`Game Over! +${coinsGained} Coins, +${xpGained} XP`, "success");
    if (leveledUp) {
        setTimeout(() => showNotification(`Level Up! You are now Level ${currentPlayer.level}`, "success"), 700);
    }

    // --- Achievements (saved to the database before rewarding coins) ---
    await checkAchievements();

    // --- Update screen and close the game ---
    updateUI();
    renderMissions();
    renderAchievements();
    closeGame();

    // --- Save everything to Supabase ---
    await saveProfile();
    await saveMissions(changedMissions);
    await saveGameScore(gameId, score);
    loadLeaderboard();
}

async function checkAchievements() {
    if (!currentPlayer) return;

    const earned = ACHIEVEMENTS.filter(a => !unlockedAchievements.has(a.id) && a.test());
    if (earned.length === 0) return;

    const rows = earned.map(a => ({
        player_id: currentPlayer.id,
        achievement_id: a.id
    }));

    const { error } = await db
        .from("player_achievements")
        .upsert(rows, { onConflict: "player_id,achievement_id", ignoreDuplicates: true });

    if (error) {
        console.error("Save achievements error:", error);
        showNotification("Could not save achievement: " + error.message, "error");
        return;
    }

    earned.forEach((a, i) => {
        unlockedAchievements.add(a.id);
        currentPlayer.coins += a.reward;
        setTimeout(() => showNotification(`Achievement Unlocked: ${a.name}! (+${a.reward} Coins)`, "achievement"), 500 + i * 400);
    });
}

// ==========================================
// 8. STORE
// ==========================================
async function buyItem(itemId) {
    if (!currentPlayer) return;

    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return;

    if (ownedItems.has(itemId)) {
        showNotification("You already own this item!", "error");
        return;
    }
    if (currentPlayer.coins < item.price) {
        showNotification("Not enough coins! Play games to earn more.", "error");
        return;
    }

    // Take the coins and save
    currentPlayer.coins -= item.price;
    const savedCoins = await saveProfile();
    if (!savedCoins) {
        currentPlayer.coins += item.price;
        updateUI();
        return;
    }

    // Record the purchase
    const { error } = await db.from("player_inventory").insert([{
        player_id: currentPlayer.id,
        item_id: itemId
    }]);

    if (error) {
        console.error("Save purchase error:", error);
        showNotification("Purchase failed: " + error.message, "error");
        currentPlayer.coins += item.price; // refund
        await saveProfile();
        updateUI();
        return;
    }

    ownedItems.add(itemId);
    showNotification(`Purchased ${item.name}!`, "success");

    await checkAchievements();   // e.g. the "Shopper" achievement
    updateUI();
    renderStore();
    renderAchievements();
    await saveProfile();
}

// ==========================================
// 9. NOTIFICATIONS
// ==========================================
function showNotification(message, type = "default") {
    const container = document.getElementById("toast-container");
    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "ph-info";
    if (type === "success") icon = "ph-check-circle";
    if (type === "error") icon = "ph-warning-circle";
    if (type === "achievement") icon = "ph-trophy";

    toast.innerHTML = `<i class="ph-fill ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}