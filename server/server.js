// server/server.js - ИСПРАВЛЕНИЕ: РАЗДЕЛЬНЫЕ КУЛДАУНЫ И СИНХРОНИЗАЦИЯ

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

// ✅ ХРАНИЛИЩЕ ДЛЯ ПОДТВЕРЖДЕННЫХ ДВИЖЕНИЙ
var confirmedMoves = new Map();

// ✅ ФУНКЦИЯ ДЛЯ ПОДТВЕРЖДЕНИЯ ДВИЖЕНИЯ
function confirmMove(unitId, fromQ, fromR, toQ, toR) {
    confirmedMoves.set(unitId, {
        fromQ: fromQ,
        fromR: fromR,
        toQ: toQ,
        toR: toR,
        timestamp: Date.now(),
        confirmed: true
    });
}

// ✅ ФУНКЦИЯ ДЛЯ ОЧИСТКИ ПОДТВЕРЖДЕННЫХ ДВИЖЕНИЙ
function clearConfirmedMoves() {
    confirmedMoves.clear();
}

// ✅ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ ВСЕХ ПОДТВЕРЖДЕННЫХ ДВИЖЕНИЙ
function getAllConfirmedMoves() {
    var result = {};
    var keys = confirmedMoves.keys();
    for (var key of keys) {
        result[key] = confirmedMoves.get(key);
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
        // ✅ ДОБАВЛЯЕМ ПОДТВЕРЖДЕННЫЕ ДВИЖЕНИЯ
        state.confirmedMoves = getAllConfirmedMoves();
        io.emit('gameState', state);
    }
}

// ✅ ПРИ СОЗДАНИИ НОВОЙ ИГРЫ ОЧИЩАЕМ ДВИЖЕНИЯ
function createNewGame() {
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    
    // ✅ ОЧИЩАЕМ ПОДТВЕРЖДЕННЫЕ ДВИЖЕНИЯ
    clearConfirmedMoves();
    
    currentGame = new TankGame();
    console.log('🎮 Новая игра создана!');
    
    // ✅ БОТ-ИНТЕРВАЛ С РАЗДЕЛЬНЫМИ КУЛДАУНАМИ
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
            // Если бот выстрелил или двинулся
            io.emit('shootResult', result);
            
            // Проверяем, изменилась ли позиция бота
            var enemy = currentGame.enemies[0];
            if (enemy && positionsBefore[enemy.id]) {
                var before = positionsBefore[enemy.id];
                if (before.q !== enemy.q || before.r !== enemy.r) {
                    // ✅ ПОДТВЕРЖДАЕМ ДВИЖЕНИЕ БОТА
                    confirmMove(enemy.id, before.q, before.r, enemy.q, enemy.r);
                    console.log('🤖 Бот подтвержден:', enemy.id, 'с', before.q, before.r, 'на', enemy.q, enemy.r);
                }
            }
        }
        
        // ✅ ОТПРАВЛЯЕМ СОСТОЯНИЕ
        broadcastState();
        
        if (currentGame.checkWinner()) {
            clearInterval(botInterval);
            botInterval = null;
            io.emit('gameEnded', {
                winner: currentGame.winner,
                kills: currentGame.getFirstPlayer() ? currentGame.getFirstPlayer().kills : 0
            });
        }
    }, 1000); // КАЖДУЮ СЕКУНДУ
}

createNewGame();

