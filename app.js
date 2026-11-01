// ==========================================
// 0. FAIL-SAFE SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = 'https://kkwgodtsatrmnvssojxt.supabase.co';
const supabaseKey = 'sb_publishable_h9RjSCZ_8sHwA0RNhp3GOw_kxdoT_gn';
let supabase = null;

// Initialize safely without crashing if CDN is slow
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log("Supabase Client Initialized:", supabase);
    } else {
        console.error("Supabase SDK missing from HTML!");
    }
} catch (err) {
    console.error("Supabase Initialization Error:", err);
}

// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
let currentPlayer = null;

// Run the moment the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // FORCE-HIDE all common loading screen IDs and classes
    const loaderIDs = ["preloader", "loading-screen", "loader", "loading", "page-loader", "spinner"];
    loaderIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    document.querySelectorAll(".preloader, .loader, .loading-overlay, .loader-wrapper").forEach(el => {
        el.style.display = "none";
    });

    // Force display the Welcome Modal
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) {
        welcomeModal.style.display = "flex";
        welcomeModal.classList.remove("hidden");
    }
});

// ==========================================
// 2. LOGIN LOGIC (SUPABASE)
// ==========================================
async function registerNewPlayer() {
    const usernameInput = document.getElementById("username-input");
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification("Please enter a username!", "error");
        return;
    }

    if (!supabase) {
        showNotification("Database connection unavailable.", "error");
        return;
    }

    try {
        // Insert or fetch the player from Supabase
        const { data, error } = await supabase
            .from('profiles')
            .upsert([
                { username: username }
            ], { onConflict: 'username' })
            .select();

        if (error) throw error;

        // Save data to state
        currentPlayer = data[0];
        console.log("Player logged in:", currentPlayer);
        
        // Hide modal and display menu
        const welcomeModal = document.getElementById("welcome-modal");
        if (welcomeModal) welcomeModal.style.display = "none";
        
        const arcadeMenu = document.getElementById('arcade-menu');
        if (arcadeMenu) arcadeMenu.classList.remove('hidden'); 
        
        updateUI();
        showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");
    } catch (error) {
        console.error("Database Error:", error);
        showNotification("Could not connect to the database.", "error");
    }
}

// ==========================================
// 3. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    if (!currentPlayer) return;

    // Safely update Header / Profile data
    const elements = {
        "ui-username": currentPlayer.username,
        "ui-avatar": currentPlayer.username ? currentPlayer.username.charAt(0).toUpperCase() : "P",
        "ui-level": currentPlayer.level || 0,
        "ui-xp": currentPlayer.xp || 0,
        "ui-coins": currentPlayer.coins || 0,
        "player-name-display": currentPlayer.username,
        "player-coins-display": currentPlayer.coins || 0,
        "stat-games": currentPlayer.gamesPlayed || 0,
        "stat-wins": currentPlayer.wins || 0
    };

    for (const [id, val] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}

function switchTab(targetId, navElement) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');

    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        navElement.classList.add('active');
    }
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
        alert(message); // Fallback if toast container isn't in HTML
        return;
    }
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "ph-info";
    if (type === "success") icon = "ph-check-circle";
    if (type === "error") icon = "ph-warning-circle";
    if (type === "achievement") icon = "ph-trophy";

    toast.innerHTML = `<i class="ph-fill ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}