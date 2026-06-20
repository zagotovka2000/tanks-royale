// server/server.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

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

// Подключения
io.on('connection', (socket) => {
    console.log('🔌 Клиент подключен:', socket.id);
    
    // Отправка начального состояния
    const state = gameService.getStateForPlayer('player1');
    if (state) {
        socket.emit('gameState', state);
    }
    
    // Обработчики
    socket.on('moveRequest', (data) => {
        gameController.handleMoveRequest(socket, data);
    });
    
    socket.on('shootRequest', (data) => {
        gameController.handleShootRequest(socket, data);
    });
    
    socket.on('moveComplete', (data) => {
        gameController.handleMoveComplete(socket, data);
    });
    
    socket.on('reset', () => {
        gameController.handleReset();
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключен:', socket.id);
    });
});

// Запуск
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 TANK ROYALE SERVER на http://localhost:${PORT}`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('💥 Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Необработанный промис:', reason);
});
