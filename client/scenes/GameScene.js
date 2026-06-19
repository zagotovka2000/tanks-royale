// client/scenes/GameScene.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

function GameScene() {
   Phaser.Scene.call(this, { key: 'GameScene' });
   this.gameState = null;
   this.hexGrid = null;
   this.tankSprites = new Map();
   this.gameController = null;
   this.inputController = null;
   this.socket = null;
   this.updateTimer = null;
   this.botTimer = null;
   this.isLocalGame = true;
   this.debugText = null;
   this.isReady = false;
   
   // Настройки камеры
   this.cameraZoom = 1;
   this.minZoom = 0.5;
   this.maxZoom = 2.0;
   this.isDragging = false;
   this.dragStartX = 0;
   this.dragStartY = 0;
   this.cameraStartX = 0;
   this.cameraStartY = 0;
   this.zoomContainer = null;
   
   // Свойства для обработки движений
   this.processedMoves = new Set();
   this.moveProcessingLock = false;
   this.lastProcessedState = null;
   this.moveQueue = [];
   this.isProcessingQueue = false;
   
   // Очередь выстрелов
   this.shootQueue = [];
   this.isProcessingShoot = false;
   
   // ✅ ХРАНЕНИЕ АКТИВНЫХ СНАРЯДОВ
   this.activeProjectiles = [];
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
   
   // Убеждаемся, что ShootLogic загружен
   if (typeof ShootLogic === 'undefined') {
       console.warn('⚠️ ShootLogic не загружен, загружаем...');
       var script = document.createElement('script');
       script.src = '/client/game/ShootLogic.js';
       document.head.appendChild(script);
       
       var checkLoaded = function(attempts) {
           if (typeof ShootLogic !== 'undefined') {
               console.log('✅ ShootLogic успешно загружен');
               return true;
           } else if (attempts > 0) {
               setTimeout(function() { checkLoaded(attempts - 1); }, 100);
           } else {
               console.error('❌ Не удалось загрузить ShootLogic');
           }
       };
       setTimeout(function() { checkLoaded(10); }, 500);
   } else {
       console.log('✅ ShootLogic уже загружен');
   }
   
   this.cameras.main.setBackgroundColor('#1a2a3a');
   
   var width = this.cameras.main.width;
   var height = this.cameras.main.height;
   console.log('📐 Размеры камеры:', width, 'x', height);
   
   this.hexGrid = new HexGrid(this, 45);
   this.hexGrid.init();
   console.log('✅ HexGrid создан');
   
   this.gameController = new GameController(this, null);
   this.gameController.init();
   console.log('✅ GameController создан');
   
   this.inputController = new InputController(this, this.gameController);
   this.inputController.init();
   this.inputController.scene = this;
   console.log('✅ InputController создан');
   
   this.isReady = true;
   
   this.gameController.updateGameState();
   console.log('✅ Начальное состояние загружено');
   
   this.debugText = this.add.text(
       10, 10,
       'Гексов: 0 | Танков: 0 | Зум: 1.0x',
       { fontSize: '14px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 8, y: 4 } }
   );
   this.debugText.setDepth(100);
   this.debugText.setScrollFactor(0);
   
   this.setupCameraControls();
   
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
// НАСТРОЙКА КАМЕРЫ
// ============================================
GameScene.prototype.setupCameraControls = function() {
   var self = this;
   
   this.input.on('wheel', function(pointer, gameObjects, deltaX, deltaY, deltaZ) {
       var zoomFactor = 0.1;
       if (deltaY > 0) {
           self.cameraZoom = Math.max(self.minZoom, self.cameraZoom - zoomFactor);
       } else {
           self.cameraZoom = Math.min(self.maxZoom, self.cameraZoom + zoomFactor);
       }
       self.cameras.main.setZoom(self.cameraZoom);
       self.updateCamera();
       self.updateDebugText();
   });
   
   this.input.on('pointerdown', function(pointer) {
       if (pointer.leftButtonDown()) {
           self.isDragging = true;
           self.dragStartX = pointer.x;
           self.dragStartY = pointer.y;
           self.cameraStartX = self.cameras.main.scrollX;
           self.cameraStartY = self.cameras.main.scrollY;
       }
   });
   
   this.input.on('pointermove', function(pointer) {
       if (self.isDragging && pointer.leftButtonDown()) {
           var dx = pointer.x - self.dragStartX;
           var dy = pointer.y - self.dragStartY;
           self.cameras.main.scrollX = self.cameraStartX - dx / self.cameraZoom;
           self.cameras.main.scrollY = self.cameraStartY - dy / self.cameraZoom;
       }
   });
   
   this.input.on('pointerup', function(pointer) {
       if (self.isDragging) {
           self.isDragging = false;
       }
   });
   
   this.addZoomButtons();
};

// ============================================
// КНОПКИ ЗУМА
// ============================================
GameScene.prototype.addZoomButtons = function() {
   var self = this;
   
   var zoomContainer = document.createElement('div');
   zoomContainer.id = 'zoom-controls';
   zoomContainer.style.cssText = 
       'position: fixed; bottom: 100px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 1000;';
   document.body.appendChild(zoomContainer);
   
   var zoomInBtn = document.createElement('button');
   zoomInBtn.textContent = '+';
   zoomInBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px); transition: background 0.2s;';
   zoomInBtn.onmouseover = function() { this.style.background = 'rgba(233,69,96,0.8)'; };
   zoomInBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
   zoomInBtn.onclick = function() {
       self.cameraZoom = Math.min(self.maxZoom, self.cameraZoom + 0.1);
       self.cameras.main.setZoom(self.cameraZoom);
       self.updateCamera();
       self.updateDebugText();
   };
   zoomContainer.appendChild(zoomInBtn);
   
   var zoomOutBtn = document.createElement('button');
   zoomOutBtn.textContent = '−';
   zoomOutBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px); transition: background 0.2s;';
   zoomOutBtn.onmouseover = function() { this.style.background = 'rgba(233,69,96,0.8)'; };
   zoomOutBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
   zoomOutBtn.onclick = function() {
       self.cameraZoom = Math.max(self.minZoom, self.cameraZoom - 0.1);
       self.cameras.main.setZoom(self.cameraZoom);
       self.updateCamera();
       self.updateDebugText();
   };
   zoomContainer.appendChild(zoomOutBtn);
   
   var resetBtn = document.createElement('button');
   resetBtn.textContent = '⟲';
   resetBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: #ff9800; font-size: 24px; cursor: pointer; backdrop-filter: blur(5px); transition: background 0.2s; margin-top: 5px;';
   resetBtn.onmouseover = function() { this.style.background = 'rgba(255,152,0,0.3)'; };
   resetBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
   resetBtn.onclick = function() {
       self.cameraZoom = 1;
       self.cameras.main.setZoom(1);
       self.cameras.main.scrollX = 0;
       self.cameras.main.scrollY = 0;
       self.updateDebugText();
   };
   zoomContainer.appendChild(resetBtn);
   
   this.zoomContainer = zoomContainer;
};

