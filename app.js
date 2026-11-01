// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
let currentPlayer = {
    id: null,
    username: "",
    level: 0,
    xp: 0,
    coins: 0,
    gamesPlayed: 0,
    wins: 0,
    achievements: [] // Array of unlocked achievement IDs
};

// Run immediately when the script loads
document.addEventListener("DOMContentLoaded", () => {
    authenticateDevice();
});

// ==========================================
// 2. DEVICE AUTHENTICATION LOGIC
// ==========================================
function authenticateDevice() {
    let savedId = localStorage.getItem("gamehub_player_id");
    let savedName = localStorage.getItem("gamehub_username");

    if (savedId && savedName) {
        // Returning player
        console.log("Welcome back! Device ID:", savedId);
        currentPlayer.id = savedId;
        currentPlayer.username = savedName;
        
        // Temporary local simulation for returning user stats until Supabase is linked:
        simulateDataLoad(); 
    } else {
        // New player / new device: Show the Welcome Modal
        console.log("New device detected. Prompting for username.");
        document.getElementById("welcome-modal").style.display = "flex";
    }
}

function registerNewPlayer() {
    let inputName = document.getElementById("username-input").value.trim();
    
    if (inputName.length < 3) {
        alert("Name must be at least 3 characters.");
        return;
    }

    // Generate unique ID and save permanently to the phone's browser
    let newId = crypto.randomUUID(); 
    localStorage.setItem("gamehub_player_id", newId);
    localStorage.setItem("gamehub_username", inputName);

    // Update current state
    currentPlayer.id = newId;
    currentPlayer.username = inputName;
    currentPlayer.level = 0;
    currentPlayer.xp = 0;
    currentPlayer.coins = 0;
    currentPlayer.gamesPlayed = 0;
    currentPlayer.wins = 0;

    // Hide Modal and Update UI
    document.getElementById("welcome-modal").style.display = "none";
    updateUI();
    
    // TODO: Supabase Insert -> createNewPlayerInSupabase(newId, inputName)
}

// ==========================================
// 3. UI UPDATES & NAVIGATION
// ==========================================
function updateUI() {
    // Update Header
    document.getElementById("ui-username").textContent = currentPlayer.username;
    document.getElementById("ui-avatar").textContent = currentPlayer.username.charAt(0).toUpperCase();
    document.getElementById("ui-level").textContent = currentPlayer.level;
    document.getElementById("ui-xp").textContent = currentPlayer.xp;
    document.getElementById("ui-coins").textContent = currentPlayer.coins;

    // Update Profile Page Stats
    document.getElementById("stat-games").textContent = currentPlayer.gamesPlayed;
    document.getElementById("stat-wins").textContent = currentPlayer.wins;
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
        alert("Purchased item successfully!");
        // TODO: Supabase Update -> updatePlayerInventory(currentPlayer.id, itemId)
    } else {
        alert("Not enough coins! Play games to earn more.");
    }
}

function awardEndGameRewards(score, isWin) {
    let xpGained = 50;
    let coinsGained = isWin ? 30 : 10;
    
    currentPlayer.xp += xpGained;
    currentPlayer.coins += coinsGained;
    currentPlayer.gamesPlayed += 1;
    if(isWin) currentPlayer.wins += 1;

    showNotification(`Game Over! +${coinsGained} Coins, +${xpGained} XP`, "success");
    
    // --- ACHIEVEMENT CHECKS ---
    checkAchievements();

    // Level up logic
    let xpNeeded = (currentPlayer.level + 1) * 100;
    if (currentPlayer.xp >= xpNeeded) {
        currentPlayer.level += 1;
        setTimeout(() => showNotification(`Level Up! You are now Level ${currentPlayer.level}`, "success"), 1000);
    }
    
    updateUI();
    closeGame();
}

function checkAchievements() {
    // Check First Win
    if (currentPlayer.wins === 1 && !currentPlayer.achievements.includes("first_win")) {
        currentPlayer.achievements.push("first_win");
        currentPlayer.coins += 50; // Bonus for achievement
        setTimeout(() => showNotification("Achievement Unlocked: First Win! (+50 Coins)", "achievement"), 500);
    }
    
    // Check Arcade Veteran (10 games played)
    if (currentPlayer.gamesPlayed === 10 && !currentPlayer.achievements.includes("veteran")) {
        currentPlayer.achievements.push("veteran");
        currentPlayer.coins += 100;
        setTimeout(() => showNotification("Achievement Unlocked: Arcade Veteran! (+100 Coins)", "achievement"), 500);
    }
}
    
    // TODO: Supabase Update -> pushScoreAndRewardsToSupabase(...)

// Temporary function to mock database load for returning players
function simulateDataLoad() {
    // Keeps their actual device username, but mocks the stats for testing the UI
    currentPlayer.level = 2;
    currentPlayer.xp = 150;
    currentPlayer.coins = 420;
    currentPlayer.gamesPlayed = 12;
    currentPlayer.wins = 5;
    updateUI();
}

// ==========================================
// 5. CUSTOM NOTIFICATIONS
// ==========================================
function showNotification(message, type = "default") {
    const container = document.getElementById("toast-container");
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