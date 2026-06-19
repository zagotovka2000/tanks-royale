// client/controllers/GameController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С ИНДИВИДУАЛЬНЫМИ КУЛДАУНАМИ

function GameController(scene, socket) {
   this.scene = scene;
   this.socket = socket;
   this.gameInstance = null;
   this.gameState = null;
   this.isInitialized = false;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks = new Map();
   
   // Кэш для кулдаунов
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
       console.log('🔍 window.TankGame:', window.TankGame);
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
// ✅ МЕТОДЫ КУЛДАУНОВ С UNIT ID
// ============================================

GameController.prototype.getRemainingCooldown = function(unitId) {
   if (!this.gameInstance) return 0;
   if (unitId && typeof this.gameInstance.getRemainingCooldown === 'function') {
       return this.gameInstance.getRemainingCooldown(unitId);
   }
   // Fallback для совместимости
   return this.getRemainingMoveCooldown(unitId) || this.getRemainingShootCooldown(unitId) || 0;
};

GameController.prototype.getRemainingMoveCooldown = function(unitId) {
   if (!this.gameInstance) return 0;
   if (unitId && typeof this.gameInstance.getRemainingMoveCooldown === 'function') {
       return this.gameInstance.getRemainingMoveCooldown(unitId);
   }
   // Fallback - используем первого игрока
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
   // Fallback - используем первого игрока
   var player = this.gameInstance.getFirstPlayer();
   if (player && typeof this.gameInstance.getRemainingShootCooldown === 'function') {
       return this.gameInstance.getRemainingShootCooldown(player.id);
   }
   return 0;
};

GameController.prototype.canShoot = function(unitId) {
   if (!this.gameInstance) return false;
   
   // Если передан unitId - используем его
   if (unitId) {
       var unit = this.gameInstance.getAllUnits().find(function(u) { 
           return u.id === unitId && u.active; 
       });
       if (!unit) return false;
       if (typeof this.gameInstance.canShoot === 'function') {
           return this.gameInstance.canShoot(unit);
       }
   }
   
   // Fallback - используем первого игрока
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   if (typeof this.gameInstance.canShoot === 'function') {
       return this.gameInstance.canShoot(player);
   }
   return true;
};

GameController.prototype.canMove = function(unitId) {
   if (!this.gameInstance) return false;
   
   // Если передан unitId - используем его
   if (unitId) {
       var unit = this.gameInstance.getAllUnits().find(function(u) { 
           return u.id === unitId && u.active; 
       });
       if (!unit) return false;
       if (typeof this.gameInstance.canMove === 'function') {
           return this.gameInstance.canMove(unit);
       }
   }
   
   // Fallback - используем первого игрока
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   if (typeof this.gameInstance.canMove === 'function') {
       return this.gameInstance.canMove(player);
   }
   return true;
};

GameController.prototype.updateCooldownCache = function() {
   if (!this.gameInstance) return;
   
   var now = Date.now();
   if (now - this._lastCooldownUpdate > 50) {
       var player = this.gameInstance.getFirstPlayer();
       if (player) {
           this._cachedCooldowns.move = this.getRemainingMoveCooldown(player.id);
           this._cachedCooldowns.shoot = this.getRemainingShootCooldown(player.id);
       } else {
           this._cachedCooldowns.move = 0;
           this._cachedCooldowns.shoot = 0;
       }
       this._lastCooldownUpdate = now;
   }
};

// ============================================
// ЗАПРОС ДВИЖЕНИЯ
// ============================================

GameController.prototype.requestMove = function(q, r, callback) {
   if (!this.socket || !this.socket.connected) {
       return this.executeMoveLocally(q, r, callback);
   }
   
   if (this.isWaitingForResponse) {
       console.warn('⏳ Ожидание ответа от сервера');
       if (callback) callback(false, { message: 'Ожидание ответа' });
       return false;
   }
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       if (callback) callback(false, { message: 'Игрок не найден' });
       return false;
   }
   
   // ✅ ИСПОЛЬЗУЕМ player.id ДЛЯ КУЛДАУНА
   if (!this.canMove(player.id)) {
       var remaining = this.getRemainingMoveCooldown(player.id);
       if (this.scene && this.scene.inputController) {
           this.scene.inputController.showMessage('⏱️ Кулдаун движения: ' + Math.ceil(remaining / 1000) + 'с');
       }
       if (callback) callback(false, { message: 'Кулдаун движения', remaining: remaining });
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
           console.warn('⏳ Таймаут ожидания ответа');
       }
   }.bind(this), 3000);
   
   return true;
};

