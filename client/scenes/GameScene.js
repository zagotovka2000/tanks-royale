// client/scenes/GameScene.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ

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
       
       this.isReady = false;
       this.pendingState = null;
       this.processedMoves = new Set();
       this.lastMoveTime = 0;
       
       this.moveDuration = 1500;
       this.rotateDuration = 400;
       this.shootDuration = 300;
   }

   create() {
       console.log('🎮 GameScene.create() START');
       
       this.cameras.main.setBackgroundColor('#1a2a3a');
       this.setupScene();
       this.setupControllers();
       this.setupInput();
       this.setupUI();
       this.setupTimers();
       
       this.isReady = true;
       this.loadInitialState();
       
       console.log('✅ GameScene.create() FINISHED');
   }

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

   setupControllers() {
       this.gameController = new GameController(this, null);
       this.gameController.init();
       
       this.inputController = new InputController(this, this.gameController);
       this.inputController.init();
       this.inputController.scene = this;
       
       this.cameraController = new CameraController(this);
       this.cameraController.init();
       
       console.log('✅ Контроллеры созданы');
   }

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
       });
       
       console.log('✅ Ввод настроен');
   }

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

   setupTimers() {
       this.time.addEvent({
           delay: 100,
           callback: () => {
               if (this.gameController) {
                   this.gameController.updateUI();
               }
           },
           loop: true
       });
       
       this.time.addEvent({
           delay: 5000,
           callback: () => {
               this.cleanupAnimations();
           },
           loop: true
       });
       
       console.log('✅ Таймеры настроены');
   }

   loadInitialState() {
       if (this.gameController) {
           this.gameController.updateGameState();
       }
       
       if (!this.gameState) {
           this.createTestState();
       }
   }

   // ============================================
   // ОБНОВЛЕНИЕ СОСТОЯНИЯ
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
       
       this.gameState = state;
       
       if (state.cells && this.hexGrid) {
           this.hexGrid.drawMap(state.cells);
       }
       
       this.updateTanks(state);
       
       if (this.inputController) {
           this.inputController.setGameState(state);
       }
       
       if (this.gameController) {
           this.gameController.updateUI();
       }
   }

   updateTanks(state) {
      if (!state || !this.isReady) return;
      
      const currentTanks = this.getCurrentTanks(state);
      const self = this;
      
      currentTanks.forEach((value, id) => {
          if (self.tankSprites.has(id)) {
              const sprite = self.tankSprites.get(id);
              const unit = value.unit;
              
              // ✅ ПРОСТАЯ ПРОВЕРКА
              if (sprite._isAnimating) {
                  if (sprite.unit.hp !== unit.hp) {
                      sprite.unit.hp = unit.hp;
                      sprite.updateHPBar();
                  }
                  return;
              }
              
              const currentPos = { q: sprite.unit.q, r: sprite.unit.r };
              const needMove = (currentPos.q !== unit.q || currentPos.r !== unit.r);
              
              if (needMove) {
                  console.log(`🎯 ДВИЖЕНИЕ: (${currentPos.q},${currentPos.r}) -> (${unit.q},${unit.r})`);
                  
                  const fromQ = sprite.unit.q;
                  const fromR = sprite.unit.r;
                  const toQ = unit.q;
                  const toR = unit.r;
                  
                  sprite.unit.q = toQ;
                  sprite.unit.r = toR;
                  sprite.unit.direction = unit.direction || sprite.unit.direction;
                  
                  // ✅ ПРОСТО ВЫЗЫВАЕМ MOVE TO
                  sprite.moveTo(fromQ, fromR, toQ, toR, self.moveDuration, function() {
                      console.log(`✅ Анимация завершена для ${id}`);
                      if (sprite.unit.hp !== unit.hp) {
                          sprite.unit.hp = unit.hp;
                          sprite.updateHPBar();
                      }
                  });
                  
                  if (sprite.unit.hp !== unit.hp) {
                      sprite.unit.hp = unit.hp;
                      sprite.updateHPBar();
                  }
                  
                  if (unit.direction && unit.direction !== sprite.currentDirection) {
                      sprite.rotateTurret(unit.direction);
                  }
                  
              } else {
                  const targetPos = self.hexGrid.hexToPixel(unit.q, unit.r);
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
              // Создаем новый танк
              console.log(`🆕 СОЗДАЕМ НОВЫЙ ТАНК: ${id}`);
              const sprite = new TankSprite(self, value.unit, self.hexGrid, self.animationEngine);
              sprite.create();
              sprite.moveDuration = self.moveDuration;
              sprite.rotateDuration = self.rotateDuration;
              
              const pos = self.hexGrid.hexToPixel(value.unit.q, value.unit.r);
              sprite.container.setScale(0);
              self.tweens.add({
                  targets: sprite.container,
                  scale: 1,
                  duration: 300,
                  ease: 'Back.Out'
              });
              
              self.tankSprites.set(id, sprite);
              console.log(`✅ Создан танк: ${id} (${value.unit.name})`);
          }
      });
      
      this.removeMissingTanks(currentTanks);
  }
  

   getCurrentTanks(state) {
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
       
       return tanks;
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
           }
       }
   }

   // ============================================
   // ОБРАБОТКА ВЫСТРЕЛОВ
   // ============================================

 // client/scenes/GameScene.js - В МЕТОДЕ handleShootResult

