// client/controllers/InputController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

function InputController(scene, gameController) {
   this.scene = scene;
   this.gameController = gameController;
   this.isEnabled = true;
   this.moveMode = false; // false = shoot mode, true = move mode
   this.selectedTarget = null;
   this.validMoveNeighbors = [];
   this.lastClickTime = 0;
   this.throttleDelay = 150;
   this.selectedTank = null; // Танк, выбранный для движения
   this.isProcessingAction = false;
   this.pendingMove = null;
   this.actionQueue = [];
   
   // Ссылка на логику стрельбы
   this.shootLogic = null;
}

InputController.prototype.init = function() {
   var self = this;
   
   // Инициализируем логику стрельбы
   if (typeof ShootLogic !== 'undefined') {
       this.shootLogic = new ShootLogic();
       console.log('✅ ShootLogic инициализирован');
   } else {
       console.warn('⚠️ ShootLogic не найден, используется встроенная логика');
   }
   
   // Клик по игровому полю
   this.scene.input.on('pointerdown', function(pointer) {
       self.handleClick(pointer);
   });
   
   // Кнопка выстрела
   var shootBtn = document.getElementById('shootBtn');
   if (shootBtn) {
       shootBtn.addEventListener('click', function() {
           self.executeShoot();
       });
   }
   
   // Кнопка сброса
   var resetBtn = document.getElementById('resetBtn');
   if (resetBtn) {
       resetBtn.addEventListener('click', function() {
           self.gameController.resetGame();
       });
   }
   
   this.updateUI();
   this.showMessage('🎮 Кликните по своему танку для переключения режима');
   this.showMessage('🔫 Режим по умолчанию: СТРЕЛЬБА');
};

// ============================================
// ОСНОВНОЙ МЕТОД ОБРАБОТКИ КЛИКА
// ============================================
InputController.prototype.handleClick = function(pointer) {
   if (!this.isEnabled) return;
   if (this.gameController.isGameOver()) {
       this.showMessage('⚠️ Игра окончена');
       return;
   }
   
   if (this.isProcessingAction) {
       this.showMessage('⏳ Подождите, выполняется действие...');
       return;
   }
   
   var now = Date.now();
   if (now - this.lastClickTime < this.throttleDelay) return;
   this.lastClickTime = now;
   
   var hex = this.scene.hexGrid.pixelToHex(pointer.x, pointer.y);
   if (!hex) {
       this.showMessage('❌ Клик мимо поля');
       return;
   }
   
   var state = this.scene.gameState;
   if (!state || !state.myTank) return;
   
   var myTank = state.myTank;
   
   // ============================================
   // ✅ КЛИК ПО СВОЕМУ ТАНКУ - ПЕРЕКЛЮЧЕНИЕ РЕЖИМА
   // ============================================
   if (myTank.q === hex.q && myTank.r === hex.r) {
       // Если танк уже выбран и мы в режиме движения - выключаем режим
       if (this.selectedTank && this.moveMode) {
           this.clearTankSelection();
           this.moveMode = false;
           this.updateUI();
           this.showMessage('🔫 Режим СТРЕЛЬБЫ');
           return;
       }
       
       // Включаем режим движения
       this.selectTank(myTank);
       return;
   }
   
   // ============================================
   // ✅ РЕЖИМ ДВИЖЕНИЯ - КЛИК ПО ДОСТУПНОЙ КЛЕТКЕ
   // ============================================
   if (this.moveMode && this.selectedTank) {
       var isValid = this.validMoveNeighbors.some(function(n) {
           return n.q === hex.q && n.r === hex.r;
       });
       
       if (isValid) {
           this.isProcessingAction = true;
           
           this.gameController.requestMove(hex.q, hex.r, function(success, data) {
               this.isProcessingAction = false;
               
               if (success) {
                   this.showMessage('🚶 Движение на (' + hex.q + ', ' + hex.r + ')');
                   this.clearTankSelection();
                   this.moveMode = false;
                   this.updateUI();
                   this.showMessage('🔫 Режим СТРЕЛЬБЫ');
               } else {
                   this.showMessage('❌ ' + (data.message || 'Движение отклонено'));
               }
           }.bind(this));
       } else {
           this.showMessage('⚠️ Нельзя туда двигаться');
       }
       return;
   }
   
   // ============================================
   // ✅ РЕЖИМ СТРЕЛЬБЫ - ВЫБОР ЦЕЛИ
   // ============================================
   if (!this.moveMode) {
       // Проверяем, есть ли враг на этой клетке
       var isEnemy = state.enemies && state.enemies.some(function(e) {
           return e.active && e.q === hex.q && e.r === hex.r;
       });
       
       // Для игрока - можно стрелять по любым координатам
       // Для врага - только если есть цель
       if (this.shootLogic && this.shootLogic.canPlayerShootAnywhere()) {
           // Игрок может стрелять куда угодно
           this.selectTarget(hex.q, hex.r);
           if (isEnemy) {
               this.showMessage('🎯 ЦЕЛЬ: ВРАГ на (' + hex.q + ', ' + hex.r + ')');
           } else {
               this.showMessage('🎯 Точка: (' + hex.q + ', ' + hex.r + ')');
           }
       } else if (isEnemy) {
           // Враг может стрелять только по врагам
           this.selectTarget(hex.q, hex.r);
           this.showMessage('🎯 ЦЕЛЬ: ВРАГ на (' + hex.q + ', ' + hex.r + ')');
       } else {
           this.showMessage('⚠️ Выберите врага для стрельбы');
       }
   }
};

