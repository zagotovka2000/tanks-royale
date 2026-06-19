// client/controllers/InputController.js - ИСПРАВЛЕНИЕ: ОБНОВЛЕННАЯ ЛОГИКА

function InputController(scene, gameController) {
   this.scene = scene;
   this.gameController = gameController;
   this.isEnabled = true;
   this.moveMode = false; // false = shoot mode, true = move mode
   this.selectedTarget = null;
   this.validMoveNeighbors = [];
   this.lastClickTime = 0;
   this.throttleDelay = 150;
   this.selectedTank = null; // Танк, который выбран для движения
   
   // ✅ НОВЫЕ СВОЙСТВА
   this.isProcessingAction = false;
   this.pendingMove = null;
   this.actionQueue = [];
}

InputController.prototype.init = function() {
   var self = this;
   
   // Клик по игровому полю
   this.scene.input.on('pointerdown', function(pointer) {
       self.handleClick(pointer);
   });
   
   // Кнопка переключения режима
   var modeBtn = document.getElementById('modeToggle');
   if (modeBtn) {
       modeBtn.addEventListener('click', function() {
           self.toggleMode();
       });
   }
   
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
   this.showMessage('🎮 Кликните по своему танку для переключения в режим движения');
   this.showMessage('🔫 Режим: СТРЕЛЬБА (нажмите на свой танк для переключения)');
};

