// client/controllers/GameController.js - ИСПРАВЛЕННЫЙ

function GameController(scene, socket) {
   this.scene = scene;
   this.socket = socket;
   this.gameInstance = null;
   this.gameState = null;
   this.isInitialized = false;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks = new Map();
   
   this._cachedCooldowns = {
       move: 0,
       shoot: 0
   };
   this._lastCooldownUpdate = 0;
}

GameController.prototype.init = function() {
   var TankGameClass = window.TankGame || 
                       (typeof require !== 'undefined' ? require('../game/TankGame.js').TankGame : null);
   
   if (!TankGameClass) {
       console.error('❌ TankGame не найден!');
       return this;
   }
   
   console.log('✅ Создание GameController с TankGame');
   this.gameInstance = new TankGameClass();
   this.isInitialized = true;
   this.updateUI();
   
   if (this.socket) {
       this.socket.on('moveAccepted', this.onMoveAccepted.bind(this));
       this.socket.on('moveRejected', this.onMoveRejected.bind(this));
       this.socket.on('shootResult', this.onShootResult.bind(this));
       this.socket.on('shootRejected', this.onShootRejected.bind(this));
       this.socket.on('gameState', this.onGameState.bind(this));
       this.socket.on('gameReset', this.onGameReset.bind(this));
       this.socket.on('gameEnded', this.onGameEnded.bind(this));
   }
   
   return this;
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ requestMove - ДЛЯ ИГРОКА
// ============================================
GameController.prototype.requestMove = function(q, r, callback) {
   console.log('🎯 requestMove вызван для игрока на', q, r);
   
   if (!this.gameInstance) {
       console.error('❌ gameInstance не создан');
       if (callback) callback(false, { message: 'Игра не инициализирована' });
       return false;
   }
   
   // ✅ ПОЛУЧАЕМ ИГРОКА
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       console.error('❌ Игрок не найден');
       if (callback) callback(false, { message: 'Игрок не найден' });
       return false;
   }
   
   console.log('🎯 Текущая позиция игрока:', player.q, player.r);
   
   // ✅ ПРОВЕРЯЕМ КУЛДАУН
   if (!this.canMove(player.id)) {
       var remaining = this.getRemainingMoveCooldown(player.id);
       console.warn('⏱️ Кулдаун движения:', remaining);
       if (callback) callback(false, { message: 'Кулдаун движения', remaining: remaining });
       return false;
   }
   
   // ✅ ВЫПОЛНЯЕМ ДВИЖЕНИЕ ЛОКАЛЬНО (для локальной игры)
   if (!this.socket || !this.socket.connected) {
       console.log('🎯 Локальное движение игрока на', q, r);
       return this.executeMoveLocally(q, r, callback);
   }
   
   // ✅ ДЛЯ СЕТЕВОЙ ИГРЫ
   if (this.isWaitingForResponse) {
       if (callback) callback(false, { message: 'Ожидание ответа' });
       return false;
   }
   
   this.isWaitingForResponse = true;
   var requestId = Date.now() + '_' + player.id;
   this.moveCallbacks.set(requestId, callback);
   
   this.socket.emit('moveRequest', {
       q: q,
       r: r,
       requestId: requestId,
       fromQ: player.q,
       fromR: player.r
   });
   
   setTimeout(function() {
       if (this.isWaitingForResponse) {
           this.isWaitingForResponse = false;
           var cb = this.moveCallbacks.get(requestId);
           if (cb) {
               cb(false, { message: 'Таймаут' });
               this.moveCallbacks.delete(requestId);
           }
       }
   }.bind(this), 3000);
   
   return true;
};

// client/controllers/GameController.js - ИСПРАВЛЕННЫЙ