GameController.prototype.onMoveAccepted = function(data) {
   console.log('✅ Движение подтверждено:', data);
   this.isWaitingForResponse = false;
   
   var player = this.gameInstance.getFirstPlayer();
   if (player && player.id === data.unitId) {
       var fromQ = player.q;
       var fromR = player.r;
       var oldQ = fromQ;
       var oldR = fromR;
       
       player.q = data.toQ;
       player.r = data.toR;
       player.direction = data.direction || 'right';
       
       this.gameInstance.setLastPosition(player.id, fromQ, fromR);
       
       if (this.scene && this.scene.isReady) {
           var sprite = this.scene.tankSprites.get(player.id);
           if (sprite) {
               console.log('🎬 Запуск анимации для игрока с', oldQ, oldR, 'на', data.toQ, data.toR);
               
               var direction = HexUtils.getDirection(oldQ, oldR, data.toQ, data.toR);
               sprite.unit.direction = direction;
               sprite.currentDirection = direction;
               
               var self = this;
               sprite.animateMove(
                   oldQ,
                   oldR,
                   data.toQ,
                   data.toR,
                   2000,
                   function() {
                       console.log('✅ Анимация игрока завершена');
                       sprite.updateBarrel();
                       
                       if (self.socket && self.socket.connected) {
                           self.socket.emit('moveComplete', {
                               unitId: player.id,
                               fromQ: oldQ,
                               fromR: oldR,
                               toQ: data.toQ,
                               toR: data.toR
                           });
                       }
                       
                       self.updateGameState();
                       self.updateUI();
                   }
               );
           } else {
               console.warn('⚠️ Спрайт игрока не найден');
               var state = this.gameState;
               if (state && state.myTank) {
                   var newSprite = new TankSprite(this.scene, state.myTank, this.scene.hexGrid);
                   newSprite.create();
                   this.scene.tankSprites.set(player.id, newSprite);
                   this.onMoveAccepted(data);
               }
           }
       }
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
   
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.showMessage('❌ ' + data.message);
   }
   
   var requestId = data.requestId || '';
   var cb = this.moveCallbacks.get(requestId);
   if (cb) {
       cb(false, data);
       this.moveCallbacks.delete(requestId);
   }
};

GameController.prototype.executeMoveLocally = function(q, r, callback) {
   console.log('🏠 Локальное движение:', q, r);
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       if (callback) callback(false, { message: 'Игрок не найден' });
       return false;
   }
   
   var fromQ = player.q;
   var fromR = player.r;
   
   // ✅ ИСПОЛЬЗУЕМ player.id ДЛЯ ДВИЖЕНИЯ
   if (!this.canMove(player.id)) {
       var remaining = this.getRemainingMoveCooldown(player.id);
       if (this.scene && this.scene.inputController) {
           this.scene.inputController.showMessage('⏱️ Кулдаун движения: ' + Math.ceil(remaining / 1000) + 'с');
       }
       if (callback) callback(false, { message: 'Кулдаун движения', remaining: remaining });
       return false;
   }
   
   var moved = this.gameInstance.moveToCell(player.id, q, r);
   if (!moved) {
       if (callback) callback(false, { message: 'Движение невозможно' });
       return false;
   }
   
   if (this.scene && this.scene.isReady) {
       var sprite = this.scene.tankSprites.get(player.id);
       if (sprite) {
           console.log('🎬 Локальная анимация для игрока с', fromQ, fromR, 'на', q, r);
           
           var direction = HexUtils.getDirection(fromQ, fromR, q, r);
           sprite.unit.direction = direction;
           sprite.currentDirection = direction;
           
           var self = this;
           sprite.animateMove(
               fromQ,
               fromR,
               q,
               r,
               2000,
               function() {
                   console.log('✅ Локальная анимация завершена');
                   sprite.updateBarrel();
                   self.updateGameState();
                   self.updateUI();
               }
           );
       }
   }
   
   this.updateGameState();
   this.updateUI();
   
   if (callback) callback(true, { fromQ: fromQ, fromR: fromR, toQ: q, toR: r });
   return true;
};

// ============================================
// ЗАПРОС ВЫСТРЕЛА
// ============================================

