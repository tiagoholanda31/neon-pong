/**
 * Modern Neon Pong
 * Features: Particle system, screen shake, neon aesthetics, 2-player mode, coin-flip serve, timer
 */

// --- Configuration ---
const CONFIG = {
    canvasWidth: 1100,
    canvasHeight: 750,
    paddleWidth: 18,
    paddleHeight: 160,
    ballSize: 15,
    ballSpeed: 5,
    paddleSpeed: 8,
    gameDuration: 180, // 3 minutes in seconds
    aiServeDelay: 1200,
    colors: {
        player: '#00f3ff',
        ai: '#ff00ff',
        ball: '#ffffff',
        background: '#050505'
    }
};

// --- Game State ---
const state = {
    running: false,
    gameOver: false,
    twoPlayer: false,
    score: { player: 0, ai: 0 },
    screenShake: 0,
    // Serve system
    serving: false,
    server: 'player',
    coinFlipActive: false,
    coinFlipTimer: null,
    aiServeTimer: null,
    scoringPause: false, // prevents multiple scores per frame
    // Timer
    timeRemaining: CONFIG.gameDuration,
    timerInterval: null,
    paused: false // Add paused state
};

// --- Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const modeScreen = document.getElementById('modeScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const winnerText = document.getElementById('winnerText');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownTextEl = document.getElementById('countdownText');
const coinFlipTextEl = document.getElementById('coinFlipText');
const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');
const coinButton = document.getElementById('coinButton');
const timerEl = document.getElementById('timerDisplay');
const menuBtn = document.getElementById('menuButton');
const pauseMenu = document.getElementById('pauseMenu');
const btnResume = document.getElementById('btnResume');
const btnQuit = document.getElementById('btnQuit');
const introOverlay = document.getElementById('introOverlay');
const bgMusic = document.getElementById('bgMusic');

// --- Audio Configuration ---
const VOL_INTRO = 0.5;
const VOL_GAME = 0.2;
bgMusic.volume = VOL_INTRO;


// --- Classes ---

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Particle {
    constructor(x, y, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        this.size = Math.random() * 5 + 2;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.life -= this.decay;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
        ctx.restore();
    }
}

class Entity {
    constructor(x, y, width, height, color) {
        this.pos = new Vector(x, y);
        this.size = new Vector(width, height);
        this.vel = new Vector(0, 0);
        this.color = color;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, this.size.x, this.size.y);
        ctx.shadowBlur = 0;
    }

    update() {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
    }
}

class Paddle extends Entity {
    constructor(x, y, color) {
        super(x, y, CONFIG.paddleWidth, CONFIG.paddleHeight, color);
        this.speed = CONFIG.paddleSpeed;
        this.borderRadius = 8;
    }

    reset(x, y) {
        this.pos.x = x;
        this.pos.y = y;
    }

