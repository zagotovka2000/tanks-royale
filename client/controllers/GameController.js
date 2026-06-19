// client/controllers/GameController.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ

function GameController(scene, socket) {
   this.scene = scene;
   this.socket = socket;
   this.gameInstance = null;
   this.gameState = null;
   this.isInitialized = false;
   this.pendingState = null;
   this.isWaitingForResponse = false;
   this.moveCallbacks = new Map();
   
   // ✅ ДОБАВЛЯЕМ КЭШ ДЛЯ КУЛДАУНОВ
   this._cachedCooldowns = {
       move: 0,
       shoot: 0
   };
   this._lastCooldownUpdate = 0;
}

GameController.prototype.init = function() {
   this.gameInstance = new TankGame();
   this.isInitialized = true;
   this.updateUI();
   
   if (this.socket) {
       this.socket.on('moveAccepted', this.onMoveAccepted.bind(this));
       this.socket.on('moveRejected', this.onMoveRejected.bind(this));
       this.socket.on('shootResult', this.onShootResult.bind(this));
       this.socket.on('gameState', this.onGameState.bind(this));
   }
   
   return this;
};

// ✅ ВОССТАНАВЛИВАЕМ getRemainingCooldown() ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
GameController.prototype.getRemainingCooldown = function() {
   if (!this.gameInstance) return 0;
   
   // ✅ ВОЗВРАЩАЕМ МАКСИМАЛЬНЫЙ ИЗ ДВУХ КУЛДАУНОВ (ДЛЯ UI)
   var moveCooldown = this.gameInstance.getRemainingMoveCooldown ? 
       this.gameInstance.getRemainingMoveCooldown() : 0;
   var shootCooldown = this.gameInstance.getRemainingShootCooldown ? 
       this.gameInstance.getRemainingShootCooldown() : 0;
   
   // Для UI показываем максимальный (обычно это кулдаун стрельбы)
   return Math.max(moveCooldown, shootCooldown);
};

// ✅ ДОБАВЛЯЕМ МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ОТДЕЛЬНЫХ КУЛДАУНОВ
GameController.prototype.getRemainingMoveCooldown = function() {
   if (!this.gameInstance || !this.gameInstance.getRemainingMoveCooldown) return 0;
   return this.gameInstance.getRemainingMoveCooldown();
};

GameController.prototype.getRemainingShootCooldown = function() {
   if (!this.gameInstance || !this.gameInstance.getRemainingShootCooldown) return 0;
   return this.gameInstance.getRemainingShootCooldown();
};

// ✅ НОВЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ КЭША КУЛДАУНОВ
GameController.prototype.updateCooldownCache = function() {
   if (!this.gameInstance) return;
   
   var now = Date.now();
   if (now - this._lastCooldownUpdate > 50) { // Обновляем не чаще 50мс
       this._cachedCooldowns.move = this.getRemainingMoveCooldown();
       this._cachedCooldowns.shoot = this.getRemainingShootCooldown();
       this._lastCooldownUpdate = now;
   }
};

// ✅ ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ПРОВЕРКИ, МОЖЕТ ЛИ ИГРОК СТРЕЛЯТЬ
GameController.prototype.canShoot = function() {
   if (!this.gameInstance) return false;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   return this.gameInstance.canShoot ? this.gameInstance.canShoot(player) : true;
};

// ✅ ИСПРАВЛЕННЫЙ МЕТОД ДЛЯ ПРОВЕРКИ, МОЖЕТ ЛИ ИГРОК ДВИГАТЬСЯ
GameController.prototype.canMove = function() {
   if (!this.gameInstance) return false;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return false;
   return this.gameInstance.canMove ? this.gameInstance.canMove(player) : true;
};

// ✅ ИСПРАВЛЕННЫЙ requestMove
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

// ✅ ИСПРАВЛЕННЫЙ onMoveAccepted
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
   
   if (this.scene && this.scene.isReady) {
       var state = this.gameState;
       if (state) {
           if (!state.lastMoves) state.lastMoves = {};
           state.lastMoves[data.unitId] = {
               fromQ: data.fromQ,
               fromR: data.fromR,
               toQ: data.toQ,
               toR: data.toR
           };
           this.scene.updateGameState(state);
       }
   }
   
   var requestId = data.requestId || '';
   var cb = this.moveCallbacks.get(requestId);
   if (cb) {
       cb(true, data);
       this.moveCallbacks.delete(requestId);
   }
   
   this.updateUI();
};

