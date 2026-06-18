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

// ✅ ХРАНИМ ТОЛЬКО ПОСЛЕДНЕЕ ДВИЖЕНИЕ ДЛЯ КАЖДОГО ТАНКА
var lastMoves = new Map();

// ✅ ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ПОСЛЕДНЕГО ДВИЖЕНИЯ
function setLastMove(unitId, fromQ, fromR, toQ, toR) {
    lastMoves.set(unitId, {
        fromQ: fromQ,
        fromR: fromR,
        toQ: toQ,
        toR: toR,
        timestamp: Date.now()
    });
}

// ✅ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ПОСЛЕДНЕГО ДВИЖЕНИЯ
function getLastMove(unitId) {
    return lastMoves.get(unitId) || null;
}

// ✅ ФУНКЦИЯ ДЛЯ ОЧИСТКИ ДВИЖЕНИЙ
function clearLastMoves() {
    lastMoves.clear();
}

// ✅ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ПОСЛЕДНИХ ДВИЖЕНИЙ
function getAllLastMoves() {
    var result = {};
    var keys = lastMoves.keys();
    for (var key of keys) {
        result[key] = lastMoves.get(key);
    }
    return result;
}

// ✅ ФУНКЦИЯ ДЛЯ ОТПРАВКИ СОСТОЯНИЯ ВСЕМ КЛИЕНТАМ
function broadcastState() {
    if (!currentGame) return;
    
    var player = currentGame.getFirstPlayer();
    if (!player) return;
    
    var state = currentGame.getStateForPlayer(player.id);
    if (state) {
        // Добавляем последние движения
        state.lastMoves = getAllLastMoves();
        io.emit('gameState', state);
    }
}

// ✅ ПРИ СОЗДАНИИ НОВОЙ ИГРЫ ОЧИЩАЕМ ДВИЖЕНИЯ
function createNewGame() {
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    
    // ✅ ОЧИЩАЕМ ПОСЛЕДНИЕ ДВИЖЕНИЯ
    clearLastMoves();
    
    currentGame = new TankGame();
    console.log('🎮 Новая игра создана!');
    
    // ✅ ОБНОВЛЕННЫЙ БОТ-ИНТЕРВАЛ - КАЖДУЮ СЕКУНДУ
    botInterval = setInterval(function() {
        if (!currentGame) return;
        
        if (currentGame.gameOver) {
            clearInterval(botInterval);
            botInterval = null;
            return;
        }
        
        // Сохраняем текущие позиции
        var allUnits = currentGame.getAllUnits();
        var positionsBefore = {};
        for (var i = 0; i < allUnits.length; i++) {
            var unit = allUnits[i];
            positionsBefore[unit.id] = { q: unit.q, r: unit.r };
        }
        
        // Бот делает действие
        var result = currentGame.botAction();
        if (result) {
            io.emit('shootResult', result);
        }
        
        // Проверяем, кто изменил позицию
        var allUnitsAfter = currentGame.getAllUnits();
        var hasMovement = false;
        for (var i = 0; i < allUnitsAfter.length; i++) {
            var unit = allUnitsAfter[i];
            var before = positionsBefore[unit.id];
            if (before) {
                if (before.q !== unit.q || before.r !== unit.r) {
                    setLastMove(unit.id, before.q, before.r, unit.q, unit.r);
                    hasMovement = true;
                    console.log('📝 Движение:', unit.id, 'с', before.q, before.r, 'на', unit.q, unit.r);
                }
            }
        }
        
        // ✅ ОТПРАВЛЯЕМ СОСТОЯНИЕ КАЖДЫЙ РАЗ, КОГДА ЕСТЬ ДВИЖЕНИЕ
        if (hasMovement) {
            broadcastState();
        }
        
        if (currentGame.checkWinner()) {
            clearInterval(botInterval);
            botInterval = null;
            io.emit('gameEnded', {
                winner: currentGame.winner,
                kills: currentGame.getFirstPlayer() ? currentGame.getFirstPlayer().kills : 0
            });
        }
    }, 1000); // ✅ КАЖДУЮ СЕКУНДУ
}

createNewGame();

io.on('connection', function(socket) {
    console.log('🔌 Клиент подключен:', socket.id);
    
    if (currentGame) {
        var player = currentGame.getFirstPlayer();
        if (player) {
            // ✅ ОТПРАВЛЯЕМ СОСТОЯНИЕ С ПОЗИЦИЯМИ И ДВИЖЕНИЯМИ
            var state = currentGame.getStateForPlayer(player.id);
            if (state) {
                // Добавляем последние позиции
                var allUnits = currentGame.getAllUnits();
                var lastPositions = {};
                for (var i = 0; i < allUnits.length; i++) {
                    var unit = allUnits[i];
                    var lastPos = currentGame.getLastPosition(unit.id);
                    if (lastPos) {
                        lastPositions[unit.id] = lastPos;
                    }
                }
                state.lastPositions = lastPositions;
                
                // ✅ ДОБАВЛЯЕМ ПОСЛЕДНИЕ ДВИЖЕНИЯ
                state.lastMoves = getAllLastMoves();
                
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
        
        // ✅ ОТПРАВЛЯЕМ ОБНОВЛЕННОЕ СОСТОЯНИЕ ПОСЛЕ ВЫСТРЕЛА
        broadcastState();
        
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
        
        // ✅ СОХРАНЯЕМ ПОЗИЦИЮ ДО ДВИЖЕНИЯ
        var fromQ = player.q;
        var fromR = player.r;
        
        var moved = currentGame.moveToCell(player.id, data.q, data.r);
        if (moved) {
            // ✅ СОХРАНЯЕМ ПОСЛЕДНЕЕ ДВИЖЕНИЕ
            setLastMove(player.id, fromQ, fromR, data.q, data.r);
            console.log('📝 Движение игрока в историю:', player.id, 'с', fromQ, fromR, 'на', data.q, data.r);
            
            socket.emit('actionAccepted', { type: 'move' });
            
            // ✅ ОТПРАВЛЯЕМ ОБНОВЛЕННОЕ СОСТОЯНИЕ ПОСЛЕ ДВИЖЕНИЯ
            broadcastState();
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
    
    // ✅ ОБРАБОТЧИК ЗАВЕРШЕНИЯ ДВИЖЕНИЯ
    socket.on('moveComplete', function(data) {
        console.log('🚶 Движение завершено:', data.tankId, 'с', data.fromQ, data.fromR, 'на', data.toQ, data.toR);
        
        // Сохраняем последнее движение для синхронизации с другими клиентами
        if (currentGame) {
            setLastMove(data.tankId, data.fromQ, data.fromR, data.toQ, data.toR);
            
            // Отправляем обновленное состояние всем клиентам
            broadcastState();
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