    constrain() {
        if (this.pos.y < 0) this.pos.y = 0;
        if (this.pos.y + this.size.y > canvas.height) this.pos.y = canvas.height - this.size.y;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.roundRect(this.pos.x, this.pos.y, this.size.x, this.size.y, this.borderRadius);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Ball extends Entity {
    constructor() {
        super(canvas.width / 2, canvas.height / 2, CONFIG.ballSize, CONFIG.ballSize, CONFIG.colors.ball);
        this.trail = [];
        this.frozen = true;
        this.attachedTo = null;
        this.attachSide = 1;
    }

    attachToPaddle(paddle, side) {
        this.frozen = true;
        this.vel.x = 0;
        this.vel.y = 0;
        this.attachedTo = paddle;
        this.attachSide = side;
        this.trail = [];
    }

    launch() {
        if (!this.attachedTo) return;
        this.frozen = false;
        this.vel.x = this.attachSide * CONFIG.ballSpeed;
        this.vel.y = (Math.random() * 2 - 1) * CONFIG.ballSpeed * 0.4;
        this.attachedTo = null;
    }

    freeze() {
        this.frozen = true;
        this.vel.x = 0;
        this.vel.y = 0;
        this.attachedTo = null;
        this.trail = [];
    }

    update() {
        if (this.attachedTo) {
            const paddle = this.attachedTo;
            if (this.attachSide === 1) {
                this.pos.x = paddle.pos.x + paddle.size.x + 4;
            } else {
                this.pos.x = paddle.pos.x - this.size.x - 4;
            }
            this.pos.y = paddle.pos.y + paddle.size.y / 2 - this.size.y / 2;
            return;
        }

        if (this.frozen) return;
        super.update();
        this.trail.push({ x: this.pos.x, y: this.pos.y });
        if (this.trail.length > 10) this.trail.shift();
    }

    draw(ctx) {
        // Neon Yellow Trail
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ccff00';
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const opacity = (i / this.trail.length) * 0.8; // More opaque
            ctx.fillStyle = `rgba(204, 255, 0, ${opacity})`; // #ccff00

            // Round and larger trail
            const trailSize = this.size.x * 1.1; // 10% larger
            const trailRadius = trailSize / 2;
            const centerX = t.x + this.size.x / 2;
            const centerY = t.y + this.size.y / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, trailRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // White Ball
        ctx.beginPath();
        ctx.arc(this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, this.size.x / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (state.muted) return; // Don't play if muted

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'wall') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'score') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'coinflip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'coinresult') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'serve') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'timewarning') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'gameover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc.start(); osc.stop(audioCtx.currentTime + 0.8);
    }
}

// --- Mute Functionality ---
const muteBtn = document.getElementById('muteBtn');

function toggleMute() {
    state.muted = !state.muted;

    if (state.muted) {
        if (bgMusic) bgMusic.muted = true;
        muteBtn.innerText = "SOM: OFF 🔇";
        muteBtn.classList.add('muted');
    } else {
        if (bgMusic) bgMusic.muted = false;
        muteBtn.innerText = "SOM: ON 🔊";
        muteBtn.classList.remove('muted');
    }
}

muteBtn.addEventListener('click', toggleMute);

// --- Initialization ---
const player = new Paddle(10, 0, CONFIG.colors.player);
const ai = new Paddle(0, 0, CONFIG.colors.ai);
const ball = new Ball();
let particles = [];

const input = { up: false, down: false, y: null, launch: false };
const input2 = { up: false, down: false, y: null, launch: false };

// --- Touch Device Detection ---
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function resize() {
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;

    ai.pos.x = canvas.width - CONFIG.paddleWidth - 10;
    ai.pos.y = canvas.height / 2 - CONFIG.paddleHeight / 2;

    player.pos.x = 10;
    if (!state.running) {
        player.pos.y = canvas.height / 2 - CONFIG.paddleHeight / 2;
    }
}

// --- Timer System ---
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function initTimer() {
    state.timeRemaining = CONFIG.gameDuration;
    updateTimerDisplay();
}

function startTimer() {
    // Only start interval, do NOT reset timeRemaining here
    if (state.timerInterval) clearInterval(state.timerInterval);

    state.timerInterval = setInterval(() => {
        if (!state.running || state.gameOver) return;

        state.timeRemaining--;
        updateTimerDisplay();

        // Warning beep in last 10 seconds
        if (state.timeRemaining <= 10 && state.timeRemaining > 0) {
            playSound('timewarning');
        }

        if (state.timeRemaining <= 0) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (timerEl) {
        timerEl.textContent = formatTime(state.timeRemaining);
        // Flash red in last 30 seconds
        if (state.timeRemaining <= 30) {
            timerEl.classList.add('timer-warning');
        } else {
            timerEl.classList.remove('timer-warning');
        }
    }
}

function endGame() {
    state.running = false;
    state.gameOver = true;
    ball.freeze();

    if (state.aiServeTimer) { clearTimeout(state.aiServeTimer); state.aiServeTimer = null; }
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }

    playSound('gameover');

    const p = state.score.player;
    const a = state.score.ai;

    if (p > a) {
        winnerText.textContent = state.twoPlayer ? 'JOGADOR 1 VENCEU!' : 'VOCÊ VENCEU!';
    } else if (a > p) {
        winnerText.textContent = state.twoPlayer ? 'JOGADOR 2 VENCEU!' : 'IA VENCEU!';
    } else {
        winnerText.textContent = 'EMPATE!';
    }
    gameOverScreen.classList.remove('hidden');
}

// --- Coin Flip System ---
function startCoinFlip(callback) {
    state.coinFlipActive = true;
    countdownOverlay.classList.remove('hidden');

    const result = Math.random() > 0.5 ? 'player' : 'ai';

    let flipCount = 0;
    const totalFlips = 12;
    let currentShow = 'player';

    function showFlip(who) {
        if (who === 'player') {
            countdownTextEl.textContent = 'P1';
            countdownTextEl.style.color = CONFIG.colors.player;
            countdownTextEl.style.textShadow = `0 0 30px ${CONFIG.colors.player}, 0 0 60px ${CONFIG.colors.player}`;
        } else {
            const label = state.twoPlayer ? 'P2' : 'IA';
            countdownTextEl.textContent = label;
            countdownTextEl.style.color = CONFIG.colors.ai;
            countdownTextEl.style.textShadow = `0 0 30px ${CONFIG.colors.ai}, 0 0 60px ${CONFIG.colors.ai}`;
        }
    }

    coinFlipTextEl.textContent = '🪙 Cara ou Coroa...';
    showFlip(currentShow);
    playSound('coinflip');

    function doFlip() {
        flipCount++;
        currentShow = currentShow === 'player' ? 'ai' : 'player';

        if (flipCount >= totalFlips) {
            showFlip(result);
            playSound('coinresult');

            if (result === 'player') {
                coinFlipTextEl.innerHTML = state.twoPlayer
                    ? '<span class="cf-arrow cf-left">P1 SACA!</span>'
                    : '<span class="cf-arrow cf-left">VOCÊ SACA!</span>';
            } else {
                coinFlipTextEl.innerHTML = state.twoPlayer
                    ? '<span class="cf-arrow cf-right">P2 SACA!</span>'
                    : '<span class="cf-arrow cf-right">IA SACA!</span>';
            }

            countdownTextEl.style.animation = 'none';
            void countdownTextEl.offsetWidth;
            countdownTextEl.style.animation = '';

            setTimeout(() => {
                state.coinFlipActive = false;
                countdownOverlay.classList.add('hidden');
                countdownTextEl.style.color = '';
                countdownTextEl.style.textShadow = '';
                coinFlipTextEl.textContent = '';
                callback(result);
            }, 1400);
            return;
        }

        showFlip(currentShow);
        playSound('coinflip');

        const progress = flipCount / totalFlips;
        const delay = 80 + progress * progress * 250;
        setTimeout(doFlip, delay);
    }

    setTimeout(doFlip, 300);
}

// --- Serve System ---
function startServe(server) {
    state.server = server;
    state.serving = true;
    state.scoringPause = false;

    // CRITICAL FIX: Reset launch inputs to prevent auto-serve
    input.launch = false;
    input2.launch = false;

    if (server === 'player') {
        ball.attachToPaddle(player, 1);
    } else {
        ball.attachToPaddle(ai, -1);
    }

    // AI auto-serve in 1P mode
    if (server === 'ai' && !state.twoPlayer) {
        if (state.aiServeTimer) clearTimeout(state.aiServeTimer);
        state.aiServeTimer = setTimeout(() => {
            if (state.serving && state.server === 'ai') {
                doServe();
            }
        }, CONFIG.aiServeDelay);
    }
}

function doServe() {
    if (!state.serving) return;
    state.serving = false;
    ball.launch();
    playSound('serve');
    createParticles(ball.pos.x, ball.pos.y, CONFIG.colors.ball, 10);
    if (state.aiServeTimer) {
        clearTimeout(state.aiServeTimer);
        state.aiServeTimer = null;
    }
}

// --- Game Flow ---
let selectedMode = null;

// Step 1: Player picks mode (1P or 2P)
btn1P.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    selectedMode = false;
    // Hide start screen grid (buttons + controls), show the coin
    document.querySelector('.start-screen-grid').classList.add('hidden');
    document.querySelector('.mode-controls')?.classList.add('hidden'); // Legacy check
    coinButton.classList.remove('hidden');
});

