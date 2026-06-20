// client/controllers/InputController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

class InputController {
   constructor(scene, gameController) {
       this.scene = scene;
       this.gameController = gameController;
       
       this.isEnabled = true;
       this.moveMode = false;
       this.selectedTarget = null;
       this.selectedTank = null;
       this.validMoveNeighbors = [];
       this.isProcessingAction = false;
       this.lastClickTime = 0;
       this.throttleDelay = 150;
       
       this.shootLogic = null;
   }

   init() {
       if (typeof ShootLogic !== 'undefined') {
           this.shootLogic = new ShootLogic();
           console.log('✅ ShootLogic инициализирован');
       }
       
       this.setupUI();
       this.updateUI();
       
       this.showMessage('🎮 Кликните по своему танку для переключения режима');
       this.showMessage('🔫 Режим по умолчанию: СТРЕЛЬБА');
       
       console.log('✅ InputController инициализирован');
   }

   setupUI() {
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) {
           shootBtn.addEventListener('click', () => {
               this.executeShoot();
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
       
       if (this.scene && this.scene.input && this.scene.input.keyboard) {
           this.scene.input.keyboard.on('keydown', (event) => {
               if (event.key === 'Escape') {
                   this.cancelSelection();
               }
           });
       }
   }

   // ============================================
   // ОБРАБОТКА КЛИКОВ
   // ============================================

   handleClick(pointer) {
       if (!this.isEnabled) return;
       if (this.gameController && this.gameController.isGameOver()) {
           this.showMessage('⚠️ Игра окончена');
           return;
       }
       if (this.isProcessingAction) {
           this.showMessage('⏳ Подождите, выполняется действие...');
           return;
       }
       
       const now = Date.now();
       if (now - this.lastClickTime < this.throttleDelay) return;
       this.lastClickTime = now;
       
       const hex = this.scene.hexGrid.pixelToHex(pointer.x, pointer.y);
       if (!hex) {
           this.showMessage('❌ Клик мимо поля');
           return;
       }
       
       const state = this.scene.gameState;
       if (!state || !state.myTank) return;
       
       const myTank = state.myTank;
       
       if (myTank.q === hex.q && myTank.r === hex.r) {
           this.handleTankClick(myTank);
           return;
       }
       
       if (this.moveMode && this.selectedTank) {
           this.handleMoveClick(hex);
           return;
       }
       
       if (!this.moveMode) {
           this.handleShootClick(hex);
       }
   }

   handleTankClick(tank) {
       if (this.selectedTank && this.moveMode) {
           this.clearTankSelection();
           this.moveMode = false;
           this.updateUI();
           this.showMessage('🔫 Режим СТРЕЛЬБЫ');
           return;
       }
       
       if (this.gameController && !this.gameController.canMove(tank.id)) {
           const remaining = this.gameController.getRemainingMoveCooldown(tank.id);
           this.showMessage(`⏱️ Кулдаун движения: ${Math.ceil(remaining/1000)}с`);
           return;
       }
       
       this.selectTank(tank);
   }

   handleMoveClick(hex) {
       const isValid = this.validMoveNeighbors.some(n => 
           n.q === hex.q && n.r === hex.r
       );
       
       if (!isValid) {
           this.showMessage('⚠️ Нельзя туда двигаться');
           return;
       }
       
       this.isProcessingAction = true;
       
       this.gameController.requestMove(hex.q, hex.r, (success, data) => {
           this.isProcessingAction = false;
           
           if (success) {
               this.showMessage(`🚶 Движение на (${hex.q}, ${hex.r})`);
               this.clearTankSelection();
               this.moveMode = false;
               this.updateUI();
               this.showMessage('🔫 Режим СТРЕЛЬБЫ');
           } else {
               this.showMessage(`❌ ${data.message || 'Движение отклонено'}`);
           }
       });
   }

   handleShootClick(hex) {
       const state = this.scene.gameState;
       const isEnemy = state && state.enemies && state.enemies.some(e => 
           e.active && e.q === hex.q && e.r === hex.r
       );
       
       if (this.gameController && !this.gameController.canShoot(state.myTank.id)) {
           const remaining = this.gameController.getRemainingShootCooldown(state.myTank.id);
           this.showMessage(`⏱️ Перезарядка: ${Math.ceil(remaining/1000)}с`);
           return;
       }
       
       if (this.shootLogic && this.shootLogic.canPlayerShootAnywhere()) {
           this.selectTarget(hex.q, hex.r);
           if (isEnemy) {
               this.showMessage(`🎯 ЦЕЛЬ: ВРАГ на (${hex.q}, ${hex.r})`);
           } else {
               this.showMessage(`🎯 Точка: (${hex.q}, ${hex.r})`);
           }
       } else if (isEnemy) {
           this.selectTarget(hex.q, hex.r);
           this.showMessage(`🎯 ЦЕЛЬ: ВРАГ на (${hex.q}, ${hex.r})`);
       } else {
           this.showMessage('⚠️ Выберите врага для стрельбы');
       }
   }

   // ============================================
   // ВЫБОР ТАНКА ДЛЯ ДВИЖЕНИЯ
   // ============================================

   selectTank(tank) {
       console.log('🎯 Выбран танк для движения:', tank.q, tank.r);
       
       if (this.scene && this.scene.hexGrid) {
           this.scene.hexGrid.clearHighlight();
       }
       this.clearTarget();
       this.clearTankSelection();
       
       this.selectedTank = tank;
       this.moveMode = true;
       this.updateUI();
       
       this.highlightMoveArea();
       this.showMessage('🚶 Режим движения: выберите подсвеченную клетку');
   }

   clearTankSelection() {
       this.selectedTank = null;
       this.validMoveNeighbors = [];
       if (this.scene && this.scene.hexGrid) {
           this.scene.hexGrid.clearMoveHighlight();
       }
   }

   cancelSelection() {
       if (this.moveMode) {
           this.clearTankSelection();
           this.moveMode = false;
           this.updateUI();
           this.showMessage('🔫 Режим СТРЕЛЬБЫ');
       }
       this.clearTarget();
   }

   highlightMoveArea() {
       const state = this.scene.gameState;
       if (!state || !state.myTank) return;
       
       const myTank = state.myTank;
       if (!myTank.active) {
           this.showMessage('⚠️ Ваш танк уничтожен');
           return;
       }
       
       const allUnits = this.getAllUnits(state);
       const neighbors = HexUtils.getNeighbors(myTank.q, myTank.r);
       const valid = [];
       
       for (const n of neighbors) {
           const cellExists = state.cells.some(c => c.q === n.q && c.r === n.r);
           if (!cellExists) continue;
           
           const occupied = allUnits.some(u => u.active && u.q === n.q && u.r === n.r);
           if (occupied) continue;
           
           valid.push(n);
       }
       
       this.validMoveNeighbors = valid;
       
       if (valid.length > 0) {
           if (this.scene && this.scene.hexGrid) {
               this.scene.hexGrid.highlightMoveArea(myTank.q, myTank.r, valid);
           }
           this.showMessage(`🚶 Доступно клеток: ${valid.length}`);
       } else {
           this.showMessage('⚠️ Нет доступных клеток для движения');
       }
   }

   // ============================================
   // ВЫБОР ЦЕЛИ ДЛЯ СТРЕЛЬБЫ
   // ============================================

   selectTarget(q, r) {
       console.log('🎯 selectTarget:', q, r);
       
       if (this.moveMode) {
           this.clearTankSelection();
           this.moveMode = false;
           this.updateUI();
       }
       
       if (this.selectedTarget && this.selectedTarget.q === q && this.selectedTarget.r === r) {
           this.clearTarget();
           return;
       }
       
       this.selectedTarget = { q, r };
       if (this.scene && this.scene.hexGrid) {
           this.scene.hexGrid.highlightHex(q, r, 0xffeb3b);
       }
       
       const state = this.scene.gameState;
       const hasEnemy = state && state.enemies && state.enemies.some(e => 
           e.active && e.q === q && e.r === r
       );
       
       const message = hasEnemy ? `🎯 ЦЕЛЬ: ВРАГ на (${q}, ${r})` :
                                 `🎯 Точка: (${q}, ${r})`;
       this.showMessage(message);
       
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) shootBtn.classList.remove('hidden');
       
       const targetEl = document.getElementById('targetCoords');
       if (targetEl) targetEl.textContent = `(${q}, ${r})`;
       
       const targetIndicator = document.getElementById('targetIndicator');
       if (targetIndicator) targetIndicator.style.display = 'block';
       
       this.updateUI();
   }

   clearTarget() {
       this.selectedTarget = null;
       if (this.scene && this.scene.hexGrid) {
           this.scene.hexGrid.clearHighlight();
       }
       
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) shootBtn.classList.add('hidden');
       
       const targetEl = document.getElementById('targetCoords');
       if (targetEl) targetEl.textContent = '—';
       
       const targetIndicator = document.getElementById('targetIndicator');
       if (targetIndicator) targetIndicator.style.display = 'none';
       
       this.updateUI();
   }

