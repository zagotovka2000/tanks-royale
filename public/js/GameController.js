// public/js/GameController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

console.log('GameController.js loading...');

class GameController {
   constructor(socketClient, renderer) {
       this.socket = socketClient;
       this.renderer = renderer;
       this.updateBuffer = null;
       this.gameState = null;
       this.selectedTarget = null;
       this.moveMode = false;
       this.lastShootTime = 0;
       this.shootCooldown = 2000;
       this.boundHandlers = new Map();
       this.throttleDelay = 100;
       this.lastClickTime = 0;
       this.validMoveNeighbors = [];
   }
   
   init() {
       this.updateBuffer = new UpdateBuffer(this.renderer, 50);
       this.setupEventListeners();
   }
   
   setupEventListeners() {
       console.log('Setting up event listeners...');
       
       const container = document.getElementById('canvas3d-container');
       if (container) {
           const clickHandler = (e) => this.throttleClick(e);
           container.addEventListener('click', clickHandler);
           this.boundHandlers.set('canvasClick', clickHandler);
           console.log('Canvas click listener added');
       }
       
       const moveModeBtn = document.getElementById('moveModeBtn');
       if (moveModeBtn) {
           const handler = () => this.setMode('move');
           moveModeBtn.addEventListener('click', handler);
           this.boundHandlers.set('moveMode', handler);
       }
       
       const shootModeBtn = document.getElementById('shootModeBtn');
       if (shootModeBtn) {
           const handler = () => this.setMode('shoot');
           shootModeBtn.addEventListener('click', handler);
           this.boundHandlers.set('shootMode', handler);
       }
       
       // Поиск кнопки выстрела
       let shootActionBtn = document.getElementById('shootActionBtn');
       if (!shootActionBtn) {
           shootActionBtn = document.querySelector('.shoot-action-btn');
       }
       if (!shootActionBtn) {
           shootActionBtn = document.querySelector('.shoot-btn');
       }
       
       if (shootActionBtn) {
           console.log('Shoot action button found');
           // Удаляем старые обработчики
           const newBtn = shootActionBtn.cloneNode(true);
           shootActionBtn.parentNode.replaceChild(newBtn, shootActionBtn);
           
           const handler = (e) => {
               e.preventDefault();
               e.stopPropagation();
               console.log('🔫 SHOOT BUTTON CLICKED!');
               this.executeShoot();
           };
           newBtn.addEventListener('click', handler);
           this.boundHandlers.set('shootAction', handler);
           console.log('Shoot button handler bound');
       } else {
           console.error('Shoot action button NOT found!');
       }
       
       const clearTarget = document.getElementById('clearTarget');
       if (clearTarget) {
           const handler = () => this.clearTarget();
           clearTarget.addEventListener('click', handler);
           this.boundHandlers.set('clearTarget', handler);
       }
       
       const resetBtn = document.getElementById('resetBtn');
       if (resetBtn) {
           const handler = () => this.resetGame();
           resetBtn.addEventListener('click', handler);
           this.boundHandlers.set('reset', handler);
       }
       
       const zoomIn = document.getElementById('zoomInBtn');
       if (zoomIn) {
           const handler = () => this.renderer.zoomIn();
           zoomIn.addEventListener('click', handler);
           this.boundHandlers.set('zoomIn', handler);
       }
       
       const zoomOut = document.getElementById('zoomOutBtn');
       if (zoomOut) {
           const handler = () => this.renderer.zoomOut();
           zoomOut.addEventListener('click', handler);
           this.boundHandlers.set('zoomOut', handler);
       }
       
       const resetZoom = document.getElementById('resetZoomBtn');
       if (resetZoom) {
           const handler = () => this.renderer.resetZoom();
           resetZoom.addEventListener('click', handler);
           this.boundHandlers.set('resetZoom', handler);
       }
       
       const newGameBtn = document.getElementById('newGameBtn');
       if (newGameBtn) {
           const handler = () => this.resetGame();
           newGameBtn.addEventListener('click', handler);
           this.boundHandlers.set('newGame', handler);
       }
       
       console.log('All event listeners setup complete');
   }
   
   setMode(mode) {
       this.moveMode = (mode === 'move');
       
       if (!this.moveMode && this.renderer) {
           this.renderer.clearMoveHighlight();
       }
       
       if (this.moveMode && this.gameState?.myTank) {
           this.showMoveHighlight();
       }
       
       this.updateUI();
       
       this.showMessage(this.moveMode ? 
           '🚶 РЕЖИМ ДВИЖЕНИЯ: нажмите на подсвеченную зеленую клетку' : 
           '🔫 РЕЖИМ СТРЕЛЬБЫ: нажмите на клетку для выбора цели, затем нажмите 🔫');
   }
   