// ============================================
// ✅ КЛЮЧЕВОЙ МЕТОД - обрабатывает клик по подсвеченной клетке
// ============================================
InputController.prototype.handleClick = function(pointer) {
   if (!this.isEnabled) return;
   if (this.gameController.isGameOver()) {
       this.showMessage('⚠️ Игра окончена');
       return;
   }
   
   // ✅ НЕ ОБРАБАТЫВАЕМ КЛИКИ ВО ВРЕМЯ АНИМАЦИИ
   if (this.isProcessingAction) {
       this.showMessage('⏳ Подождите, выполняется действие...');
       return;
   }
   
   var now = Date.now();
   if (now - this.lastClickTime < this.throttleDelay) return;
   this.lastClickTime = now;
   
   console.log('🖱️ КЛИК в экранных координатах:', pointer.x, pointer.y);
   
   var camera = this.scene.cameras.main;
   console.log('📷 Камера: scrollX=' + camera.scrollX.toFixed(1) + ', scrollY=' + camera.scrollY.toFixed(1) + ', zoom=' + camera.zoom.toFixed(2));
   
   var hex = this.scene.hexGrid.pixelToHex(pointer.x, pointer.y);
   
   if (!hex) {
       this.showMessage('❌ Клик мимо поля');
       return;
   }
   
   console.log('✅ Выбран гекс:', hex.q, hex.r);
   
   var state = this.scene.gameState;
   if (!state || !state.myTank) return;
   
   var myTank = state.myTank;
   
   // ✅ ПРОВЕРЯЕМ КЛИК ПО СВОЕМУ ТАНКУ
   if (myTank.q === hex.q && myTank.r === hex.r) {
       // Если танк уже выбран - переключаем режим
       if (this.selectedTank && this.selectedTank.q === hex.q && this.selectedTank.r === hex.r) {
           this.toggleMode();
       } else {
           // Выбираем танк для движения
           this.selectTank(myTank);
       }
       return;
   }
   
   // ✅ ЕСЛИ В РЕЖИМЕ ДВИЖЕНИЯ И ВЫБРАН ТАНК
   if (this.moveMode && this.selectedTank) {
       // Проверяем, является ли клетка доступной для движения
       var isValid = this.validMoveNeighbors.some(function(n) {
           return n.q === hex.q && n.r === hex.r;
       });
       
       if (isValid) {
           console.log('✅ Клетка доступна, двигаемся!');
           
           // ✅ БЛОКИРУЕМ ОБРАБОТКУ
           this.isProcessingAction = true;
           
           // ✅ ОТПРАВЛЯЕМ ЗАПРОС ДВИЖЕНИЯ
           this.gameController.requestMove(hex.q, hex.r, function(success, data) {
               this.isProcessingAction = false;
               
               if (success) {
                   this.showMessage('🚶 Движение на (' + hex.q + ', ' + hex.r + ')');
                   this.clearTankSelection();
                   this.moveMode = false;
                   this.updateUI();
               } else {
                   this.showMessage('❌ ' + (data.message || 'Движение отклонено'));
               }
           }.bind(this));
       } else {
           this.showMessage('⚠️ Нельзя туда двигаться');
       }
       return;
   }
   
   // ✅ РЕЖИМ СТРЕЛЬБЫ - ВЫБОР ЦЕЛИ
   if (!this.moveMode) {
       // Если клик по врагу - выбираем как цель
       var isEnemy = state.enemies && state.enemies.some(function(e) {
           return e.active && e.q === hex.q && e.r === hex.r;
       });
       
       if (isEnemy) {
           this.selectTarget(hex.q, hex.r);
       } else {
           // Если клик по пустой клетке - просто выбираем точку
           this.selectTarget(hex.q, hex.r);
       }
   }
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ МЕТОД: Выбор танка для движения
// ============================================
InputController.prototype.selectTank = function(tank) {
    console.log('🎯 Выбран танк для движения:', tank.q, tank.r);
    
    // ✅ СНАЧАЛА ПОЛНОСТЬЮ ОЧИЩАЕМ ВСЕ ПОДСВЕТКИ
    this.scene.hexGrid.clearHighlight();
    this.clearTarget();
    
    // Сохраняем выбранный танк
    this.selectedTank = tank;
    
    // Переключаемся в режим движения
    this.moveMode = true;
    this.updateUI();
    
    // ✅ ПОДСВЕЧИВАЕМ ДОСТУПНЫЕ КЛЕТКИ
    this.highlightMoveArea();
    
    this.showMessage('🚶 Режим движения: выберите подсвеченную клетку');
};

// ============================================
// ✅ НОВЫЙ МЕТОД: Очистка выбора танка
// ============================================
InputController.prototype.clearTankSelection = function() {
   this.selectedTank = null;
   this.validMoveNeighbors = [];
   this.scene.hexGrid.clearMoveHighlight();
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ toggleMode
// ============================================
InputController.prototype.toggleMode = function() {
   if (this.isProcessingAction) {
       this.showMessage('⏳ Подождите, выполняется действие...');
       return;
   }
   
   this.moveMode = !this.moveMode;
   this.updateUI();
   
   if (this.moveMode) {
       // Если переключаемся в режим движения - выбираем танк
       var state = this.scene.gameState;
       if (state && state.myTank && state.myTank.active) {
           this.selectTank(state.myTank);
       } else {
           this.showMessage('⚠️ Ваш танк уничтожен');
           this.moveMode = false;
           this.updateUI();
       }
   } else {
       // Выходим из режима движения
       this.clearTankSelection();
       this.showMessage('🔫 Режим СТРЕЛЬБЫ');
       if (this.selectedTarget) {
           this.scene.hexGrid.highlightHex(this.selectedTarget.q, this.selectedTarget.r, 0xffeb3b);
       }
   }
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ highlightMoveArea - ЖЕЛТЫЙ ЦЕНТР, ЗЕЛЕНЫЕ СОСЕДИ
// ============================================
InputController.prototype.highlightMoveArea = function() {
    var state = this.scene.gameState;
    if (!state || !state.myTank) return;
    
    var myTank = state.myTank;
    if (!myTank.active) {
        this.showMessage('⚠️ Ваш танк уничтожен');
        return;
    }
    
    console.log('🚶 highlightMoveArea() - танк на позиции:', myTank.q, myTank.r);
    
    // Собираем все активные юниты
    var allUnits = [];
    if (state.myTank && state.myTank.active) allUnits.push(state.myTank);
    if (state.enemies) {
        for (var i = 0; i < state.enemies.length; i++) {
            if (state.enemies[i].active) allUnits.push(state.enemies[i]);
        }
    }
    
    // ✅ ПОЛУЧАЕМ ВСЕ 6 СОСЕДНИХ КЛЕТОК
    var neighbors = HexUtils.getNeighbors(myTank.q, myTank.r);
    var valid = [];
    
    for (var i = 0; i < neighbors.length; i++) {
        var n = neighbors[i];
        
        // Проверяем, что клетка существует на карте
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
    console.log('📊 Доступно клеток для движения:', valid.length);
    
    // ✅ ПОДСВЕЧИВАЕМ ВСЕ ДОСТУПНЫЕ КЛЕТКИ
    if (valid.length > 0) {
        // Сначала очищаем старые подсветки
        this.scene.hexGrid.clearHighlight();
        // Подсвечиваем центр (свой танк) - желтым
        this.scene.hexGrid.highlightHex(myTank.q, myTank.r, 0xffdd44);
        // Подсвечиваем доступные клетки - зеленым
        for (var i = 0; i < valid.length; i++) {
            this.scene.hexGrid.highlightHex(valid[i].q, valid[i].r, 0x44ff44);
        }
        this.showMessage('🚶 Доступно клеток: ' + valid.length);
    } else {
        console.warn('⚠️ Нет доступных клеток для движения');
        this.showMessage('⚠️ Нет доступных клеток для движения');
    }
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ selectTarget
// ============================================
InputController.prototype.selectTarget = function(q, r) {
   console.log('🎯 selectTarget вызван для гекса:', q, r);
   
   // Очищаем режим движения если активен
   if (this.moveMode) {
       this.clearTankSelection();
       this.moveMode = false;
       this.updateUI();
   }
   
   // Проверяем, не выбран ли уже этот гекс
   if (this.selectedTarget && this.selectedTarget.q === q && this.selectedTarget.r === r) {
       this.clearTarget();
       return;
   }
   
   this.selectedTarget = { q: q, r: r };
   
   // Подсвечиваем гекс
   this.scene.hexGrid.highlightHex(q, r, 0xffeb3b);
   
   // Проверяем, есть ли враг на этой клетке
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
   
   // Обновляем HUD
   var targetEl = document.getElementById('targetCoords');
   if (targetEl) targetEl.textContent = '(' + q + ', ' + r + ')';
   
   var targetIndicator = document.getElementById('targetIndicator');
   if (targetIndicator) targetIndicator.style.display = 'block';
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ clearTarget
// ============================================
InputController.prototype.clearTarget = function() {
   console.log('🎯 clearTarget вызван');
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
// ✅ ОБНОВЛЕННЫЙ executeShoot
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
   var distance = HexUtils.distance(myTank.q, myTank.r, target.q, target.r);
   
   if (distance > myTank.range) {
       this.showMessage('⚠️ Слишком далеко! Дистанция ' + distance);
       return;
   }
   
   var cooldown = this.gameController.getRemainingCooldown();
   if (cooldown > 0) {
       var sec = Math.ceil(cooldown / 1000);
       this.showMessage('⏱️ Перезарядка: ' + sec + ' сек');
       return;
   }
   
   // ✅ БЛОКИРУЕМ ОБРАБОТКУ
   this.isProcessingAction = true;
   
   // ✅ ОТПРАВЛЯЕМ ЗАПРОС ВЫСТРЕЛА
   var result = this.gameController.shootAt(target.q, target.r);
   if (result && result.success) {
       this.showMessage('🔫 Выстрел по (' + target.q + ', ' + target.r + ')!');
       // Очищаем цель после выстрела
       this.clearTarget();
   } else if (result && !result.success) {
       this.showMessage('❌ ' + (result.message || 'Ошибка выстрела'));
   }
   
   // Разблокируем через секунду (защита от спама)
   setTimeout(function() {
       this.isProcessingAction = false;
   }.bind(this), 500);
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ updateUI
// ============================================
InputController.prototype.updateUI = function() {
   var modeIndicator = document.getElementById('modeIndicator');
   if (modeIndicator) {
       if (this.moveMode && this.selectedTank) {
           modeIndicator.textContent = '🚶 ДВИЖЕНИЕ (выберите клетку)';
           modeIndicator.className = '';
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
// ✅ ОБНОВЛЕННЫЙ setGameState
// ============================================
InputController.prototype.setGameState = function(state) {
   // Если танк игрока переместился - обновляем подсветку движения
   if (this.moveMode && state && state.myTank) {
       // Проверяем, не изменилась ли позиция танка
       if (this.selectedTank) {
           var currentTank = state.myTank;
           if (this.selectedTank.q !== currentTank.q || this.selectedTank.r !== currentTank.r) {
               // Танк переместился, обновляем
               this.selectedTank = currentTank;
               this.highlightMoveArea();
           }
       }
   }
};

// ============================================
// ✅ ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ ПРОВЕРКИ ГОТОВНОСТИ
// ============================================
InputController.prototype.isReady = function() {
   return !this.isProcessingAction && this.isEnabled;
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ showMessage
// ============================================
InputController.prototype.showMessage = function(text) {
   console.log('📝 ' + text);
   var container = document.getElementById('messages');
   if (!container) return;
   
   var msg = document.createElement('div');
   msg.className = 'message';
   msg.textContent = text;
   container.appendChild(msg);
   
   var self = this;
   setTimeout(function() {
       if (msg && msg.remove) msg.remove();
   }, 2500);
};

// ============================================
// ✅ ОБНОВЛЕННЫЙ destroy
// ============================================
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
};

// Экспорт
if (typeof window !== 'undefined') {
   window.InputController = InputController;
}
