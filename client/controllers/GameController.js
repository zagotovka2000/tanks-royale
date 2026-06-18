// client/controllers/GameController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

function GameController(scene, socket) {
   this.scene = scene;
   this.socket = socket;
   this.gameInstance = null;
   this.gameState = null;
   this.lastActionTime = 0;
   this.cooldown = 2000;
   this.isInitialized = false;
   this.pendingState = null;
}

GameController.prototype.init = function() {
   this.gameInstance = new TankGame();
   this.isInitialized = true;
   this.updateUI();
   return this;
};

GameController.prototype.isGameOver = function() {
   return this.gameInstance ? this.gameInstance.gameOver : false;
};

GameController.prototype.getRemainingCooldown = function() {
   if (!this.gameInstance) return 0;
   return this.gameInstance.getRemainingCooldown();
};

// ✅ ИСПРАВЛЕННЫЙ moveTo - ОБНОВЛЯЕТ ПОЗИЦИЮ В СПРАЙТЕ
GameController.prototype.moveTo = function(q, r) {
    if (!this.gameInstance) return false;
    var player = this.gameInstance.getFirstPlayer();
    if (!player) return false;
    
    var fromQ = player.q;
    var fromR = player.r;
    
    var canMove = this.gameInstance.canMoveToCell(player.id, q, r);
    if (!canMove) {
        console.warn('❌ Движение невозможно');
        if (this.gameInstance.getRemainingCooldown() > 0) {
            if (this.scene && this.scene.inputController) {
                this.scene.inputController.showMessage('⏱️ Перезарядка! Подождите 2 секунды');
            }
        } else {
            var isAdjacent = HexUtils.areAdjacent(player.q, player.r, q, r);
            if (!isAdjacent) {
                if (this.scene && this.scene.inputController) {
                    this.scene.inputController.showMessage('❌ Можно двигаться только на соседнюю клетку!');
                }
            } else {
                var occupied = this.gameInstance.getAllUnits().some(function(u) {
                    return u.active && u !== player && u.q === q && u.r === r;
                });
                if (occupied) {
                    if (this.scene && this.scene.inputController) {
                        this.scene.inputController.showMessage('❌ Клетка занята!');
                    }
                }
            }
        }
        return false;
    }
    
    var direction = HexUtils.getDirection(fromQ, fromR, q, r);
    var result = this.gameInstance.moveToCell(player.id, q, r);
    if (!result) {
        console.warn('❌ moveToCell вернул false');
        return false;
    }
    
    console.log('✅ moveToCell выполнен, направление:', direction);
    
    if (this.scene) {
        var sprite = this.scene.tankSprites.get(player.id);
        if (sprite) {
            var self = this;
            var tankId = player.id;
            
            // ✅ ОБНОВЛЯЕМ ПОЗИЦИЮ В СПРАЙТЕ
            sprite.unit.q = q;
            sprite.unit.r = r;
            sprite.unit.direction = direction;
            
            sprite.animateMove(fromQ, fromR, q, r, 2000, function() {
                console.log('✅ Анимация завершена, направление:', direction);
                sprite.updateBarrel();
                self.updateGameState();
                self.updateUI();
                if (self.scene) {
                    self.scene.updateTanks(self.gameState);
                }
                
                // ✅ ОТПРАВЛЯЕМ СОБЫТИЕ НА СЕРВЕР
                if (self.socket && self.socket.connected) {
                    self.socket.emit('moveComplete', {
                        tankId: tankId,
                        fromQ: fromQ,
                        fromR: fromR,
                        toQ: q,
                        toR: r,
                        direction: direction
                    });
                }
            });
            console.log('🎬 Запущена анимация движения, направление:', direction);
        } else {
            console.warn('⚠️ Спрайт танка не найден!');
            if (this.scene) {
                this.scene.updateTanks(this.gameState);
            }
        }
    }
    
    this.updateUI();
    return true;
};

GameController.prototype.shootAt = function(q, r) {
   if (!this.gameInstance) return null;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return null;
   
   var result = this.gameInstance.shootAtCell(player.id, q, r);
   
   if (this.socket && this.socket.connected) {
       this.socket.emit('shoot', {
           q: q,
           r: r,
           playerId: player.id
       });
   }
   
   this.updateGameState();
   this.updateUI();
   return result;
};

GameController.prototype.botAction = function() {
   if (!this.gameInstance || this.gameInstance.gameOver) return null;
   return this.gameInstance.botAction();
};

// ✅ ИСПРАВЛЕННЫЙ updateGameState - ПРОВЕРЯЕТ НАЛИЧИЕ SCENE
// client/controllers/GameController.js - ИСПРАВЛЯЕМ updateGameState

GameController.prototype.updateGameState = function() {
   if (!this.gameInstance) return;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return;
   
   // Сохраняем позиции всех танков
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
   
   // ✅ ПРОВЕРЯЕМ, ЧТО СЦЕНА СУЩЕСТВУЕТ И ГОТОВА
   if (this.scene && this.scene.isReady) {
       this.scene.updateGameState(this.gameState);
   } else {
       console.log('⏳ Сцена еще не готова, состояние сохранено');
       this.pendingState = this.gameState;
   }
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

// client/controllers/GameController.js - ИСПРАВЛЯЕМ resetGame

GameController.prototype.resetGame = function() {
   // Создаем новую игру
   this.gameInstance = new TankGame();
   this.gameState = null;
   this.lastActionTime = 0;
   this.pendingState = null;
   
   // ✅ ОЧИЩАЕМ СПРАЙТЫ
   if (this.scene) {
       this.scene.tankSprites.forEach(function(sprite, key) {
           if (sprite) sprite.destroy();
       });
       this.scene.tankSprites.clear();
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

// ✅ ДОБАВЛЯЕМ МЕТОД ДЛЯ ПРОВЕРКИ ГОТОВНОСТИ
GameController.prototype.checkPendingState = function() {
   if (this.pendingState && this.scene && this.scene.isReady) {
       console.log('✅ Применяем отложенное состояние');
       this.scene.updateGameState(this.pendingState);
       this.pendingState = null;
       return true;
   }
   return false;
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
   
   if (hpEl) hpEl.textContent = tank.hp + '/' + tank.maxHp;
   if (killsEl) killsEl.textContent = tank.kills || 0;
   if (enemiesEl) enemiesEl.textContent = this.gameState.enemies ? this.gameState.enemies.length : 0;
   
   var cooldown = this.getRemainingCooldown();
   if (cooldownFill) {
       var percent = (cooldown / this.cooldown) * 100;
       cooldownFill.style.width = Math.min(100, percent) + '%';
   }
   if (cooldownText) {
       if (cooldown > 0) {
           cooldownText.textContent = Math.ceil(cooldown / 1000) + 'с';
           cooldownText.style.color = '#e94560';
       } else {
           cooldownText.textContent = 'готов';
           cooldownText.style.color = '#4caf50';
       }
   }
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
   this.gameInstance = null;
   this.gameState = null;
   this.scene = null;
   this.socket = null;
   this.isInitialized = false;
   this.pendingState = null;
};

if (typeof window !== 'undefined') {
   window.GameController = GameController;
}