   showMoveHighlight() {
       if (!this.gameState?.myTank) return;
       
       const myTank = this.gameState.myTank;
       const allUnits = [...(this.gameState.enemies || []), ...(this.gameState.allies || [])];
       if (this.gameState.myTank) allUnits.push(this.gameState.myTank);
       
       this.validMoveNeighbors = window.HexUtils.getValidMoveNeighbors(
           myTank.q, myTank.r,
           this.gameState.walls || [],
           allUnits,
           this.gameState.cells || []
       );
       
       if (this.renderer) {
           this.renderer.highlightMoveArea(myTank.q, myTank.r, this.validMoveNeighbors);
       }
   }
   
   throttleClick(event) {
       const now = Date.now();
       if (now - this.lastClickTime < this.throttleDelay) {
           return;
       }
       this.lastClickTime = now;
       this.onCanvasClick(event);
   }
   
   updateGameState(state) {
       if (!state) return;
       
       this.gameState = state;
       this.updateUI();
       
       if (this.updateBuffer) {
           this.updateBuffer.scheduleUpdate(state, 'full');
       }
       
       if (this.moveMode && this.gameState?.myTank) {
           this.showMoveHighlight();
       }
   }
   
   updateUI() {
       if (!this.gameState || !this.gameState.myTank) return;
       
       const hpValue = document.getElementById('hpValue');
       if (hpValue) hpValue.textContent = `${this.gameState.myTank.hp}/${this.gameState.myTank.maxHp}`;
       
       const killsValue = document.getElementById('killsValue');
       if (killsValue) killsValue.textContent = this.gameState.myTank.kills || 0;
       
       const enemiesValue = document.getElementById('enemiesValue');
       if (enemiesValue) enemiesValue.textContent = this.gameState.enemies?.length || 0;
       
       if (this.gameState.lastActionTime) {
           this.updateCooldown(this.gameState.lastActionTime);
       }
   }
   
   updateCooldown(lastActionTime) {
       const COOLDOWN_TIME = 2000;
       
       const update = () => {
           const now = Date.now();
           const elapsed = now - lastActionTime;
           
           if (elapsed < COOLDOWN_TIME) {
               const remaining = COOLDOWN_TIME - elapsed;
               const percent = (remaining / COOLDOWN_TIME) * 100;
               const seconds = Math.ceil(remaining / 1000);
               
               const fill = document.getElementById('cooldownFill');
               const text = document.getElementById('cooldownText');
               
               if (fill) fill.style.width = `${percent}%`;
               if (text) text.textContent = `${seconds}с`;
               
               setTimeout(update, 100);
           } else {
               const fill = document.getElementById('cooldownFill');
               const text = document.getElementById('cooldownText');
               if (fill) fill.style.width = '0%';
               if (text) text.textContent = 'готов';
           }
       };
       
       update();
   }
   
   onCanvasClick(event) {
       if (!this.renderer || !this.gameState || !this.gameState.myTank) return;
       
       const hex = this.screenToHex(event.clientX, event.clientY);
       if (!hex || (hex.q === -1 && hex.r === -1)) return;
       
       const myTank = this.gameState.myTank;
       const isMyTank = (myTank.q === hex.q && myTank.r === hex.r);
       
       if (isMyTank) {
           this.setMode(!this.moveMode ? 'move' : 'shoot');
           return;
       }
       
       if (this.moveMode) {
           const isValidMove = this.validMoveNeighbors.some(
               n => n.q === hex.q && n.r === hex.r
           );
           
           if (isValidMove) {
               this.moveTo(hex.q, hex.r);
               this.setMode('shoot');
           } else {
               this.showMessage('⚠️ Нельзя туда двигаться');
           }
           return;
       }
       
       // Режим стрельбы - выбираем цель
       if (!this.moveMode) {
           this.selectTarget(hex.q, hex.r);
       }
   }
   
   screenToHex(screenX, screenY) {
       if (!this.renderer || !this.renderer.camera || !this.renderer.scene) {
           return { q: -1, r: -1 };
       }
       
       const container = document.getElementById('canvas3d-container');
       if (!container) return { q: -1, r: -1 };
       
       const rect = container.getBoundingClientRect();
       const x = ((screenX - rect.left) / rect.width) * 2 - 1;
       const y = -((screenY - rect.top) / rect.height) * 2 + 1;
       
       const raycaster = new THREE.Raycaster();
       raycaster.setFromCamera(new THREE.Vector2(x, y), this.renderer.camera);
       
       const intersects = raycaster.intersectObjects(
           Array.from(this.renderer.hexMeshes.values())
       );
       
       if (intersects.length > 0) {
           const userData = intersects[0].object.userData;
           if (userData && userData.q !== undefined && userData.r !== undefined) {
               return { q: userData.q, r: userData.r };
           }
       }
       
       return { q: -1, r: -1 };
   }
   