   // ============================================
   // ВЫПОЛНЕНИЕ ВЫСТРЕЛА
   // ============================================

   executeShoot() {
       if (!this.selectedTarget) {
           this.showMessage('⚠️ Сначала выберите цель');
           return;
       }
       
       if (this.gameController && this.gameController.isGameOver()) {
           this.showMessage('⚠️ Игра окончена');
           return;
       }
       
       if (this.isProcessingAction) {
           this.showMessage('⏳ Подождите, выполняется действие...');
           return;
       }
       
       const state = this.scene.gameState;
       if (!state || !state.myTank || !state.myTank.active) {
           this.showMessage('⚠️ Ваш танк уничтожен');
           return;
       }
       
       const myTank = state.myTank;
       const target = this.selectedTarget;
       
       if (this.gameController && !this.gameController.canShoot(myTank.id)) {
           const remaining = this.gameController.getRemainingShootCooldown(myTank.id);
           this.showMessage(`⏱️ Перезарядка: ${Math.ceil(remaining/1000)}с`);
           return;
       }
       
       if (this.shootLogic) {
           const allUnits = this.getAllUnits(state);
           const check = this.shootLogic.canShootAt(myTank, target.q, target.r, allUnits);
           
           if (!check.canShoot) {
               this.showMessage(`⚠️ ${check.reason}`);
               return;
           }
       }
       
       this.isProcessingAction = true;
       
       const tankSprite = this.scene.tankSprites.get(myTank.id);
       if (tankSprite) {
           const direction = HexUtils.getDirection(myTank.q, myTank.r, target.q, target.r);
           tankSprite.rotateTurret(direction, 300, () => {
               this.executeShotLogic(myTank, target);
           });
       } else {
           this.executeShotLogic(myTank, target);
       }
   }

// client/controllers/InputController.js - В executeShotLogic

executeShotLogic(myTank, target) {
   if (!this.gameController) {
       this.isProcessingAction = false;
       return;
   }
   
   // ✅ ПЕРЕДАЕМ КООРДИНАТЫ ЦЕЛИ ДЛЯ ПОВОРОТА СТВОЛА
   const result = this.gameController.shootAt(target.q, target.r);
   
   if (result && result.success) {
       this.showMessage(`🔫 Выстрел по (${target.q}, ${target.r})!`);
       this.clearTarget();
   } else if (result && !result.success) {
       this.showMessage(`❌ ${result.message || 'Ошибка выстрела'}`);
       if (result.cooldown) {
           const sec = Math.ceil(result.cooldown / 1000);
           this.showMessage(`⏱️ Перезарядка: ${sec}с`);
       }
   }
   
   setTimeout(() => {
       this.isProcessingAction = false;
   }, 500);
}

