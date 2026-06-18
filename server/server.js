// server/server.js

var express = require('express');
var http = require('http');
var socketIo = require('socket.io');
var path = require('path');

// Загружаем TankGame
var { TankGame } = require('../client/game/TankGame.js');

var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// ✅ Корневая директория проекта
var rootPath = path.join(__dirname, '..');
var publicPath = path.join(rootPath, 'public');
var clientPath = path.join(rootPath, 'client');

console.log('📁 Root path:', rootPath);
console.log('📁 Public path:', publicPath);
console.log('📁 Client path:', clientPath);

// ✅ Раздаем статику из public (CSS, изображения)
app.use('/public', express.static(publicPath));
app.use('/css', express.static(path.join(publicPath, 'css')));

// ✅ Раздаем клиентские скрипты (JS)
app.use('/client', express.static(clientPath));

// ✅ Главная страница - index.html из public
app.get('/', function(req, res) {
    var indexPath = path.join(publicPath, 'index.html');
    console.log('📄 Serving index.html from:', indexPath);
    res.sendFile(indexPath);
});

// ✅ Если файл не найден, пробуем из public
app.use(express.static(publicPath));

// Игровое состояние
var currentGame = null;
var botInterval = null;

function createNewGame() {
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    
    currentGame = new TankGame();
    console.log('🎮 Новая игра создана!');
    
    botInterval = setInterval(function() {
        if (!currentGame) return;
        
        if (currentGame.gameOver) {
            clearInterval(botInterval);
            botInterval = null;
            return;
        }
        
        var result = currentGame.botAction();
        if (result) {
            io.emit('shootResult', result);
        }
        
        if (currentGame.checkWinner()) {
            clearInterval(botInterval);
            botInterval = null;
            
            var player = currentGame.getFirstPlayer();
            io.emit('gameEnded', {
                winner: currentGame.winner,
                kills: player ? player.kills : 0
            });
        }
        
        var player = currentGame.getFirstPlayer();
        if (player) {
            var state = currentGame.getStateForPlayer(player.id);
            if (state) {
                io.emit('gameState', state);
            }
        }
    }, 2000);
}

createNewGame();

io.on('connection', function(socket) {
    console.log('🔌 Клиент подключен:', socket.id);
    
    if (currentGame) {
        var player = currentGame.getFirstPlayer();
        if (player) {
            var state = currentGame.getStateForPlayer(player.id);
            if (state) {
                socket.emit('gameState', state);
            }
        }
    }
    
    socket.on('shoot', function(data) {
        console.log('🔫 Выстрел от', socket.id, 'по', data.q, data.r);
        
        if (!currentGame) {
            socket.emit('error', { message: 'Игра не создана' });
            return;
        }
        
        if (currentGame.gameOver) {
            socket.emit('error', { message: 'Игра окончена' });
            return;
        }
        
        var player = currentGame.getFirstPlayer();
        if (!player) {
            socket.emit('error', { message: 'Игрок не найден' });
            return;
        }
        
        if (!player.active) {
            socket.emit('error', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        var result = currentGame.shootAtCell(player.id, data.q, data.r);
        io.emit('shootResult', result);
        
        if (currentGame.checkWinner()) {
            if (botInterval) {
                clearInterval(botInterval);
                botInterval = null;
            }
            io.emit('gameEnded', {
                winner: currentGame.winner,
                kills: player.kills || 0
            });
        }
    });
    
    socket.on('move', function(data) {
        console.log('🚶 Движение от', socket.id, 'на', data.q, data.r);
        
        if (!currentGame) {
            socket.emit('error', { message: 'Игра не создана' });
            return;
        }
        
        if (currentGame.gameOver) {
            socket.emit('error', { message: 'Игра окончена' });
            return;
        }
        
        var player = currentGame.getFirstPlayer();
        if (!player) {
            socket.emit('error', { message: 'Игрок не найден' });
            return;
        }
        
        if (!player.active) {
            socket.emit('error', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        var moved = currentGame.moveToCell(player.id, data.q, data.r);
        if (moved) {
            socket.emit('actionAccepted', { type: 'move' });
            
            var state = currentGame.getStateForPlayer(player.id);
            if (state) {
                io.emit('gameState', state);
            }
        } else {
            var cooldown = currentGame.getRemainingCooldown();
            if (cooldown > 0) {
                socket.emit('error', { 
                    message: 'Перезарядка: ' + Math.ceil(cooldown / 1000) + ' сек' 
                });
            } else {
                socket.emit('error', { message: 'Нельзя туда двигаться' });
            }
        }
    });
    
    socket.on('reset', function() {
        console.log('🔄 Сброс игры от', socket.id);
        createNewGame();
        io.emit('gameReset', { message: 'Новая игра началась!' });
    });
    
    socket.on('disconnect', function() {
        console.log('🔌 Клиент отключен:', socket.id);
    });
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', function() {
    console.log('\n🎮 TANK ROYALE SERVER');
    console.log('📍 http://localhost:' + PORT);
    console.log('📁 Root directory:', rootPath);
    console.log('📁 Public directory:', publicPath);
    console.log('📁 Client directory:', clientPath);
    console.log('🚀 Сервер запущен!\n');
});
