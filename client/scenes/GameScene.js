// client/scenes/GameScene.js - ПОЛНАЯ ВЕРСИЯ С ПОДКЛЮЧЕНИЕМ К СЕРВЕРУ И ЛОГИРОВАНИЕМ

class GameScene extends Phaser.Scene {
   constructor() {
       super({ key: 'GameScene' });
       
       this.gameState = null;
       this.hexGrid = null;
       this.tankSprites = new Map();
       this.animationEngine = null;
       this.shootAnimation = null;
       this.gameController = null;
       this.inputController = null;
       this.cameraController = null;
       
       // ✅ СОКЕТ ДЛЯ СВЯЗИ С СЕРВЕРОМ
       this.socket = null;
       this.isConnected = false;
       
       this.isReady = false;
       this.pendingState = null;
       this.processedMoves = new Set();
       this.lastMoveTime = 0;
       this.pendingAnimations = new Map();
       this.moveQueue = new Map();
       
       this.moveDuration = 1500;
       this.rotateDuration = 400;
       this.shootDuration = 300;
       this.animationTimeout = 3000;
       
       this.updateCounter = 0;
       this.debugMode = false;
       
       // ✅ СТАТИСТИКА ДВИЖЕНИЙ ДЛЯ ОТЛАДКИ
       this.moveStats = {
           totalUpdates: 0,
           totalMoves: 0,
           lastMoveTime: 0,
           moveHistory: []
       };
   }

   // ============================================
   // СОЗДАНИЕ СЦЕНЫ
   // ============================================

   create() {
       console.log('🎮 GameScene.create() START');
       
       this.cameras.main.setBackgroundColor('#1a2a3a');
       
       // Настройка сцены
       this.setupScene();
       
       // ✅ НАСТРАИВАЕМ КОНТРОЛЛЕРЫ С СОКЕТОМ
       this.setupControllers();
       
       this.setupInput();
       this.setupUI();
       this.setupTimers();
       
       this.isReady = true;
       
       // Загружаем начальное состояние
       this.loadInitialState();
       
       console.log('✅ GameScene.create() FINISHED');
   }

   // ============================================
   // НАСТРОЙКА КОМПОНЕНТОВ
   // ============================================

   setupScene() {
       const width = this.cameras.main.width;
       const height = this.cameras.main.height;
       
       this.hexGrid = new HexGrid(this, 45);
       this.hexGrid.init();
       
       this.animationEngine = new AnimationEngine(this);
       this.animationEngine.setDebug(false);
       
       this.shootAnimation = new ShootAnimation(this, this.hexGrid);
       this.shootAnimation.setDebug(false);
       
       console.log('✅ Сцена настроена');
   }

   // ============================================
   // ✅ НАСТРОЙКА КОНТРОЛЛЕРОВ С ПОДКЛЮЧЕНИЕМ К СЕРВЕРУ
   // ============================================

   setupControllers() {
       console.log('🔌 Настройка подключения к серверу...');
       
       // ✅ СОЗДАЕМ СОКЕТ
       this.initSocket();
       
       // ✅ ПЕРЕДАЕМ СОКЕТ В GAME_CONTROLLER
       this.gameController = new GameController(this, this.socket);
       this.gameController.init();
       
       this.inputController = new InputController(this, this.gameController);
       this.inputController.init();
       this.inputController.scene = this;
       
       this.cameraController = new CameraController(this);
       this.cameraController.init();
       
       console.log('✅ Контроллеры созданы');
   }

   // ============================================
   // ✅ ИНИЦИАЛИЗАЦИЯ СОКЕТА
   // ============================================