handleShootResult(result) {
   if (!result) return;
   
   console.log('🎯 handleShootResult:', result);
   
   let attacker = null;
   if (result.attackerId) {
       attacker = this.tankSprites.get(result.attackerId);
   }
   
   // ✅ ЕСЛИ ЕСТЬ СТРЕЛЯЮЩИЙ - ПОВОРАЧИВАЕМ СТВОЛ И СТРЕЛЯЕМ
   if (attacker) {
       // Поворачиваем ствол в направлении выстрела
       const fromQ = result.fromQ;
       const fromR = result.fromR;
       const targetQ = result.targetQ;
       const targetR = result.targetR;
       const dir = HexUtils.getDirection(fromQ, fromR, targetQ, targetR);
       
       // ✅ ПОВОРАЧИВАЕМ СТВОЛ И СТРЕЛЯЕМ
       attacker.shootAt(targetQ, targetR, () => {
           // После выстрела ствол остается в этом направлении
           console.log('✅ Выстрел завершен, ствол в направлении', dir);
       });
   }
   
   // Анимируем снаряд
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
   // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
   // ============================================

   showMessage(text) {
       if (this.inputController) {
           this.inputController.showMessage(text);
       }
   }

   showGameOver(winner) {
       const overlay = document.getElementById('gameover');
       const winnerText = document.getElementById('winnerText');
       
       if (overlay) overlay.style.display = 'flex';
       if (winnerText) winnerText.textContent = winner || 'Игра окончена';
   }

   toggleDebug() {
       if (this.animationEngine) {
           this.animationEngine.setDebug(!this.animationEngine.debugMode);
       }
       if (this.shootAnimation) {
           this.shootAnimation.setDebug(!this.shootAnimation.debugMode);
       }
       console.log(`🐛 Отладка: ${this.animationEngine.debugMode ? 'ВКЛ' : 'ВЫКЛ'}`);
   }

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

   createTestState() {
       const state = {
           myTank: {
               id: 'player1',
               name: 'Командир',
               q: 1,
               r: -8,
               hp: 120,
               maxHp: 120,
               damage: 35,
               color: '#ffd93d',
               type: 'medium',
               active: true,
               direction: 'right',
               kills: 0,
               isPlayer: true
           },
           enemies: [{
               id: 'enemy1',
               name: 'Враг',
               q: -1,
               r: 8,
               hp: 100,
               maxHp: 100,
               damage: 30,
               color: '#e94560',
               type: 'medium',
               active: true,
               direction: 'right',
               kills: 0,
               isPlayer: false
           }],
           cells: [],
           gameOver: false,
           winner: null
       };
       
       this.updateGameState(state);
   }

   onResize() {
       if (this.hexGrid) {
           const width = this.cameras.main.width;
           const height = this.cameras.main.height;
           this.hexGrid.gridOffsetX = width / 2;
           this.hexGrid.gridOffsetY = height / 2;
           
           if (this.gameState) {
               this.hexGrid.drawMap(this.gameState.cells);
               this.updateTanks(this.gameState);
           }
       }
   }

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
       
       console.log('🧹 GameScene очищена');
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.GameScene = GameScene;
   console.log('✅ GameScene зарегистрирован в window');
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { GameScene };
}
