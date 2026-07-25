// Flappy Bird Pro - Mobile Performance & Clear Power-Up Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const socket = typeof io !== 'undefined' ? io() : null;

canvas.width = 480;
canvas.height = 640;

// UI Elementleri
const startModal = document.getElementById('startModal');
const gameOverModal = document.getElementById('gameOverModal');
const startHintOverlay = document.getElementById('startHintOverlay');
const frostOverlay = document.getElementById('frostOverlay');
const announceBanner = document.getElementById('announceBanner');
const powerupHud = document.getElementById('powerupHud');
const multiplayerWidget = document.getElementById('multiplayerWidget');
const mpPlayerList = document.getElementById('mpPlayerList');

const playerNameInput = document.getElementById('playerNameInput');
const nameErrorAlert = document.getElementById('nameErrorAlert');
const btnStartGame = document.getElementById('btnStartGame');
const btnRestart = document.getElementById('btnRestart');
const btnBackToMenu = document.getElementById('btnBackToMenu');

const currentScoreDisplay = document.getElementById('currentScoreDisplay');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const personalBestDisplay = document.getElementById('personalBestDisplay');
const newRecordBadge = document.getElementById('newRecordBadge');
const menuLeaderboardList = document.getElementById('menuLeaderboardList');
const gameOverLeaderboardList = document.getElementById('gameOverLeaderboardList');
const hudCharIcon = document.getElementById('hudCharIcon');
const hudPlayerName = document.getElementById('hudPlayerName');

// --- SES MOTORU ---
class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playJump() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playScore() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now);
        osc2.frequency.setValueAtTime(659.25, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.1);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.22);
    }

    playHit() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    }

    playFreeze() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playNitro() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.45);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    playShield() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

const sounds = new SoundEngine();

// --- VARLIKLAR ---
const assets = {
    bg: new Image(),
    bgs: {
        emin_sena: new Image(),
        sky: new Image(),
        cyberpunk: new Image(),
        space: new Image()
    },
    pipe: new Image(),
    rawBirds: {
        golden: new Image(),
        cyber: new Image(),
        dragon: new Image(),
        classic: new Image(),
        senasal: new Image(),
        phoenix: new Image()
    }
};

const processedSprites = {};

function processRawBirdImage(imgKey, rawImg) {
    try {
        const offCanvas = document.createElement('canvas');
        const w = rawImg.naturalWidth || 200;
        const h = rawImg.naturalHeight || 200;
        offCanvas.width = w;
        offCanvas.height = h;
        const offCtx = offCanvas.getContext('2d');

        offCtx.drawImage(rawImg, 0, 0);

        const imgData = offCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (r < 45 && g < 45 && b < 45) {
                data[i + 3] = 0;
            } else if (r < 65 && g < 65 && b < 65) {
                data[i + 3] = Math.floor(data[i + 3] * 0.4);
            }
        }

        offCtx.putImageData(imgData, 0, 0);

        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.beginPath();
        offCtx.arc(w / 2, h / 2, Math.min(w, h) * 0.46, 0, Math.PI * 2);
        offCtx.fill();

        processedSprites[imgKey] = offCanvas;
    } catch (e) {
        console.warn("Could not process transparent sprite for:", imgKey, e);
    }
}

function loadAndProcessBird(imgKey, srcPath) {
    const img = new Image();
    img.onload = () => processRawBirdImage(imgKey, img);
    img.src = srcPath;
    if (img.complete && img.naturalWidth > 0) {
        processRawBirdImage(imgKey, img);
    }
    assets.rawBirds[imgKey] = img;
}

loadAndProcessBird('senasal', 'assets/bird_senasal.png');
loadAndProcessBird('golden', 'assets/bird_golden.png');
loadAndProcessBird('cyber', 'assets/bird_cyber.png');
loadAndProcessBird('dragon', 'assets/bird_dragon.png');
loadAndProcessBird('classic', 'assets/bird_golden.png');
loadAndProcessBird('phoenix', 'assets/bird_phoenix.png');

assets.bgs.emin_sena.src = 'assets/bg.png';
assets.bgs.sky.src = 'assets/bg.png';
assets.bgs.cyberpunk.src = 'assets/bg_cyberpunk.png';
assets.bgs.space.src = 'assets/bg_space.png';
assets.pipe.src = 'assets/pipe.png';

