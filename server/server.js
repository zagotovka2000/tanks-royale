// server/server.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ServerConfig = require('./config/serverConfig.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, ServerConfig.SOCKET);

// Статика
app.use('/public', express.static(ServerConfig.PATHS.public));
app.use('/css', express.static(path.join(ServerConfig.PATHS.public, 'css')));
app.use('/client', express.static(ServerConfig.PATHS.client));
app.use(express.static(ServerConfig.PATHS.public));

app.get('/', (req, res) => {
    res.sendFile(path.join(ServerConfig.PATHS.public, 'index.html'));
});

// Контроллер игры
const ServerGameController = require('./controllers/GameController.js');
const gameController = new ServerGameController(io);

// Подключения
io.on('connection', (socket) => {
    console.log('🔌 Клиент подключен:', socket.id);
    
    // Отправка начального состояния
    const state = gameController.getStateForPlayer('player1');
    if (state) socket.emit('gameState', state);
    
    // Обработчики
    socket.on('moveRequest', (data) => gameController.handleMoveRequest(socket, data));
    socket.on('shootRequest', (data) => gameController.handleShootRequest(socket, data));
    socket.on('moveComplete', (data) => gameController.handleMoveComplete(socket, data));
    socket.on('reset', () => gameController.handleReset());
    
    socket.on('disconnect', () => {
        console.log('🔌 Клиент отключен:', socket.id);
    });
});

// Запуск
const PORT = ServerConfig.PORT;
server.listen(PORT, ServerConfig.HOST, () => {
    console.log(`🎮 TANK ROYALE SERVER на http://localhost:${PORT}`);
});