btn2P.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    selectedMode = true;
    document.querySelector('.start-screen-grid').classList.add('hidden');
    document.querySelector('.mode-controls')?.classList.add('hidden'); // Legacy check
    coinButton.classList.remove('hidden');
});

// Step 2: Player clicks the coin to flip
coinButton.addEventListener('click', () => {
    coinButton.classList.add('hidden');
    modeScreen.classList.add('hidden');
    menuBtn.classList.add('hidden'); // Hide menu button during coin flip
    startGame(selectedMode);
});

function startGame(twoPlayer) {
    state.twoPlayer = twoPlayer;
    state.gameOver = false;
    state.paused = false;
    state.score = { player: 0, ai: 0 };
    state.scoringPause = false;

    // Duck music volume
    if (bgMusic) bgMusic.volume = VOL_GAME;

    updateUI();
    modeScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    menuBtn.classList.remove('hidden'); // Show menu button in game

    player.pos.y = canvas.height / 2 - CONFIG.paddleHeight / 2;
    ai.pos.y = canvas.height / 2 - CONFIG.paddleHeight / 2;

    state.running = true;

    // Start the timer
    initTimer(); // Reset timer to full duration
    startTimer(); // Start counting

    // Coin flip to decide first server
    startCoinFlip((winner) => {
        startServe(winner);
    });
}