const CHAR_INFO = {
    senasal: { name: "Senasal Fena", icon: "🎀", color: "#ff69b4" },
    golden: { name: "Altın Anka", icon: "✨", color: "#ffd700" },
    cyber: { name: "Siber Kuş", icon: "⚡", color: "#00f3ff" },
    dragon: { name: "Ejderha Kuşu", icon: "🔥", color: "#2ed573" },
    phoenix: { name: "Alevli Anka", icon: "🔥", color: "#ff4500" },
    classic: { name: "Klasik Kuş", icon: "🐣", color: "#fffa65" }
};

// --- OYUN DURUMU & FİZİK ---
let gameMode = 'MENU';
let playerName = '';
let selectedChar = 'senasal';
let score = 0;
let personalBest = localStorage.getItem('flappy_pb') ? parseInt(localStorage.getItem('flappy_pb')) : 0;
let bgX = 0;
const bgSpeed = 1.0;
const groundHeight = 50;

const bird = {
    x: 100,
    y: 300,
    radius: 17,
    velocity: 0,
    gravity: 0.18,
    jumpStrength: -4.8,
    rotation: 0
};

let basePipeSpeed = 1.4;
let currentPipeSpeed = basePipeSpeed;

let isFrozen = false;
let freezeTimer = 0;
let isNitroActive = false;
let nitroTimer = 0;
let hasShield = false;
let shieldInvincibleTimer = 0; // Kalkan kırıldıktan sonraki geçici koruma süresi

let pipes = [];
let powerUps = [];
let particles = [];
let floatTexts = [];
let otherPlayers = {};
let frameCount = 0;
let lastTimestamp = 0;
let ignoreJumpUntil = 0;
let selectedBg = 'emin_sena';

let lastVoiceToggleTime = 0;
function handleVoiceToggle(e) {
    const voiceBtn = e.target.closest('.voice-btn');
    if (voiceBtn) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (now - lastVoiceToggleTime < 350) return;
        lastVoiceToggleTime = now;
        toggleVoiceChat();
    }
}

document.addEventListener('touchend', (e) => {
    if (e.target.closest('.voice-btn')) {
        handleVoiceToggle(e);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.voice-btn')) {
        handleVoiceToggle(e);
        return;
    }

    const charCard = e.target.closest('.char-card');
    if (charCard) {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        charCard.classList.add('selected');
        selectedChar = charCard.getAttribute('data-char') || 'senasal';
        return;
    }

    const bgCard = e.target.closest('.bg-card');
    if (bgCard) {
        document.querySelectorAll('.bg-card').forEach(c => c.classList.remove('selected'));
        bgCard.classList.add('selected');
        selectedBg = bgCard.getAttribute('data-bg') || 'emin_sena';
        return;
    }
});

playerNameInput.addEventListener('input', () => {
    if (playerNameInput.value.trim() !== '') {
        playerNameInput.classList.remove('invalid');
        nameErrorAlert.style.display = 'none';
    }
});

// --- NET, BELİRGİN İKONLU VE ETİKETLİ ÖZEL GÜÇ NESNESİ ---
class PowerUpItem {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.type = type; // 'FREEZE', 'NITRO', 'SHIELD', 'STAR'
        this.radius = 22; // Büyütüldü (Çok belirgin)
        this.collected = false;
    }

    update(dt) {
        this.x -= currentPipeSpeed * dt;
        this.y = this.baseY + Math.sin(frameCount * 0.08) * 6;
    }

    draw(ctx) {
        if (this.collected) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        let icon = '❄️';
        let label = 'DONMA';
        let mainColor = '#00f3ff';
        let bgColor = 'rgba(0, 243, 255, 0.35)';

        if (this.type === 'FREEZE') {
            icon = '❄️';
            label = 'DONMA';
            mainColor = '#00f3ff';
            bgColor = 'rgba(0, 243, 255, 0.4)';
        } else if (this.type === 'NITRO') {
            icon = '🚀';
            label = 'NİTRO';
            mainColor = '#ff7b00';
            bgColor = 'rgba(255, 123, 0, 0.4)';
        } else if (this.type === 'SHIELD') {
            icon = '🛡️';
            label = 'KALKAN';
            mainColor = '#2ed573';
            bgColor = 'rgba(46, 213, 115, 0.4)';
        } else if (this.type === 'STAR') {
            icon = '🌟';
            label = '+3 PUAN';
            mainColor = '#ffd700';
            bgColor = 'rgba(255, 215, 0, 0.4)';
        }

        // Parlayan Dış Halka
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = bgColor;
        ctx.fill();

        // İç Küre
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();

        // Büyük İkon
        ctx.font = '20px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, 0, -1);

        // Belirgin Alt Etiket Kutusu
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.roundRect(-24, 16, 48, 14, 6);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillText(label, 0, 23);

        ctx.restore();
    }
}

