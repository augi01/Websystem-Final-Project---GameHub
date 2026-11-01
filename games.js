// ==========================================
// GAMES. Each game gets (area, finish).
// Call finish({ score, win, title, summary, extra }) when it ends.
// Return a cleanup function that stops any timers.
// Icons come from icons.js: ico("name")
// ==========================================

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function randInt(n) { return Math.floor(Math.random() * n); }

const GAME_LIST = {
    tictactoe:   { name: "Tic-Tac-Toe",   tag: "Strategy",  icon: "cross", colors: ["#F472B6", "#FB7185"], scoreMax: 250,  start: startTicTacToe },
    guessnumber: { name: "Guess Number",  tag: "Logic",     icon: "dice",  colors: ["#38BDF8", "#6366F1"], scoreMax: 550,  start: startGuessNumber },
    matching:    { name: "Matching Cards", tag: "Memory",   icon: "cards", colors: ["#34D399", "#10B981"], scoreMax: 900,  start: startMatching },
    reaction:    { name: "Reaction Rush", tag: "Speed",     icon: "bolt",  colors: ["#FBBF24", "#F97316"], scoreMax: 3000, start: startReaction },
    codebreaker: { name: "Code Breaker",  tag: "Deduction", icon: "key",   colors: ["#A855F7", "#6D28D9"], scoreMax: 700,  start: startCodeBreaker },
    trivia:      { name: "Trivia Blitz",  tag: "Knowledge", icon: "orb",   colors: ["#FB7185", "#E11D48"], scoreMax: 1000, start: startTrivia }
};

// ------------------------------------------
// 1. TIC-TAC-TOE (beat the CPU, fewer moves = more points)
// ------------------------------------------
function startTicTacToe(area, finish) {
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const board = Array(9).fill(null);
    const timers = [];
    let over = false, locked = false, xMoves = 0;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    area.innerHTML = `
        <div class="game-info" id="ttt-status">Your turn ${ico("cross")}</div>
        <div class="ttt-board">
            ${board.map((_, i) => `<button class="ttt-cell" data-i="${i}"></button>`).join("")}
        </div>
        <p class="game-hint">You are ${ico("cross")} Beat the CPU ${ico("ring")} Win in fewer moves for a bigger score!</p>`;

    const status = area.querySelector("#ttt-status");
    const cells = area.querySelectorAll(".ttt-cell");
    cells.forEach((c, i) => c.addEventListener("click", () => play(i)));

    function getWinner() {
        for (const [a, b, c] of LINES) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return { p: board[a], line: [a, b, c] };
        }
        return null;
    }

    function findLineMove(p) {
        for (const line of LINES) {
            const vals = line.map(i => board[i]);
            if (vals.filter(v => v === p).length === 2 && vals.includes(null)) return line[vals.indexOf(null)];
        }
        return -1;
    }

    function cpuMove() {
        const empty = board.map((v, i) => (v ? null : i)).filter(i => i !== null);
        if (Math.random() < 0.3) return empty[randInt(empty.length)]; // CPU sometimes slips up
        let m = findLineMove("O"); if (m >= 0) return m;
        m = findLineMove("X"); if (m >= 0) return m;
        if (!board[4]) return 4;
        const corners = [0, 2, 6, 8].filter(i => !board[i]);
        if (corners.length) return corners[randInt(corners.length)];
        return empty[randInt(empty.length)];
    }

    function place(i, p) {
        board[i] = p;
        cells[i].innerHTML = ico(p === "X" ? "cross" : "ring");
        cells[i].classList.add(p === "X" ? "x" : "o");
        cells[i].disabled = true;
    }

    function end(res) { later(() => finish(res), 1000); return true; }

    function checkEnd() {
        const w = getWinner();
        if (w) {
            over = true;
            w.line.forEach(i => cells[i].classList.add("win"));
            if (w.p === "X") {
                status.innerHTML = "You win!";
                return end({ score: 200 + (5 - xMoves) * 25, win: true, title: "You beat the CPU!", summary: `Won in ${xMoves} moves`, extra: { moves: xMoves, outcome: "win" } });
            }
            status.innerHTML = "CPU wins";
            return end({ score: 0, win: false, title: "The CPU got you!", summary: "Try a different strategy", extra: { moves: xMoves, outcome: "loss" } });
        }
        if (board.every(Boolean)) {
            over = true;
            status.innerHTML = "It's a draw";
            return end({ score: 80, win: false, title: "It's a draw!", summary: "Nobody wins this time", extra: { moves: xMoves, outcome: "draw" } });
        }
        return false;
    }

    function play(i) {
        if (over || locked || board[i]) return;
        xMoves++;
        place(i, "X");
        if (checkEnd()) return;
        locked = true;
        status.innerHTML = "CPU is thinking…";
        later(() => {
            place(cpuMove(), "O");
            locked = false;
            if (!checkEnd()) status.innerHTML = `Your turn ${ico("cross")}`;
        }, 550);
    }

    return () => timers.forEach(clearTimeout);
}