function togglePause() {
    if (!state.running || state.gameOver || state.coinFlipActive) return;

    state.paused = !state.paused;

    if (state.paused) {
        pauseMenu.classList.remove('hidden');
        if (state.timerInterval) clearInterval(state.timerInterval);
    } else {
        pauseMenu.classList.add('hidden');
        startTimer(); // Resume timer
    }
}

// Pause Menu Listeners
// Fix: Use mousedown or ensure pointer-events are correct. Click should work if CSS is correct.
// We added pointer-events: auto to .pause-content which contains these buttons.
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent bubbling
    togglePause();
});

btnResume.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
});

btnQuit.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause(); // Unpause locally first to reset state correctly
    resetToMenu();
});


function resetToMenu() {
    // Reset mode screen to initial state
    document.querySelector('.start-screen-grid').classList.remove('hidden');
    document.querySelector('.mode-controls')?.classList.remove('hidden'); // Legacy check
    coinButton.classList.add('hidden');
    modeScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    state.gameOver = false;
    state.gameOver = false;
    state.running = false;
    state.paused = false;

    // Restore music volume
    if (bgMusic) bgMusic.volume = VOL_INTRO;

    pauseMenu.classList.add('hidden');
    menuBtn.classList.remove('hidden'); // Check this logic based on requirement (usually hidden in main menu)
    menuBtn.classList.add('hidden'); // Actually hide it in main menu
    selectedMode = null;
    if (timerEl) timerEl.textContent = formatTime(CONFIG.gameDuration);
    if (timerEl) timerEl.classList.remove('timer-warning');
}