GameController.prototype.executeMoveLocally = function(q, r, callback) {
   console.log('🎯 executeMoveLocally на', q, r);
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       console.error('❌ Игрок не найден');
       if (callback) callback(false, { message: 'Игрок не найден' });
       return false;
   }
   
   var fromQ = player.q;
   var fromR = player.r;
   
   console.log('🎯 Движение с', fromQ, fromR, 'на', q, r);
   
   if (!this.canMove(player.id)) {
       var remaining = this.getRemainingMoveCooldown(player.id);
       console.warn('⏱️ Кулдаун движения:', remaining);
       if (callback) callback(false, { message: 'Кулдаун движения', remaining: remaining });
       return false;
   }
   
   var moved = this.gameInstance.moveToCell(player.id, q, r);
   console.log('🎯 Результат движения:', moved);
   
   if (!moved) {
       console.warn('❌ Движение невозможно');
       if (callback) callback(false, { message: 'Движение невозможно' });
       return false;
   }
   
   // ✅ НЕ ОБНОВЛЯЕМ СЦЕНУ СРАЗУ - даем анимации завершиться
   // this.updateGameState();  // ← УБИРАЕМ МГНОВЕННОЕ ОБНОВЛЕНИЕ
   
   // ✅ ПРОСТО ОБНОВЛЯЕМ UI И ВОЗВРАЩАЕМ РЕЗУЛЬТАТ
   this.updateUI();
   
   if (callback) {
       callback(true, { 
           fromQ: fromQ, 
           fromR: fromR, 
           toQ: q, 
           toR: r,
           unitId: player.id 
       });
   }
   
   // ✅ ЗАПУСКАЕМ АНИМАЦИЮ ЧЕРЕЗ СЦЕНУ
   if (this.scene && this.scene.isReady) {
       // Обновляем состояние сцены с новыми данными
       this.updateGameState();
   }
   
   return true;
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ updateGameState
// ============================================
GameController.prototype.updateGameState = function() {
   if (!this.gameInstance) {
       console.warn('⚠️ gameInstance не создан');
       return;
   }
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       console.warn('⚠️ Игрок не найден');
       return;
   }
   
   console.log('🔄 updateGameState: игрок на', player.q, player.r);
   
   // Сохраняем последние позиции
   var allUnits = this.gameInstance.getAllUnits();
   for (var i = 0; i < allUnits.length; i++) {
       var unit = allUnits[i];
       if (!this.gameInstance.getLastPosition(unit.id)) {
           this.gameInstance.setLastPosition(unit.id, unit.q, unit.r);
       }
   }
   
   this.gameState = this.gameInstance.getStateForPlayer(player.id);
   
   if (this.gameInstance.checkWinner()) {
       this.gameState.gameOver = true;
       this.gameState.winner = this.gameInstance.winner;
       this.onGameEnd();
   }
   
   // ✅ ОБНОВЛЯЕМ СЦЕНУ
   if (this.scene && this.scene.isReady && typeof this.scene.updateGameState === 'function') {
       console.log('🔄 Обновление сцены с состоянием');
       this.scene.updateGameState(this.gameState);
   } else if (this.scene) {
       this.pendingState = this.gameState;
       console.log('⏳ Сцена еще не готова, состояние сохранено');
   } else {
       console.warn('⚠️ scene не установлен в GameController');
   }
};

// ============================================
// ОСТАЛЬНЫЕ МЕТОДЫ (без изменений)
// ============================================

GameController.prototype.getRemainingMoveCooldown = function(unitId) {
   if (!this.gameInstance) return 0;
   if (unitId && typeof this.gameInstance.getRemainingMoveCooldown === 'function') {
       return this.gameInstance.getRemainingMoveCooldown(unitId);
   }
   var player = this.gameInstance.getFirstPlayer();
   if (player && typeof this.gameInstance.getRemainingMoveCooldown === 'function') {
       return this.gameInstance.getRemainingMoveCooldown(player.id);
   }
   return 0;
};

GameController.prototype.getRemainingShootCooldown = function(unitId) {
   if (!this.gameInstance) return 0;
   if (unitId && typeof this.gameInstance.getRemainingShootCooldown === 'function') {
       return this.gameInstance.getRemainingShootCooldown(unitId);
   }
   var player = this.gameInstance.getFirstPlayer();
   if (player && typeof this.gameInstance.getRemainingShootCooldown === 'function') {
       return this.gameInstance.getRemainingShootCooldown(player.id);
   }
   return 0;
};