// ------------------------------------------
// 2. GUESS NUMBER (7 tries, fewer tries = more points)
// ------------------------------------------
function startGuessNumber(area, finish) {
    const MAX_TRIES = 7;
    const secret = randInt(100) + 1;
    const timers = [];
    let tries = 0, over = false;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    area.innerHTML = `
        <div class="game-info">I'm thinking of a number from <b>1</b> to <b>100</b></div>
        <div class="hearts" id="gn-hearts"></div>
        <div class="gn-input-row">
            <input id="gn-input" type="number" inputmode="numeric" min="1" max="100" placeholder="?">
            <button class="btn" id="gn-btn">Guess</button>
        </div>
        <div class="gn-feedback" id="gn-feedback">Make your first guess!</div>
        <div class="gn-history" id="gn-history"></div>
        <p class="game-hint">You have ${MAX_TRIES} guesses. The fewer you use, the more points you get!</p>`;

    const input = area.querySelector("#gn-input");
    const feedback = area.querySelector("#gn-feedback");
    const history = area.querySelector("#gn-history");
    const hearts = area.querySelector("#gn-hearts");

    function renderHearts() {
        hearts.innerHTML = ico("heart").repeat(MAX_TRIES - tries) + ico("heartDark").repeat(tries);
    }
    renderHearts();

    function guess() {
        if (over) return;
        const v = parseInt(input.value, 10);
        if (!Number.isInteger(v) || v < 1 || v > 100) {
            feedback.textContent = "Enter a number from 1 to 100";
            feedback.classList.remove("shake");
            void feedback.offsetWidth;
            feedback.classList.add("shake");
            return;
        }
        tries++;
        input.value = "";
        renderHearts();

        if (v === secret) {
            over = true;
            const left = MAX_TRIES - tries;
            feedback.innerHTML = `${ico("check")} ${secret} is right!`;
            later(() => finish({
                score: 100 + left * 75, win: true,
                title: "You cracked it!", summary: `Found ${secret} in ${tries} ${tries === 1 ? "guess" : "guesses"}`,
                extra: { attempts: tries }
            }), 900);
            return;
        }

        const diff = Math.abs(v - secret);
        const heat = diff <= 5 ? `<span class="heat-hot">${ico("fire")} Very hot</span>`
                   : diff <= 15 ? `<span class="heat-warm">Warm</span>`
                   : diff <= 30 ? `<span class="heat-cool">Cool</span>`
                   : `<span class="heat-cold">Cold</span>`;
        const dir = v < secret ? `${ico("arrowup")} Higher` : `${ico("arrowup", "flip")} Lower`;
        feedback.innerHTML = `${dir} · ${heat}`;
        const chip = document.createElement("div");
        chip.className = "gn-chip";
        chip.innerHTML = `${v} ${ico("arrowup", v < secret ? "" : "flip")}`;
        history.prepend(chip);

        if (tries >= MAX_TRIES) {
            over = true;
            feedback.textContent = `Out of guesses! It was ${secret}`;
            later(() => finish({
                score: 0, win: false,
                title: "Out of guesses!", summary: `The number was ${secret}`,
                extra: { attempts: tries }
            }), 1200);
        }
    }

    area.querySelector("#gn-btn").addEventListener("click", guess);
    input.addEventListener("keydown", e => { if (e.key === "Enter") guess(); });
    setTimeout(() => input.focus(), 100);

    return () => timers.forEach(clearTimeout);
}