   getAllUnits(state) {
       const units = [];
       if (state.myTank && state.myTank.active) units.push(state.myTank);
       if (state.enemies) {
           for (const enemy of state.enemies) {
               if (enemy.active) units.push(enemy);
           }
       }
       return units;
   }

   // ============================================
   // ОБНОВЛЕНИЕ UI
   // ============================================

   updateUI() {
       const modeIndicator = document.getElementById('mode-indicator');
       if (modeIndicator) {
           if (this.moveMode && this.selectedTank) {
               modeIndicator.textContent = '🚶 ДВИЖЕНИЕ (выберите клетку)';
               modeIndicator.className = 'move-mode';
               modeIndicator.style.borderColor = '#44ff44';
               modeIndicator.style.color = '#44ff44';
           } else {
               modeIndicator.textContent = '🔫 СТРЕЛЬБА';
               modeIndicator.className = 'shoot-mode';
               modeIndicator.style.borderColor = '#e94560';
               modeIndicator.style.color = '#e94560';
           }
       }
       
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) {
           if (!this.moveMode && this.selectedTarget) {
               shootBtn.classList.remove('hidden');
           } else {
               shootBtn.classList.add('hidden');
           }
       }
   }

   setGameState(state) {
       if (this.moveMode && state && state.myTank) {
           if (this.selectedTank) {
               const currentTank = state.myTank;
               if (this.selectedTank.q !== currentTank.q || this.selectedTank.r !== currentTank.r) {
                   this.selectedTank = currentTank;
                   this.highlightMoveArea();
               }
           }
       }
   }

   showMessage(text) {
      console.log('📝', text);
      const container = document.getElementById('messages');
      if (!container) {
          console.log('📝', text);
          return;
      }
      
      // Ограничиваем количество сообщений
      while (container.children.length > 5) {
          const child = container.firstChild;
          if (child && child.parentNode) {
              child.remove();
          }
      }
      
      const msg = document.createElement('div');
      msg.className = 'message';
      
      // Определяем тип сообщения по эмодзи или содержимому
      let msgType = 'info';
      if (text.includes('❌') || text.includes('⚠️') || text.includes('Ошибка')) {
          msgType = 'error';
      } else if (text.includes('✅') || text.includes('🎯') || text.includes('🚶')) {
          msgType = 'success';
      } else if (text.includes('⏱️') || text.includes('⚠️')) {
          msgType = 'warning';
      }
      
      // ✅ БЕЛЫЙ ТЕКСТ, ТЕМНЫЙ ФОН
      msg.style.color = '#ffffff';
      msg.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
      msg.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      msg.style.borderRadius = '20px';
      msg.style.padding = '8px 20px';
      msg.style.fontSize = '14px';
      msg.style.fontWeight = '500';
      msg.style.fontFamily = 'Arial, sans-serif';
      msg.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
      msg.style.backdropFilter = 'blur(8px)';
      
      // Цветная полоска слева
      if (msgType === 'error') {
          msg.style.borderLeft = '4px solid #e94560';
      } else if (msgType === 'success') {
          msg.style.borderLeft = '4px solid #4caf50';
      } else if (msgType === 'warning') {
          msg.style.borderLeft = '4px solid #ff9800';
      } else {
          msg.style.borderLeft = '4px solid #ffd93d';
      }
      
      msg.textContent = text;
      container.appendChild(msg);
      
      // Анимация исчезновения
      setTimeout(() => {
          if (msg && msg.parentNode) {
              msg.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
              msg.style.opacity = '0';
              msg.style.transform = 'translateY(-20px)';
              setTimeout(() => {
                  if (msg && msg.parentNode) {
                      msg.remove();
                  }
              }, 500);
          }
      }, 2500);
  }
   destroy() {
       if (this.scene && this.scene.input) {
           this.scene.input.off('pointerdown');
       }
       
       this.scene = null;
       this.gameController = null;
       this.selectedTarget = null;
       this.selectedTank = null;
       this.validMoveNeighbors = [];
       this.isProcessingAction = false;
       this.shootLogic = null;
       
       console.log('🧹 InputController очищен');
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.InputController = InputController;
   console.log('✅ InputController зарегистрирован в window');
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { InputController };
}
