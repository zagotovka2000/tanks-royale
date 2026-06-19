// client/scenes/GameScene.js - ИСПРАВЛЕНИЕ: ОБНОВЛЕННАЯ ОБРАБОТКА ДВИЖЕНИЙ

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
   
   // ✅ НОВЫЕ СВОЙСТВА ДЛЯ ОБРАБОТКИ ДВИЖЕНИЙ
   this.processedMoves = new Set(); // Уже обработанные движения
   this.moveProcessingLock = false;
   this.lastProcessedState = null;
}

GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.init = function() {
   console.log('🔧 GameScene.init()');
};

GameScene.prototype.create = function() {
   console.log('🎮 GameScene.create() START');
   
   // Устанавливаем фон
   this.cameras.main.setBackgroundColor('#1a2a3a');
   
   // Размеры камеры
   var width = this.cameras.main.width;
   var height = this.cameras.main.height;
   console.log('📐 Размеры камеры:', width, 'x', height);
   
   // Создаем гексагональную сетку
   console.log('📐 Создание HexGrid...');
   this.hexGrid = new HexGrid(this, 45);
   this.hexGrid.init();
   console.log('✅ HexGrid создан');
   
   // Создаем игровой контроллер
   console.log('📐 Создание GameController...');
   this.gameController = new GameController(this, null);
   this.gameController.init();
   console.log('✅ GameController создан');
   
   // Создаем контроллер ввода
   console.log('📐 Создание InputController...');
   this.inputController = new InputController(this, this.gameController);
   this.inputController.init();
   this.inputController.scene = this;
   console.log('✅ InputController создан');
   
   // Устанавливаем флаг готовности
   this.isReady = true;
   
   // Загружаем начальное состояние
   console.log('📐 Загрузка начального состояния...');
   this.gameController.updateGameState();
   console.log('✅ Начальное состояние загружено');
   
   // Отладочная информация
   this.debugText = this.add.text(
       10,
       10,
       'Гексов: 0 | Танков: 0 | Зум: 1.0x',
       { 
           fontSize: '14px', 
           color: '#ffffff', 
           backgroundColor: '#000000', 
           padding: { x: 8, y: 4 } 
       }
   );
   this.debugText.setDepth(100);
   this.debugText.setScrollFactor(0);
   
   // Настройка камеры
   this.setupCameraControls();
   
   // Таймер обновления
   this.updateTimer = this.time.addEvent({
       delay: 100,
       callback: this.onUpdate,
       callbackScope: this,
       loop: true
   });
   
   // Таймер для бота
   this.botTimer = this.time.addEvent({
       delay: 2000,
       callback: this.onBotAction,
       callbackScope: this,
       loop: true
   });
   
   // Обработка ресайза
   var self = this;
   window.addEventListener('resize', function() {
       self.onResize();
   });
   
   // Принудительная перерисовка через 500мс
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
   
   // Колесико мыши - зум
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
       console.log('🔍 Зум:', self.cameraZoom.toFixed(2) + 'x');
   });
   
   // Зажатая левая кнопка - панорамирование
   this.input.on('pointerdown', function(pointer) {
       if (pointer.leftButtonDown()) {
           self.isDragging = true;
           self.dragStartX = pointer.x;
           self.dragStartY = pointer.y;
           self.cameraStartX = self.cameras.main.scrollX;
           self.cameraStartY = self.cameras.main.scrollY;
           console.log('🖱️ Начало панорамирования');
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
           console.log('🖱️ Конец панорамирования');
       }
   });
   
   // Кнопки зума на экране
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
       'position: fixed; ' +
       'bottom: 100px; ' +
       'right: 20px; ' +
       'display: flex; ' +
       'flex-direction: column; ' +
       'gap: 8px; ' +
       'z-index: 1000;';
   document.body.appendChild(zoomContainer);
   
   var zoomInBtn = document.createElement('button');
   zoomInBtn.textContent = '+';
   zoomInBtn.style.cssText = 
       'width: 50px; ' +
       'height: 50px; ' +
       'border-radius: 25px; ' +
       'border: none; ' +
       'background: rgba(0,0,0,0.7); ' +
       'color: white; ' +
       'font-size: 28px; ' +
       'cursor: pointer; ' +
       'backdrop-filter: blur(5px); ' +
       'transition: background 0.2s;';
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
       'width: 50px; ' +
       'height: 50px; ' +
       'border-radius: 25px; ' +
       'border: none; ' +
       'background: rgba(0,0,0,0.7); ' +
       'color: white; ' +
       'font-size: 28px; ' +
       'cursor: pointer; ' +
       'backdrop-filter: blur(5px); ' +
       'transition: background 0.2s;';
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
       'width: 50px; ' +
       'height: 50px; ' +
       'border-radius: 25px; ' +
       'border: none; ' +
       'background: rgba(0,0,0,0.7); ' +
       'color: #ff9800; ' +
       'font-size: 24px; ' +
       'cursor: pointer; ' +
       'backdrop-filter: blur(5px); ' +
       'transition: background 0.2s; ' +
       'margin-top: 5px;';
   resetBtn.onmouseover = function() { this.style.background = 'rgba(255,152,0,0.3)'; };
   resetBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
   resetBtn.onclick = function() {
       self.cameraZoom = 1;
       self.cameras.main.setZoom(1);
       self.cameras.main.scrollX = 0;
       self.cameras.main.scrollY = 0;
       self.updateDebugText();
       console.log('⟲ Сброс камеры');
   };
   zoomContainer.appendChild(resetBtn);
   
   this.zoomContainer = zoomContainer;
};