// ------------------------------------------
// 3. MATCHING CARDS (fewer moves + faster = more points)
// ------------------------------------------
function startMatching(area, finish) {
    const FACES = ["gem", "heart", "star", "bolt", "key", "sword", "crown", "coin"];
    const deck = shuffle([...FACES, ...FACES]);
    const timers = [];
    let first = null, lock = false, moves = 0, matched = 0, seconds = 0, started = false, tick = null;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    area.innerHTML = `
        <div class="mem-stats">
            <span>Moves: <b id="mm-moves">0</b></span>
            <span>Time: <b id="mm-time">0</b>s</span>
            <span>Pairs: <b id="mm-pairs">0</b>/8</span>
        </div>
        <div class="mem-grid">
            ${deck.map((e, i) => `
                <button class="mem-card" data-i="${i}">
                    <span class="mem-face mem-back">?</span>
                    <span class="mem-face mem-front">${ico(e)}</span>
                </button>`).join("")}
        </div>
        <p class="game-hint">Find all 8 pairs. Fewer moves and a faster time give a bigger score!</p>`;

    const cards = area.querySelectorAll(".mem-card");
    const movesEl = area.querySelector("#mm-moves");
    const timeEl = area.querySelector("#mm-time");
    const pairsEl = area.querySelector("#mm-pairs");
    cards.forEach((c, i) => c.addEventListener("click", () => flip(i)));

    function flip(i) {
        const c = cards[i];
        if (lock || c.classList.contains("flipped") || c.classList.contains("matched")) return;

        if (!started) {
            started = true;
            tick = setInterval(() => { seconds++; timeEl.textContent = seconds; }, 1000);
        }
        c.classList.add("flipped");

        if (first === null) { first = i; return; }

        moves++;
        movesEl.textContent = moves;
        const a = first;
        first = null;

        if (deck[a] === deck[i]) {
            cards[a].classList.add("matched");
            c.classList.add("matched");
            matched++;
            pairsEl.textContent = matched;
            if (matched === FACES.length) {
                clearInterval(tick);
                const score = Math.max(100, 1200 - moves * 30 - seconds * 5);
                later(() => finish({
                    score, win: true,
                    title: "All pairs found!", summary: `${moves} moves in ${seconds} seconds`,
                    extra: { moves, seconds }
                }), 800);
            }
        } else {
            lock = true;
            later(() => {
                cards[a].classList.remove("flipped");
                c.classList.remove("flipped");
                lock = false;
            }, 800);
        }
    }

    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
}

// ------------------------------------------
// 4. REACTION RUSH (5 rounds, tap when green)
// ------------------------------------------
function startReaction(area, finish) {
    const ROUNDS = 5;
    const times = [];
    const timers = [];
    let round = 0, state = "idle", goTime = 0, points = 0, goTimer = null;
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    area.innerHTML = `
        <div class="game-info" id="rr-round">Get ready!</div>
        <div class="rr-pad idle" id="rr-pad">
            <div id="rr-main">Tap to start</div>
            <small id="rr-sub">Tap as soon as it turns green</small>
        </div>
        <div class="rr-dots" id="rr-dots"></div>
        <p class="game-hint">5 rounds. Tapping too early scores 0 for that round.</p>`;

    const pad = area.querySelector("#rr-pad");
    const mainEl = area.querySelector("#rr-main");
    const subEl = area.querySelector("#rr-sub");
    const roundEl = area.querySelector("#rr-round");
    const dots = area.querySelector("#rr-dots");

    function setPad(cls, main, sub) {
        pad.className = "rr-pad " + cls;
        mainEl.textContent = main;
        subEl.textContent = sub || "";
    }

    function renderDots() {
        dots.innerHTML = Array.from({ length: ROUNDS }, (_, i) => {
            const t = times[i];
            if (t === undefined) return `<span class="rr-dot"></span>`;
            if (t === null) return `<span class="rr-dot bad">×</span>`;
            return `<span class="rr-dot done">${t}</span>`;
        }).join("");
    }
    renderDots();

    function startRound() {
        round++;
        roundEl.textContent = `Round ${round}/${ROUNDS}`;
        state = "waiting";
        setPad("wait", "Wait for green…", "Don't tap yet!");
        goTimer = later(() => {
            state = "go";
            setPad("go", "TAP NOW!", "");
            goTime = performance.now();
        }, 1200 + randInt(2300));
    }

    function afterRound() {
        if (round >= ROUNDS) later(done, 1500);
        else later(startRound, 1400);
    }

    function done() {
        const valid = times.filter(t => t !== null);
        const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
        const win = valid.length >= 3 && avg !== null && avg < 450;
        finish({
            score: points, win,
            title: win ? "Lightning fast!" : "Round over!",
            summary: avg !== null ? `Average reaction: ${avg} ms` : "Too many false starts",
            extra: { avg, valid: valid.length }
        });
    }

    pad.addEventListener("pointerdown", () => {
        if (state === "idle") { startRound(); return; }

        if (state === "waiting") {
            clearTimeout(goTimer);
            times.push(null);
            renderDots();
            state = "between";
            setPad("between", "Too early!", "That round scores 0");
            afterRound();
            return;
        }

        if (state === "go") {
            const ms = Math.round(performance.now() - goTime);
            times.push(ms);
            points += Math.max(0, Math.round(1000 - ms * 1.5));
            renderDots();
            state = "between";
            setPad("between", `${ms} ms`, ms < 250 ? "Lightning!" : ms < 400 ? "Nice!" : "Keep going");
            afterRound();
        }
    });

    return () => timers.forEach(clearTimeout);
}