   selectTarget(q, r) {
       console.log('=== selectTarget called ===', q, r);
       this.selectedTarget = { q, r };
       
       const hasEnemy = this.gameState.enemies?.some(
           e => e.active && e.q === q && e.r === r
       );
       
       if (hasEnemy) {
           this.showMessage(`🎯 Цель выбрана: (${q}, ${r}) - ВРАГ!`);
       } else {
           this.showMessage(`🎯 Точка выбрана: (${q}, ${r})`);
       }
       
       const targetCoords = document.getElementById('targetCoords');
       if (targetCoords) targetCoords.textContent = `(${q}, ${r})`;
       
       if (this.renderer) {
           this.renderer.highlightHex(q, r, 0xffeb3b);
       }
       
       console.log('Selected target set to:', this.selectedTarget);
   }
   
   clearTarget() {
       this.selectedTarget = null;
       const targetCoords = document.getElementById('targetCoords');
       if (targetCoords) targetCoords.textContent = 'нет';
       this.showMessage('🎯 Цель сброшена');
   }
   
   moveTo(q, r) {
       if (!this.gameState?.myTank || this.gameState.gameOver) return;
       
       const myTank = this.gameState.myTank;
       const direction = window.HexUtils.getDirection(myTank.q, myTank.r, q, r);
       
       if (this.gameState.myTank) {
           this.gameState.myTank.direction = direction;
       }
       
       if (this.socket) {
           this.socket.sendMove(q, r);
       }
       
       this.showMessage(`🚶 Движение на (${q}, ${r})`);
       
       if (this.renderer) {
           setTimeout(() => this.renderer.clearMoveHighlight(), 100);
       }
   }
   executeShoot() {
      console.log('========================================');
      console.log('=== EXECUTE SHOOT CALLED ===');
      console.log('Selected target:', this.selectedTarget);
      
      if (!this.selectedTarget) {
          this.showMessage('⚠️ Сначала выберите цель (нажмите на клетку)');
          return;
      }
      
      if (!this.gameState || this.gameState.gameOver) {
          this.showMessage('⚠️ Игра не активна');
          return;
      }
      
      const myTank = this.gameState.myTank;
      if (!myTank || myTank.hp <= 0) {
          this.showMessage('⚠️ Ваш танк уничтожен');
          return;
      }
      
      const now = Date.now();
      if (now - this.lastShootTime < this.shootCooldown) {
          const remaining = Math.ceil((this.shootCooldown - (now - this.lastShootTime)) / 1000);
          this.showMessage(`⏱️ Перезарядка: ${remaining} сек`);
          return;
      }
      
      const target = this.selectedTarget;
      const distance = window.HexUtils.distance(myTank.q, myTank.r, target.q, target.r);
      
      if (distance > (myTank.range || 5)) {
          this.showMessage(`⚠️ Слишком далеко! Дистанция ${distance}`);
          return;
      }
      
      console.log('✅ All checks passed, starting animation and sending shoot!');
      
      const direction = window.HexUtils.getDirection(myTank.q, myTank.r, target.q, target.r);
      if (this.gameState.myTank) {
          this.gameState.myTank.direction = direction;
      }
      
      if (window.soundManager) {
          window.soundManager.play('shoot');
      }
      
      // ВСЕГДА показываем анимацию выстрела
      if (this.renderer) {
          console.log('🎬 Calling addMuzzleFlash');
          this.renderer.addMuzzleFlash(myTank.q, myTank.r, direction);
          
          console.log('🎬 Calling addShotAnimation');
          this.renderer.addShotAnimation(
              myTank.q, myTank.r, target.q, target.r,
              () => {
                  console.log('🎬 Animation complete, sending to server');
                  if (this.socket) {
                      this.socket.sendShoot(target.q, target.r, myTank.id);
                  }
              }
          );
      } else {
          console.error('No renderer available!');
          if (this.socket) {
              this.socket.sendShoot(target.q, target.r, myTank.id);
          }
      }
      
      this.lastShootTime = now;
      this.showMessage(`🔫 Выстрел по координатам (${target.q}, ${target.r})!`);
  }
   