// ============================================
// ОБНОВЛЕНИЕ КАМЕРЫ
// ============================================
GameScene.prototype.updateCamera = function() {
   this.cameras.main.update();
   console.log('📷 Камера обновлена: zoom=' + this.cameraZoom.toFixed(2));
};

// ============================================
// ОБНОВЛЕНИЕ ОТЛАДОЧНОЙ ИНФОРМАЦИИ
// ============================================
GameScene.prototype.updateDebugText = function() {
   if (this.debugText && this.hexGrid) {
       this.debugText.setText(
           'Гексов: ' + this.hexGrid.hexObjects.size + 
           ' | Танков: ' + this.tankSprites.size +
           ' | Зум: ' + this.cameraZoom.toFixed(2) + 'x'
       );
   }
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ onUpdate - ПРОВЕРЯЕТ НОВЫЕ ДВИЖЕНИЯ
// ============================================
GameScene.prototype.onUpdate = function() {
    // Обновляем анимации танков
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
    
    // ✅ ОЧИЩАЕМ СТАРЫЕ ОБРАБОТАННЫЕ ДВИЖЕНИЯ (если прошло больше 5 секунд)
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
    
    // ✅ ОБРАБАТЫВАЕМ НОВЫЕ ДВИЖЕНИЯ
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
    
    // ✅ ОБНОВЛЯЕМ UI ЧЕРЕЗ КОНТРОЛЛЕР
    if (this.gameController) {
        this.gameController.updateUI();
    }
    
    this.updateDebugText();
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ processLastMoves
// ============================================
GameScene.prototype.processLastMoves = function(lastMoves) {
    if (!this.isReady) return;
    if (!lastMoves) return;
    if (this.moveProcessingLock) {
        console.log('⏳ Уже обрабатываем движения');
        return;
    }
    
    this.moveProcessingLock = true;
    var self = this;
    
    try {
        var processedCount = 0;
        
        for (var unitId in lastMoves) {
            if (!lastMoves.hasOwnProperty(unitId)) continue;
            
            var move = lastMoves[unitId];
            if (!move) continue;
            
            // ✅ ПРОВЕРЯЕМ, НЕ ОБРАБОТАНО ЛИ УЖЕ
            var moveKey = unitId + '_' + move.fromQ + '_' + move.fromR + '_' + move.toQ + '_' + move.toR;
            if (this.processedMoves.has(moveKey)) {
                console.log('⏳ Движение уже обработано:', moveKey);
                continue;
            }
            
            // Проверяем, есть ли спрайт
            if (!this.tankSprites.has(unitId)) {
                console.warn('⚠️ Спрайт для танка', unitId, 'не найден');
                continue;
            }
            
            var sprite = this.tankSprites.get(unitId);
            
            // ✅ ЕСЛИ АНИМАЦИЯ ИДЕТ - ПРОПУСКАЕМ
            if (sprite.isAnimating) {
                console.log('⏳ Танк', unitId, 'уже анимируется');
                continue;
            }
            
            // ✅ ПРОВЕРЯЕМ СМЕНУ ПОЗИЦИИ
            var currentQ = sprite.unit.q;
            var currentR = sprite.unit.r;
            
            if (currentQ === move.fromQ && currentR === move.fromR) {
                console.log('🎬 Анимация для', unitId, 'с', move.fromQ, move.fromR, 'на', move.toQ, move.toR);
                
                var direction = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
                
                // Обновляем данные
                sprite.unit.direction = direction;
                sprite.unit.q = move.toQ;
                sprite.unit.r = move.toR;
                sprite.currentDirection = direction;
                
                // ✅ ЗАПУСКАЕМ АНИМАЦИЮ С ОЧЕРЕДЬЮ
                sprite.animateMove(
                    move.fromQ, 
                    move.fromR, 
                    move.toQ, 
                    move.toR, 
                    2000,
                    function() {
                        console.log('✅ Анимация завершена для', unitId);
                        // Отмечаем как обработанное
                        self.processedMoves.add(moveKey);
                        
                        // ✅ ОТПРАВЛЯЕМ moveComplete НА СЕРВЕР
                        if (self.socket && self.socket.connected) {
                            self.socket.emit('moveComplete', {
                                unitId: unitId,
                                fromQ: move.fromQ,
                                fromR: move.fromR,
                                toQ: move.toQ,
                                toR: move.toR
                            });
                        }
                        
                        // Проверяем новые движения
                        setTimeout(function() {
                            if (self.gameState && self.gameState.lastMoves) {
                                self.processLastMoves(self.gameState.lastMoves);
                            }
                        }, 100);
                    }
                );
                processedCount++;
            } else {
                // ✅ ЕСЛИ ПОЗИЦИЯ НЕ СОВПАДАЕТ - ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ
                console.log('⚠️ Позиция не совпадает для', unitId, 'обновляем принудительно');
                var targetPos = this.hexGrid.hexToPixel(move.toQ, move.toR);
                sprite.container.setPosition(targetPos.x, targetPos.y);
                sprite.unit.q = move.toQ;
                sprite.unit.r = move.toR;
                var dir = HexUtils.getDirection(move.fromQ, move.fromR, move.toQ, move.toR);
                sprite.updatePosition(move.toQ, move.toR, dir || 'right');
                
                // Отмечаем как обработанное
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
   
   console.log('🔄 updateTanks() START');
   
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
           
           if (sprite.isAnimating) {
               console.log('⏳ Танк', id, 'анимируется, пропускаем обновление');
               return;
           }
           
           var currentPos = { q: sprite.unit.q, r: sprite.unit.r };
           if (currentPos.q !== unit.q || currentPos.r !== unit.r) {
               console.log('📍 Обновляем позицию', id, 'с', currentPos.q, currentPos.r, 'на', unit.q, unit.r);
               var targetPos = self.hexGrid.hexToPixel(unit.q, unit.r);
               sprite.container.setPosition(targetPos.x, targetPos.y);
               sprite.unit.q = unit.q;
               sprite.unit.r = unit.r;
               sprite.updatePosition(unit.q, unit.r, unit.direction);
           }
       } else {
           console.log('🆕 Создаем новый танк:', id);
           var sprite = new TankSprite(self, value.unit, self.hexGrid);
           sprite.create();
           sprite.updateBarrel();
           self.tankSprites.set(id, sprite);
       }
   });
   
   var existingIds = [];
   var tankKeys = self.tankSprites.keys();
   for (var key of tankKeys) {
       if (!currentTanks.has(key)) {
           existingIds.push(key);
       }
   }
   
   for (var i = 0; i < existingIds.length; i++) {
       var id = existingIds[i];
       var sprite = self.tankSprites.get(id);
       if (sprite) {
           sprite.destroy();
           self.tankSprites.delete(id);
       }
   }
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ onBotAction - используем правильные методы
// ============================================
GameScene.prototype.onBotAction = function() {
   if (this.isLocalGame && this.gameController) {
       var result = this.gameController.botAction();
       if (result) {
           if (result.type === 'move') {
               console.log('🤖 Бот движется:', result.unitId, 'с', result.fromQ, result.fromR, 'на', result.toQ, result.toR);
               
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
                       result.fromQ,
                       result.fromR,
                       result.toQ,
                       result.toR,
                       2000,
                       function() {
                           console.log('✅ Анимация бота завершена');
                           sprite.updateBarrel();
                           // Обновляем состояние после анимации
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
// ✅ ИСПРАВЛЕННЫЙ handleShootResult - используем правильные методы
// ============================================
GameScene.prototype.handleShootResult = function(result) {
   if (!result) return;
   
   if (result.fromQ !== undefined && result.fromR !== undefined &&
       result.targetQ !== undefined && result.targetR !== undefined) {
       this.animateShot(result.fromQ, result.fromR, result.targetQ, result.targetR);
   }
   
   if (result.hit) {
       if (result.killed) {
           this.showMessage('💀 ' + (result.message || 'Уничтожение!'));
           this.addSmoke(result.targetQ, result.targetR);
       } else {
           this.showMessage('💥 ' + result.message);
       }
   } else if (result.message) {
       this.showMessage('❌ ' + result.message);
   }
   
   // ✅ ОБНОВЛЯЕМ СОСТОЯНИЕ
   if (this.gameController) {
       this.gameController.updateGameState();
   }
};

// ============================================
// ОБНОВЛЕНИЕ СОСТОЯНИЯ ИГРЫ
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
   
   // Обновляем карту
   if (state.cells && this.hexGrid) {
       this.hexGrid.drawMap(state.cells);
   }
   
   // ✅ ОБРАБАТЫВАЕМ ПОСЛЕДНИЕ ДВИЖЕНИЯ
   if (state.lastMoves) {
       console.log('📜 Получены последние движения:', state.lastMoves);
       this.processLastMoves(state.lastMoves);
   }
   
   // Обновляем танки
   this.updateTanks(state);
   
   // Обновляем контроллер ввода
   if (this.inputController) {
       this.inputController.setGameState(state);
   }
   
   // Обновляем UI
   if (this.gameController) {
       this.gameController.updateUI();
   }
};

// ============================================
// АНИМАЦИЯ ВЫСТРЕЛА
// ============================================
GameScene.prototype.animateShot = function(fromQ, fromR, toQ, toR) {
   var from = this.hexGrid.hexToPixel(fromQ, fromR);
   var to = this.hexGrid.hexToPixel(toQ, toR);
   
   var projectile = this.add.circle(from.x, from.y, 6, 0xff6600);
   projectile.setDepth(20);
   
   var glow = this.add.circle(from.x, from.y, 14, 0xff8800, 0.3);
   glow.setDepth(19);
   
   var self = this;
   this.tweens.add({
       targets: projectile,
       x: to.x,
       y: to.y,
       duration: 250,
       ease: 'Power2',
       onUpdate: function() {
           glow.x = projectile.x;
           glow.y = projectile.y;
       },
       onComplete: function() {
           projectile.destroy();
           glow.destroy();
           self.addExplosion(toQ, toR);
       }
   });
};

// ============================================
// ЭФФЕКТ ВЗРЫВА
// ============================================
GameScene.prototype.addExplosion = function(q, r) {
   var pos = this.hexGrid.hexToPixel(q, r);
   
   for (var i = 0; i < 15; i++) {
       var angle = Math.random() * Math.PI * 2;
       var dist = 20 + Math.random() * 40;
       var particle = this.add.circle(pos.x, pos.y, 3 + Math.random() * 5, 0xff6600);
       particle.setDepth(15);
       
       (function(particle) {
           this.tweens.add({
               targets: particle,
               x: pos.x + Math.cos(angle) * dist,
               y: pos.y + Math.sin(angle) * dist,
               alpha: 0,
               scale: 0.2,
               duration: 400 + Math.random() * 200,
               ease: 'Power2',
               onComplete: function() {
                   particle.destroy();
               }
           });
       }).call(this, particle);
   }
   
   var flash = this.add.circle(pos.x, pos.y, 25, 0xffffff, 0.6);
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
