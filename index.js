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
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Логирование запросов для отладки
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Статические файлы
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    contentType: 'text/css',
    extensions: ['css']
}));
app.use('/js', express.static(path.join(__dirname, 'public/js'), {
    contentType: 'application/javascript',
    extensions: ['js']
}));
app.use('/sounds', express.static(path.join(__dirname, 'public/sounds')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let currentGame = null;
let botInterval = null;
let gameStateVersion = 0;
const clients = new Map();

class GameStateManager {
    constructor() {
        this.updateQueue = [];
        this.isUpdating = false;
        this.lastUpdateTime = 0;
        this.minUpdateInterval = 50;
    }
    
    queueUpdate(game, playerId) {
        this.updateQueue.push({ game, playerId, version: ++gameStateVersion });
        this.processQueue();
    }
    
    async processQueue() {
        if (this.isUpdating || this.updateQueue.length === 0) return;
        
        const now = Date.now();
        if (now - this.lastUpdateTime < this.minUpdateInterval) {
            setTimeout(() => this.processQueue(), this.minUpdateInterval);
            return;
        }
        
        this.isUpdating = true;
        const { game, playerId, version } = this.updateQueue.shift();
        
        try {
            const state = game.getStateForPlayer(playerId);
            if (state && version === gameStateVersion) {
                io.emit('gameState', state);
                this.lastUpdateTime = Date.now();
            }
        } catch (err) {
            console.error('Error processing state update:', err);
        }
        
        this.isUpdating = false;
        
        if (this.updateQueue.length > 0) {
            setTimeout(() => this.processQueue(), 10);
        }
    }
    
    clear() {
        this.updateQueue = [];
        this.isUpdating = false;
    }
}

const stateManager = new GameStateManager();

function createNewGame() {
    if (botInterval) clearInterval(botInterval);
    
    if (currentGame) {
        currentGame = null;
    }
    
    currentGame = new TankGame();
    gameStateVersion = 0;
    stateManager.clear();
    
    botInterval = setInterval(() => {
        if (currentGame && !currentGame.isGameOver() && currentGame.hasPlayers()) {
            const botResults = currentGame.botAction();
            
            if (botResults && botResults.length > 0) {
                botResults.forEach(result => {
                    console.log('Bot shooting:', result);
                    io.emit('shootResult', result);
                });
            }
            
            const player = currentGame.getFirstPlayer();
            if (player) {
                stateManager.queueUpdate(currentGame, player.id);
            }
            
            if (currentGame.checkWinner()) {
                clearInterval(botInterval);
                const player = currentGame.getFirstPlayer();
                io.emit('gameEnded', {
                    winner: currentGame.getWinner(),
                    kills: player?.kills || 0
                });
                botInterval = null;
            }
        } else if (currentGame && currentGame.isGameOver()) {
            if (botInterval) clearInterval(botInterval);
            botInterval = null;
        }
    }, 3000);
}

createNewGame();

io.on('connection', (socket) => {
    console.log('🔌 Клиент подключен:', socket.id);
    clients.set(socket.id, { socket, connectedAt: Date.now() });
    
    socket.on('joinGame', (data) => {
        console.log('📥 Присоединение:', data.userName);
        
        if (!currentGame || currentGame.isGameOver()) {
            createNewGame();
        }
        
        if (currentGame.hasPlayers()) {
            socket.emit('error', { message: 'Игра уже началась, наблюдайте за битвой!' });
            const player = currentGame.getFirstPlayer();
            if (player) {
                const state = currentGame.getStateForPlayer(player.id);
                if (state) socket.emit('gameState', state);
            }
            return;
        }
        
        const result = currentGame.addPlayer(data.userId, data.userName);
        if (result.success) {
            socket.emit('joined', { success: true });
            const state = currentGame.getStateForPlayer(data.userId);
            if (state) {
                socket.emit('gameState', state);
            }
            console.log('✅ Игрок добавлен');
        } else {
            socket.emit('error', { message: result.reason });
        }
    });
    
    socket.on('move', (data) => {
        if (!currentGame || currentGame.isGameOver()) {
            socket.emit('error', { message: 'Игра окончена' });
            return;
        }
        
        const player = currentGame.getFirstPlayer();
        if (!player) {
            socket.emit('error', { message: 'Игрок не найден' });
            return;
        }
        
        const moved = currentGame.moveToCell(player.id, data.q, data.r);
        if (moved) {
            stateManager.queueUpdate(currentGame, player.id);
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
        console.log('🔫 Shoot received:', data);
        
        if (!currentGame || currentGame.isGameOver()) {
            socket.emit('error', { message: 'Игра окончена' });
            return;
        }
        
        let player = currentGame.getFirstPlayer();
        
        if (data.playerId) {
            player = currentGame.getAllUnits().find(u => u.id === data.playerId);
        }
        
        if (!player || !player.active) {
            socket.emit('error', { message: 'Танк не найден' });
            return;
        }
        
        const result = currentGame.shootAtCell(player.id, data.q, data.r);
        result.fromQ = player.q;
        result.fromR = player.r;
        result.attackerId = player.id;
        
        console.log('Shoot result:', result);
        
        // ВАЖНО: Рассылаем результат ВСЕМ клиентам
        io.emit('shootResult', result);
        
        if (result.success) {
            stateManager.queueUpdate(currentGame, player.id);
        }
        
        if (currentGame.checkWinner()) {
            clearInterval(botInterval);
            const p = currentGame.getFirstPlayer();
            io.emit('gameEnded', {
                winner: currentGame.getWinner(),
                kills: p?.kills || 0
            });
            botInterval = null;
        }
    });
    
    socket.on('reset', () => {
        createNewGame();
        const player = currentGame.getFirstPlayer();
        if (player) {
            stateManager.queueUpdate(currentGame, player.id);
        }
        io.emit('gameReset', { message: 'Новая игра началась!' });
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключен:', socket.id);
        clients.delete(socket.id);
    });
});

setInterval(() => {
    const now = Date.now();
    clients.forEach((client, id) => {
        if (now - client.connectedAt > 3600000) {
            clients.delete(id);
        }
    });
}, 600000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎮 TANK ROYALE SERVER`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`📁 Public directory: ${path.join(__dirname, 'public')}`);
    console.log(`🚀 Server ready, waiting for connections...`);
});