// ============================================
// ВЫБОР ТАНКА ДЛЯ ДВИЖЕНИЯ
// ============================================
InputController.prototype.selectTank = function(tank) {
   console.log('🎯 Выбран танк для движения:', tank.q, tank.r);
   
   // Очищаем всё
   this.scene.hexGrid.clearHighlight();
   this.clearTarget();
   this.clearTankSelection();
   
   this.selectedTank = tank;
   this.moveMode = true;
   this.updateUI();
   
   // Подсвечиваем доступные клетки
   this.highlightMoveArea();
   this.showMessage('🚶 Режим движения: выберите подсвеченную клетку');
};

// ============================================
// ОЧИСТКА ВЫБОРА ТАНКА
// ============================================
InputController.prototype.clearTankSelection = function() {
   this.selectedTank = null;
   this.validMoveNeighbors = [];
   this.scene.hexGrid.clearMoveHighlight();
};

// ============================================
// ПОДСВЕТКА ДОСТУПНЫХ КЛЕТОК ДЛЯ ДВИЖЕНИЯ
// ============================================
InputController.prototype.highlightMoveArea = function() {
   var state = this.scene.gameState;
   if (!state || !state.myTank) return;
   
   var myTank = state.myTank;
   if (!myTank.active) {
       this.showMessage('⚠️ Ваш танк уничтожен');
       return;
   }
   
   // Собираем все активные юниты
   var allUnits = [];
   if (state.myTank && state.myTank.active) allUnits.push(state.myTank);
   if (state.enemies) {
       for (var i = 0; i < state.enemies.length; i++) {
           if (state.enemies[i].active) allUnits.push(state.enemies[i]);
       }
   }
   
   // Получаем всех соседей
   var neighbors = HexUtils.getNeighbors(myTank.q, myTank.r);
   var valid = [];
   
   for (var i = 0; i < neighbors.length; i++) {
       var n = neighbors[i];
       
       // Проверяем существование клетки
       var cellExists = state.cells.some(function(c) {
           return c.q === n.q && c.r === n.r;
       });
       if (!cellExists) continue;
       
       // Проверяем, не занята ли клетка
       var occupied = allUnits.some(function(u) {
           return u.active && u.q === n.q && u.r === n.r;
       });
       if (occupied) continue;
       
       valid.push(n);
   }
   
   this.validMoveNeighbors = valid;
   
   // Подсвечиваем
   if (valid.length > 0) {
       this.scene.hexGrid.clearHighlight();
       // Центр - желтый
       this.scene.hexGrid.highlightHex(myTank.q, myTank.r, 0xffdd44);
       // Доступные клетки - зеленые
       for (var i = 0; i < valid.length; i++) {
           this.scene.hexGrid.highlightHex(valid[i].q, valid[i].r, 0x44ff44);
       }
       this.showMessage('🚶 Доступно клеток: ' + valid.length);
   } else {
       this.showMessage('⚠️ Нет доступных клеток для движения');
   }
};

