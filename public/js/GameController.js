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
   }
   
   init() {
       this.updateBuffer = new UpdateBuffer(this.renderer, 50);
       this.setupEventListeners();
   }
   
   setupEventListeners() {
       const container = document.getElementById('canvas3d-container');
       if (container) {
           const clickHandler = (e) => this.throttleClick(e);
           container.addEventListener('click', clickHandler);
           this.boundHandlers.set('canvasClick', clickHandler);
       }
       
       const shootBtn = document.getElementById('shootBtn');
       if (shootBtn) {
           const shootHandler = () => this.shoot();
           shootBtn.addEventListener('click', shootHandler);
           this.boundHandlers.set('shoot', shootHandler);
       }
       
       const resetBtn = document.getElementById('resetBtn');
       if (resetBtn) {
           const resetHandler = () => this.resetGame();
           resetBtn.addEventListener('click', resetHandler);
           this.boundHandlers.set('reset', resetHandler);
       }
       
       document.querySelectorAll('.hex-controls button[data-dir]').forEach(btn => {
           const dir = btn.getAttribute('data-dir');
           const moveHandler = () => this.move(dir);
           btn.addEventListener('click', moveHandler);
           if (!this.boundHandlers.has(`move_${dir}`)) {
               this.boundHandlers.set(`move_${dir}`, moveHandler);
           }
       });
       
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
   }
   
   updateUI() {
       if (!this.gameState || !this.gameState.myTank) return;
       
       const hpValue = document.getElementById('hpValue');
       if (hpValue) hpValue.textContent = `${this.gameState.myTank.hp}/${this.gameState.myTank.maxHp}`;
       
       const killsValue = document.getElementById('killsValue');
       if (killsValue) killsValue.textContent = this.gameState.myTank.kills || 0;
       
       const enemiesValue = document.getElementById('enemiesValue');
       if (enemiesValue) enemiesValue.textContent = this.gameState.enemies?.length || 0;
       
       const modeStatus = document.getElementById('modeStatus');
       if (modeStatus) {
           modeStatus.textContent = this.moveMode ? '🚶 ДВИЖЕНИЕ' : '🔫 СТРЕЛЬБА';
           modeStatus.style.color = this.moveMode ? '#4caf50' : '#e94560';
       }
       
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
       const isAdjacent = window.HexUtils.areAdjacent(myTank.q, myTank.r, hex.q, hex.r);
       const hasWall = this.gameState.walls?.some(w => w.q === hex.q && w.r === hex.r);
       
       if (isMyTank) {
           this.moveMode = !this.moveMode;
           this.selectedTarget = null;
           this.showMessage(this.moveMode ? 
               '✅ Режим движения. Нажмите на соседнюю клетку' : 
               '🔫 Режим стрельбы. Выберите цель');
           this.updateUI();
           return;
       }
       
       if (this.moveMode && isAdjacent && !hasWall) {
           this.moveTo(hex.q, hex.r);
           this.moveMode = false;
           this.updateUI();
           return;
       }
       
       if (!this.moveMode) {
           this.selectTarget(hex.q, hex.r);
       } else if (hasWall) {
           this.showMessage('🧱 Там стена! Нельзя пройти');
       } else if (!isAdjacent) {
           this.showMessage('⚠️ Можно двигаться только на соседние клетки');
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
       this.selectedTarget = { q, r };
       this.showMessage(`🎯 Цель выбрана: (${q}, ${r})`);
       
       const targetStatus = document.getElementById('targetStatus');
       if (targetStatus) targetStatus.textContent = `(${q},${r})`;
       
       if (this.renderer) {
           this.renderer.highlightHex(q, r, 0xffeb3b);
       }
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
   }
   
   move(direction) {
       if (!this.gameState?.myTank || this.gameState.gameOver) return;
       
       const myTank = this.gameState.myTank;
       let targetQ = myTank.q, targetR = myTank.r;
       
       const directionMap = {
           'up': () => targetR--,
           'up-right': () => { targetQ++; targetR--; },
           'right': () => targetQ++,
           'down-right': () => { targetQ++; targetR++; },
           'down': () => targetR++,
           'down-left': () => { targetQ--; targetR++; },
           'left': () => targetQ--,
           'up-left': () => { targetQ--; targetR--; }
       };
       
       const moveFunc = directionMap[direction];
       if (moveFunc) moveFunc();
       else return;
       
       const cellExists = this.gameState.cells?.some(
           cell => cell.q === targetQ && cell.r === targetR
       );
       
       if (!cellExists) {
           this.showMessage('❌ Нельзя туда двигаться');
           return;
       }
       
       const hasWall = this.gameState.walls?.some(
           w => w.q === targetQ && w.r === targetR
       );
       
       if (hasWall) {
           this.showMessage('🧱 Там стена! Нельзя пройти');
           return;
       }
       
       const isOccupied = [...(this.gameState.enemies || []), ...(this.gameState.allies || [])]
           .some(u => u.active && u.q === targetQ && u.r === targetR);
       
       if (isOccupied) {
           this.showMessage('⚠️ Клетка занята другим танком');
           return;
       }
       
       const directionName = window.HexUtils.getDirection(myTank.q, myTank.r, targetQ, targetR);
       if (this.gameState.myTank) {
           this.gameState.myTank.direction = directionName;
       }
       
       if (this.socket) {
           this.socket.sendMove(targetQ, targetR);
       }
       
       this.showMessage(`🚶 Движение на (${targetQ}, ${targetR})`);
   }
   
   shoot() {
       if (!this.selectedTarget) {
           this.showMessage('⚠️ Сначала выберите цель (нажмите на клетку)');
           return;
       }
       
       if (!this.gameState || this.gameState.gameOver) return;
       
       const now = Date.now();
       if (now - this.lastShootTime < this.shootCooldown) {
           const remaining = Math.ceil((this.shootCooldown - (now - this.lastShootTime)) / 1000);
           this.showMessage(`⏱️ Перезарядка: ${remaining} сек`);
           return;
       }
       
       const myTank = this.gameState.myTank;
       const target = this.selectedTarget;
       
       const direction = window.HexUtils.getDirection(myTank.q, myTank.r, target.q, target.r);
       if (this.gameState.myTank) {
           this.gameState.myTank.direction = direction;
       }
       
       if (window.soundManager) {
           window.soundManager.play('shoot');
       }
       
       if (this.renderer) {
           this.renderer.addShotAnimation(
               myTank.q, myTank.r, target.q, target.r,
               () => {
                   if (this.socket) {
                       this.socket.sendShoot(target.q, target.r);
                   }
               }
           );
       } else if (this.socket) {
           this.socket.sendShoot(target.q, target.r);
       }
       
       this.lastShootTime = now;
       this.selectedTarget = null;
       
       const targetStatus = document.getElementById('targetStatus');
       if (targetStatus) targetStatus.textContent = 'нет';
   }
   
   onShootResult(result) {
       if (!result) return;
       
       if (result.hit && result.killed) {
           this.showMessage(`💀 ${result.message || 'Уничтожение!'}`);
           if (this.renderer) {
               this.renderer.addExplosionEffect(result.targetX || result.targetQ, 
                                              result.targetY || result.targetR);
           }
       } else if (result.hit) {
           this.showMessage(`💥 ${result.message || 'Попадание!'}`);
       } else if (result.wallDestroyed) {
           this.showMessage('🧱 Стена разрушена!');
       } else {
           this.showMessage(`❌ ${result.message || 'Промах!'}`);
           if (this.renderer && result.targetQ && result.targetR) {
               this.renderer.addMissEffect(result.targetQ, result.targetR);
           }
       }
       
       if (window.soundManager) {
           if (result.hit) {
               window.soundManager.play('explosion');
           } else {
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
       
       const gameOverScreen = document.getElementById('gameOverScreen');
       const gameScreen = document.getElementById('gameScreen');
       
       if (gameOverScreen) gameOverScreen.style.display = 'none';
       if (gameScreen) gameScreen.style.display = 'flex';
       
       const targetStatus = document.getElementById('targetStatus');
       if (targetStatus) targetStatus.textContent = 'нет';
       
       this.showMessage('🔄 Новая битва!');
   }
   
   showMessage(text) {
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
           if (name === 'canvasClick') {
               const container = document.getElementById('canvas3d-container');
               if (container) container.removeEventListener('click', handler);
           } else if (name === 'shoot') {
               const btn = document.getElementById('shootBtn');
               if (btn) btn.removeEventListener('click', handler);
           } else if (name === 'reset') {
               const btn = document.getElementById('resetBtn');
               if (btn) btn.removeEventListener('click', handler);
           } else if (name.startsWith('move_')) {
               const dir = name.replace('move_', '');
               const btn = document.querySelector(`.hex-controls button[data-dir="${dir}"]`);
               if (btn) btn.removeEventListener('click', handler);
           } else if (name === 'zoomIn') {
               const btn = document.getElementById('zoomInBtn');
               if (btn) btn.removeEventListener('click', handler);
           } else if (name === 'zoomOut') {
               const btn = document.getElementById('zoomOutBtn');
               if (btn) btn.removeEventListener('click', handler);
           } else if (name === 'resetZoom') {
               const btn = document.getElementById('resetZoomBtn');
               if (btn) btn.removeEventListener('click', handler);
           } else if (name === 'newGame') {
               const btn = document.getElementById('newGameBtn');
               if (btn) btn.removeEventListener('click', handler);
           }
       });
       
       this.boundHandlers.clear();
       
       if (this.updateBuffer) {
           this.updateBuffer.clear();
       }
   }
}

window.GameController = GameController;
