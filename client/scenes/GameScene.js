// client/scenes/GameScene.js

var GameScene = new Phaser.Class({
   Extends: Phaser.Scene,
   
   initialize: function() {
       console.log('🏗️ GameScene конструктор');
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
       
       // Настройки камеры
       this.cameraZoom = 1;
       this.minZoom = 0.5;
       this.maxZoom = 2.0;
       this.isDragging = false;
       this.dragStartX = 0;
       this.dragStartY = 0;
       this.cameraStartX = 0;
       this.cameraStartY = 0;
   },
   
   init: function() {
       console.log('🔧 GameScene.init()');
   },
   
   create: function() {
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
       
       // ✅ ТАЙМЕР ОБНОВЛЕНИЯ (КАЖДЫЕ 100МС ДЛЯ UI И ЛОГИКИ)
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
   },
   
   setupCameraControls: function() {
       var self = this;
       var scene = this;
       
       // === КОЛЕСИКО МЫШИ - ЗУМ ===
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
       
       // === ЗАЖАТАЯ ЛЕВАЯ КНОПКА - ПАНОРАМИРОВАНИЕ ===
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
               
               // Двигаем камеру (инвертируем направление)
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
       
       // === КНОПКИ ЗУМА НА ЭКРАНЕ ===
       // Добавляем кнопки в DOM
       this.addZoomButtons();
   },
   
   addZoomButtons: function() {
       var self = this;
       
       // Создаем контейнер для кнопок
       var zoomContainer = document.createElement('div');
       zoomContainer.id = 'zoom-controls';
       zoomContainer.style.cssText = `
           position: fixed;
           bottom: 100px;
           right: 20px;
           display: flex;
           flex-direction: column;
           gap: 8px;
           z-index: 1000;
       `;
       document.body.appendChild(zoomContainer);
       
       // Кнопка "+"
       var zoomInBtn = document.createElement('button');
       zoomInBtn.textContent = '+';
       zoomInBtn.style.cssText = `
           width: 50px;
           height: 50px;
           border-radius: 25px;
           border: none;
           background: rgba(0,0,0,0.7);
           color: white;
           font-size: 28px;
           cursor: pointer;
           backdrop-filter: blur(5px);
           transition: background 0.2s;
       `;
       zoomInBtn.onmouseover = function() { this.style.background = 'rgba(233,69,96,0.8)'; };
       zoomInBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
       zoomInBtn.onclick = function() {
           self.cameraZoom = Math.min(self.maxZoom, self.cameraZoom + 0.1);
           self.cameras.main.setZoom(self.cameraZoom);
           self.updateCamera();
           self.updateDebugText();
       };
       zoomContainer.appendChild(zoomInBtn);
       
       // Кнопка "-"
       var zoomOutBtn = document.createElement('button');
       zoomOutBtn.textContent = '−';
       zoomOutBtn.style.cssText = `
           width: 50px;
           height: 50px;
           border-radius: 25px;
           border: none;
           background: rgba(0,0,0,0.7);
           color: white;
           font-size: 28px;
           cursor: pointer;
           backdrop-filter: blur(5px);
           transition: background 0.2s;
       `;
       zoomOutBtn.onmouseover = function() { this.style.background = 'rgba(233,69,96,0.8)'; };
       zoomOutBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.7)'; };
       zoomOutBtn.onclick = function() {
           self.cameraZoom = Math.max(self.minZoom, self.cameraZoom - 0.1);
           self.cameras.main.setZoom(self.cameraZoom);
           self.updateCamera();
           self.updateDebugText();
       };
       zoomContainer.appendChild(zoomOutBtn);
       
       // Кнопка сброса
       var resetBtn = document.createElement('button');
       resetBtn.textContent = '⟲';
       resetBtn.style.cssText = `
           width: 50px;
           height: 50px;
           border-radius: 25px;
           border: none;
           background: rgba(0,0,0,0.7);
           color: #ff9800;
           font-size: 24px;
           cursor: pointer;
           backdrop-filter: blur(5px);
           transition: background 0.2s;
           margin-top: 5px;
       `;
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
       
       // Сохраняем ссылку для удаления
       this.zoomContainer = zoomContainer;
   },
   
   updateDebugText: function() {
       if (this.debugText && this.hexGrid) {
           this.debugText.setText(
               'Гексов: ' + this.hexGrid.hexObjects.size + 
               ' | Танков: ' + this.tankSprites.size +
               ' | Зум: ' + this.cameraZoom.toFixed(2) + 'x'
           );
       }
   },
   
   // ✅ ДОБАВЛЕННЫЙ МЕТОД updateCamera
   updateCamera: function() {
       // Принудительно обновляем камеру
       this.cameras.main.update();
       console.log('📷 Камера обновлена: zoom=' + this.cameraZoom.toFixed(2));
   },
   
   // ✅ ОБНОВЛЕННЫЙ onUpdate - ОТСЛЕЖИВАЕТ ЗАВЕРШЕНИЕ АНИМАЦИЙ
   onUpdate: function() {
       // ✅ ОБНОВЛЯЕМ АНИМАЦИИ ТАНКОВ
       var allAnimationsComplete = true;
       for (var key of this.tankSprites.keys()) {
           var sprite = this.tankSprites.get(key);
           if (sprite && sprite.update) {
               sprite.update();
               if (sprite.isAnimating) {
                   allAnimationsComplete = false;
               }
           }
       }
       
       // ✅ ЕСЛИ ВСЕ АНИМАЦИИ ЗАВЕРШЕНЫ - ОБНОВЛЯЕМ СОСТОЯНИЕ
       if (allAnimationsComplete && this.gameState) {
           // Проверяем, нужно ли обновить танки
           this.updateTanks(this.gameState);
       }
       
       // Обновляем UI
       if (this.gameController) {
           this.gameController.updateUI();
       }
       
       // Обновляем отладочную информацию
       this.updateDebugText();
   },
   
   onBotAction: function() {
       if (this.isLocalGame && this.gameController) {
           var result = this.gameController.botAction();
           if (result) {
               this.handleShootResult(result);
           }
       }
   },
   
   updateGameState: function(state) {
       if (!state) {
           if (this.gameController && this.gameController.gameState) {
               state = this.gameController.gameState;
           } else {
               return;
           }
       }
       
       this.gameState = state;
       
       // Обновляем карту
       if (state.cells) {
           this.hexGrid.drawMap(state.cells);
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
   },
   
   // ✅ ИСПРАВЛЕННЫЙ updateTanks - ВЫЗЫВАЕТ updateBarrel() ПРИ СОЗДАНИИ
   updateTanks: function(state) {
       if (!state) return;
       
       console.log('🔄 updateTanks() START');
       
       var currentTanks = new Map();
       
       if (state.myTank && state.myTank.active !== false) {
           currentTanks.set(state.myTank.id, { unit: state.myTank, isPlayer: true });
           console.log('📌 Игрок на позиции:', state.myTank.q, state.myTank.r, 'направление:', state.myTank.direction);
       }
       
       if (state.enemies) {
           for (var i = 0; i < state.enemies.length; i++) {
               var enemy = state.enemies[i];
               if (enemy.active !== false) {
                   currentTanks.set(enemy.id, { unit: enemy, isPlayer: false });
               }
           }
       }
       
       var self = this;
       currentTanks.forEach(function(value, id) {
           if (self.tankSprites.has(id)) {
               var sprite = self.tankSprites.get(id);
               var unit = value.unit;
               
               // ✅ ЕСЛИ ТАНК АНИМИРУЕТСЯ - НЕ МЕНЯЕМ ПОЗИЦИЮ!
               if (!sprite.isAnimating) {
                   var targetPos = self.hexGrid.hexToPixel(unit.q, unit.r);
                   sprite.container.setPosition(targetPos.x, targetPos.y);
                   // ✅ ПЕРЕДАЕМ НАПРАВЛЕНИЕ ИЗ UNIT
                   sprite.updatePosition(unit.q, unit.r, unit.direction);
                   console.log('✅ Обновлен спрайт', id, 'на позицию', targetPos.x, targetPos.y, 'направление:', unit.direction);
               } else {
                   console.log('⏳ Танк', id, 'анимируется, пропускаем обновление позиции');
               }
           } else {
               // Создаем новый спрайт
               console.log('🆕 Создаем новый танк:', id);
               var sprite = new TankSprite(self, value.unit, self.hexGrid);
               sprite.create();
               // ✅ УБЕЖДАЕМСЯ, ЧТО БАШНЯ СМОТРИТ В НУЖНУЮ СТОРОНУ
               sprite.updateBarrel();
               self.tankSprites.set(id, sprite);
           }
       });
       
       // Удаляем танки, которых больше нет
       var existingIds = [];
       for (var key of self.tankSprites.keys()) {
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
   },
   
   handleShootResult: function(result) {
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
       
       if (this.gameController) {
           this.gameController.updateGameState();
       }
   },
   
   animateShot: function(fromQ, fromR, toQ, toR) {
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
   },
   
   addExplosion: function(q, r) {
       var pos = this.hexGrid.hexToPixel(q, r);
       
       for (var i = 0; i < 15; i++) {
           var angle = Math.random() * Math.PI * 2;
           var dist = 20 + Math.random() * 40;
           var particle = this.add.circle(pos.x, pos.y, 3 + Math.random() * 5, 0xff6600);
           particle.setDepth(15);
           
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
   },
   
   addSmoke: function(q, r) {
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
       }
   },
   
   showMessage: function(text) {
       if (this.inputController) {
           this.inputController.showMessage(text);
       }
   },
   
   onResize: function() {
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
   },
   
   shutdown: function() {
       if (this.updateTimer) {
           this.updateTimer.remove();
           this.updateTimer = null;
       }
       if (this.botTimer) {
           this.botTimer.remove();
           this.botTimer = null;
       }
       
       for (var key of this.tankSprites.keys()) {
           var sprite = this.tankSprites.get(key);
           if (sprite) sprite.destroy();
       }
       this.tankSprites.clear();
       
       if (this.inputController) {
           this.inputController.destroy();
           this.inputController = null;
       }
       if (this.gameController) {
           this.gameController.destroy();
           this.gameController = null;
       }
       
       // Удаляем кнопки зума
       if (this.zoomContainer) {
           this.zoomContainer.remove();
           this.zoomContainer = null;
       }
       
       window.removeEventListener('resize', this.onResize);
   }
});

// Регистрируем сцену
if (typeof window !== 'undefined') {
   window.GameScene = GameScene;
}
