// ==========================================
// 0. SUPABASE CONNECTION
// ==========================================
const supabaseUrl = 'https://kkwgodtsatrmnvssojxt.supabase.co';
const supabaseKey = 'sb_publishable_h9RjSCZ_8sHwA0RNhp3GOw_kxdoT_gn';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase Client Initialized:", supabase);

// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
let currentPlayer = null;

// Run this the moment the page loads!
document.addEventListener("DOMContentLoaded", () => {
    // Hide loading screens if you have them
    const preloader = document.getElementById("preloader"); 
    if (preloader) preloader.style.display = "none";
    
    const loadingScreen = document.getElementById("loading-screen"); 
    if (loadingScreen) loadingScreen.style.display = "none";

    // Show the welcome modal so the player can log in
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.style.display = "flex";
});

// ==========================================
// 2. LOGIN LOGIC (SUPABASE)
// ==========================================
// This matches the onclick="registerNewPlayer()" button in your HTML!
async function registerNewPlayer() {
    const usernameInput = document.getElementById("username-input");
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification("Please enter a username!", "error");
        return;
    }

    // Insert or fetch the player from Supabase
    const { data, error } = await supabase
        .from('profiles')
        .upsert([
            { username: username }
        ], { onConflict: 'username' })
        .select();

    if (error) {
        console.error("Database Error:", error);
        showNotification("Could not connect to the database.", "error");
        return;
    }

    // Save data to state
    currentPlayer = data[0];
    console.log("Player logged in:", currentPlayer);
    
    // Hide the welcome modal and show the arcade
    document.getElementById("welcome-modal").style.display = "none";
    
    const arcadeMenu = document.getElementById('arcade-menu');
    if (arcadeMenu) arcadeMenu.classList.remove('hidden'); 
    
    // Update the UI with their actual stats from the database
    updateUI();

    // Welcome toast!
    showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");
}

// ==========================================
// 3. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    // Safely update Header / Profile data
    const uiUsername = document.getElementById("ui-username");
    const uiAvatar = document.getElementById("ui-avatar");
    const uiLevel = document.getElementById("ui-level");
    const uiXp = document.getElementById("ui-xp");
    const uiCoins = document.getElementById("ui-coins");
    
    if (uiUsername) uiUsername.textContent = currentPlayer.username;
    if (uiAvatar) uiAvatar.textContent = currentPlayer.username.charAt(0).toUpperCase();
    if (uiLevel) uiLevel.textContent = currentPlayer.level || 0;
    if (uiXp) uiXp.textContent = currentPlayer.xp || 0;
    if (uiCoins) uiCoins.textContent = currentPlayer.coins || 0;

    // Check alternative ID names just in case
    const playerNameDisplay = document.getElementById('player-name-display');
    const playerCoinsDisplay = document.getElementById('player-coins-display');
    if (playerNameDisplay) playerNameDisplay.innerText = currentPlayer.username;
    if (playerCoinsDisplay) playerCoinsDisplay.innerText = currentPlayer.coins || 0;

    // Update Profile Page Stats
    const statGames = document.getElementById("stat-games");
    const statWins = document.getElementById("stat-wins");
    if (statGames) statGames.textContent = currentPlayer.gamesPlayed || 0;
    if (statWins) statWins.textContent = currentPlayer.wins || 0;
}

function switchTab(targetId, navElement) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.remove('active');
    });
    // Show target section
    document.getElementById(targetId).classList.add('active');

    // Update active nav styling
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    navElement.classList.add('active');
}

// ==========================================
// 4. GAME & ECONOMY LOGIC
// ==========================================
function launchGame(gameId) {
    // Hide main hub by activating the full-screen game overlay
    document.getElementById("view-active-game").classList.add("active-flex");
    
    let titleElement = document.getElementById("active-game-title");
    let boardArea = document.getElementById("game-board-area");

    // Clear previous game content
    boardArea.innerHTML = ""; 

    // Inject the selected game
    if (gameId === 'tictactoe') {
        titleElement.textContent = "Tic-Tac-Toe";
        boardArea.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 20px; color: var(--text-muted);">Tic-Tac-Toe board goes here.</p>
                <button class="btn" onclick="awardEndGameRewards(100, true)">Simulate Win (+30 Coins, +50 XP)</button>
            </div>
        `;
    } 
    else if (gameId === 'guessnumber') {
        titleElement.textContent = "Guess Number";
        boardArea.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 20px; color: var(--text-muted);">Guess Number logic goes here.</p>
                <button class="btn" onclick="awardEndGameRewards(80, true)">Simulate Win (+30 Coins, +50 XP)</button>
            </div>
        `;
    }
    else {
        titleElement.textContent = "Coming Soon";
        boardArea.innerHTML = `<p style="color: var(--text-muted);">This game is under development.</p>`;
    }
}

function closeGame() {
    // Hide the game overlay to reveal the hub again
    document.getElementById("view-active-game").classList.remove("active-flex");
}

function buyItem(itemId, price) {
    if (currentPlayer.coins >= price) {
        currentPlayer.coins -= price;
        updateUI();
        showNotification("Purchased item successfully!", "success");
        // TODO: Supabase Update -> updatePlayerInventory(currentPlayer.id, itemId)
    } else {
        showNotification("Not enough coins! Play games to earn more.", "error");
    }
}

function awardEndGameRewards(score, isWin) {
    let xpGained = 50;
    let coinsGained = isWin ? 30 : 10;
    
    // Ensure stats exist before adding (prevents 'NaN' bugs)
    currentPlayer.xp = (currentPlayer.xp || 0) + xpGained;
    currentPlayer.coins = (currentPlayer.coins || 0) + coinsGained;
    currentPlayer.gamesPlayed = (currentPlayer.gamesPlayed || 0) + 1;
    if(isWin) currentPlayer.wins = (currentPlayer.wins || 0) + 1;

    showNotification(`Game Over! +${coinsGained} Coins, +${xpGained} XP`, "success");
    
    // --- ACHIEVEMENT CHECKS ---
    checkAchievements();

    // Level up logic
    let xpNeeded = ((currentPlayer.level || 0) + 1) * 100;
    if (currentPlayer.xp >= xpNeeded) {
        currentPlayer.level = (currentPlayer.level || 0) + 1;
        setTimeout(() => showNotification(`Level Up! You are now Level ${currentPlayer.level}`, "success"), 1000);
    }
    
    updateUI();
    closeGame();
    
    // TODO: Supabase Update -> pushScoreAndRewardsToSupabase(...)
}

function checkAchievements() {
    // Safety check just in case achievements array doesn't exist yet
    if (!currentPlayer.achievements) currentPlayer.achievements = [];

    // Check First Win
    if (currentPlayer.wins === 1 && !currentPlayer.achievements.includes("first_win")) {
        currentPlayer.achievements.push("first_win");
        currentPlayer.coins += 50; 
        setTimeout(() => showNotification("Achievement Unlocked: First Win! (+50 Coins)", "achievement"), 500);
    }
    
    // Check Arcade Veteran (10 games played)
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
    if (!container) return; // Prevent crashes if HTML is missing
    
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    // Assign icon based on type
    let icon = "ph-info";
    if (type === "success") icon = "ph-check-circle";
    if (type === "error") icon = "ph-warning-circle";
    if (type === "achievement") icon = "ph-trophy";

    toast.innerHTML = `<i class="ph-fill ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);

    // Remove from DOM after animation completes (3 seconds)
    setTimeout(() => {
        toast.remove();
    }, 3000);
}