// ============================================
// ОБНОВЛЕНИЕ КАМЕРЫ
// ============================================
GameScene.prototype.updateCamera = function() {
   this.cameras.main.update();
};

// ============================================
// ОБНОВЛЕНИЕ ОТЛАДОЧНОЙ ИНФОРМАЦИИ
// ============================================
GameScene.prototype.updateDebugText = function() {
   if (this.debugText && this.hexGrid) {
       this.debugText.setText(
           'Гексов: ' + this.hexGrid.hexObjects.size + 
           ' | Танков: ' + this.tankSprites.size +
           ' | Зум: ' + this.cameraZoom.toFixed(2) + 'x' +
           ' | Снарядов: ' + this.activeProjectiles.length
       );
   }
};

// ============================================
// onUpdate
// ============================================
GameScene.prototype.onUpdate = function() {
    var allAnimationsComplete = true;
    var self = this;
    
    // Обновляем все спрайты
    this.tankSprites.forEach(function(sprite, key) {
        if (sprite && sprite.update) {
            sprite.update();
            if (sprite.isAnimating) {
                allAnimationsComplete = false;
            }
        }
    });
    
    // ✅ ОЧИЩАЕМ СТАРЫЕ СНАРЯДЫ
    this.activeProjectiles = this.activeProjectiles.filter(function(p) {
        if (p && p.active) {
            return true;
        }
        return false;
    });
    
    // Очищаем старые записи в processedMoves
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
                console.warn('⚠️ Спрайт для танка', unitId, 'не найден');
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
                        
                        if (self.socket && self.socket.connected) {
                            self.socket.emit('moveComplete', {
                                unitId: unitId,
                                fromQ: move.fromQ,
                                fromR: move.fromR,
                                toQ: move.toQ,
                                toR: move.toR
                            });
                        }
                        
                        setTimeout(function() {
                            if (self.gameState && self.gameState.lastMoves) {
                                self.processLastMoves(self.gameState.lastMoves);
                            }
                        }, 100);
                    }
                );
                processedCount++;
            } else {
                var targetPos = this.hexGrid.hexToPixel(move.toQ, move.toR);
                sprite.container.setPosition(targetPos.x, targetPos.y);
                sprite.unit.q = move.toQ;
                sprite.unit.r = move.toR;
                var dir = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
                sprite.updatePosition(move.toQ, move.toR, dir || 'right');
                this.processedMoves.add(moveKey);
            }
        }
        
        if (processedCount > 0) {
            console.log('✅ Обработано движений:', processedCount);
        }
    } catch (error) {
        console.error('❌ Ошибка в processLastMoves:', error);
    } finally {
        this.moveProcessingLock = false;
    }
};