// ============================================
// ВЫБОР ЦЕЛИ ДЛЯ СТРЕЛЬБЫ
// ============================================
InputController.prototype.selectTarget = function(q, r) {
   console.log('🎯 selectTarget:', q, r);
   
   // Если в режиме движения - выключаем
   if (this.moveMode) {
       this.clearTankSelection();
       this.moveMode = false;
       this.updateUI();
   }
   
   // Если тот же гекс - снимаем цель
   if (this.selectedTarget && this.selectedTarget.q === q && this.selectedTarget.r === r) {
       this.clearTarget();
       return;
   }
   
   this.selectedTarget = { q: q, r: r };
   this.scene.hexGrid.highlightHex(q, r, 0xffeb3b);
   
   // Проверяем врага
   var state = this.scene.gameState;
   var hasEnemy = false;
   if (state && state.enemies) {
       hasEnemy = state.enemies.some(function(e) {
           return e.active && e.q === q && e.r === r;
       });
   }
   
   var message = hasEnemy ? '🎯 ЦЕЛЬ: ВРАГ на (' + q + ', ' + r + ')' :
                            '🎯 Точка: (' + q + ', ' + r + ')';
   this.showMessage(message);
   
   // Показываем кнопку выстрела
   var shootBtn = document.getElementById('shootBtn');
   if (shootBtn) shootBtn.classList.remove('hidden');
   
   var targetEl = document.getElementById('targetCoords');
   if (targetEl) targetEl.textContent = '(' + q + ', ' + r + ')';
   
   var targetIndicator = document.getElementById('targetIndicator');
   if (targetIndicator) targetIndicator.style.display = 'block';
};

// ============================================
// ОЧИСТКА ЦЕЛИ
// ============================================
InputController.prototype.clearTarget = function() {
   this.selectedTarget = null;
   this.scene.hexGrid.clearHighlight();
   
   var shootBtn = document.getElementById('shootBtn');
   if (shootBtn) shootBtn.classList.add('hidden');
   
   var targetEl = document.getElementById('targetCoords');
   if (targetEl) targetEl.textContent = '—';
   
   var targetIndicator = document.getElementById('targetIndicator');
   if (targetIndicator) targetIndicator.style.display = 'none';
};