// ------------------------------------------
// 5. CODE BREAKER (Mastermind: 4 colors, no repeats, 8 tries)
// ------------------------------------------
function startCodeBreaker(area, finish) {
    const COLORS = [
        { id: "r", c: "#F43F5E" }, { id: "b", c: "#38BDF8" }, { id: "g", c: "#4ADE80" },
        { id: "y", c: "#FACC15" }, { id: "p", c: "#A855F7" }, { id: "o", c: "#FB923C" }
    ];
    const LEN = 4, MAX = 8;
    const secret = shuffle(COLORS.map(c => c.id)).slice(0, LEN);
    const colorOf = id => COLORS.find(c => c.id === id).c;
    const timers = [];
    let guess = Array(LEN).fill(null);
    let attempts = 0, over = false;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    area.innerHTML = `
        <div class="game-info">Crack the secret code in <b>${MAX}</b> tries<br><small class="cb-label">4 colors · no repeats</small></div>
        <div class="cb-current" id="cb-current"></div>
        <div class="cb-palette" id="cb-palette">
            ${COLORS.map(c => `<button class="cb-color" data-c="${c.id}" style="background:${c.c}"></button>`).join("")}
        </div>
        <div class="cb-actions">
            <button class="btn btn-ghost" id="cb-clear">Clear</button>
            <button class="btn" id="cb-submit">Submit</button>
        </div>
        <div class="cb-attempts" id="cb-attempts"></div>
        <p class="game-hint"><span class="fb-dot exact"></span> = right color, right spot · <span class="fb-dot near"></span> = right color, wrong spot</p>
        <div class="cb-history" id="cb-history"></div>`;

    const current = area.querySelector("#cb-current");
    const palette = area.querySelector("#cb-palette");
    const submitBtn = area.querySelector("#cb-submit");
    const attemptsEl = area.querySelector("#cb-attempts");
    const history = area.querySelector("#cb-history");

    function render() {
        current.innerHTML = guess.map((g, i) =>
            g ? `<button class="cb-peg filled" data-slot="${i}" style="background:${colorOf(g)}"></button>`
              : `<button class="cb-peg" data-slot="${i}"></button>`).join("");
        palette.querySelectorAll(".cb-color").forEach(b => b.classList.toggle("used", guess.includes(b.dataset.c)));
        submitBtn.disabled = over || guess.includes(null);
        attemptsEl.textContent = over ? "" : `Try ${attempts + 1} of ${MAX}`;
    }
    render();

    palette.addEventListener("click", e => {
        const b = e.target.closest(".cb-color");
        if (!b || over || guess.includes(b.dataset.c)) return;
        const slot = guess.indexOf(null);
        if (slot === -1) return;
        guess[slot] = b.dataset.c;
        render();
    });

    current.addEventListener("click", e => {
        const p = e.target.closest(".cb-peg");
        if (!p || over) return;
        guess[Number(p.dataset.slot)] = null;
        render();
    });

    area.querySelector("#cb-clear").addEventListener("click", () => {
        if (over) return;
        guess = Array(LEN).fill(null);
        render();
    });

    function addRow(code, exact, near, label) {
        const row = document.createElement("div");
        row.className = "cb-row";
        const dotsHtml = [
            ...Array(exact).fill("exact"),
            ...Array(near).fill("near"),
            ...Array(LEN - exact - near).fill("")
        ].map(k => `<span class="fb-dot ${k}"></span>`).join("");
        row.innerHTML = `
            <div>${label ? `<div class="cb-label">${label}</div>` : ""}
                <div class="cb-row-pegs">${code.map(c => `<span class="cb-mini" style="background:${colorOf(c)}"></span>`).join("")}</div>
            </div>
            <div class="cb-feedback">${dotsHtml}</div>`;
        history.prepend(row);
    }

    submitBtn.addEventListener("click", () => {
        if (over || guess.includes(null)) return;
        attempts++;
        const exact = guess.filter((g, i) => g === secret[i]).length;
        const common = guess.filter(g => secret.includes(g)).length;
        const near = common - exact;
        addRow([...guess], exact, near, `Try ${attempts}`);

        if (exact === LEN) {
            over = true;
            render();
            later(() => finish({
                score: 150 + (MAX - attempts) * 100, win: true,
                title: "Code cracked!", summary: `Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}`,
                extra: { attempts }
            }), 900);
            return;
        }

        if (attempts >= MAX) {
            over = true;
            addRow([...secret], LEN, 0, `${ico("lock")} The secret code`);
            render();
            later(() => finish({
                score: 0, win: false,
                title: "Code locked!", summary: "You ran out of tries",
                extra: { attempts }
            }), 2200);
            return;
        }

        guess = Array(LEN).fill(null);
        render();
    });

    return () => timers.forEach(clearTimeout);
}