// ============================================
// updateTanks
// ============================================
GameScene.prototype.updateTanks = function(state) {
   if (!state || !this.isReady) return;
   
   var currentTanks = new Map();
   var self = this;
   
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
   
   currentTanks.forEach(function(value, id) {
       if (self.tankSprites.has(id)) {
           var sprite = self.tankSprites.get(id);
           var unit = value.unit;
           
           if (sprite.isAnimating) return;
           
           var currentPos = { q: sprite.unit.q, r: sprite.unit.r };
           if (currentPos.q !== unit.q || currentPos.r !== unit.r) {
               var targetPos = self.hexGrid.hexToPixel(unit.q, unit.r);
               sprite.container.setPosition(targetPos.x, targetPos.y);
               sprite.unit.q = unit.q;
               sprite.unit.r = unit.r;
               sprite.updatePosition(unit.q, unit.r, unit.direction);
           }
           
           if (sprite.unit.hp !== unit.hp) {
               sprite.unit.hp = unit.hp;
               sprite.updateHPBar();
           }
       } else {
           var sprite = new TankSprite(self, value.unit, self.hexGrid);
           sprite.create();
           
           if (value.isPlayer && value.unit.direction) {
               sprite.unit.direction = value.unit.direction;
               sprite.currentDirection = value.unit.direction;
               sprite.updateBarrel();
           }
           
           self.tankSprites.set(id, sprite);
           
           if (value.isPlayer && state.lastMoves && state.lastMoves[id]) {
               var move = state.lastMoves[id];
               if (move) {
                   var dir = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
                   sprite.unit.direction = dir;
                   sprite.currentDirection = dir;
                   sprite.animateMove(
                       move.fromQ, move.fromR, move.toQ, move.toR, 2000,
                       function() {
                           sprite.updateBarrel();
                           if (self.gameState && self.gameState.lastMoves) {
                               delete self.gameState.lastMoves[id];
                           }
                       }
                   );
               }
           }
       }
   });
   
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
       if (result) {
           if (result.type === 'move') {
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
           } else {
               this.handleShootResult(result);
           }
       }
   }
};

// ============================================
// handleShootResult
// ============================================
GameScene.prototype.handleShootResult = function(result) {
   if (!result) return;
   
   console.log('🎯 handleShootResult:', result);
   
   // Проверяем, есть ли данные для анимации выстрела
   if (result.fromQ !== undefined && result.fromR !== undefined &&
       result.targetQ !== undefined && result.targetR !== undefined) {
       
       var shooterId = result.attackerId || result.unitId;
       console.log('🔫 Стрелок ID:', shooterId);
       
       this.animateShot(
           result.fromQ, 
           result.fromR, 
           result.targetQ, 
           result.targetR,
           shooterId
       );
   }
   
   // Обработка результата выстрела
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
       this.playMissSound();
   }
   
   // Обновляем состояние игры
   if (this.gameController) {
       this.gameController.updateGameState();
   }
};

// ============================================
// executeShot
// ============================================
GameScene.prototype.executeShot = function(result) {
   var self = this;
   
   if (result.fromQ !== undefined && result.fromR !== undefined &&
       result.targetQ !== undefined && result.targetR !== undefined) {
       self.animateShot(result.fromQ, result.fromR, result.targetQ, result.targetR, result.unitId);
   }
   
   if (result.hit) {
       if (result.killed) {
           self.showMessage('💀 ' + (result.message || 'Уничтожение!'));
           self.addSmoke(result.targetQ, result.targetR);
       } else {
           self.showMessage('💥 ' + result.message);
       }
   } else if (result.message) {
       self.showMessage('❌ ' + result.message);
       self.playMissSound();
   }
   
   if (self.gameController) {
       self.gameController.updateGameState();
   }
};