// --- Loop ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function update() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (!state.running) return;
    if (state.paused) return; // Stop update if paused
    if (state.coinFlipActive) return;

    // Player 1 Movement
    if (input.y !== null && !state.serving) {
        player.pos.y = input.y - player.size.y / 2;
    } else {
        if (input.up) player.pos.y -= player.speed;
        if (input.down) player.pos.y += player.speed;
    }
    player.constrain();

    // Player 2 / AI Movement
    if (state.twoPlayer) {
        if (input2.y !== null && !state.serving) {
            ai.pos.y = input2.y - ai.size.y / 2;
        } else {
            if (input2.up) ai.pos.y -= ai.speed;
            if (input2.down) ai.pos.y += ai.speed;
        }
        ai.constrain();
    } else {
        if (!state.serving || state.server !== 'ai') {
            const aiCenter = ai.pos.y + ai.size.y / 2;
            const ballCenter = ball.pos.y + ball.size.y / 2;
            if (aiCenter < ballCenter - 10) ai.pos.y += ai.speed * 0.75;
            if (aiCenter > ballCenter + 10) ai.pos.y -= ai.speed * 0.75;
        } else {
            const aiCenter = ai.pos.y + ai.size.y / 2;
            const targetY = canvas.height / 2;
            if (aiCenter < targetY - 5) ai.pos.y += ai.speed * 0.4;
            if (aiCenter > targetY + 5) ai.pos.y -= ai.speed * 0.4;
        }
        ai.constrain();
    }

    // Handle serve launch
    if (state.serving) {
        if (state.server === 'player' && input.launch) {
            input.launch = false;
            doServe();
        }
        if (state.server === 'ai' && state.twoPlayer && input2.launch) {
            input2.launch = false;
            doServe();
        }
    }

    // Ball Physics
    ball.update();

    // Wall Collision
    if (!ball.frozen && !ball.attachedTo) {
        if (ball.pos.y <= 0 || ball.pos.y + ball.size.y >= canvas.height) {
            ball.vel.y *= -1;
            if (ball.pos.y <= 0) ball.pos.y = 1;
            if (ball.pos.y + ball.size.y >= canvas.height) ball.pos.y = canvas.height - ball.size.y - 1;
            shakeScreen(2);
            playSound('wall');
            createParticles(ball.pos.x + ball.size.x / 2, ball.pos.y + (ball.vel.y > 0 ? 0 : ball.size.y), CONFIG.colors.ball, 5);
        }
    }

    // Paddle Collision - Player
    if (!ball.attachedTo && !ball.frozen && checkCollision(ball, player)) {
        ball.pos.x = player.pos.x + player.size.x;

        let hitPoint = (ball.pos.y + ball.size.y / 2) - (player.pos.y + player.size.y / 2);
        let normalizedHit = hitPoint / (player.size.y / 2);
        if (normalizedHit > 1) normalizedHit = 1;
        if (normalizedHit < -1) normalizedHit = -1;

        let angle = normalizedHit * (Math.PI / 4); // Max 45 degrees
        let speed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2) * 1.05;
        if (speed > CONFIG.ballSpeed * 2.5) speed = CONFIG.ballSpeed * 2.5;

        ball.vel.x = Math.cos(angle) * speed;
        ball.vel.y = Math.sin(angle) * speed;

        shakeScreen(5);
        playSound('hit');
        createParticles(ball.pos.x, ball.pos.y + ball.size.y / 2, CONFIG.colors.player, 15);
    }

    // Paddle Collision - AI/Player2
    if (!ball.attachedTo && !ball.frozen && checkCollision(ball, ai)) {
        ball.pos.x = ai.pos.x - ball.size.x;

        let hitPoint = (ball.pos.y + ball.size.y / 2) - (ai.pos.y + ai.size.y / 2);
        let normalizedHit = hitPoint / (ai.size.y / 2);
        if (normalizedHit > 1) normalizedHit = 1;
        if (normalizedHit < -1) normalizedHit = -1;

        let angle = normalizedHit * (Math.PI / 4);
        let speed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2) * 1.05;
        if (speed > CONFIG.ballSpeed * 2.5) speed = CONFIG.ballSpeed * 2.5;

        ball.vel.x = -Math.cos(angle) * speed;
        ball.vel.y = Math.sin(angle) * speed;

        shakeScreen(5);
        playSound('hit');
        createParticles(ball.pos.x + ball.size.x, ball.pos.y + ball.size.y / 2, CONFIG.colors.ai, 15);
    }

    // Scoring — only if ball is in play and not in a scoring pause
    if (!ball.attachedTo && !ball.frozen && !state.scoringPause) {
        if (ball.pos.x + ball.size.x < -10) { // Allow slight overlap before scoring to prevent edge cases? No, verify standard.
            scorePoint('ai');
        } else if (ball.pos.x > canvas.width + 10) {
            scorePoint('player');
        }
    }

    // Screen shake decay
    if (state.screenShake > 0) {
        state.screenShake *= 0.9;
        if (state.screenShake < 0.5) state.screenShake = 0;
    }
}

