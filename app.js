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
// 1. STATE & INITIALIZATION
// ==========================================
let currentPlayer = null;
const SAVED_NAME_KEY = "gamehub_username";

function showWelcomeModal() {
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.style.display = "flex";
}

function hideWelcomeModal() {
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    // Press Enter to submit the name
    const input = document.getElementById("username-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") registerNewPlayer();
        });
    }

    // Returning player on this device? Log them in automatically.
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
// 2. LOGIN LOGIC (SUPABASE)
// ==========================================
async function loginPlayer(username, silent = false) {
    if (!db) {
        if (!silent) showNotification("Database connection unavailable.", "error");
        return false;
    }

    try {
        const { data, error } = await db
            .from('profiles')
            .upsert([{ username: username }], { onConflict: 'username' })
            .select();

        if (error) throw error;
        if (!data || !data[0]) throw new Error("No profile returned");

        currentPlayer = data[0];
        console.log("Player logged in:", currentPlayer);

        try { localStorage.setItem(SAVED_NAME_KEY, username); } catch (e) {}

        hideWelcomeModal();
        updateUI();
        loadLeaderboard();
        showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");
        return true;
    } catch (error) {
        console.error("Database Error:", error);
        if (!silent) showNotification("Could not connect to the database.", "error");
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

// ==========================================
// 3. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    if (!currentPlayer) return;

    const elements = {
        "ui-username": currentPlayer.username,
        "ui-avatar": currentPlayer.username ? currentPlayer.username.charAt(0).toUpperCase() : "P",
        "ui-level": currentPlayer.level || 0,
        "ui-xp": currentPlayer.xp || 0,
        "ui-coins": currentPlayer.coins || 0,
        "stat-games": currentPlayer.gamesPlayed || 0,
        "stat-wins": currentPlayer.wins || 0
    };

    for (const [id, val] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}

function switchTab(targetId, navElement) {
    document.querySelectorAll('main .view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');

    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        navElement.classList.add('active');
    }

    if (targetId === 'view-leaderboard') loadLeaderboard();
}

async function loadLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list || !db) return;

    try {
        const { data, error } = await db
            .from('profiles')
            .select('username, xp, level')
            .order('xp', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No players yet.</p>`;
            return;
        }

        list.innerHTML = data.map((p, i) => `
            <div class="mission-card">
                <div class="mission-info">
                    <h4>#${i + 1} ${escapeHtml(p.username)}</h4>
                    <p>Level ${p.level || 0}</p>
                </div>
                <div class="mission-reward">${p.xp || 0} XP</div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Leaderboard error:", err);
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Could not load rankings.</p>`;
    }
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

// ==========================================
// 4. GAME & ECONOMY LOGIC
// ==========================================
function launchGame(gameId) {
    const gameOverlay = document.getElementById("view-active-game");
    if (gameOverlay) gameOverlay.classList.add("active-flex");

    let titleElement = document.getElementById("active-game-title");
    let boardArea = document.getElementById("game-board-area");
    if (!boardArea) return;

    boardArea.innerHTML = "";

    if (gameId === 'tictactoe') {
        if (titleElement) titleElement.textContent = "Tic-Tac-Toe";
        boardArea.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 20px; color: var(--text-muted);">Tic-Tac-Toe board goes here.</p>
                <button class="btn" onclick="awardEndGameRewards(100, true)">Simulate Win (+30 Coins, +50 XP)</button>
            </div>
        `;
    }
    else if (gameId === 'guessnumber') {
        if (titleElement) titleElement.textContent = "Guess Number";
        boardArea.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 20px; color: var(--text-muted);">Guess Number logic goes here.</p>
                <button class="btn" onclick="awardEndGameRewards(80, true)">Simulate Win (+30 Coins, +50 XP)</button>
            </div>
        `;
    }
    else {
        if (titleElement) titleElement.textContent = "Coming Soon";
        boardArea.innerHTML = `<p style="color: var(--text-muted);">This game is under development.</p>`;
    }
}

function closeGame() {
    const gameOverlay = document.getElementById("view-active-game");
    if (gameOverlay) gameOverlay.classList.remove("active-flex");
}

function buyItem(itemId, price) {
    if (!currentPlayer) return;
    if ((currentPlayer.coins || 0) >= price) {
        currentPlayer.coins -= price;
        updateUI();
        showNotification("Purchased item successfully!", "success");
    } else {
        showNotification("Not enough coins! Play games to earn more.", "error");
    }
}

function awardEndGameRewards(score, isWin) {
    if (!currentPlayer) return;
    let xpGained = 50;
    let coinsGained = isWin ? 30 : 10;

    currentPlayer.xp = (currentPlayer.xp || 0) + xpGained;
    currentPlayer.coins = (currentPlayer.coins || 0) + coinsGained;
    currentPlayer.gamesPlayed = (currentPlayer.gamesPlayed || 0) + 1;
    if (isWin) currentPlayer.wins = (currentPlayer.wins || 0) + 1;

    showNotification(`Game Over! +${coinsGained} Coins, +${xpGained} XP`, "success");

    checkAchievements();

    let xpNeeded = ((currentPlayer.level || 0) + 1) * 100;
    if (currentPlayer.xp >= xpNeeded) {
        currentPlayer.level = (currentPlayer.level || 0) + 1;
        setTimeout(() => showNotification(`Level Up! You are now Level ${currentPlayer.level}`, "success"), 1000);
    }

    updateUI();
    closeGame();
}

function checkAchievements() {
    if (!currentPlayer) return;
    if (!currentPlayer.achievements) currentPlayer.achievements = [];

    if (currentPlayer.wins === 1 && !currentPlayer.achievements.includes("first_win")) {
        currentPlayer.achievements.push("first_win");
        currentPlayer.coins += 50;
        setTimeout(() => showNotification("Achievement Unlocked: First Win! (+50 Coins)", "achievement"), 500);
    }

    if (currentPlayer.gamesPlayed === 10 && !currentPlayer.achievements.includes("veteran")) {
        currentPlayer.achievements.push("veteran");
        currentPlayer.coins += 100;
        setTimeout(() => showNotification("Achievement Unlocked: Arcade Veteran! (+100 Coins)", "achievement"), 500);
    }
}

// ==========================================
// 5. CUSTOM NOTIFICATIONS
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