GameController.prototype.canShoot = function(unitId) {
   if (!this.gameInstance) return false;
   if (unitId) {
       var unit = this.gameInstance.getAllUnits().find(function(u) { 
           return u.id === unitId && u.active; 
       });
       if (!unit) return false;
       if (typeof this.gameInstance.canShoot === 'function') {
           return this.gameInstance.canShoot(unit);
       }
   }
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   if (typeof this.gameInstance.canShoot === 'function') {
       return this.gameInstance.canShoot(player);
   }
   return true;
};

GameController.prototype.canMove = function(unitId) {
   if (!this.gameInstance) return false;
   if (unitId) {
       var unit = this.gameInstance.getAllUnits().find(function(u) { 
           return u.id === unitId && u.active; 
       });
       if (!unit) return false;
       if (typeof this.gameInstance.canMove === 'function') {
           return this.gameInstance.canMove(unit);
       }
   }
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   if (typeof this.gameInstance.canMove === 'function') {
       return this.gameInstance.canMove(player);
   }
   return true;
};

GameController.prototype.shootAt = function(q, r) {
   if (!this.socket || !this.socket.connected) {
       return this.executeShootLocally(q, r);
   }
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return { success: false, message: 'Игрок не найден' };
   
   if (!this.canShoot(player.id)) {
       var remaining = this.getRemainingShootCooldown(player.id);
       return { success: false, message: 'Перезарядка', cooldown: remaining };
   }
   
   this.socket.emit('shootRequest', {
       q: q,
       r: r,
       playerId: player.id
   });
   
   return { success: true, pending: true };
};

GameController.prototype.executeShootLocally = function(q, r) {
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return { success: false, message: 'Игрок не найден' };
   
   if (!this.canShoot(player.id)) {
       var remaining = this.getRemainingShootCooldown(player.id);
       return { success: false, message: 'Перезарядка', cooldown: remaining };
   }
   
   var result = this.gameInstance.shootAtCell(player.id, q, r);
   this.updateGameState();
   this.updateUI();
   
   if (this.scene && typeof this.scene.handleShootResult === 'function') {
       this.scene.handleShootResult(result);
   }
   
   return result;
};

GameController.prototype.onMoveAccepted = function(data) {
   console.log('✅ Движение подтверждено:', data);
   this.isWaitingForResponse = false;
   
   var player = this.gameInstance.getFirstPlayer();
   if (player && player.id === data.unitId) {
       var fromQ = player.q;
       var fromR = player.r;
       
       player.q = data.toQ;
       player.r = data.toR;
       player.direction = data.direction || 'right';
       
       this.gameInstance.setLastPosition(player.id, fromQ, fromR);
   }
   
   this.updateGameState();
   this.updateUI();
   
   var requestId = data.requestId || '';
   var cb = this.moveCallbacks.get(requestId);
   if (cb) {
       cb(true, data);
       this.moveCallbacks.delete(requestId);
   }
};

GameController.prototype.onMoveRejected = function(data) {
   console.log('❌ Движение отклонено:', data);
   this.isWaitingForResponse = false;
   
   var requestId = data.requestId || '';
   var cb = this.moveCallbacks.get(requestId);
   if (cb) {
       cb(false, data);
       this.moveCallbacks.delete(requestId);
   }
};

GameController.prototype.onShootResult = function(result) {
   console.log('🎯 Результат выстрела:', result);
   this.updateGameState();
   this.updateUI();
   
   if (this.scene && typeof this.scene.handleShootResult === 'function') {
       this.scene.handleShootResult(result);
   }
};

GameController.prototype.onShootRejected = function(data) {
   console.log('❌ Выстрел отклонен:', data);
};

GameController.prototype.onGameState = function(state) {
   console.log('📥 Получено состояние от сервера');
   this.gameState = state;
   if (this.scene && this.scene.isReady && typeof this.scene.updateGameState === 'function') {
       this.scene.updateGameState(state);
   }
   this.updateUI();
};