function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function draw() {
    const dx = (Math.random() - 0.5) * state.screenShake;
    const dy = (Math.random() - 0.5) * state.screenShake;

    ctx.save();
    ctx.translate(dx, dy);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Middle line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Particles
    for (const p of particles) p.draw(ctx);

    player.draw(ctx);
    ai.draw(ctx);
    ball.draw(ctx);

    // Serve hint
    if (state.serving) {
        ctx.save();
        ctx.font = '16px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;

        if (state.server === 'player') {
            ctx.fillStyle = CONFIG.colors.player;
            ctx.shadowColor = CONFIG.colors.player;
            ctx.shadowBlur = 10;
            const text = isTouchDevice ? 'Toque na tela para sacar!' : 'Pressione W para sacar!';
            ctx.fillText(text, canvas.width / 4, 40);
        } else if (state.server === 'ai' && state.twoPlayer) {
            ctx.fillStyle = CONFIG.colors.ai;
            ctx.shadowColor = CONFIG.colors.ai;
            ctx.shadowBlur = 10;
            const text = isTouchDevice ? 'Toque na tela para sacar!' : 'Pressione P para sacar!';
            ctx.fillText(text, canvas.width * 3 / 4, 40);
        } else {
            ctx.fillStyle = CONFIG.colors.ai;
            ctx.shadowColor = CONFIG.colors.ai;
            ctx.shadowBlur = 10;
            ctx.fillText('IA sacando...', canvas.width * 3 / 4, 40);
        }
        ctx.restore();
    }

    ctx.restore();
}

function checkCollision(rect1, rect2) {
    return (
        rect1.pos.x < rect2.pos.x + rect2.size.x &&
        rect1.pos.x + rect1.size.x > rect2.pos.x &&
        rect1.pos.y < rect2.pos.y + rect2.size.y &&
        rect1.pos.y + rect1.size.y > rect2.pos.y
    );
}

function scorePoint(who) {
    // IMMEDIATELY freeze the ball to prevent multiple triggers
    if (state.scoringPause) return; // double check
    state.scoringPause = true;
    ball.freeze();
    ball.vel.x = 0; // Force stop
    ball.vel.y = 0;

    state.score[who]++;
    playSound('score');
    updateUI();
    shakeScreen(15);

    // Flash animation
    const container = document.querySelector('.game-container');
    container.classList.add('flash-animation');
    setTimeout(() => container.classList.remove('flash-animation'), 300);

    createParticles(canvas.width / 2, canvas.height / 2, CONFIG.colors.ball, 30);

    // Next server = player who lost
    const nextServer = who === 'ai' ? 'player' : 'ai';

    setTimeout(() => {
        if (state.running && !state.gameOver) {
            state.scoringPause = false;
            startServe(nextServer);
        }
    }, 800);
}

function updateUI() {
    playerScoreEl.innerText = state.score.player;
    aiScoreEl.innerText = state.score.ai;
}

function shakeScreen(amount) {
    state.screenShake = amount;
}

