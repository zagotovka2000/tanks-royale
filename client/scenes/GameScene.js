// client/scenes/GameScene.js - ИСПРАВЛЕННЫЙ

function GameScene() {
   Phaser.Scene.call(this, { key: 'GameScene' });
   
   this.gameState = null;
   this.hexGrid = null;
   this.tankSprites = new Map();
   this.gameController = null;
   this.inputController = null;
   this.cameraController = null;
   this.socket = null;
   this.isLocalGame = true;
   this.debugText = null;
   this.isReady = false;
   
   this.activeProjectiles = [];
   this.processedMoves = new Set();
   this.moveProcessingLock = false;
   this.updateTimer = null;
   this.botTimer = null;
}

GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function(data) {
   console.log('🔧 GameScene.init()', data || '');
   if (data) {
       this.isLocalGame = data.isLocalGame !== undefined ? data.isLocalGame : true;
       this.socket = data.socket || null;
   }
};

GameScene.prototype.create = function() {
   console.log('🎮 GameScene.create() START');
   
   this.cameras.main.setBackgroundColor('#1a2a3a');
   
   var width = this.cameras.main.width;
   var height = this.cameras.main.height;
   console.log('📐 Размеры камеры:', width, 'x', height);
   
   // 1. Гексагональная сетка
   this.hexGrid = new HexGrid(this, 45);
   this.hexGrid.init();
   console.log('✅ HexGrid создан');
   
   // 2. Контроллер игры - ПЕРЕДАЕМ this
   this.gameController = new GameController(this, null);
   this.gameController.init();
   console.log('✅ GameController создан');
   
   // 3. Контроллер ввода - ПЕРЕДАЕМ this
   this.inputController = new InputController(this, this.gameController);
   this.inputController.init();
   this.inputController.scene = this;
   console.log('✅ InputController создан');
   
   // 4. Контроллер камеры
   this.cameraController = new CameraController(this);
   this.cameraController.init();
   console.log('✅ CameraController создан');
   
   this.isReady = true;
   
   // Обновляем состояние
   this.gameController.updateGameState();
   console.log('✅ Начальное состояние загружено');
   
   // Отладочный текст
   this.debugText = this.add.text(
       10, 10,
       'Гексов: 0 | Танков: 0 | Зум: 1.0x',
       { fontSize: '14px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 8, y: 4 } }
   );
   this.debugText.setDepth(100);
   this.debugText.setScrollFactor(0);
   
   // Таймеры
   this.updateTimer = this.time.addEvent({
       delay: 50,
       callback: this.onUpdate,
       callbackScope: this,
       loop: true
   });
   
   this.botTimer = this.time.addEvent({
       delay: 2000,
       callback: this.onBotAction,
       callbackScope: this,
       loop: true
   });
   
   var self = this;
   window.addEventListener('resize', function() {
       self.onResize();
   });
   
   setTimeout(function() {
       console.log('🔄 Принудительная перерисовка...');
       if (self.gameState) {
           self.updateGameState(self.gameState);
       }
   }, 500);
   
   console.log('✅ GameScene.create() FINISHED');
};

// ============================================
// updateGameState - ДОЛЖЕН БЫТЬ В GameScene
// ============================================
GameScene.prototype.updateGameState = function(state) {
   if (!this.isReady) {
       console.log('⏳ Сцена еще не готова, откладываем обновление');
       return;
   }
   
   if (!state) {
       if (this.gameController && this.gameController.gameState) {
           state = this.gameController.gameState;
       } else {
           return;
       }
   }
   
   this.gameState = state;
   
   if (state.cells && this.hexGrid) {
       this.hexGrid.drawMap(state.cells);
   }
   
   if (state.lastMoves) {
       this.processLastMoves(state.lastMoves);
   }
   
   this.updateTanks(state);
   
   if (this.inputController) {
       this.inputController.setGameState(state);
   }
   
   if (this.gameController) {
       this.gameController.updateUI();
   }
};

// ============================================
// ОСТАЛЬНЫЕ МЕТОДЫ (onUpdate, processLastMoves, updateTanks, и т.д.)
// ============================================
// ... остальные методы остаются без изменений ...

// ============================================
// onUpdate
// ============================================
GameScene.prototype.onUpdate = function() {
    // Обновляем спрайты
    var allAnimationsComplete = true;
    var self = this;
    
    this.tankSprites.forEach(function(sprite, key) {
        if (sprite && sprite.update) {
            sprite.update();
            if (sprite.isAnimating) {
                allAnimationsComplete = false;
            }
        }
    });
    
    // Очистка старых записей
    if (this.processedMoves.size > 100) {
        var now = Date.now();
        var toRemove = [];
        for (var key of this.processedMoves) {
            var parts = key.split('_');
            if (parts.length >= 5) {
                var timestamp = parseInt(parts[parts.length - 1]);
                if (now - timestamp > 5000) {
                    toRemove.push(key);
                }
            }
        }
        for (var i = 0; i < toRemove.length; i++) {
            this.processedMoves.delete(toRemove[i]);
        }
    }
    
    // Обрабатываем последние движения
    if (allAnimationsComplete && this.gameState && !this.moveProcessingLock) {
        if (this.gameState.lastMoves) {
            var hasNewMoves = false;
            for (var unitId in this.gameState.lastMoves) {
                if (!this.gameState.lastMoves.hasOwnProperty(unitId)) continue;
                var move = this.gameState.lastMoves[unitId];
                var moveKey = unitId + '_' + move.fromQ + '_' + move.fromR + '_' + move.toQ + '_' + move.toR;
                if (!this.processedMoves.has(moveKey)) {
                    if (this.tankSprites.has(unitId)) {
                        var sprite = this.tankSprites.get(unitId);
                        if (!sprite.isAnimating) {
                            if (sprite.unit.q !== move.toQ || sprite.unit.r !== move.toR) {
                                hasNewMoves = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (hasNewMoves) {
                this.processLastMoves(this.gameState.lastMoves);
            }
        }
    }
    
    if (this.gameController) {
        this.gameController.updateUI();
    }
    
    this.updateDebugText();
};

// ============================================
// updateDebugText
// ============================================
GameScene.prototype.updateDebugText = function() {
   if (this.debugText && this.hexGrid) {
       this.debugText.setText(
           'Гексов: ' + this.hexGrid.hexObjects.size + 
           ' | Танков: ' + this.tankSprites.size +
           ' | Зум: ' + (this.cameraController ? this.cameraController.zoom.toFixed(2) : '1.0') + 'x' +
           ' | Снарядов: ' + this.activeProjectiles.length
       );
   }
};

// ============================================
// processLastMoves
// ============================================
GameScene.prototype.processLastMoves = function(lastMoves) {
    if (!this.isReady) return;
    if (!lastMoves) return;
    if (this.moveProcessingLock) return;
    
    this.moveProcessingLock = true;
    var self = this;
    
    try {
        var processedCount = 0;
        
        for (var unitId in lastMoves) {
            if (!lastMoves.hasOwnProperty(unitId)) continue;
            
            var move = lastMoves[unitId];
            if (!move) continue;
            
            var moveKey = unitId + '_' + move.fromQ + '_' + move.fromR + '_' + move.toQ + '_' + move.toR;
            if (this.processedMoves.has(moveKey)) continue;
            
            if (!this.tankSprites.has(unitId)) {
                continue;
            }
            
            var sprite = this.tankSprites.get(unitId);
            if (sprite.isAnimating) continue;
            
            var currentQ = sprite.unit.q;
            var currentR = sprite.unit.r;
            
            if (currentQ === move.fromQ && currentR === move.fromR) {
                var direction = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
                
                sprite.unit.direction = direction;
                sprite.unit.q = move.toQ;
                sprite.unit.r = move.toR;
                sprite.currentDirection = direction;
                
                sprite.animateMove(
                    move.fromQ, move.fromR, move.toQ, move.toR, 2000,
                    function() {
                        self.processedMoves.add(moveKey);
                        setTimeout(function() {
                            if (self.gameState && self.gameState.lastMoves) {
                                self.processLastMoves(self.gameState.lastMoves);
                            }
                        }, 100);
                    }
                );
                processedCount++;
            }
        }
    } catch (error) {
        console.error('❌ Ошибка в processLastMoves:', error);
    } finally {
        this.moveProcessingLock = false;
    }
};

// client/scenes/GameScene.js - ИСПРАВЛЕННЫЙ МЕТОД updateTanks

GameScene.prototype.updateTanks = function(state) {
   if (!state || !this.isReady) return;
   
   var currentTanks = new Map();
   var self = this;
   
   // Собираем текущие танки
   if (state.myTank && state.myTank.active !== false) {
       currentTanks.set(state.myTank.id, { unit: state.myTank, isPlayer: true });
   }
   
   if (state.enemies) {
       for (var i = 0; i < state.enemies.length; i++) {
           var enemy = state.enemies[i];
           if (enemy.active !== false) {
               currentTanks.set(enemy.id, { unit: enemy, isPlayer: false });
           }
       }
   }
   
   // Обновляем или создаем танки
   currentTanks.forEach(function(value, id) {
       if (self.tankSprites.has(id)) {
           var sprite = self.tankSprites.get(id);
           var unit = value.unit;
           
           // ✅ ПРОВЕРЯЕМ, НУЖНО ЛИ АНИМИРОВАТЬ ДВИЖЕНИЕ
           var currentPos = { q: sprite.unit.q, r: sprite.unit.r };
           var needMove = (currentPos.q !== unit.q || currentPos.r !== unit.r);
           
           if (needMove && !sprite.isAnimating) {
               // ✅ ЗАПУСКАЕМ АНИМАЦИЮ ВМЕСТО МГНОВЕННОГО ПЕРЕМЕЩЕНИЯ
               console.log('🎯 АНИМАЦИЯ ДВИЖЕНИЯ от', currentPos.q, currentPos.r, 'до', unit.q, unit.r);
               
               // Сохраняем старую позицию для анимации
               var fromQ = sprite.unit.q;
               var fromR = sprite.unit.r;
               var toQ = unit.q;
               var toR = unit.r;
               
               // Обновляем данные до новой позиции
               sprite.unit.q = toQ;
               sprite.unit.r = toR;
               sprite.unit.direction = unit.direction || sprite.unit.direction;
               
               // Запускаем анимацию
               sprite.animateMove(fromQ, fromR, toQ, toR, 1500, function() {
                   console.log('✅ Анимация завершена для', id);
                   // После анимации обновляем HP и другие параметры
                   if (sprite.unit.hp !== unit.hp) {
                       sprite.unit.hp = unit.hp;
                       sprite.updateHPBar();
                   }
                   // Проверяем, не завершена ли игра
                   if (self.gameState && self.gameState.gameOver) {
                       // Показываем Game Over
                   }
               });
               
               // Обновляем HP сразу (без анимации)
               if (sprite.unit.hp !== unit.hp) {
                   sprite.unit.hp = unit.hp;
                   sprite.updateHPBar();
               }
               
               // Обновляем направление башни
               if (unit.direction && unit.direction !== sprite.currentDirection) {
                   sprite.setTurretDirection(unit.direction);
               }
               
           } else if (!sprite.isAnimating) {
               // ✅ Если не нужно двигаться - просто обновляем позицию
               var targetPos = self.hexGrid.hexToPixel(unit.q, unit.r);
               sprite.container.setPosition(targetPos.x, targetPos.y);
               sprite.unit.q = unit.q;
               sprite.unit.r = unit.r;
               
               if (unit.direction) {
                   sprite.unit.direction = unit.direction;
                   sprite.currentDirection = unit.direction;
               }
               
               if (sprite.unit.hp !== unit.hp) {
                   sprite.unit.hp = unit.hp;
                   sprite.updateHPBar();
               }
               sprite.updatePosition(unit.q, unit.r, unit.direction);
           }
       } else {
           // Создаем новый спрайт
           var sprite = new TankSprite(self, value.unit, self.hexGrid);
           sprite.create();
           self.tankSprites.set(id, sprite);
       }
   });
   
   // Удаляем отсутствующие танки
   var tankKeys = self.tankSprites.keys();
   var toRemove = [];
   for (var key of tankKeys) {
       if (!currentTanks.has(key)) {
           toRemove.push(key);
       }
   }
   
   for (var i = 0; i < toRemove.length; i++) {
       var id = toRemove[i];
       var sprite = self.tankSprites.get(id);
       if (sprite) {
           sprite.destroy();
           self.tankSprites.delete(id);
       }
   }
};

// ============================================
// onBotAction
// ============================================
GameScene.prototype.onBotAction = function() {
   if (this.isLocalGame && this.gameController) {
       var result = this.gameController.botAction();
       if (result && result.type === 'move') {
           var unitId = result.unitId;
           var state = this.gameState;
           var unitData = null;
           
           if (state && state.enemies) {
               for (var i = 0; i < state.enemies.length; i++) {
                   if (state.enemies[i].id === unitId) {
                       unitData = state.enemies[i];
                       break;
                   }
               }
           }
           
           if (unitData) {
               var sprite = this.tankSprites.get(unitId);
               if (!sprite) {
                   sprite = new TankSprite(this, unitData, this.hexGrid);
                   sprite.create();
                   this.tankSprites.set(unitId, sprite);
               }
               
               var self = this;
               sprite.animateMove(
                   result.fromQ, result.fromR, result.toQ, result.toR, 2000,
                   function() {
                       sprite.updateBarrel();
                       if (self.gameController) {
                           self.gameController.updateGameState();
                       }
                   }
               );
           }
       } else if (result) {
           this.handleShootResult(result);
       }
   }
};

// ============================================
// handleShootResult
// ============================================
GameScene.prototype.handleShootResult = function(result) {
   if (!result) return;
   console.log('🎯 handleShootResult:', result);
   
   if (result.fromQ !== undefined && result.fromR !== undefined &&
       result.targetQ !== undefined && result.targetR !== undefined) {
       this.animateShot(result.fromQ, result.fromR, result.targetQ, result.targetR, result.attackerId || result.unitId);
   }
   
   if (result.hit) {
       if (result.killed) {
           this.showMessage('💀 ' + (result.message || 'Уничтожение!'));
           if (result.targetQ !== undefined && result.targetR !== undefined) {
               this.addSmoke(result.targetQ, result.targetR);
           }
       } else {
           this.showMessage('💥 ' + result.message);
       }
   } else if (result.message) {
       this.showMessage('❌ ' + result.message);
   }
   
   if (this.gameController) {
       this.gameController.updateGameState();
   }
};

// ============================================
// АНИМАЦИЯ ВЫСТРЕЛА
// ============================================
GameScene.prototype.animateShot = function(fromQ, fromR, toQ, toR, unitId) {
    var from = this.hexGrid.hexToPixel(fromQ, fromR);
    var to = this.hexGrid.hexToPixel(toQ, toR);
    
    console.log('🎯 animateShot от', fromQ, fromR, 'до', toQ, toR);
    
    var shootingTank = null;
    if (unitId) {
        shootingTank = this.tankSprites.get(unitId);
    }
    
    if (!shootingTank) {
        this.tankSprites.forEach(function(sprite, key) {
            if (sprite.unit && sprite.unit.active !== false &&
                sprite.unit.q === fromQ && sprite.unit.r === fromR) {
                shootingTank = sprite;
            }
        });
    }
    
    var direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
    console.log('🎯 Направление выстрела:', direction);
    
    if (shootingTank && typeof shootingTank.rotateTurret === 'function') {
        shootingTank.rotateTurret(direction, 300, function() {
            console.log('✅ Башня повернута, выполняем выстрел');
            this._executeShot(from, to, shootingTank);
        }.bind(this));
    } else {
        this._executeShot(from, to, null);
    }
};

// ============================================
// ВЫПОЛНЕНИЕ ВЫСТРЕЛА
// ============================================
GameScene.prototype._executeShot = function(from, to, shootingTank) {
    console.log('💥 _executeShot от', from.x, from.y, 'до', to.x, to.y);
    
    if (shootingTank && typeof shootingTank.playRecoil === 'function') {
        shootingTank.playRecoil();
    }
    
    var self = this;
    
    var projectile = this.add.circle(from.x, from.y, 8, 0xff6600);
    projectile.setDepth(20);
    projectile.setStrokeStyle(3, 0xffaa00);
    
    var glow = this.add.circle(from.x, from.y, 20, 0xff8800, 0.3);
    glow.setDepth(19);
    
    var projectileData = { projectile: projectile, glow: glow, active: true };
    this.activeProjectiles.push(projectileData);
    
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var duration = Math.max(300, Math.min(1200, distance * 0.8));
    
    this.tweens.add({
        targets: projectile,
        x: to.x,
        y: to.y,
        duration: duration,
        ease: 'Power1',
        onUpdate: function() {
            glow.x = projectile.x;
            glow.y = projectile.y;
        },
        onComplete: function() {
            var index = self.activeProjectiles.indexOf(projectileData);
            if (index !== -1) {
                self.activeProjectiles.splice(index, 1);
            }
            projectile.destroy();
            glow.destroy();
            
            self.addExplosionAt(to.x, to.y);
            
            var hex = self.hexGrid.pixelToHex(to.x, to.y);
            if (hex) {
                console.log('📍 Клетка взрыва:', hex.q, hex.r);
                self.checkHitSound(hex.q, hex.r);
            }
        }
    });
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
// ============================================
GameScene.prototype.addExplosionAt = function(x, y) {
    for (var i = 0; i < 20; i++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 15 + Math.random() * 45;
        var particle = this.add.circle(x, y, 2 + Math.random() * 6, 0xff6600);
        particle.setDepth(15);
        
        (function(particle) {
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0.1,
                duration: 300 + Math.random() * 300,
                ease: 'Power2',
                onComplete: function() {
                    particle.destroy();
                }
            });
        }).call(this, particle);
    }
    
    var flash = this.add.circle(x, y, 30, 0xffffff, 0.7);
    flash.setDepth(14);
    this.tweens.add({
        targets: flash,
        scale: 0.1,
        alpha: 0,
        duration: 150,
        onComplete: function() {
            flash.destroy();
        }
    });
};

GameScene.prototype.addSmoke = function(q, r) {
   var pos = this.hexGrid.hexToPixel(q, r);
   for (var i = 0; i < 8; i++) {
       var smoke = this.add.circle(
           pos.x + (Math.random() - 0.5) * 30,
           pos.y + (Math.random() - 0.5) * 30,
           5 + Math.random() * 12,
           0x888888,
           0.3 + Math.random() * 0.3
       );
       smoke.setDepth(12);
       (function(smoke) {
           this.tweens.add({
               targets: smoke,
               scale: 4,
               alpha: 0,
               y: smoke.y - 40 - Math.random() * 40,
               duration: 2000 + Math.random() * 1000,
               ease: 'Power1',
               onComplete: function() {
                   smoke.destroy();
               }
           });
       }).call(this, smoke);
   }
};

GameScene.prototype.checkHitSound = function(q, r) {
   var hasTarget = false;
   this.tankSprites.forEach(function(sprite) {
       if (sprite.unit && sprite.unit.active !== false && 
           sprite.unit.q === q && sprite.unit.r === r) {
           hasTarget = true;
           if (typeof sprite.playSound === 'function') {
               sprite.playSound('hit');
           }
       }
   });
   if (!hasTarget) {
       console.log('🔊 Промах (нет цели)');
   }
};

GameScene.prototype.showMessage = function(text) {
   if (this.inputController) {
       this.inputController.showMessage(text);
   }
};

GameScene.prototype.onResize = function() {
   if (this.hexGrid) {
       var width = this.cameras.main.width;
       var height = this.cameras.main.height;
       this.hexGrid.gridOffsetX = width / 2;
       this.hexGrid.gridOffsetY = height / 2;
       
       if (this.gameState) {
           this.hexGrid.drawMap(this.gameState.cells);
           this.updateTanks(this.gameState);
       }
   }
};

GameScene.prototype.shutdown = function() {
   if (this.updateTimer) {
       this.updateTimer.remove();
       this.updateTimer = null;
   }
   if (this.botTimer) {
       this.botTimer.remove();
       this.botTimer = null;
   }
   
   for (var i = 0; i < this.activeProjectiles.length; i++) {
       var p = this.activeProjectiles[i];
       if (p.projectile) p.projectile.destroy();
       if (p.glow) p.glow.destroy();
   }
   this.activeProjectiles = [];
   
   this.tankSprites.forEach(function(sprite, key) {
       if (sprite) sprite.destroy();
   });
   this.tankSprites.clear();
   
   if (this.inputController) {
       this.inputController.destroy();
       this.inputController = null;
   }
   if (this.gameController) {
       this.gameController.destroy();
       this.gameController = null;
   }
   if (this.cameraController) {
       this.cameraController.destroy();
       this.cameraController = null;
   }
   
   this.isReady = false;
};

// Экспорт
if (typeof window !== 'undefined') {
   window.GameScene = GameScene;
}