// ✅ ИСПРАВЛЕННЫЙ onMoveRejected
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

// ✅ ИСПРАВЛЕННЫЙ executeMoveLocally
GameController.prototype.executeMoveLocally = function(q, r, callback) {
   console.log('🏠 Локальное движение:', q, r);
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) {
       if (callback) callback(false, { message: 'Игрок не найден' });
       return false;
   }
   
   var fromQ = player.q;
   var fromR = player.r;
   
   var moved = this.gameInstance.moveToCell(player.id, q, r);
   if (!moved) {
       if (callback) callback(false, { message: 'Движение невозможно' });
       return false;
   }
   
   this.updateGameState();
   this.updateUI();
   
   if (callback) callback(true, { fromQ: fromQ, fromR: fromR, toQ: q, toR: r });
   return true;
};

// ✅ ИСПРАВЛЕННЫЙ shootAt
GameController.prototype.shootAt = function(q, r) {
   if (!this.socket || !this.socket.connected) {
       return this.executeShootLocally(q, r);
   }
   
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return { success: false, message: 'Игрок не найден' };
   
   // ✅ ИСПОЛЬЗУЕМ НОВЫЙ МЕТОД canShoot
   if (!this.canShoot()) {
       var remaining = this.getRemainingShootCooldown();
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

// ✅ ИСПРАВЛЕННЫЙ executeShootLocally
GameController.prototype.executeShootLocally = function(q, r) {
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return { success: false, message: 'Игрок не найден' };
   
   var result = this.gameInstance.shootAtCell(player.id, q, r);
   this.updateGameState();
   this.updateUI();
   
   if (this.scene) {
       this.scene.handleShootResult(result);
   }
   
   return result;
};

// ✅ ИСПРАВЛЕННЫЙ onShootResult
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

// ✅ ИСПРАВЛЕННЫЙ onGameState
GameController.prototype.onGameState = function(state) {
   console.log('📥 Получено состояние от сервера');
   this.gameState = state;
   if (this.scene && this.scene.isReady) {
       this.scene.updateGameState(state);
   }
   this.updateUI();
};

// ✅ ИСПРАВЛЕННЫЙ updateGameState
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

// ✅ ИСПРАВЛЕННЫЙ updateUI
GameController.prototype.updateUI = function() {
   // ✅ ОБНОВЛЯЕМ КЭШ КУЛДАУНОВ
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
   
   // ✅ ИСПОЛЬЗУЕМ КЭШ ДЛЯ КУЛДАУНА
   var cooldown = this._cachedCooldowns.shoot || 0;
   var moveCooldown = this._cachedCooldowns.move || 0;
   
   // Показываем максимальный кулдаун (обычно это стрельба)
   var displayCooldown = Math.max(cooldown, moveCooldown);
   
   if (cooldownFill) {
       var maxCooldown = 2500; // Максимальный кулдаун (shootCooldown)
       var percent = Math.min(100, (displayCooldown / maxCooldown) * 100);
       cooldownFill.style.width = percent + '%';
       
       // Меняем цвет в зависимости от кулдауна
       if (displayCooldown > 0) {
           cooldownFill.style.background = '#e94560';
       } else {
           cooldownFill.style.background = '#4caf50';
       }
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

// ✅ ИСПРАВЛЕННЫЙ isGameOver
GameController.prototype.isGameOver = function() {
   return this.gameInstance ? this.gameInstance.gameOver : false;
};

// ✅ ИСПРАВЛЕННЫЙ botAction
GameController.prototype.botAction = function() {
   if (!this.gameInstance || this.gameInstance.gameOver) return null;
   return this.gameInstance.botAction();
};

// ✅ ИСПРАВЛЕННЫЙ onGameEnd
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

// ✅ ИСПРАВЛЕННЫЙ resetGame
GameController.prototype.resetGame = function() {
   this.gameInstance = new TankGame();
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
       
       // Очищаем обработанные движения
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

// ✅ checkPendingState
GameController.prototype.checkPendingState = function() {
   if (this.pendingState && this.scene && this.scene.isReady) {
       console.log('✅ Применяем отложенное состояние');
       this.scene.updateGameState(this.pendingState);
       this.pendingState = null;
       return true;
   }
   return false;
};

// ✅ showMessage
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

// ✅ destroy
GameController.prototype.destroy = function() {
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