   initSocket() {
       // Проверяем, загружен ли Socket.io
       if (typeof io === 'undefined') {
           console.warn('⚠️ Socket.io не загружен! Работа в офлайн-режиме');
           this.socket = null;
           this.isConnected = false;
           return;
       }

       try {
           // Подключаемся к серверу
           const serverUrl = window.location.origin || 'http://localhost:3000';
           console.log('🌐 Подключение к серверу:', serverUrl);
           
           this.socket = io(serverUrl, {
               transports: ['websocket', 'polling'],
               reconnection: true,
               reconnectionAttempts: 5,
               reconnectionDelay: 1000,
               timeout: 5000
           });

           // ============================================
           // ОБРАБОТЧИКИ СОБЫТИЙ СОКЕТА
           // ============================================

           this.socket.on('connect', () => {
               console.log('✅ Сокет подключен к серверу! ID:', this.socket.id);
               this.isConnected = true;
               
               // Регистрируем игрока
               this.socket.emit('register', {
                   playerId: 'player1',
                   name: 'Командир',
                   team: 'player'
               });
               
               this.showMessage('✅ Подключен к серверу');
           });

           this.socket.on('connect_error', (error) => {
               console.error('❌ Ошибка подключения сокета:', error);
               this.isConnected = false;
               this.showMessage('⚠️ Ошибка подключения к серверу');
           });

           this.socket.on('disconnect', (reason) => {
               console.log('❌ Сокет отключен:', reason);
               this.isConnected = false;
               this.showMessage('⚠️ Потеря связи с сервером');
           });

           this.socket.on('reconnect', (attemptNumber) => {
               console.log('🔄 Переподключен к серверу, попытка:', attemptNumber);
               this.isConnected = true;
               this.showMessage('✅ Переподключен к серверу');
               
               // Повторно регистрируемся
               this.socket.emit('register', {
                   playerId: 'player1',
                   name: 'Командир',
                   team: 'player'
               });
           });

           // ============================================
           // ИГРОВЫЕ СОБЫТИЯ
           // ============================================

           this.socket.on('gameState', (state) => {
               console.log('📥 Получено состояние от сервера');
               this.updateGameState(state);
           });

           this.socket.on('moveAccepted', (data) => {
               console.log('✅ Движение подтверждено сервером:', data);
               this.showMessage(`✅ Движение на (${data.toQ}, ${data.toR}) подтверждено`);
               
               // Обновляем состояние
               if (this.gameController) {
                   this.gameController.updateGameState();
               }
           });

           this.socket.on('moveRejected', (data) => {
               console.log('❌ Движение отклонено:', data);
               this.showMessage('❌ ' + data.message);
           });

           this.socket.on('shootResult', (result) => {
               console.log('🎯 Результат выстрела от сервера:', result);
               this.handleShootResult(result);
               this.showMessage(result.message || '💥 Выстрел!');
               
               if (this.gameController) {
                   this.gameController.updateGameState();
               }
           });

           this.socket.on('shootRejected', (data) => {
               console.log('❌ Выстрел отклонен:', data);
               this.showMessage('❌ ' + data.message);
           });

           this.socket.on('gameReset', () => {
               console.log('🔄 Сброс игры от сервера');
               this.onGameReset();
           });

           this.socket.on('gameEnded', (data) => {
               console.log('🏁 Игра окончена:', data);
               this.showGameOver(data.winner);
           });

           console.log('✅ Обработчики сокета настроены');

       } catch (error) {
           console.error('❌ Ошибка создания сокета:', error);
           this.socket = null;
           this.isConnected = false;
       }
   }

   // ============================================
   // ВВОД
   // ============================================

   setupInput() {
       this.input.on('pointerdown', (pointer) => {
           if (this.inputController) {
               this.inputController.handleClick(pointer);
           }
       });
       
       this.input.keyboard.on('keydown', (event) => {
           if (event.key === 'd' || event.key === 'D') {
               this.toggleDebug();
           }
           if (event.key === 'r' || event.key === 'R') {
               if (this.gameController) {
                   this.gameController.resetGame();
               }
           }
       });
       
       console.log('✅ Ввод настроен');
   }

   // ============================================
   // UI
   // ============================================

   setupUI() {
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) {
           shootBtn.addEventListener('click', () => {
               if (this.inputController) {
                   this.inputController.executeShoot();
               }
           });
       }
       
       const resetBtn = document.getElementById('resetBtn');
       if (resetBtn) {
           resetBtn.addEventListener('click', () => {
               if (this.gameController) {
                   this.gameController.resetGame();
               }
           });
       }
       
