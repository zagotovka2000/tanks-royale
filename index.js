const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { TankGame } = require('./game/TankGame');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { 
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});


// Убедиться, что статические файлы раздаются правильно
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/sounds', express.static(path.join(__dirname, 'public/sounds')));
let currentGame = null;
let botInterval = null;

// Сохраняем io в глобальную переменную для доступа из TankGame
global.io = io;

function createNewGame() {
    if (botInterval) clearInterval(botInterval);
    currentGame = new TankGame();
    
    botInterval = setInterval(() => {
        if (currentGame && !currentGame.isGameOver() && currentGame.hasPlayers()) {
            // Сохраняем результат ботов, чтобы отправить клиентам
            const botResults = currentGame.botAction();
            
            // Отправляем результаты выстрелов ботов
            if (botResults && botResults.length > 0) {
                botResults.forEach(result => {
                    io.emit('shootResult', result);
                });
            }
            
            const player = currentGame.getFirstPlayer();
            if (player) {
                const state = currentGame.getStateForPlayer(player.id);
                if (state) io.emit('gameState', state);
            }
            if (currentGame.checkWinner()) {
                clearInterval(botInterval);
                const player = currentGame.getFirstPlayer();
                io.emit('gameEnded', {
                    winner: currentGame.getWinner(),
                    kills: player?.kills || 0
                });
            }
        }
    }, 3000);
}

createNewGame();

io.on('connection', (socket) => {
    console.log('🔌 Клиент подключен:', socket.id);
    
    socket.on('joinGame', (data) => {
        console.log('📥 Присоединение:', data.userName);
        if (currentGame.isGameOver() || currentGame.hasPlayers()) {
            createNewGame();
        }
        
        const result = currentGame.addPlayer(data.userId, data.userName);
        if (result.success) {
            socket.emit('joined', { success: true });
            const state = currentGame.getStateForPlayer(data.userId);
            if (state) socket.emit('gameState', state);
            console.log('✅ Игрок добавлен');
        } else {
            socket.emit('error', { message: result.reason });
        }
    });
    
    socket.on('move', (data) => {
        if (!currentGame || currentGame.isGameOver()) return;
        const player = currentGame.getFirstPlayer();
        if (!player) return;
        
        const moved = currentGame.moveToCell(player.id, data.q, data.r);
        if (moved) {
            const state = currentGame.getStateForPlayer(player.id);
            io.emit('gameState', state);
            socket.emit('actionAccepted', { type: 'move' });
        } else {
            const cooldown = currentGame.getRemainingCooldown(player.id);
            if (cooldown > 0) {
                socket.emit('error', { message: `Перезарядка: ${Math.ceil(cooldown / 1000)} сек` });
            } else {
                socket.emit('error', { message: "Не могу туда двигаться" });
            }
        }
    });
    
    socket.on('shoot', (data) => {
        if (!currentGame || currentGame.isGameOver()) return;
        const player = currentGame.getFirstPlayer();
        if (!player) return;
        
        const result = currentGame.shootAtCell(player.id, data.q, data.r);
        // Добавляем координаты стреляющего для анимации
        result.fromQ = player.q;
        result.fromR = player.r;
        result.attackerId = player.id;
        
        socket.emit('shootResult', result);
        if (result.success) {
            const state = currentGame.getStateForPlayer(player.id);
            io.emit('gameState', state);
            socket.emit('actionAccepted', { type: 'shoot' });
        }
    });
    
    socket.on('reset', () => {
        createNewGame();
        const player = currentGame.getFirstPlayer();
        if (player) {
            const state = currentGame.getStateForPlayer(player.id);
            io.emit('gameState', state);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключен:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎮 TANK ROYALE SERVER`);
    console.log(`📍 http://localhost:${PORT}`);
});