// --- Input Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        input.up = true;
        input.launch = true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = true;

    if (e.code === 'KeyP') {
        input2.up = true;
        input2.launch = true;
    }
    if (e.code === 'Semicolon' || e.key === 'ç' || e.key === 'Ç') input2.down = true;

    if (e.code === 'Space') {
        if (state.gameOver) {
            resetToMenu();
        } else if (state.serving && state.server === 'player') {
            input.launch = true;
        }
    }

    if (e.code === 'Escape') {
        if (state.running && !state.gameOver) {
            togglePause();
        }
    }

    input.y = null;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') input.down = false;
    if (e.code === 'KeyP') input2.up = false;
    if (e.code === 'Semicolon' || e.key === 'ç' || e.key === 'Ç') input2.down = false;
});

// Intro Interaction
introOverlay.addEventListener('click', () => {
    console.log("Intro clicked");

    // Request fullscreen and landscape lock on mobile devices
    if (isTouchDevice && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed:', e));
            }
        }).catch(err => {
            console.log("Error attempting to enable fullscreen:", err);
        });
    }

    // Resume AudioContext if suspended
    const playMusic = () => {
        if (bgMusic) {
            bgMusic.volume = VOL_INTRO;
            bgMusic.currentTime = 0; // Start from beginning
            const playPromise = bgMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("Music playing successfully");
                }).catch(e => {
                    console.log("Audio play failed, retrying on next interaction:", e);
                });
            }
        }
    };

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed");
            playMusic();
        });
    } else {
        playMusic();
    }

    // Fade out intro
    introOverlay.classList.add('fade-out');

    // Remove after transition
    setTimeout(() => {
        introOverlay.style.display = 'none';
    }, 1500);
});

canvas.addEventListener('mousemove', (e) => {
    if (!state.running || state.coinFlipActive || state.serving) return;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    input.y = (e.clientY - rect.top) * scaleY;
});

// --- Touch Controls Event Listeners ---
if (isTouchDevice) {
    function createTouchRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.classList.add('touch-ripple');
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        document.body.appendChild(ripple);

        // Remove after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 400);
    }

    function handleTouches(e) {
        // Only prevent default on the canvas itself to allow UI clicks (Menu, Mute)
        if (e.target === canvas) {
            e.preventDefault();
        }

        if (!state.running || state.coinFlipActive || state.paused) return;

        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        const scaleX = canvas.width / rect.width;

        input.y = null;
        if (state.twoPlayer) input2.y = null;

        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];

            // Map screen coordinates to canvas space
            const touchX = (touch.clientX - rect.left) * scaleX;
            const touchY = (touch.clientY - rect.top) * scaleY;

            // If touching the game area
            if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                touch.clientY >= rect.top && touch.clientY <= rect.bottom) {

                // Left half of screen -> Player 1
                if (touchX < canvas.width / 2) {
                    input.y = touchY;
                }
                // Right half of screen -> Player 2 (only in 2P mode)
                else if (state.twoPlayer) {
                    input2.y = touchY;
                }
            }
        }
    }

    document.addEventListener('touchstart', (e) => {
        // Ignore touches on UI overlays/buttons
        if (e.target.closest('.overlay, .menu-btn, .mute-btn')) return;

        handleTouches(e);

        // Visual feedback & Tap to serve logic
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            createTouchRipple(touch.clientX, touch.clientY);

            if (state.serving) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const touchX = (touch.clientX - rect.left) * scaleX;

                // Determine who served based on tap location (left/right side)
                if (state.server === 'player' && touchX < canvas.width / 2) {
                    input.launch = true;
                } else if (state.server === 'ai' && state.twoPlayer && touchX >= canvas.width / 2) {
                    input2.launch = true;
                }
            }
        }
    }, { passive: false });

    document.addEventListener('touchmove', handleTouches, { passive: false });

    document.addEventListener('touchend', (e) => {
        handleTouches(e);
        // Reset launch flags just in case
        input.launch = false;
        input2.launch = false;
    });

    document.addEventListener('touchcancel', handleTouches);

    // Game-over tap to return to menu
    gameOverScreen.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (state.gameOver) {
            resetToMenu();
        }
    }, { passive: false });
}

// Start
resize();
loop();
