// ==========================================
// 0. SUPABASE CONNECTION
// ==========================================
const supabaseUrl = 'https://kkwgodtsatrmnvssojxt.supabase.co';
const supabaseKey = 'sb_publishable_h9RjSCZ_8sHwA0RNhp3GOw_kxdoT_gn';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Supabase Client Initialized:", supabase);

// ==========================================
// 0. SUPABASE CONNECTION
// ==========================================
const supabaseUrl = 'https://kkwgodtsatrmnvssojxt.supabase.co';
const supabaseKey = 'sb_publishable_h9RjSCZ_8sHwA0RNhp3GOw_kxdoT_gn';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. STATE
// ==========================================
let currentPlayer = null;

// ==========================================
// 2. LOGIN LOGIC (SUPABASE)
// ==========================================
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');

loginBtn.addEventListener('click', async () => {
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

    // Save data to state and update UI
    currentPlayer = data[0];
    console.log("Player logged in:", currentPlayer);
    
    document.getElementById('welcome-modal').style.display = 'none'; 
    document.getElementById('arcade-menu').classList.remove('hidden'); 
    
    // Update the UI with their name, level, and coins
    document.getElementById('player-name-display').innerText = currentPlayer.username;
    document.getElementById('player-coins-display').innerText = currentPlayer.coins;

    // Give them a nice welcome toast!
    showNotification(`Welcome to the arcade, ${currentPlayer.username}!`, "success");
});

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
        showNotification("Purchased item successfully!", "success");
        // TODO: Supabase Update -> updatePlayerInventory(currentPlayer.id, itemId)
    } else {
        showNotification("Not enough coins! Play games to earn more.", "error");
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