  onShootResult(result) {
   console.log('onShootResult', result);
   
   if (!result) return;
   
   // ВАЖНО: Показываем анимацию снаряда для ВСЕХ выстрелов (игрока и врагов)
   if (result.fromQ !== undefined && result.fromR !== undefined && 
       result.targetQ !== undefined && result.targetR !== undefined) {
       
       console.log('🎬 Adding shot animation for:', result.fromQ, result.fromR, '->', result.targetQ, result.targetR);
       
       if (this.renderer && typeof this.renderer.addShotAnimation === 'function') {
           // Анимация без колбэка (просто визуальный эффект)
           this.renderer.addShotAnimation(
               result.fromQ, result.fromR, 
               result.targetQ, result.targetR,
               null // Нет колбэка для вражеских выстрелов
           );
       }
   }
   
   // Эффект попадания
   if (result.hit) {
       const hitX = result.targetX || result.targetQ;
       const hitY = result.targetY || result.targetR;
       console.log('💥 Showing hit effect at:', hitX, hitY);
       
       if (this.renderer && typeof this.renderer.addHitEffect === 'function') {
           this.renderer.addHitEffect(hitX, hitY);
       }
       
       if (result.killed) {
           this.showMessage(`💀 ${result.message || 'Уничтожение!'}`);
       } else {
           this.showMessage(`💥 ${result.message || 'Попадание!'}`);
       }
   } else if (result.wallDestroyed) {
       this.showMessage('🧱 Стена разрушена!');
   } else if (result.message && result.message !== 'На пути стена или лес') {
       this.showMessage(`❌ ${result.message}`);
   }
   
   if (window.soundManager) {
       if (result.hit) {
           window.soundManager.play('explosion');
       } else if (!result.wallDestroyed && result.message !== 'На пути стена или лес') {
           window.soundManager.play('miss');
       }
   }
}
   
   onGameEnded(data) {
       if (!data) return;
       
       const gameScreen = document.getElementById('gameScreen');
       const gameOverScreen = document.getElementById('gameOverScreen');
       const winnerText = document.getElementById('winnerText');
       
       if (gameScreen) gameScreen.style.display = 'none';
       if (gameOverScreen) gameOverScreen.style.display = 'flex';
       if (winnerText) winnerText.innerHTML = `${data.winner}<br>🏅 Убийств: ${data.kills || 0}`;
       
       this.showMessage(`🏆 Игра окончена! ${data.winner}`);
   }
   
   resetGame() {
       if (this.socket) {
           this.socket.resetGame();
       }
       
       this.selectedTarget = null;
       this.moveMode = false;
       this.lastShootTime = 0;
       this.validMoveNeighbors = [];
       
       if (this.renderer) {
           this.renderer.clearMoveHighlight();
       }
       
       const gameOverScreen = document.getElementById('gameOverScreen');
       const gameScreen = document.getElementById('gameScreen');
       
       if (gameOverScreen) gameOverScreen.style.display = 'none';
       if (gameScreen) gameScreen.style.display = 'flex';
       
       const targetCoords = document.getElementById('targetCoords');
       if (targetCoords) targetCoords.textContent = 'нет';
       
       this.showMessage('🔄 Новая битва!');
   }
   
   showMessage(text) {
       console.log('Message:', text);
       const container = document.getElementById('messages');
       if (!container) return;
       
       const msg = document.createElement('div');
       msg.className = 'message';
       msg.textContent = text;
       container.appendChild(msg);
       
       setTimeout(() => {
           if (msg && msg.remove) msg.remove();
       }, 3000);
   }
   
   dispose() {
       this.boundHandlers.forEach((handler, name) => {
           const container = document.getElementById('canvas3d-container');
           if (name === 'canvasClick' && container) {
               container.removeEventListener('click', handler);
           } else {
               const btn = document.getElementById(
                   name === 'moveMode' ? 'moveModeBtn' :
                   name === 'shootMode' ? 'shootModeBtn' :
                   name === 'shootAction' ? 'shootActionBtn' :
                   name === 'clearTarget' ? 'clearTarget' :
                   name === 'reset' ? 'resetBtn' :
                   name === 'zoomIn' ? 'zoomInBtn' :
                   name === 'zoomOut' ? 'zoomOutBtn' :
                   name === 'resetZoom' ? 'resetZoomBtn' :
                   name === 'newGame' ? 'newGameBtn' : null
               );
               if (btn) btn.removeEventListener('click', handler);
           }
       });
       
       this.boundHandlers.clear();
       
       if (this.updateBuffer) {
           this.updateBuffer.clear();
       }
   }
}

// Регистрация класса
if (typeof window !== 'undefined') {
    window.GameController = GameController;
    console.log('GameController registered to window');
}

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameController };
}

console.log('GameController.js loaded successfully');