// ============================================
// playMissSound
// ============================================
GameScene.prototype.playMissSound = function() {
   var firstTank = null;
   this.tankSprites.forEach(function(sprite) {
       if (!firstTank) {
           firstTank = sprite;
       }
   });
   
   if (firstTank && firstTank.playSound) {
       firstTank.playSound('miss');
       console.log('🔊 Звук промаха');
   }
};

// ============================================
// updateGameState
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
// ✅ ИСПРАВЛЕННАЯ АНИМАЦИЯ ВЫСТРЕЛА
// ============================================
GameScene.prototype.animateShot = function(fromQ, fromR, toQ, toR, unitId) {
   // ✅ ПОЛУЧАЕМ КООРДИНАТЫ ТОЛЬКО ОДИН РАЗ
   var from = this.hexGrid.hexToPixel(fromQ, fromR);
   var to = this.hexGrid.hexToPixel(toQ, toR);
   
   console.log('🎯 animateShot от', fromQ, fromR, 'до', toQ, toR);
   console.log('📐 fromPixel:', from.x, from.y, 'toPixel:', to.x, to.y);
   
   // Находим танк, который стрелял
   var shootingTank = null;
   if (unitId) {
       shootingTank = this.tankSprites.get(unitId);
   }
   
   // Если не нашли по ID - ищем по позиции
   if (!shootingTank) {
       this.tankSprites.forEach(function(sprite, key) {
           if (sprite.unit && sprite.unit.active !== false &&
               sprite.unit.q === fromQ && sprite.unit.r === fromR) {
               shootingTank = sprite;
           }
       });
   }
   
   // ✅ ВЫЧИСЛЯЕМ НАПРАВЛЕНИЕ
   var direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
   console.log('🎯 Направление выстрела:', direction);
   
   // Если есть танк-стрелок - поворачиваем башню и стреляем
   if (shootingTank) {
       if (typeof shootingTank.rotateTurret === 'function') {
           shootingTank.rotateTurret(direction, 300, function() {
               console.log('✅ Башня повернута, выполняем выстрел');
               this._executeShot(from, to, shootingTank);
           }.bind(this));
       } else {
           console.warn('⚠️ Метод rotateTurret отсутствует, стреляем без поворота');
           this._executeShot(from, to, shootingTank);
       }
   } else {
       console.warn('⚠️ Стреляющий танк не найден, создаем снаряд');
       this._executeShot(from, to, null);
   }
};

// ============================================
// ✅ ИСПРАВЛЕННОЕ ВЫПОЛНЕНИЕ АНИМАЦИИ ВЫСТРЕЛА
// ============================================
GameScene.prototype._executeShot = function(from, to, shootingTank) {
   console.log('💥 _executeShot от', from.x, from.y, 'до', to.x, to.y);
   
   // ✅ СОЗДАЕМ СНАРЯД С ЯРКИМ СВЕЧЕНИЕМ
   var projectile = this.add.circle(from.x, from.y, 8, 0xff6600);
   projectile.setDepth(20);
   projectile.setStrokeStyle(3, 0xffaa00);
   
   // ✅ СВЕЧЕНИЕ
   var glow = this.add.circle(from.x, from.y, 20, 0xff8800, 0.3);
   glow.setDepth(19);
   
   // ✅ ДОБАВЛЯЕМ В АКТИВНЫЕ СНАРЯДЫ
   var projectileData = {
       projectile: projectile,
       glow: glow,
       active: true
   };
   this.activeProjectiles.push(projectileData);
   
   // Анимация отдачи у стреляющего танка
   if (shootingTank && typeof shootingTank.playRecoil === 'function') {
       shootingTank.playRecoil();
   }
   
   // ✅ РАССЧИТЫВАЕМ ДЛИТЕЛЬНОСТЬ ПОЛЕТА
   var dx = to.x - from.x;
   var dy = to.y - from.y;
   var distance = Math.sqrt(dx * dx + dy * dy);
   var duration = Math.max(300, Math.min(1200, distance * 0.8));
   
   console.log('📐 Расстояние:', distance, 'длительность:', duration);
   
   var self = this;
   
   // ✅ АНИМАЦИЯ ПОЛЕТА С ТРАЕКТОРИЕЙ
   this.tweens.add({
       targets: projectile,
       x: to.x,
       y: to.y,
       duration: duration,
       ease: 'Power1',
       onUpdate: function(tween) {
           glow.x = projectile.x;
           glow.y = projectile.y;
           
           // ✅ ДОБАВЛЯЕМ СВЕЧЕНИЕ СЛЕДА
           if (Math.random() < 0.3) {
               var trail = self.add.circle(
                   projectile.x + (Math.random() - 0.5) * 8,
                   projectile.y + (Math.random() - 0.5) * 8,
                   3 + Math.random() * 4,
                   0xff8800,
                   0.2 + Math.random() * 0.3
               );
               trail.setDepth(18);
               self.tweens.add({
                   targets: trail,
                   alpha: 0,
                   scale: 0.3,
                   duration: 200,
                   onComplete: function() {
                       trail.destroy();
                   }
               });
           }
       },
       onComplete: function() {
           // ✅ УДАЛЯЕМ ИЗ АКТИВНЫХ
           var index = self.activeProjectiles.indexOf(projectileData);
           if (index !== -1) {
               self.activeProjectiles.splice(index, 1);
           }
           
           projectile.destroy();
           glow.destroy();
           
           // ✅ ПРОВЕРЯЕМ, ЧТО ВЗРЫВ ПРОИСХОДИТ В ТОЧКЕ ПРИЛЕТА
           // ИСПОЛЬЗУЕМ КООРДИНАТЫ to.x, to.y - ОНИ ТОЧНЫЕ
           console.log('💥 Взрыв в точке:', Math.round(to.x), Math.round(to.y));
           
           // Взрываем точно по координатам
           self.addExplosionAt(to.x, to.y);
           
           // Проверяем попадание по координатам
           var hex = self.hexGrid.pixelToHex(to.x, to.y);
           if (hex) {
               console.log('📍 Клетка взрыва:', hex.q, hex.r);
               // Проверяем, есть ли там танк
               var hasTarget = false;
               self.tankSprites.forEach(function(sprite) {
                   if (sprite.unit && sprite.unit.active !== false && 
                       sprite.unit.q === hex.q && sprite.unit.r === hex.r) {
                       hasTarget = true;
                       if (typeof sprite.playSound === 'function') {
                           sprite.playSound('hit');
                       }
                   }
               });
               
               if (!hasTarget) {
                   console.log('🔊 Промах (нет цели)');
               }
           }
       }
   });
};

