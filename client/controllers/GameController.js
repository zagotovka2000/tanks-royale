// client/controllers/GameController.js

function GameController(scene, socket) {
   this.scene = scene;
   this.socket = socket;
   this.gameInstance = null;
   this.gameState = null;
   this.lastActionTime = 0;
   this.cooldown = 2000;
   this.isInitialized = false;
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

// ✅ ОБНОВЛЕННЫЙ moveTo С КОЛБЭКОМ
GameController.prototype.moveTo = function(q, r) {
    if (!this.gameInstance) return false;
    var player = this.gameInstance.getFirstPlayer();
    if (!player) return false;
    
    var fromQ = player.q;
    var fromR = player.r;
    
    console.log('🚶 moveTo() - с', fromQ, fromR, 'на', q, r);
    
    // ✅ ПРОВЕРЯЕМ, МОЖЕТ ЛИ ТАНК ДВИГАТЬСЯ
    var canMove = this.gameInstance.canMoveToCell(player.id, q, r);
    
    if (!canMove) {
        console.warn('❌ Движение невозможно');
        // Проверяем причину
        if (this.gameInstance.getRemainingCooldown() > 0) {
            console.warn('⏱️ Причина: перезарядка');
            if (this.scene && this.scene.inputController) {
                this.scene.inputController.showMessage('⏱️ Перезарядка! Подождите 2 секунды');
            }
        } else {
            var isAdjacent = HexUtils.areAdjacent(player.q, player.r, q, r);
            if (!isAdjacent) {
                console.warn('❌ Причина: клетка не является соседней');
                if (this.scene && this.scene.inputController) {
                    this.scene.inputController.showMessage('❌ Можно двигаться только на соседнюю клетку!');
                }
            } else {
                var occupied = this.gameInstance.getAllUnits().some(function(u) {
                    return u.active && u !== player && u.q === q && u.r === r;
                });
                if (occupied) {
                    console.warn('❌ Причина: клетка занята другим юнитом');
                    if (this.scene && this.scene.inputController) {
                        this.scene.inputController.showMessage('❌ Клетка занята!');
                    }
                }
            }
        }
        return false;
    }
    
    // ✅ МЕНЯЕМ ПОЗИЦИЮ В ЛОГИКЕ СРАЗУ
    var result = this.gameInstance.moveToCell(player.id, q, r);
    
    if (!result) {
        console.warn('❌ moveToCell вернул false');
        return false;
    }
    
    console.log('✅ moveToCell успешно выполнен, новая позиция:', player.q, player.r);
    
    // ✅ ЗАПУСКАЕМ АНИМАЦИЮ
    if (this.scene) {
        var sprite = this.scene.tankSprites.get(player.id);
        if (sprite) {
            // ✅ ПЕРЕДАЕМ КОЛБЭК ДЛЯ ОБНОВЛЕНИЯ ПОСЛЕ АНИМАЦИИ
            var self = this;
            sprite.animateMove(fromQ, fromR, q, r, 3000, function() {
                console.log('✅ Анимация завершена, обновляем состояние');
                // ✅ ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ СОСТОЯНИЕ ПОСЛЕ АНИМАЦИИ
                self.updateGameState();
                self.updateUI();
            });
            console.log('🎬 Запущена анимация движения на 3 секунды');
        } else {
            console.warn('⚠️ Спрайт танка не найден!');
            this.scene.updateTanks(this.gameState);
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
   
   // Отправляем результат на сервер (если есть)
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

GameController.prototype.updateGameState = function() {
   if (!this.gameInstance) return;
   var player = this.gameInstance.getFirstPlayer();
   if (!player) return;
   
   this.gameState = this.gameInstance.getStateForPlayer(player.id);
   
   // Проверяем победителя
   if (this.gameInstance.checkWinner()) {
       this.gameState.gameOver = true;
       this.gameState.winner = this.gameInstance.winner;
       this.onGameEnd();
   }
   
   // Обновляем сцену
   if (this.scene) {
       this.scene.updateGameState(this.gameState);
   }
};

GameController.prototype.onGameEnd = function() {
   var winner = this.gameInstance ? this.gameInstance.winner : 'Ничья';
   var overlay = document.getElementById('gameover');
   var winnerText = document.getElementById('winnerText');
   
   if (overlay) overlay.style.display = 'flex';
   if (winnerText) winnerText.textContent = winner;
   
   // Отключаем ввод
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.isEnabled = false;
   }
   
   this.showMessage('🏆 ' + winner);
};

GameController.prototype.resetGame = function() {
   // Создаем новую игру
   this.gameInstance = new TankGame();
   this.gameState = null;
   this.lastActionTime = 0;
   
   // Закрываем оверлей
   var overlay = document.getElementById('gameover');
   if (overlay) overlay.style.display = 'none';
   
   // Включаем ввод
   if (this.scene && this.scene.inputController) {
       this.scene.inputController.isEnabled = true;
       this.scene.inputController.clearTarget();
       this.scene.inputController.moveMode = false;
       this.scene.inputController.updateUI();
   }
   
   // Обновляем состояние
   this.updateGameState();
   this.updateUI();
   this.showMessage('🔄 Новая битва!');
};

// ✅ ОБНОВЛЕННЫЙ updateUI - ПОКАЗЫВАЕТ КУЛДАУН ТОЛЬКО ДЛЯ СТРЕЛЬБЫ
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
    
    // ✅ ПОКАЗЫВАЕМ КУЛДАУН ТОЛЬКО ДЛЯ СТРЕЛЬБЫ
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
};

if (typeof window !== 'undefined') {
   window.GameController = GameController;
}