GameController.prototype.onGameReset = function(data) {
   console.log('🔄 Сброс игры:', data);
   this.resetGame();
};

GameController.prototype.onGameEnded = function(data) {
   console.log('🏁 Игра окончена:', data);
   if (this.gameInstance) {
       this.gameInstance.gameOver = true;
       this.gameInstance.winner = data.winner;
   }
   this.updateGameState();
   this.onGameEnd();
};

GameController.prototype.updateUI = function() {
   if (!this.gameState || !this.gameState.myTank) {
       var hpEl = document.getElementById('hpValue');
       var killsEl = document.getElementById('killsValue');
       var enemiesEl = document.getElementById('enemiesValue');
       if (hpEl) hpEl.textContent = '—';
       if (killsEl) killsEl.textContent = '—';
       if (enemiesEl) enemiesEl.textContent = '—';
       return;
   }
   
   var tank = this.gameState.myTank;
   var hpEl = document.getElementById('hpValue');
   var killsEl = document.getElementById('killsValue');
   var enemiesEl = document.getElementById('enemiesValue');
   var cooldownFill = document.getElementById('cooldownFill');
   var cooldownText = document.getElementById('cooldownText');
   
   if (hpEl) hpEl.textContent = Math.ceil(tank.hp) + '/' + tank.maxHp;
   if (killsEl) killsEl.textContent = tank.kills || 0;
   if (enemiesEl) enemiesEl.textContent = this.gameState.enemies ? this.gameState.enemies.length : 0;
   
   var cooldown = this.getRemainingShootCooldown(tank.id);
   var moveCooldown = this.getRemainingMoveCooldown(tank.id);
   var displayCooldown = Math.max(cooldown, moveCooldown);
   
   if (cooldownFill) {
       var maxCooldown = 2500;
       var percent = Math.min(100, (displayCooldown / maxCooldown) * 100);
       cooldownFill.style.width = percent + '%';
       cooldownFill.style.background = displayCooldown > 0 ? '#e94560' : '#4caf50';
   }
   
   if (cooldownText) {
       if (displayCooldown > 0) {
           cooldownText.textContent = Math.ceil(displayCooldown / 1000) + 'с';
           cooldownText.style.color = '#e94560';
       } else {
           cooldownText.textContent = 'готов';
           cooldownText.style.color = '#4caf50';
       }
   }
};

GameController.prototype.isGameOver = function() {
   return this.gameInstance ? this.gameInstance.gameOver : false;
};

GameController.prototype.botAction = function() {
   if (!this.gameInstance || this.gameInstance.gameOver) return null;
   return this.gameInstance.botAction();
};

GameController.prototype.onGameEnd = function() {
   var winner = this.gameInstance ? this.gameInstance.winner : 'Ничья';
   var overlay = document.getElementById('gameover');
   var winnerText = document.getElementById('winnerText');
   
   if (overlay) overlay.style.display = 'flex';
   if (winnerText) winnerText.textContent = winner;
};

GameController.prototype.resetGame = function() {
   var TankGameClass = window.TankGame;
   if (!TankGameClass) {
       console.error('❌ TankGame не найден для сброса!');
       return;
   }
   
   this.gameInstance = new TankGameClass();
   this.gameState = null;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks.clear();
   
   var overlay = document.getElementById('gameover');
   if (overlay) overlay.style.display = 'none';
   
   this.updateGameState();
   this.updateUI();
};

GameController.prototype.destroy = function() {
   if (this.socket) {
       this.socket.off('moveAccepted');
       this.socket.off('moveRejected');
       this.socket.off('shootResult');
       this.socket.off('shootRejected');
       this.socket.off('gameState');
       this.socket.off('gameReset');
       this.socket.off('gameEnded');
   }
   this.gameInstance = null;
   this.gameState = null;
   this.scene = null;
   this.socket = null;
   this.isInitialized = false;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks.clear();
};

// Экспорт
if (typeof window !== 'undefined') {
   window.GameController = GameController;
}