// ============================================
// ВЗРЫВ ПО КООРДИНАТАМ (БЕЗ ГЕКСА)
// ============================================
GameScene.prototype.addExplosionAt = function(x, y) {
   console.log('💥 Взрыв по координатам:', x, y);
   
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

// ============================================
// checkHitSound
// ============================================
GameScene.prototype.checkHitSound = function(q, r) {
   var hasTarget = false;
   var targetSprite = null;
   
   this.tankSprites.forEach(function(sprite, key) {
       if (sprite.unit && sprite.unit.active !== false && 
           sprite.unit.q === q && sprite.unit.r === r) {
           hasTarget = true;
           targetSprite = sprite;
       }
   });
   
   if (hasTarget && targetSprite) {
       if (typeof targetSprite.playSound === 'function') {
           targetSprite.playSound('hit');
       }
       console.log('💥 Попадание по танку на', q, r);
   } else {
       console.log('🔊 Промах (нет цели на клетке', q, r, ')');
   }
};

// ============================================
// ЭФФЕКТ ВЗРЫВА
// ============================================
GameScene.prototype.addExplosion = function(q, r) {
   var pos = this.hexGrid.hexToPixel(q, r);
   this.addExplosionAt(pos.x, pos.y);
};

// ============================================
// ЭФФЕКТ ДЫМА
// ============================================
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

// ============================================
// ПОКАЗ СООБЩЕНИЯ
// ============================================
GameScene.prototype.showMessage = function(text) {
   if (this.inputController) {
       this.inputController.showMessage(text);
   }
};

// ============================================
// ОБРАБОТКА РЕСАЙЗА
// ============================================
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

// ============================================
// ОСТАНОВКА СЦЕНЫ
// ============================================
GameScene.prototype.shutdown = function() {
   if (this.updateTimer) {
       this.updateTimer.remove();
       this.updateTimer = null;
   }
   if (this.botTimer) {
       this.botTimer.remove();
       this.botTimer = null;
   }
   
   // ✅ УНИЧТОЖАЕМ ВСЕ СНАРЯДЫ
   for (var i = 0; i < this.activeProjectiles.length; i++) {
       var p = this.activeProjectiles[i];
       if (p.projectile) p.projectile.destroy();
       if (p.glow) p.glow.destroy();
   }
   this.activeProjectiles = [];
   
   var self = this;
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
   
   if (this.zoomContainer) {
       this.zoomContainer.remove();
       this.zoomContainer = null;
   }
   
   this.isReady = false;
};

// Регистрируем сцену
if (typeof window !== 'undefined') {
   window.GameScene = GameScene;
}