// --- MOBİL PERFORMANS İÇİN HAFİF PARÇACIKLAR ---
class Particle {
    constructor(x, y, charType, isExplosion = false, isNitro = false) {
        this.x = x;
        this.y = y;
        this.size = isExplosion ? Math.random() * 5 + 3 : (isNitro ? Math.random() * 4 + 2 : Math.random() * 3 + 1.5);
        this.vx = isExplosion ? (Math.random() - 0.5) * 5 : (isNitro ? -Math.random() * 5 - 2 : (Math.random() - 1) * 1.2);
        this.vy = isExplosion ? (Math.random() - 0.5) * 5 : (isNitro ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 1.2);
        this.life = 1.0;
        this.decay = isExplosion ? 0.04 : Math.random() * 0.04 + 0.03;
        this.charType = charType;
        this.isNitro = isNitro;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);

        if (this.isNitro) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ff4757' : '#ff7b00';
        } else if (this.charType === 'golden') {
            ctx.fillStyle = '#ffd700';
        } else if (this.charType === 'cyber') {
            ctx.fillStyle = '#00f3ff';
        } else if (this.charType === 'dragon') {
            ctx.fillStyle = '#2ed573';
        } else {
            ctx.fillStyle = '#ffffff';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function spawnFloatText(text, x, y) {
    floatTexts.push({ text, x, y, alpha: 1.0, vy: -1.5 });
}

function spawnPipe() {
    const minHeight = 65;
    const maxHeight = 640 - groundHeight - 195 - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
    const gap = 195;

    const pipeX = 480;
    pipes.push({
        x: pipeX,
        topHeight: topHeight,
        bottomY: topHeight + gap,
        width: 65,
        passed: false
    });

    // %50 İhtimalle İKİ BORUNUN ARASINDAKİ YATAY AÇIK HAVADA Özel Güç Doğsun!
    if (Math.random() < 0.50) {
        const types = ['FREEZE', 'NITRO', 'SHIELD', 'STAR'];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        // İki borunun arasındaki YATAY AÇIK HAVADA heyecanlı pozisyonlar:
        // 1: Yüksek Gökyüzü (y = 80) -> Oyuncu yukarı tırmanıp alıp sonra sonraki boruya süzülmeli!
        // 2: Düşük Zemin Yakını (y = 480) -> Oyuncu aşağı süzülüp alıp sonra tekrar yükselmeli!
        // 3: Orta Açık Hava (y = 280) -> İki borunun ortasında açık havada
        const openSkyPositions = [
            80,   // Yüksek Gökyüzü Tırmanışı (Heyecanlı!)
            480,  // Düşük Zemin Süzülmesi (Heyecanlı!)
            280   // Orta Açık Hava
        ];

        const chosenY = openSkyPositions[Math.floor(Math.random() * openSkyPositions.length)];
        // Borunun arkasındaki açık yatay mesafeye yerleştir (pipeX + 115)
        powerUps.push(new PowerUpItem(pipeX + 115, chosenY, chosenType));
    }
}

function handleUserAction() {
    if (isFrozen) return;
    if (Date.now() < ignoreJumpUntil) return;

    if (gameMode === 'READY') {
        gameMode = 'PLAYING';
        startHintOverlay.style.display = 'none';
        bird.velocity = bird.jumpStrength;
        sounds.playJump();
    } else if (gameMode === 'PLAYING') {
        bird.velocity = bird.jumpStrength;
        sounds.playJump();

        if (particles.length < 20) {
            for (let i = 0; i < 2; i++) {
                particles.push(new Particle(bird.x - 10, bird.y + 4, selectedChar));
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (gameMode === 'READY' || gameMode === 'PLAYING') {
            e.preventDefault();
            handleUserAction();
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (gameMode === 'READY' || gameMode === 'PLAYING') {
        e.preventDefault();
        handleUserAction();
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (gameMode === 'READY' || gameMode === 'PLAYING') {
        e.preventDefault();
        handleUserAction();
    }
});

function prepareGameReady() {
    const rawName = playerNameInput.value.trim();

    if (!rawName) {
        playerNameInput.classList.add('invalid');
        nameErrorAlert.style.display = 'block';
        playerNameInput.focus();
        return;
    }

    playerNameInput.classList.remove('invalid');
    nameErrorAlert.style.display = 'none';

    playerName = rawName.substring(0, 12);
    hudPlayerName.innerText = playerName;
    hudCharIcon.innerText = CHAR_INFO[selectedChar].icon;

    bird.y = 640 / 2 - 20;
    bird.velocity = 0;
    bird.rotation = 0;
    score = 0;
    currentScoreDisplay.innerText = '0';

    isFrozen = false;
    freezeTimer = 0;
    isNitroActive = false;
    nitroTimer = 0;
    hasShield = false;
    shieldInvincibleTimer = 0;
    currentPipeSpeed = basePipeSpeed;

    pipes = [];
    powerUps = [];
    particles = [];
    floatTexts = [];
    frameCount = 0;

    frostOverlay.style.display = 'none';
    startModal.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    
    ignoreJumpUntil = Date.now() + 400;
    gameMode = 'READY';
    startHintOverlay.style.display = 'block';
    multiplayerWidget.style.display = 'flex';
    updatePowerupHud();

    if (socket) {
        socket.emit('playerJoin', { name: playerName, characterId: selectedChar });
    }
}

function gameOver() {
    gameMode = 'GAMEOVER';
    sounds.playHit();
    startHintOverlay.style.display = 'none';
    frostOverlay.style.display = 'none';

    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(bird.x, bird.y, selectedChar, true));
    }

    let isNewRecord = false;
    if (score > personalBest) {
        personalBest = score;
        localStorage.setItem('flappy_pb', personalBest);
        isNewRecord = true;
    }

    finalScoreDisplay.innerText = score;
    personalBestDisplay.innerText = personalBest;
    newRecordBadge.style.display = isNewRecord ? 'inline-block' : 'none';

    if (socket && score > 0) {
        socket.emit('submitScore', {
            name: playerName,
            score: score,
            characterId: selectedChar
        });
    }

    setTimeout(() => {
        gameOverModal.classList.remove('hidden');
    }, 450);
}

btnStartGame.addEventListener('click', (e) => {
    if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
    sounds.init();
    prepareGameReady();
});

btnRestart.addEventListener('click', (e) => {
    if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
    sounds.init();
    prepareGameReady();
});

btnBackToMenu.addEventListener('click', (e) => {
    if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
    gameMode = 'MENU';
    gameOverModal.classList.add('hidden');
    startHintOverlay.style.display = 'none';
    multiplayerWidget.style.display = 'none';
    frostOverlay.style.display = 'none';
    startModal.classList.remove('hidden');
});

// --- SOCKET EVENTLERİ ---
if (socket) {
    socket.on('leaderboardUpdate', (leaderboard) => {
        renderLeaderboard(menuLeaderboardList, leaderboard);
        renderLeaderboard(gameOverLeaderboardList, leaderboard);
    });

    socket.on('playersUpdate', (players) => {
        const newOther = {};
        for (let id in players) {
            if (id !== socket.id) {
                newOther[id] = players[id];
            }
        }
        otherPlayers = newOther;
        renderMultiplayerWidget();
    });

    socket.on('playerMoved', (playerData) => {
        if (playerData && playerData.id && playerData.id !== socket.id) {
            otherPlayers[playerData.id] = playerData;
            renderMultiplayerWidget();
        }
    });

    socket.on('getFrozen', (data) => {
        if (gameMode === 'PLAYING') {
            isFrozen = true;
            freezeTimer = 180;
            frostOverlay.style.display = 'flex';
            sounds.playFreeze();
        }
    });

    socket.on('systemAnnounce', (msg) => {
        if (announceBanner) {
            announceBanner.innerText = msg;
            announceBanner.style.display = 'block';
            setTimeout(() => {
                announceBanner.style.display = 'none';
            }, 2500);
        }
    });
}

// --- CANLI SESLİ SOHBET (WEBRTC VOICE CHAT) ---
const btnVoiceToggle = document.getElementById('btnVoiceToggle');
let localStream = null;
let peerConnections = {};
let isVoiceActive = false;

const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function updateVoiceButtons(active) {
    document.querySelectorAll('.voice-btn').forEach(btn => {
        if (active) {
            btn.classList.add('active');
            if (btn.classList.contains('voice-btn-large')) {
                btn.innerText = '🎙️ CANLI SESLİ SOHBET (AÇIK)';
            } else {
                btn.innerText = '🎙️ SES: AÇIK';
            }
        } else {
            btn.classList.remove('active');
            if (btn.classList.contains('voice-btn-large')) {
                btn.innerText = '🎙️ CANLI SESLİ SOHBETİ AÇ (KAPALI)';
            } else {
                btn.innerText = '🎙️ SES: KAPALI';
            }
        }
    });
}

async function toggleVoiceChat() {
    if (!isVoiceActive) {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Tarayıcınız sesli sohbet özelliğini desteklemiyor.");
                return;
            }
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            isVoiceActive = true;
            updateVoiceButtons(true);
            spawnFloatText("🎙️ MİKROFON AÇILDI!", bird.x, bird.y - 20);

            for (let peerId in otherPlayers) {
                if (peerId !== socket.id) {
                    createPeerConnection(peerId, true);
                }
            }
        } catch (err) {
            console.error("Mikrofon erişimi engellendi:", err);
            isVoiceActive = false;
            updateVoiceButtons(false);
            spawnFloatText("⚠️ MİKROFON İZNİ GEREKLİ", bird.x, bird.y - 20);
            alert("Mikrofon izni alınamadı! Lütfen tarayıcınızın adres çubuğundaki kilit ikonuna tıklayarak mikrofon izni verin.");
        }
    } else {
        stopVoiceChat();
    }
}

function stopVoiceChat() {
    isVoiceActive = false;
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    for (let id in peerConnections) {
        if (peerConnections[id]) {
            peerConnections[id].close();
        }
    }
    peerConnections = {};
    updateVoiceButtons(false);
    spawnFloatText("🔇 MİKROFON KAPATILDI", bird.x, bird.y - 20);
}

function createPeerConnection(peerId, isInitiator) {
    if (peerConnections[peerId]) return peerConnections[peerId];

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[peerId] = pc;

    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
            socket.emit('voiceSignal', {
                targetId: peerId,
                signal: { type: 'candidate', candidate: event.candidate }
            });
        }
    };

    pc.ontrack = (event) => {
        let remoteAudio = document.getElementById(`audio_${peerId}`);
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = `audio_${peerId}`;
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
    };

    if (isInitiator) {
        pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            socket.emit('voiceSignal', {
                targetId: peerId,
                signal: { type: 'offer', offer: offer }
            });
        });
    }

    return pc;
}



