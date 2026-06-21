// server/server.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ МНОЖЕСТВА ИГРОКОВ

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

// Статика
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')));
app.use('/client', express.static(path.join(__dirname, '..', 'client')));
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Контроллеры
const GameService = require('./services/GameService.js');
const BotController = require('./controllers/BotController.js');
const ServerGameController = require('./controllers/GameController.js');

const gameService = new GameService();
gameService.createGame();

const botController = new BotController(gameService, io);
botController.start();

const gameController = new ServerGameController(io, gameService, botController);

// Хранение подключенных игроков
const connectedPlayers = new Map();

// ===== ОБРАБОТКА ПОДКЛЮЧЕНИЙ =====
io.on('connection', (socket) => {
    console.log('🔌 Клиент подключен:', socket.id);
    
    // Регистрация игрока
    socket.on('register', (data) => {
        const playerId = data.playerId || 'player_' + socket.id;
        const playerName = data.name || 'Игрок';
        const team = data.team || 'player';
        
        // Добавляем игрока в игру
        const player = gameService.addPlayer(playerId, playerName, team);
        if (player) {
            connectedPlayers.set(socket.id, { playerId, team });
            console.log(`👤 Игрок зарегистрирован: ${playerName} (${playerId})`);
            
            // Отправляем обновленное состояние
            const state = gameService.getStateForPlayer('player1');
            if (state) {
                socket.emit('gameState', state);
            }
        }
    });
    
    // Отправка начального состояния
    const state = gameService.getStateForPlayer('player1');
    if (state) {
        socket.emit('gameState', state);
    }
    
    // ===== ОБРАБОТЧИКИ =====
    socket.on('moveRequest', (data) => {
        // Определяем, какой игрок отправляет запрос
        const connection = connectedPlayers.get(socket.id);
        if (connection && connection.playerId) {
            data.playerId = connection.playerId;
        }
        gameController.handleMoveRequest(socket, data);
    });
    
    socket.on('shootRequest', (data) => {
        const connection = connectedPlayers.get(socket.id);
        if (connection && connection.playerId) {
            data.playerId = connection.playerId;
        }
        gameController.handleShootRequest(socket, data);
    });
    
    // ✅ Добавляем обработку ошибок сокета
    socket.on('error', (error) => {
        console.error('❌ Ошибка сокета:', error);
    });
    
    socket.on('disconnect', () => {
        const connection = connectedPlayers.get(socket.id);
        if (connection) {
            const playerId = connection.playerId;
            gameService.currentGame?.removePlayer(playerId);
            connectedPlayers.delete(socket.id);
            console.log(`👤 Игрок отключен: ${playerId}`);
            
            // Обновляем состояние для всех
            const state = gameService.getStateForPlayer('player1');
            if (state) {
                io.emit('gameState', state);
            }
        }
        console.log('🔌 Клиент отключен:', socket.id);
    });
});

// ===== API ДЛЯ TELEGRAM =====
app.use(express.json());

// Добавление бота через API
app.post('/api/bot/add', (req, res) => {
    const botData = req.body;
    const bot = gameService.addBot(botData);
    if (bot) {
        res.json({ success: true, bot });
    } else {
        res.status(400).json({ success: false, error: 'Не удалось добавить бота' });
    }
});

// Получение состояния игры
app.get('/api/state', (req, res) => {
    const state = gameService.getStateForPlayer('player1');
    res.json(state);
});

// Сброс игры через API
app.post('/api/reset', (req, res) => {
    gameController.handleReset();
    res.json({ success: true });
});

// ===== ЗАПУСК =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 TANK ROYALE SERVER на http://localhost:${PORT}`);
});

// ===== ОБРАБОТКА ОШИБОК =====
process.on('uncaughtException', (error) => {
    console.error('💥 Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Необработанный промис:', reason);
});