GameController.prototype.shootAt = function(q, r) {
   if (!this.socket || !this.socket.connected) {
       return this.executeShootLocally(q, r);
   }
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return { success: false, message: 'Игрок не найден' };
   
   // ✅ ИСПОЛЬЗУЕМ player.id ДЛЯ КУЛДАУНА
   if (!this.canShoot(player.id)) {
       var remaining = this.getRemainingShootCooldown(player.id);
       if (this.scene && this.scene.inputController) {
           this.scene.inputController.showMessage('⏱️ Перезарядка: ' + Math.ceil(remaining / 1000) + 'с');
       }
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
   
   // ✅ ИСПОЛЬЗУЕМ player.id ДЛЯ КУЛДАУНА
   if (!this.canShoot(player.id)) {
       var remaining = this.getRemainingShootCooldown(player.id);
       if (this.scene && this.scene.inputController) {
           this.scene.inputController.showMessage('⏱️ Перезарядка: ' + Math.ceil(remaining / 1000) + 'с');
       }
       return { success: false, message: 'Перезарядка', cooldown: remaining };
   }
   
   var result = this.gameInstance.shootAtCell(player.id, q, r);
   this.updateGameState();
   this.updateUI();
   
   if (this.scene) {
       this.scene.handleShootResult(result);
   }
   
   return result;
};

GameController.prototype.onShootResult = function(result) {
   console.log('🎯 Результат выстрела:', result);
   
   if (result.hit) {
       var allUnits = this.gameInstance.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           var unit = allUnits[i];
           if (unit.q === result.targetQ && unit.r === result.targetR) {
               if (result.killed) {
                   unit.active = false;
               } else {
                   var player = this.gameInstance.getFirstPlayer();
                   unit.hp -= player ? player.damage : 30;
               }
               break;
           }
       }
   }
   
   this.updateGameState();
   this.updateUI();
   
   if (this.scene) {
       this.scene.handleShootResult(result);
   }
};

GameController.prototype.onShootRejected = function(data) {
   console.log('❌ Выстрел отклонен:', data);
   
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.showMessage('❌ ' + data.message);
   }
};

// ============================================
// СОСТОЯНИЕ ИГРЫ
// ============================================

GameController.prototype.onGameState = function(state) {
   console.log('📥 Получено состояние от сервера');
   this.gameState = state;
   if (this.scene && this.scene.isReady) {
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

GameController.prototype.updateGameState = function() {
   if (!this.gameInstance) return;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return;
   
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
   
   if (this.scene && this.scene.isReady) {
       this.scene.updateGameState(this.gameState);
   } else {
       this.pendingState = this.gameState;
   }
};

// ============================================
// UI ОБНОВЛЕНИЯ
// ============================================

GameController.prototype.updateUI = function() {
   this.updateCooldownCache();
   
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
   
   var cooldown = this._cachedCooldowns.shoot || 0;
   var moveCooldown = this._cachedCooldowns.move || 0;
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

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
// ============================================

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
   
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.isEnabled = false;
   }
   
   this.showMessage('🏆 ' + winner);
};

GameController.prototype.resetGame = function() {
   var TankGameClass = window.TankGame || 
                       (typeof require !== 'undefined' ? require('../game/TankGame.js').TankGame : null);
   
   if (!TankGameClass) {
       console.error('❌ TankGame не найден для сброса!');
       return;
   }
   
   this.gameInstance = new TankGameClass();
   this.gameState = null;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks.clear();
   this._cachedCooldowns = { move: 0, shoot: 0 };
   this._lastCooldownUpdate = 0;
   
   if (this.scene) {
       this.scene.tankSprites.forEach(function(sprite, key) {
           if (sprite) sprite.destroy();
       });
       this.scene.tankSprites.clear();
       
       if (this.scene.processedMoves) {
           this.scene.processedMoves.clear();
       }
   }
   
   if (this.socket && this.socket.connected) {
       this.socket.emit('reset');
   }
   
   var overlay = document.getElementById('gameover');
   if (overlay) overlay.style.display = 'none';
   
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.isEnabled = true;
       this.scene.inputController.clearTarget();
       this.scene.inputController.moveMode = false;
       this.scene.inputController.updateUI();
   }
   
   this.updateGameState();
   this.updateUI();
   this.showMessage('🔄 Новая битва!');
};

GameController.prototype.checkPendingState = function() {
   if (this.pendingState && this.scene && this.scene.isReady) {
       console.log('✅ Применяем отложенное состояние');
       this.scene.updateGameState(this.pendingState);
       this.pendingState = null;
       return true;
   }
   return false;
};

GameController.prototype.showMessage = function(text) {
   console.log('📝 ' + text);
   var container = document.getElementById('messages');
   if (!container) return;
   
   var msg = document.createElement('div');
   msg.className = 'message';
   msg.textContent = text;
   container.appendChild(msg);
   
   setTimeout(function() {
       if (msg && msg.remove) msg.remove();
   }, 2500);
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

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { GameController: GameController };
}