// ============================================
// ВЫПОЛНЕНИЕ ВЫСТРЕЛА
// ============================================
InputController.prototype.executeShoot = function() {
   if (!this.selectedTarget) {
       this.showMessage('⚠️ Сначала выберите цель');
       return;
   }
   
   if (this.gameController.isGameOver()) {
       this.showMessage('⚠️ Игра окончена');
       return;
   }
   
   if (this.isProcessingAction) {
       this.showMessage('⏳ Подождите, выполняется действие...');
       return;
   }
   
   var state = this.scene.gameState;
   if (!state || !state.myTank || !state.myTank.active) {
       this.showMessage('⚠️ Ваш танк уничтожен');
       return;
   }
   
   var myTank = state.myTank;
   var target = this.selectedTarget;
   
   // ============================================
   // ✅ ИСПОЛЬЗУЕМ НОВУЮ ЛОГИКУ СТРЕЛЬБЫ
   // ============================================
   if (this.shootLogic) {
       // Получаем всех юнитов
       var allUnits = [];
       if (state.myTank && state.myTank.active) {
           allUnits.push(state.myTank);
       }
       if (state.enemies) {
           for (var i = 0; i < state.enemies.length; i++) {
               if (state.enemies[i].active) {
                   allUnits.push(state.enemies[i]);
               }
           }
       }
       
       // Проверяем возможность выстрела
       var check = this.shootLogic.canShootAt(myTank, target.q, target.r, allUnits);
       
       if (!check.canShoot) {
           this.showMessage('⚠️ ' + check.reason);
           return;
       }
       
       // Для игрока - нет ограничений по дальности
       // Для врага - проверяем дальность
       if (!myTank.isPlayer) {
           if (check.distance > this.shootLogic.config.enemyMaxRange) {
               this.showMessage('⚠️ Слишком далеко! Макс. ' + this.shootLogic.config.enemyMaxRange + ' гексов');
               return;
           }
       }
   } else {
       // Fallback: старая логика
       var distance = HexUtils.distance(myTank.q, myTank.r, target.q, target.r);
       if (distance > myTank.range && !myTank.isPlayer) {
           this.showMessage('⚠️ Слишком далеко! Дистанция ' + distance);
           return;
       }
   }
   
   // Проверка кулдауна
   var cooldown = this.gameController.getRemainingCooldown();
   if (cooldown > 0) {
       var sec = Math.ceil(cooldown / 1000);
       this.showMessage('⏱️ Перезарядка: ' + sec + ' сек');
       return;
   }
   
   // Блокируем и стреляем
   this.isProcessingAction = true;
   
   var result = this.gameController.shootAt(target.q, target.r);
   if (result && result.success) {
       this.showMessage('🔫 Выстрел по (' + target.q + ', ' + target.r + ')!');
       this.clearTarget();
   } else if (result && !result.success) {
       this.showMessage('❌ ' + (result.message || 'Ошибка выстрела'));
   }
   
   setTimeout(function() {
       this.isProcessingAction = false;
   }.bind(this), 500);
};

// ============================================
// ОБНОВЛЕНИЕ UI
// ============================================
InputController.prototype.updateUI = function() {
   var modeIndicator = document.getElementById('modeIndicator');
   if (modeIndicator) {
       if (this.moveMode && this.selectedTank) {
           modeIndicator.textContent = '🚶 ДВИЖЕНИЕ (выберите клетку)';
           modeIndicator.className = 'move-mode';
       } else {
           modeIndicator.textContent = '🔫 СТРЕЛЬБА';
           modeIndicator.className = 'shoot-mode';
       }
   }
   
   var shootBtn = document.getElementById('shootBtn');
   if (shootBtn) {
       if (!this.moveMode && this.selectedTarget) {
           shootBtn.classList.remove('hidden');
       } else {
           shootBtn.classList.add('hidden');
       }
   }
};

// ============================================
// ОБНОВЛЕНИЕ СОСТОЯНИЯ
// ============================================
InputController.prototype.setGameState = function(state) {
   if (this.moveMode && state && state.myTank) {
       if (this.selectedTank) {
           var currentTank = state.myTank;
           if (this.selectedTank.q !== currentTank.q || this.selectedTank.r !== currentTank.r) {
               this.selectedTank = currentTank;
               this.highlightMoveArea();
           }
       }
   }
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
// ============================================
InputController.prototype.isReady = function() {
   return !this.isProcessingAction && this.isEnabled;
};

InputController.prototype.showMessage = function(text) {
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

InputController.prototype.destroy = function() {
   if (this.scene && this.scene.input) {
       this.scene.input.off('pointerdown');
   }
   this.scene = null;
   this.gameController = null;
   this.selectedTarget = null;
   this.selectedTank = null;
   this.validMoveNeighbors = [];
   this.actionQueue = [];
   this.isProcessingAction = false;
   this.shootLogic = null;
};

// Экспорт
if (typeof window !== 'undefined') {
   window.InputController = InputController;
}