       const newGameBtn = document.getElementById('newGameBtn');
       if (newGameBtn) {
           newGameBtn.addEventListener('click', () => {
               if (this.gameController) {
                   this.gameController.resetGame();
               }
           });
       }
       
       console.log('✅ UI настроен');
   }

   // ============================================
   // ТАЙМЕРЫ
   // ============================================

   setupTimers() {
       // Обновление UI каждые 100мс
       this.time.addEvent({
           delay: 100,
           callback: () => {
               if (this.gameController) {
                   this.gameController.updateUI();
               }
               this.checkStuckAnimations();
           },
           loop: true
       });
       
       // Очистка старых записей каждые 5 секунд
       this.time.addEvent({
           delay: 5000,
           callback: () => {
               this.cleanupAnimations();
           },
           loop: true
       });
       
       console.log('✅ Таймеры настроены');
   }

   // ============================================
   // ЗАГРУЗКА НАЧАЛЬНОГО СОСТОЯНИЯ
   // ============================================

   loadInitialState() {
       console.log('📥 Загрузка начального состояния...');
       
       // Если есть сокет и он подключен - ждем состояние от сервера
       if (this.socket && this.isConnected) {
           console.log('⏳ Ожидание состояния от сервера...');
           // Сервер сам пришлет состояние после регистрации
           return;
       }
       
       // Иначе пробуем получить состояние из GameController
       if (this.gameController) {
           this.gameController.updateGameState();
           
           if (this.gameController.gameState) {
               this.updateGameState(this.gameController.gameState);
               return;
           }
       }
       
       // Если ничего нет - создаем тестовое
       console.log('🔄 Создание тестового состояния...');
       this.createTestState();
   }

   // ============================================
   // ПРОВЕРКА ЗАВИСШИХ АНИМАЦИЙ
   // ============================================

   checkStuckAnimations() {
       const now = Date.now();
       const toRemove = [];
       
       for (const [id, sprite] of this.tankSprites) {
           if (sprite._isAnimating && sprite._animationStartTime) {
               if (now - sprite._animationStartTime > this.animationTimeout) {
                   console.warn(`⚠️ Принудительное завершение анимации для ${id}`);
                   sprite._isAnimating = false;
                   sprite._animationStartTime = null;
                   sprite.stopAllAnimations();
                   
                   const unit = this.getUnitFromState(id);
                   if (unit) {
                       const pos = this.hexGrid.hexToPixel(unit.q, unit.r);
                       sprite.container.setPosition(pos.x, pos.y);
                       sprite.unit.q = unit.q;
                       sprite.unit.r = unit.r;
                       sprite.updateHPBar();
                       sprite.setTracksDirection(unit.direction || 'right', false);
                       sprite.setTurretDirection(unit.direction || 'right', false);
                   }
                   
                   toRemove.push(id);
               }
           }
       }
       
       if (toRemove.length > 0) {
           console.log(`🧹 Принудительно завершено ${toRemove.length} анимаций`);
       }
   }

   getUnitFromState(id) {
       if (!this.gameState) return null;
       
       const sources = [
           this.gameState.myTank,
           ...(this.gameState.enemies || []),
           ...(this.gameState.bots || []),
           ...(this.gameState.allUnits || [])
       ];
       
       for (const unit of sources) {
           if (unit && unit.id === id) {
               return unit;
           }
       }
       
       return null;
   }

   // ============================================
   // ✅ ОБНОВЛЕНИЕ СОСТОЯНИЯ С ЛОГИРОВАНИЕМ
   // ============================================

   updateGameState(state) {
       if (!this.isReady) {
           this.pendingState = state;
           return;
       }
       
       if (!state) {
           if (this.gameController && this.gameController.gameState) {
               state = this.gameController.gameState;
           } else {
               return;
           }
       }
       
       // ✅ ЛОГИРУЕМ ПОЛУЧЕННОЕ СОСТОЯНИЕ
       const unitCount = state.allUnits ? state.allUnits.length : 
                        (state.enemies ? state.enemies.length + 1 : 0);
       console.log(`📊 updateGameState #${this.updateCounter + 1}, юнитов: ${unitCount}`);
       
       this.gameState = state;
       this.updateCounter++;
       
       // Обновляем карту
       if (state.cells && this.hexGrid) {
           this.hexGrid.drawMap(state.cells);
       }
       
       // ✅ ОБНОВЛЯЕМ ВСЕХ ТАНКОВ (ЭТО ДОЛЖНО АНИМИРОВАТЬ ДВИЖЕНИЕ)
       this.updateAllTanks(state);
       
       // Обновляем InputController
       if (this.inputController) {
           this.inputController.setGameState(state);
       }
       
       // Обновляем UI
       if (this.gameController) {
           this.gameController.updateUI();
       }
       
       // Проверяем Game Over
       if (state.gameOver) {
           this.showGameOver(state.winner);
       }
   }

   // ============================================
   // ОБНОВЛЕНИЕ ВСЕХ ТАНКОВ
   // ============================================

   updateAllTanks(state) {
       if (!state || !this.isReady) return;
       
       const allTanks = this.getAllTanksFromState(state);
       
       console.log(`🔄 Обновление ${allTanks.size} танков`);
       
       for (const [id, tankData] of allTanks) {
           const unit = tankData.unit;
           const isPlayer = tankData.isPlayer;
           
           if (this.tankSprites.has(id)) {
               const sprite = this.tankSprites.get(id);
               this.updateTankSprite(sprite, unit, isPlayer);
           } else {
               console.log(`🆕 СОЗДАЕМ ТАНК: ${id} (${unit.name})`);
               this.createTankSprite(id, unit, isPlayer);
           }
       }
       
       this.removeMissingTanks(allTanks);
   }

   getAllTanksFromState(state) {
       const tanks = new Map();
       
       if (state.myTank && state.myTank.active !== false) {
           tanks.set(state.myTank.id, { unit: state.myTank, isPlayer: true });
       }
       
       if (state.enemies) {
           for (const enemy of state.enemies) {
               if (enemy.active !== false) {
                   tanks.set(enemy.id, { unit: enemy, isPlayer: false });
               }
           }
       }
       
       if (state.bots) {
           for (const bot of state.bots) {
               if (bot.active !== false) {
                   tanks.set(bot.id, { unit: bot, isPlayer: false });
               }
           }
       }
       
       if (state.allUnits) {
           for (const unit of state.allUnits) {
               if (unit.active !== false && !tanks.has(unit.id)) {
                   tanks.set(unit.id, { unit: unit, isPlayer: false });
               }
           }
       }
       
       return tanks;
   }

   createTankSprite(id, unit, isPlayer) {
       const sprite = new TankSprite(this, unit, this.hexGrid, this.animationEngine);
       sprite.create();
       sprite.moveDuration = this.moveDuration;
       sprite.rotateDuration = this.rotateDuration;
       sprite.isPlayer = isPlayer;
       
       const pos = this.hexGrid.hexToPixel(unit.q, unit.r);
       sprite.container.setPosition(pos.x, pos.y);
       sprite.container.setScale(0);
       
       this.tweens.add({
           targets: sprite.container,
           scale: 1,
           duration: 300,
           ease: 'Back.Out'
       });
       
       this.tankSprites.set(id, sprite);
       console.log(`✅ Создан танк: ${id} (${unit.name}) на позиции (${unit.q},${unit.r})`);
   }

   // ============================================
   // ✅ ОБНОВЛЕНИЕ СПРАЙТА ТАНКА С ЛОГИРОВАНИЕМ
   // ============================================

   updateTankSprite(sprite, unit, isPlayer) {
       const self = this;
       
       // ✅ ЛОГИРУЕМ ИЗМЕНЕНИЯ ПОЗИЦИЙ
       if (sprite.unit.q !== unit.q || sprite.unit.r !== unit.r) {
           console.log(`🎯 Обновление позиции: ${unit.name} (${sprite.unit.q},${sprite.unit.r}) -> (${unit.q},${unit.r})`);
       }
       
       // Проверяем, не зависла ли анимация
       if (sprite._isAnimating) {
           if (sprite._animationStartTime && 
               Date.now() - sprite._animationStartTime > this.animationTimeout) {
               console.warn(`⚠️ Принудительное завершение анимации для ${sprite.unit.id}`);
               sprite._isAnimating = false;
               sprite._animationStartTime = null;
               sprite.stopAllAnimations();
               
               const pos = this.hexGrid.hexToPixel(unit.q, unit.r);
               sprite.container.setPosition(pos.x, pos.y);
               sprite.unit.q = unit.q;
               sprite.unit.r = unit.r;
               sprite.updateHPBar();
               sprite.setTracksDirection(unit.direction || 'right', false);
               sprite.setTurretDirection(unit.direction || 'right', false);
               return;
           }
           
           if (sprite.unit.hp !== unit.hp) {
               sprite.unit.hp = unit.hp;
               sprite.updateHPBar();
           }
           return;
       }
       
       // Проверяем, нужно ли двигаться
       const currentPos = { q: sprite.unit.q, r: sprite.unit.r };
       const needMove = (currentPos.q !== unit.q || currentPos.r !== unit.r);
       
       if (needMove) {
           const fromQ = sprite.unit.q;
           const fromR = sprite.unit.r;
           const toQ = unit.q;
           const toR = unit.r;
           
           console.log(`🚶 ДВИЖЕНИЕ: ${sprite.unit.name} (${fromQ},${fromR}) -> (${toQ},${toR})`);
           
           // ✅ ОБНОВЛЯЕМ КООРДИНАТЫ В СПРАЙТЕ
           sprite.unit.q = toQ;
           sprite.unit.r = toR;
           
           // ✅ ЗАПУСКАЕМ АНИМАЦИЮ ДВИЖЕНИЯ
           sprite._animationStartTime = Date.now();
           sprite.moveTo(fromQ, fromR, toQ, toR, this.moveDuration, function() {
               console.log(`✅ Анимация завершена для ${sprite.unit.id}`);
               sprite._isAnimating = false;
               sprite._animationStartTime = null;
               
               const finalPos = self.hexGrid.hexToPixel(unit.q, unit.r);
               sprite.container.setPosition(finalPos.x, finalPos.y);
               sprite.unit.q = unit.q;
               sprite.unit.r = unit.r;
               sprite.updateHPBar();
               
               if (unit.direction) {
                   sprite.setTracksDirection(unit.direction, false);
                   sprite.setTurretDirection(unit.direction, false);
               }
           });
           
           if (sprite.unit.hp !== unit.hp) {
               sprite.unit.hp = unit.hp;
               sprite.updateHPBar();
           }
           
       } else {
           // Нет движения - просто обновляем позицию
           const targetPos = this.hexGrid.hexToPixel(unit.q, unit.r);
           sprite.container.setPosition(targetPos.x, targetPos.y);
           sprite.unit.q = unit.q;
           sprite.unit.r = unit.r;
           
           if (unit.direction) {
               sprite.unit.direction = unit.direction;
               sprite.setTracksDirection(unit.direction, false);
               sprite.setTurretDirection(unit.direction, false);
           }
           
           if (sprite.unit.hp !== unit.hp) {
               sprite.unit.hp = unit.hp;
               sprite.updateHPBar();
           }
       }
   }

   removeMissingTanks(currentTanks) {
       const toRemove = [];
       for (const [id, sprite] of this.tankSprites) {
           if (!currentTanks.has(id)) {
               toRemove.push(id);
           }
       }
       
       for (const id of toRemove) {
           const sprite = this.tankSprites.get(id);
           if (sprite) {
               this.tweens.add({
                   targets: sprite.container,
                   alpha: 0,
                   scale: 0.5,
                   duration: 300,
                   onComplete: () => {
                       sprite.destroy();
                       this.tankSprites.delete(id);
                   }
               });
               console.log(`🗑️ Танк удален: ${id}`);
           }
       }
   }

   // ============================================
   // ОБРАБОТКА ВЫСТРЕЛОВ
   // ============================================

   handleShootResult(result) {
       if (!result) return;
       
       console.log('🎯 handleShootResult:', result);
       
       let attacker = null;
       if (result.attackerId) {
           attacker = this.tankSprites.get(result.attackerId);
       }
       
       if (attacker && result.fromQ !== undefined && result.targetQ !== undefined) {
           attacker.shootAt(result.targetQ, result.targetR, () => {
               if (this.debugMode) console.log('✅ Выстрел завершен');
           });
       }
       
       if (result.fromQ !== undefined && result.fromR !== undefined &&
           result.targetQ !== undefined && result.targetR !== undefined) {
           
           this.shootAnimation.fire(
               result.fromQ, result.fromR,
               result.targetQ, result.targetR,
               {
                   duration: this.shootDuration,
                   onHit: (x, y, data) => {
                       if (result.hit) {
                           this.showHitEffect(result.targetQ, result.targetR, result.damage || 0);
                           this.showMessage(`💥 Попадание! -${result.damage || 0} HP`);
                           
                           if (result.killed) {
                               this.showMessage(`💀 ${result.targetName || 'Враг'} уничтожен!`);
                           }
                       } else {
                           this.showMessage(`💨 Промах!`);
                       }
                   }
               }
           );
       }
       
       if (this.gameController) {
           this.gameController.updateGameState();
       }
   }

   // ============================================
   // ЭФФЕКТЫ
   // ============================================

   showHitEffect(q, r, damage) {
       const pos = this.hexGrid.hexToPixel(q, r);
       
       this.shootAnimation.createExplosion(pos.x, pos.y, damage);
       
       if (damage > 0) {
           const color = damage > 30 ? '#ff4444' : '#ffaa00';
           const text = this.add.text(pos.x, pos.y - 20, `-${damage}`, {
               fontSize: '24px',
               color: color,
               stroke: '#000000',
               strokeThickness: 4,
               fontStyle: 'bold'
           }).setOrigin(0.5);
           
           this.tweens.add({
               targets: text,
               y: pos.y - 60,
               alpha: 0,
               duration: 1000,
               ease: 'Quadratic.Out',
               onComplete: () => text.destroy()
           });
       }
       
       if (this.cameraController) {
           this.cameraController.shake(100, 3);
       }
   }

   // ============================================
   // ТЕСТОВОЕ СОСТОЯНИЕ
   // ============================================

   createTestState() {
       console.log('🔄 Создание тестового состояния с 3 ботами...');
       
       const state = {
           myTank: {
               id: 'player1',
               name: 'Командир',
               team: 'player',
               q: 1,
               r: -8,
               hp: 120,
               maxHp: 120,
               damage: 35,
               color: '#ffd93d',
               type: 'medium',
               range: Infinity,
               active: true,
               direction: 'right',
               kills: 0,
               isPlayer: true,
               isBot: false
           },
           enemies: [
               {
                   id: 'bot1',
                   name: 'Враг-1',
                   team: 'enemy',
                   q: -1,
                   r: 8,
                   hp: 100,
                   maxHp: 100,
                   damage: 30,
                   color: '#e94560',
                   type: 'medium',
                   range: 5,
                   active: true,
                   direction: 'right',
                   kills: 0,
                   isPlayer: false,
                   isBot: true
               },
               {
                   id: 'bot2',
                   name: 'Враг-2',
                   team: 'enemy',
                   q: -2,
                   r: 6,
                   hp: 80,
                   maxHp: 80,
                   damage: 25,
                   color: '#ff6b6b',
                   type: 'light',
                   range: 5,
                   active: true,
                   direction: 'right',
                   kills: 0,
                   isPlayer: false,
                   isBot: true
               },
               {
                   id: 'bot3',
                   name: 'Нейтрал',
                   team: 'neutral',
                   q: 3,
                   r: 5,
                   hp: 150,
                   maxHp: 150,
                   damage: 20,
                   color: '#88ccff',
                   type: 'heavy',
                   range: 4,
                   active: true,
                   direction: 'right',
                   kills: 0,
                   isPlayer: false,
                   isBot: true
               }
           ],
           bots: [],
           allUnits: [],
           cells: [],
           gameOver: false,
           winner: null,
           lastPositions: {},
           cooldowns: {}
       };
       
       for (let q = -10; q <= 10; q++) {
           for (let r = -10; r <= 10; r++) {
               const s = -q - r;
               if (Math.abs(q) <= 10 && Math.abs(r) <= 10 && Math.abs(s) <= 10) {
                   state.cells.push({ q, r, s, terrain: 'plains' });
               }
           }
       }
       
       state.allUnits = [state.myTank, ...state.enemies];
       
       this.updateGameState(state);
       console.log('✅ Тестовое состояние создано');
   }

   // ============================================
   // GAME OVER
   // ============================================

   showGameOver(winner) {
       const overlay = document.getElementById('gameover');
       const winnerText = document.getElementById('winnerText');
       
       if (overlay) overlay.style.display = 'flex';
       if (winnerText) winnerText.textContent = winner || 'Игра окончена';
       
       console.log(`🏁 Игра окончена: ${winner}`);
   }

   // ============================================
   // ОЧИСТКА
   // ============================================

   cleanupAnimations() {
       if (this.processedMoves.size > 100) {
           const now = Date.now();
           const toRemove = [];
           for (const key of this.processedMoves) {
               const parts = key.split('_');
               if (parts.length >= 5) {
                   const timestamp = parseInt(parts[parts.length - 1]);
                   if (now - timestamp > 5000) {
                       toRemove.push(key);
                   }
               }
           }
           for (const key of toRemove) {
               this.processedMoves.delete(key);
           }
       }
   }

   // ============================================
   // СООБЩЕНИЯ
   // ============================================

   showMessage(text) {
       if (this.inputController) {
           this.inputController.showMessage(text);
       } else {
           console.log('📝', text);
       }
   }

   // ============================================
   // ОТЛАДКА
   // ============================================

   toggleDebug() {
       this.debugMode = !this.debugMode;
       if (this.animationEngine) {
           this.animationEngine.setDebug(this.debugMode);
       }
       if (this.shootAnimation) {
           this.shootAnimation.setDebug(this.debugMode);
       }
       console.log(`🐛 Отладка: ${this.debugMode ? 'ВКЛ' : 'ВЫКЛ'}`);
   }

   // ============================================
   // RESIZE
   // ============================================

   onResize() {
       if (this.hexGrid) {
           const width = this.cameras.main.width;
           const height = this.cameras.main.height;
           this.hexGrid.gridOffsetX = width / 2;
           this.hexGrid.gridOffsetY = height / 2;
           
           if (this.gameState) {
               this.hexGrid.drawMap(this.gameState.cells);
               this.updateAllTanks(this.gameState);
           }
       }
   }

   // ============================================
   // СБРОС ИГРЫ
   // ============================================

   onGameReset() {
       console.log('🔄 Сброс игры в GameScene');
       
       for (const [id, sprite] of this.tankSprites) {
           sprite.destroy();
       }
       this.tankSprites.clear();
       
       this.processedMoves.clear();
       this.pendingAnimations.clear();
       this.moveQueue.clear();
       
       this.gameState = null;
       this.pendingState = null;
       
       this.loadInitialState();
   }

   // ============================================
   // УНИЧТОЖЕНИЕ
   // ============================================

   shutdown() {
       if (this.animationEngine) {
           this.animationEngine.clearAll();
       }
       
       for (const [id, sprite] of this.tankSprites) {
           sprite.destroy();
       }
       this.tankSprites.clear();
       
       if (this.shootAnimation) {
           this.shootAnimation.clearAll();
       }
       
       if (this.socket) {
           this.socket.disconnect();
           this.socket = null;
       }
       
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
       
       if (this.hexGrid) {
           this.hexGrid.destroy();
           this.hexGrid = null;
       }
       
       this.isReady = false;
       this.processedMoves.clear();
       this.pendingAnimations.clear();
       this.moveQueue.clear();
       
       console.log('🧹 GameScene очищена');
   }
}

// ============================================
// ЭКСПОРТ
// ============================================

if (typeof window !== 'undefined') {
   window.GameScene = GameScene;
   console.log('✅ GameScene зарегистрирован в window');
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { GameScene };
}