io.on('connection', function(socket) {
    console.log('🔌 Клиент подключен:', socket.id);
    
    // Отправляем начальное состояние
    if (currentGame) {
        var player = currentGame.getFirstPlayer();
        if (player) {
            var state = currentGame.getStateForPlayer(player.id);
            if (state) {
                // ✅ ДОБАВЛЯЕМ ПОДТВЕРЖДЕННЫЕ ДВИЖЕНИЯ
                state.confirmedMoves = getAllConfirmedMoves();
                socket.emit('gameState', state);
            }
        }
    }
    
    // ✅ НОВЫЙ ОБРАБОТЧИК - moveRequest (вместо move)
    socket.on('moveRequest', function(data) {
        console.log('🚶 Запрос движения от', socket.id, 'на', data.q, data.r);
        
        if (!currentGame) {
            socket.emit('moveRejected', { 
                message: 'Игра не создана',
                reason: 'no_game'
            });
            return;
        }
        
        if (currentGame.gameOver) {
            socket.emit('moveRejected', { 
                message: 'Игра окончена',
                reason: 'game_over'
            });
            return;
        }
        
        var player = currentGame.getFirstPlayer();
        if (!player) {
            socket.emit('moveRejected', { 
                message: 'Игрок не найден',
                reason: 'no_player'
            });
            return;
        }
        
        if (!player.active) {
            socket.emit('moveRejected', { 
                message: 'Ваш танк уничтожен',
                reason: 'tank_destroyed'
            });
            return;
        }
        
        // ✅ ВАЛИДАЦИЯ НА СЕРВЕРЕ
        var fromQ = player.q;
        var fromR = player.r;
        
        // Проверяем кулдаун движения
        if (!currentGame.canMove(player)) {
            var remaining = currentGame.getRemainingMoveCooldown();
            socket.emit('moveRejected', {
                message: 'Кулдаун движения: ' + Math.ceil(remaining / 1000) + 'с',
                reason: 'cooldown',
                remaining: remaining
            });
            return;
        }
        
        // Проверяем смежность
        if (!HexUtils.areAdjacent(fromQ, fromR, data.q, data.r)) {
            socket.emit('moveRejected', {
                message: 'Можно двигаться только на соседнюю клетку',
                reason: 'not_adjacent'
            });
            return;
        }
        
        // Проверяем занятость
        var occupied = currentGame.getAllUnits().some(function(u) {
            return u.active && u !== player && u.q === data.q && u.r === data.r;
        });
        if (occupied) {
            socket.emit('moveRejected', {
                message: 'Клетка занята',
                reason: 'occupied'
            });
            return;
        }
        
        // ✅ ВЫПОЛНЯЕМ ДВИЖЕНИЕ НА СЕРВЕРЕ
        var moved = currentGame.moveToCell(player.id, data.q, data.r);
        if (moved) {
            // ✅ ПОДТВЕРЖДАЕМ ДВИЖЕНИЕ
            confirmMove(player.id, fromQ, fromR, data.q, data.r);
            
            console.log('✅ Движение подтверждено:', player.id, 'с', fromQ, fromR, 'на', data.q, data.r);
            
            // ✅ ОТПРАВЛЯЕМ ПОДТВЕРЖДЕНИЕ КЛИЕНТУ
            socket.emit('moveAccepted', {
                unitId: player.id,
                fromQ: fromQ,
                fromR: fromR,
                toQ: data.q,
                toR: data.r,
                direction: HexUtils.getDirection(fromQ, fromR, data.q, data.r)
            });
            
            // ✅ РАССЫЛАЕМ ОБНОВЛЕННОЕ СОСТОЯНИЕ ВСЕМ
            broadcastState();
        } else {
            socket.emit('moveRejected', {
                message: 'Неизвестная ошибка',
                reason: 'unknown'
            });
        }
    });
    
    // ✅ ОБРАБОТЧИК ДЛЯ ЗАВЕРШЕНИЯ АНИМАЦИИ
    socket.on('moveComplete', function(data) {
        console.log('🎬 Анимация завершена:', data.unitId);
        
        if (currentGame) {
            // Обновляем состояние только если это подтвержденное движение
            if (confirmedMoves.has(data.unitId)) {
                var move = confirmedMoves.get(data.unitId);
                if (move.toQ === data.toQ && move.toR === data.toR) {
                    // Удаляем из подтвержденных, так как анимация завершена
                    confirmedMoves.delete(data.unitId);
                    // Отправляем обновленное состояние
                    broadcastState();
                }
            }
        }
    });
    
    // ✅ ОБРАБОТЧИК ВЫСТРЕЛА
    socket.on('shootRequest', function(data) {
        console.log('🔫 Запрос выстрела от', socket.id, 'по', data.q, data.r);
        
        if (!currentGame) {
            socket.emit('shootRejected', { message: 'Игра не создана' });
            return;
        }
        
        if (currentGame.gameOver) {
            socket.emit('shootRejected', { message: 'Игра окончена' });
            return;
        }
        
        var player = currentGame.getFirstPlayer();
        if (!player || !player.active) {
            socket.emit('shootRejected', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        // ✅ ПРОВЕРЯЕМ КУЛДАУН СТРЕЛЬБЫ
        if (!currentGame.canShoot(player)) {
            var remaining = currentGame.getRemainingShootCooldown();
            socket.emit('shootRejected', {
                message: 'Перезарядка: ' + Math.ceil(remaining / 1000) + 'с',
                remaining: remaining
            });
            return;
        }
        
        var result = currentGame.shootAtCell(player.id, data.q, data.r);
        
        // ✅ ОТПРАВЛЯЕМ РЕЗУЛЬТАТ ВСЕМ
        io.emit('shootResult', result);
        
        // ✅ ОБНОВЛЯЕМ СОСТОЯНИЕ
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
    
    // ✅ СТАРЫЙ ОБРАБОТЧИК ДЛЯ СОВМЕСТИМОСТИ (shoot)
    socket.on('shoot', function(data) {
        // Преобразуем в новый формат
        socket.emit('shootRequest', data);
    });
    
    // ✅ СТАРЫЙ ОБРАБОТЧИК ДЛЯ СОВМЕСТИМОСТИ (move)
    socket.on('move', function(data) {
        // Преобразуем в новый формат
        socket.emit('moveRequest', data);
    });
    
    // ✅ ОБРАБОТЧИК ДЛЯ СБРОСА
    socket.on('reset', function() {
        console.log('🔄 Сброс игры от', socket.id);
        clearConfirmedMoves();
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