if (socket) {
    socket.on('voiceSignal', async (data) => {
        const { callerId, signal } = data;
        let pc = peerConnections[callerId];

        if (!pc) {
            pc = createPeerConnection(callerId, false);
        }

        if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('voiceSignal', {
                targetId: callerId,
                signal: { type: 'answer', answer: answer }
            });
        } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.type === 'candidate' && signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    });
}

function updatePowerupHud() {
    if (!powerupHud) return;
    powerupHud.innerHTML = '';

    if (isNitroActive) {
        const badge = document.createElement('div');
        badge.className = 'pu-badge';
        badge.style.borderColor = '#ff7b00';
        badge.style.color = '#ff7b00';
        badge.innerHTML = `🚀 NİTRO ROKET! (+6 Puan)`;
        powerupHud.appendChild(badge);
    }

    if (hasShield) {
        const badge = document.createElement('div');
        badge.className = 'pu-badge';
        badge.style.borderColor = '#2ed573';
        badge.style.color = '#2ed573';
        badge.innerHTML = `🛡️ KALKAN AKTİF`;
        powerupHud.appendChild(badge);
    }
}

function renderMultiplayerWidget() {
    if (!mpPlayerList) return;
    mpPlayerList.innerHTML = '';

    if (!playerName) return;

    const allList = [{
        id: 'me',
        name: playerName,
        characterId: selectedChar,
        score: score,
        isAlive: gameMode !== 'GAMEOVER',
        isMe: true
    }];

    for (let id in otherPlayers) {
        if (socket && id !== socket.id) {
            allList.push({
                id: id,
                name: otherPlayers[id].name || 'Oyuncu',
                characterId: otherPlayers[id].characterId || 'classic',
                score: otherPlayers[id].score || 0,
                isAlive: otherPlayers[id].isAlive !== false,
                isMe: false
            });
        }
    }

    allList.sort((a, b) => b.score - a.score);

    allList.forEach(p => {
        const row = document.createElement('div');
        row.className = `mp-player-row ${p.isMe ? 'is-me' : ''}`;
        const charIcon = CHAR_INFO[p.characterId] ? CHAR_INFO[p.characterId].icon : '✨';
        const statusDot = p.isAlive ? '🟢' : '💀';

        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                <span style="font-size:10px;">${statusDot}</span>
                <span>${charIcon}</span>
                <span style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden; max-width:80px;">${escapeHtml(p.name)}</span>
            </div>
            <span class="mp-score">${p.score}</span>
        `;
        mpPlayerList.appendChild(row);
    });
}

function renderLeaderboard(targetUl, leaderboard) {
    if (!targetUl) return;
    targetUl.innerHTML = '';
    if (!leaderboard || leaderboard.length === 0) {
        targetUl.innerHTML = '<li class="lb-item" style="color:#94a3b8;">Henüz skor bulunmuyor. İlk sen ol!</li>';
        return;
    }

    leaderboard.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'lb-item';
        const icon = CHAR_INFO[item.characterId] ? CHAR_INFO[item.characterId].icon : '✨';
        const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ffffff';

        li.innerHTML = `
            <span class="lb-rank" style="color:${rankColor};">#${index + 1}</span>
            <div class="lb-player">
                <span>${icon}</span>
                <strong>${escapeHtml(item.name)}</strong>
            </div>
            <span class="lb-score">${item.score}</span>
        `;
        targetUl.appendChild(li);
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function checkCollision() {
    if (isNitroActive || shieldInvincibleTimer > 0) return false;

    if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= 640 - groundHeight) {
        if (hasShield) {
            hasShield = false;
            shieldInvincibleTimer = 180; // 3 TAM SANYİE GEÇİCİ YENİLMEZLİK KORUMASI!
            sounds.playShield();
            bird.velocity = -3.5;
            spawnFloatText("🛡️ KALKAN KORUDU! (3s KORUMA)", bird.x, bird.y - 20);
            updatePowerupHud();
            return false;
        }
        return true;
    }

    for (let pipe of pipes) {
        if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
            if (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > pipe.bottomY) {
                if (hasShield) {
                    hasShield = false;
                    shieldInvincibleTimer = 180; // 3 TAM SANYİE GEÇİCİ YENİLMEZLİK KORUMASI!
                    sounds.playShield();
                    bird.velocity = -3.5;
                    spawnFloatText("🛡️ KALKAN KORUDU! (3s KORUMA)", bird.x, bird.y - 20);
                    updatePowerupHud();
                    return false;
                }
                return true;
            }
        }
    }
    return false;
}

// --- GÜNCELLEME DÖNGÜSÜ (DELTA TIME İLE PÜRÜZSÜZ MOBİL KONTROL) ---
function update(dt) {
    // 1. Dondurulduğunda arkaplan ve dünya TAMAMEN DURUR!
    const effectiveBgSpeed = isFrozen ? 0 : bgSpeed;
    bgX = (bgX - effectiveBgSpeed * dt) % 480;

    if (gameMode === 'READY') {
        frameCount++;
        bird.y = (640 / 2 - 20) + Math.sin(frameCount * 0.08) * 8;
        bird.rotation = Math.sin(frameCount * 0.08) * 0.05;
    }
    else if (gameMode === 'PLAYING') {
        frameCount++;

        if (shieldInvincibleTimer > 0) {
            shieldInvincibleTimer -= dt;
        }

        if (isFrozen) {
            freezeTimer -= dt;
            currentPipeSpeed = 0; // Borular TAMAMEN DURUR!
            bird.velocity = 0;    // Kuş havada DOKUNULMAZ ve HAREKETSİZ kilitlenir!
            bird.rotation = 0;

            if (freezeTimer <= 0) {
                isFrozen = false;
                frostOverlay.style.display = 'none';
                currentPipeSpeed = basePipeSpeed;
            }
        } else if (isNitroActive) {
            nitroTimer -= dt;
            currentPipeSpeed = basePipeSpeed * 4.2;
            bird.y += Math.sin(frameCount * 0.3) * 1.5;

            if (particles.length < 20) {
                particles.push(new Particle(bird.x - 18, bird.y, selectedChar, false, true));
            }

            if (nitroTimer <= 0) {
                isNitroActive = false;
                currentPipeSpeed = basePipeSpeed;
                updatePowerupHud();
            }
        } else {
            currentPipeSpeed = basePipeSpeed;
            bird.velocity += bird.gravity * dt;
            bird.y += bird.velocity * dt;
            bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, bird.velocity * 0.07));
        }

        if (!isFrozen && frameCount > 80 && frameCount % 175 === 0) {
            spawnPipe();
        }

        pipes.forEach(pipe => {
            pipe.x -= currentPipeSpeed * dt;

            if (!pipe.passed && bird.x > pipe.x + pipe.width) {
                pipe.passed = true;
                score++;
                currentScoreDisplay.innerText = score;
                renderMultiplayerWidget();
                sounds.playScore();
                spawnFloatText("+1", bird.x, bird.y - 20);
            }
        });

        pipes = pipes.filter(pipe => pipe.x + pipe.width > -50);

        powerUps.forEach(pu => {
            pu.update(dt);

            if (!pu.collected) {
                const dist = Math.hypot(bird.x - pu.x, bird.y - pu.y);
                if (dist < bird.radius + pu.radius) {
                    pu.collected = true;

                    if (pu.type === 'FREEZE') {
                        sounds.playFreeze();
                        spawnFloatText("❄️ DONDURMA SALDIRISI!", bird.x, bird.y - 25);
                        if (socket) socket.emit('attackFreeze');
                    } else if (pu.type === 'NITRO') {
                        sounds.playNitro();
                        isNitroActive = true;
                        nitroTimer = 210;
                        score += 6;
                        currentScoreDisplay.innerText = score;
                        spawnFloatText("🚀 NİTRO ROKET! +6 SKOR", bird.x, bird.y - 25);
                        updatePowerupHud();
                    } else if (pu.type === 'SHIELD') {
                        sounds.playShield();
                        hasShield = true;
                        spawnFloatText("🛡️ KALKAN KAZANILDI!", bird.x, bird.y - 25);
                        updatePowerupHud();
                    } else if (pu.type === 'STAR') {
                        sounds.playScore();
                        score += 3;
                        currentScoreDisplay.innerText = score;
                        spawnFloatText("🌟 +3 BONUS SKOR!", bird.x, bird.y - 25);
                    }
                    renderMultiplayerWidget();
                }
            }
        });

        powerUps = powerUps.filter(pu => !pu.collected && pu.x > -40);

        if (checkCollision()) {
            gameOver();
            renderMultiplayerWidget();
        }

        if (socket && frameCount % 3 === 0) {
            socket.emit('playerState', {
                x: bird.x,
                y: bird.y,
                score: score,
                isAlive: true
            });
        }

        if (frameCount % 4 === 0 && !isNitroActive && particles.length < 20) {
            particles.push(new Particle(bird.x - 12, bird.y, selectedChar));
        }
    }

    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => p.life > 0);

    floatTexts.forEach(ft => {
        ft.y += ft.vy * dt;
        ft.alpha -= 0.018 * dt;
    });
    floatTexts = floatTexts.filter(ft => ft.alpha > 0);
}

// --- ÇİZİM DÖNGÜSÜ ---
function render() {
    // 0. Temel Güvenlik Arkaplanı (Tuval asla simsiyah kalamaz!)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 640);
    skyGradient.addColorStop(0, '#1e3c72');
    skyGradient.addColorStop(0.5, '#2a5298');
    skyGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, 480, 640);

    // 1. Seçilen Resimli Arkaplan Teması
    try {
        const currentBgImg = assets.bgs[selectedBg] || assets.bgs.emin_sena;
        if (currentBgImg && currentBgImg.complete && currentBgImg.naturalWidth > 0) {
            ctx.drawImage(currentBgImg, bgX, 0, 480, 640);
            ctx.drawImage(currentBgImg, bgX + 480, 0, 480, 640);
        }
    } catch (e) {}

    // 2. Borular
    try {
        pipes.forEach(pipe => drawPipe(pipe));
    } catch (e) {}

    // 3. Belirgin İkonlu Özel Güçler
    try {
        powerUps.forEach(pu => pu.draw(ctx));
    } catch (e) {}

    // 4. Zemin
    try {
        const groundY = 640 - groundHeight;
        ctx.fillStyle = '#2ed573';
        ctx.fillRect(0, groundY, 480, groundHeight);
        ctx.fillStyle = '#26af5f';
        ctx.fillRect(0, groundY, 480, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, groundY + 8, 480, groundHeight - 8);
    } catch (e) {}

    // 5. Hafif Parçacıklar
    try {
        particles.forEach(p => p.draw(ctx));
    } catch (e) {}

    // 6. Oyuncu Kuşu
    try {
        if (gameMode === 'READY' || gameMode === 'PLAYING' || gameMode === 'GAMEOVER') {
            drawBird();
        }
    } catch (e) {}

    // 8. Yüzen Metinler
    try {
        floatTexts.forEach(ft => {
            if (ft && typeof ft.alpha === 'number') {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
                ctx.font = 'bold 16px "Outfit", sans-serif';
                ctx.fillStyle = '#ffd700';
                ctx.fillText(ft.text || '', ft.x || 0, ft.y || 0);
                ctx.restore();
            }
        });
    } catch (e) {}
}

function drawPipe(pipe) {
    const pipeWidth = pipe.width;

    const topGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
    topGradient.addColorStop(0, '#1e824c');
    topGradient.addColorStop(0.3, '#2ecc71');
    topGradient.addColorStop(0.7, '#27ae60');
    topGradient.addColorStop(1, '#145a32');

    ctx.fillStyle = topGradient;
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.strokeStyle = '#0e3a20';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);

    ctx.fillRect(pipe.x - 4, pipe.topHeight - 24, pipeWidth + 8, 24);
    ctx.strokeRect(pipe.x - 4, pipe.topHeight - 24, pipeWidth + 8, 24);

    const bottomHeight = 640 - groundHeight - pipe.bottomY;
    ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, bottomHeight);
    ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, bottomHeight);

    ctx.fillRect(pipe.x - 4, pipe.bottomY, pipeWidth + 8, 24);
    ctx.strokeRect(pipe.x - 4, pipe.bottomY, pipeWidth + 8, 24);
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    if (isFrozen) {
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.45)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
    }

    if (hasShield) {
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46, 213, 115, 0.25)';
        ctx.strokeStyle = '#2ed573';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();
    }

    if (isNitroActive) {
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 123, 0, 0.3)';
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2.5;
        ctx.fill();
        ctx.stroke();
    }

    if (shieldInvincibleTimer > 0) {
        ctx.globalAlpha = (Math.floor(frameCount / 4) % 2 === 0) ? 0.35 : 1.0;
    }

    const transparentCanvas = processedSprites[selectedChar] || processedSprites.golden;

    if (transparentCanvas) {
        const size = 46;
        ctx.drawImage(transparentCanvas, -size / 2, -size / 2, size, size);
    } else {
        ctx.fillStyle = CHAR_INFO[selectedChar] ? CHAR_INFO[selectedChar].color : '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    }

    ctx.restore();
}

// Ana Oyun Döngüsü (Kilitlenmez 60 FPS Yağ Gibi Akıcı Engine)
function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    try {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const dt = Math.min(Math.max((timestamp - lastTimestamp) / 16.667, 0.1), 2.0) || 1.0;
        lastTimestamp = timestamp;

        update(dt);
        render();
    } catch (err) {
        console.error("Game loop error:", err);
    }
}

requestAnimationFrame(gameLoop);