const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

const SCORES_FILE = path.join(__dirname, 'scores.json');
const ADMIN_KEY = "admin123"; // Varsayılan Admin Şifresi

// Liderlik Tablosunu Yükle
function loadScores() {
    try {
        if (fs.existsSync(SCORES_FILE)) {
            const data = fs.readFileSync(SCORES_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (err) {
        console.error("Skorlar yüklenirken hata oluştu:", err);
    }
    return [];
}

// Skorları Kaydet
function saveScores(scores) {
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf8');
    } catch (err) {
        console.error("Skorlar kaydedilirken hata oluştu:", err);
    }
}

let leaderboard = loadScores();
const activePlayers = {};

// Admin Rotaları
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin API
app.post('/api/admin/action', (req, res) => {
    const { adminKey, action, payload } = req.body;

    if (adminKey !== ADMIN_KEY) {
        return res.status(401).json({ success: false, message: "Hatalı Admin Şifresi!" });
    }

    if (action === 'resetLeaderboard') {
        leaderboard = [];
        saveScores(leaderboard);
        io.emit('leaderboardUpdate', leaderboard);
        io.emit('systemAnnounce', '📢 LİDERLİK TABLOSU YÖNETİCİ TARAFINDAN SIFIRLANDI!');
        return res.json({ success: true, message: "Liderlik tablosu başarıyla sıfırlandı!" });
    }

    if (action === 'deleteScore') {
        const { index } = payload || {};
        if (typeof index === 'number' && index >= 0 && index < leaderboard.length) {
            leaderboard.splice(index, 1);
            saveScores(leaderboard);
            io.emit('leaderboardUpdate', leaderboard);
            return res.json({ success: true, message: "Skor kaydı silindi!" });
        }
    }

    if (action === 'broadcast') {
        const { message } = payload || {};
        if (message) {
            io.emit('systemAnnounce', `📢 DUYURU: ${message}`);
            return res.json({ success: true, message: "Duyuru gönderildi!" });
        }
    }

    res.status(400).json({ success: false, message: "Geçersiz işlem!" });
});

io.on('connection', (socket) => {
    socket.emit('leaderboardUpdate', leaderboard);

    socket.on('playerJoin', (playerData) => {
        const cleanName = (playerData.name || '').trim();
        if (!cleanName) return;

        activePlayers[socket.id] = {
            id: socket.id,
            name: cleanName.substring(0, 12),
            characterId: playerData.characterId || 'classic',
            x: 100,
            y: 300,
            score: 0,
            isAlive: true
        };
        io.emit('playersUpdate', activePlayers);
    });

    socket.on('playerState', (state) => {
        if (activePlayers[socket.id]) {
            activePlayers[socket.id].x = state.x;
            activePlayers[socket.id].y = state.y;
            activePlayers[socket.id].score = state.score;
            activePlayers[socket.id].isAlive = state.isAlive;
            socket.broadcast.emit('playerMoved', activePlayers[socket.id]);
        }
    });

    socket.on('attackFreeze', () => {
        const attackerName = activePlayers[socket.id] ? activePlayers[socket.id].name : 'Bir Oyuncu';
        socket.broadcast.emit('getFrozen', { attackerName });
        io.emit('systemAnnounce', `❄️ ${attackerName} HERKESİ DONDURDU!`);
    });

    socket.on('submitScore', (data) => {
        const { name, score, characterId } = data;
        const cleanName = (name || '').trim();
        if (!cleanName || typeof score !== 'number' || score <= 0) return;

        const newEntry = {
            name: cleanName.substring(0, 12),
            score: Math.floor(score),
            characterId: characterId || 'classic',
            date: new Date().toISOString().split('T')[0]
        };

        leaderboard.push(newEntry);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 15);

        saveScores(leaderboard);
        io.emit('leaderboardUpdate', leaderboard);
    });

    socket.on('disconnect', () => {
        delete activePlayers[socket.id];
        io.emit('playersUpdate', activePlayers);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Flappy Bird Sunucusu Aktif: http://localhost:${PORT}`);
    console.log(`Admin Paneli: http://localhost:${PORT}/admin (Şifre: admin123)`);
});