// ------------------------------------------
// 6. TRIVIA BLITZ (8 random questions, 15 seconds each, faster = more points)
// ------------------------------------------
const TRIVIA_QUESTIONS = [
    { q: "Which is the largest planet in our solar system?", o: ["Mars", "Jupiter", "Saturn", "Neptune"], a: 1 },
    { q: "How many continents are there?", o: ["5", "6", "7", "8"], a: 2 },
    { q: "What is the capital of Japan?", o: ["Kyoto", "Osaka", "Seoul", "Tokyo"], a: 3 },
    { q: "What is the chemical formula for water?", o: ["CO2", "H2O", "HO", "H2O2"], a: 1 },
    { q: "Which animal is the fastest on land?", o: ["Lion", "Horse", "Cheetah", "Leopard"], a: 2 },
    { q: "Which planet is known as the Red Planet?", o: ["Venus", "Mercury", "Jupiter", "Mars"], a: 3 },
    { q: "How many players are on the field for one soccer team?", o: ["9", "10", "11", "12"], a: 2 },
    { q: "What is the hardest natural substance?", o: ["Gold", "Iron", "Diamond", "Quartz"], a: 2 },
    { q: "What is the capital of the Philippines?", o: ["Cebu", "Manila", "Davao", "Baguio"], a: 1 },
    { q: "Which gas do plants absorb from the air?", o: ["Oxygen", "Nitrogen", "Helium", "Carbon dioxide"], a: 3 },
    { q: "How many sides does a hexagon have?", o: ["5", "6", "7", "8"], a: 1 },
    { q: "Who painted the Mona Lisa?", o: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Van Gogh"], a: 0 },
    { q: "Which is the largest ocean on Earth?", o: ["Atlantic", "Indian", "Pacific", "Arctic"], a: 2 },
    { q: "What is the smallest prime number?", o: ["0", "1", "2", "3"], a: 2 },
    { q: "At sea level, water boils at what temperature in °C?", o: ["90", "100", "110", "120"], a: 1 },
    { q: "What is the capital of Australia?", o: ["Sydney", "Melbourne", "Perth", "Canberra"], a: 3 },
    { q: "Who wrote Romeo and Juliet?", o: ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"], a: 2 },
    { q: "Which metal is liquid at room temperature?", o: ["Mercury", "Iron", "Lead", "Aluminum"], a: 0 },
    { q: "What is 12 × 12?", o: ["124", "132", "144", "148"], a: 2 },
    { q: "Which planet is famous for its bright rings?", o: ["Mars", "Venus", "Saturn", "Mercury"], a: 2 },
    { q: "Which gas do humans need to breathe to live?", o: ["Helium", "Oxygen", "Hydrogen", "Neon"], a: 1 },
    { q: "What is the currency of Japan?", o: ["Won", "Yuan", "Peso", "Yen"], a: 3 },
    { q: "How many bones are in the adult human body?", o: ["186", "206", "256", "300"], a: 1 },
    { q: "Which country gave the Statue of Liberty to the USA?", o: ["England", "Spain", "France", "Italy"], a: 2 },
    { q: "Which is the tallest animal in the world?", o: ["Elephant", "Giraffe", "Camel", "Ostrich"], a: 1 },
    { q: "Which star is closest to Earth?", o: ["Sirius", "Polaris", "Proxima Centauri", "The Sun"], a: 3 },
    { q: "What is the square root of 81?", o: ["7", "8", "9", "11"], a: 2 },
    { q: "Which instrument usually has 88 keys?", o: ["Violin", "Piano", "Guitar", "Flute"], a: 1 },
    { q: "What is the largest mammal?", o: ["African elephant", "Giraffe", "Hippo", "Blue whale"], a: 3 },
    { q: "Which planet is closest to the Sun?", o: ["Venus", "Earth", "Mercury", "Mars"], a: 2 },
    { q: "Who is considered the national hero of the Philippines?", o: ["Andres Bonifacio", "Jose Rizal", "Emilio Aguinaldo", "Ferdinand Magellan"], a: 1 },
    { q: "Which ocean lies east of the Philippines?", o: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3 }
];

function startTrivia(area, finish) {
    const TOTAL = 8, TIME = 15;
    const qs = shuffle(TRIVIA_QUESTIONS).slice(0, TOTAL).map(q => ({
        q: q.q,
        opts: shuffle(q.o.map((t, i) => ({ t, ok: i === q.a })))
    }));
    const timers = [];
    let idx = 0, correct = 0, score = 0, tick = null, answered = false;
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    function showQuestion() {
        answered = false;
        const q = qs[idx];
        area.innerHTML = `
            <div class="tv-top"><span>Question ${idx + 1}/${TOTAL}</span><span>${ico("check")} ${correct}</span><span id="tv-time">${TIME}</span></div>
            <div class="tv-timebar"><div class="tv-timefill" id="tv-fill"></div></div>
            <div class="tv-q">${escapeHtml(q.q)}</div>
            <div class="tv-opts">
                ${q.opts.map((o, i) => `<button class="tv-opt" data-i="${i}">${escapeHtml(o.t)}</button>`).join("")}
            </div>
            <p class="game-hint">Answer fast for bonus points. Get 5 or more right to win!</p>`;

        const fill = area.querySelector("#tv-fill");
        const timeEl = area.querySelector("#tv-time");
        const start = Date.now();

        area.querySelectorAll(".tv-opt").forEach(b =>
            b.addEventListener("click", () => answer(Number(b.dataset.i))));

        clearInterval(tick);
        tick = setInterval(() => {
            const rem = Math.max(0, TIME - (Date.now() - start) / 1000);
            fill.style.width = (rem / TIME) * 100 + "%";
            timeEl.textContent = Math.ceil(rem);
            if (rem <= 0) answer(-1);
        }, 100);
    }

    function answer(i) {
        if (answered) return;
        answered = true;
        clearInterval(tick);

        const q = qs[idx];
        const timeLeft = parseInt(area.querySelector("#tv-time").textContent, 10) || 0;
        const buttons = area.querySelectorAll(".tv-opt");
        buttons.forEach((b, n) => {
            b.disabled = true;
            if (q.opts[n].ok) b.classList.add("correct");
        });

        if (i >= 0 && q.opts[i].ok) {
            correct++;
            score += 100 + timeLeft * 5;
        } else if (i >= 0) {
            buttons[i].classList.add("wrong");
        }

        later(() => {
            idx++;
            if (idx >= TOTAL) {
                finish({
                    score, win: correct >= 5,
                    title: correct >= 5 ? "Trivia champ!" : "Study up!",
                    summary: `${correct}/${TOTAL} correct`,
                    extra: { correct, total: TOTAL }
                });
            } else {
                showQuestion();
            }
        }, 1100);
    }

    showQuestion();
    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
}