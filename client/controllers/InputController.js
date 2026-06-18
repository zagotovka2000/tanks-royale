// client/controllers/InputController.js

function InputController(scene, gameController) {
   this.scene = scene;
   this.gameController = gameController;
   this.isEnabled = true;
   this.moveMode = false; // false = shoot mode, true = move mode
   this.selectedTarget = null;
   this.validMoveNeighbors = [];
   this.lastClickTime = 0;
   this.throttleDelay = 150;
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
   this.showMessage('🎮 Кликните по клетке для выбора цели');
   this.showMessage('🔫 Режим: СТРЕЛЬБА (нажмите на свой танк для переключения)');
};

// ✅ ОБНОВЛЕННЫЙ handleClick С ПРОВЕРКОЙ КАМЕРЫ
InputController.prototype.handleClick = function(pointer) {
    if (!this.isEnabled) return;
    if (this.gameController.isGameOver()) {
        this.showMessage('⚠️ Игра окончена');
        return;
    }
    
    var now = Date.now();
    if (now - this.lastClickTime < this.throttleDelay) return;
    this.lastClickTime = now;
    
    console.log('🖱️ КЛИК в экранных координатах:', pointer.x, pointer.y);
    
    // ✅ ПРОВЕРЯЕМ КАМЕРУ
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
    
    // Клик по своему танку - переключение режима
    if (myTank.q === hex.q && myTank.r === hex.r) {
        this.toggleMode();
        return;
    }
    
    if (this.moveMode) {
        var isValid = this.validMoveNeighbors.some(function(n) {
            return n.q === hex.q && n.r === hex.r;
        });
        
        if (isValid) {
            this.gameController.moveTo(hex.q, hex.r);
            this.showMessage('🚶 Движение на (' + hex.q + ', ' + hex.r + ')');
            this.moveMode = false;
            this.updateUI();
        } else {
            this.showMessage('⚠️ Нельзя туда двигаться');
        }
    } else {
        this.selectTarget(hex.q, hex.r);
    }
};

// ✅ ОБНОВЛЕННЫЙ selectTarget
InputController.prototype.selectTarget = function(q, r) {
    console.log('🎯 selectTarget вызван для гекса:', q, r);
    
    // ✅ ПРОВЕРЯЕМ, НЕ ВЫБРАН ЛИ УЖЕ ЭТОТ ГЕКС
    if (this.selectedTarget && this.selectedTarget.q === q && this.selectedTarget.r === r) {
        // ✅ ЕСЛИ ТОТ ЖЕ ГЕКС - УБИРАЕМ ВЫБОР
        this.clearTarget();
        return;
    }
    
    this.selectedTarget = { q: q, r: r };
    
    // ✅ ПОДСВЕЧИВАЕМ ГЕКС
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

// ✅ ОБНОВЛЕННЫЙ clearTarget
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
    
    this.showMessage('🎯 Цель сброшена');
};

InputController.prototype.executeShoot = function() {
   if (!this.selectedTarget) {
       this.showMessage('⚠️ Сначала выберите цель');
       return;
   }
   
   if (this.gameController.isGameOver()) {
       this.showMessage('⚠️ Игра окончена');
       return;
   }
   
   var state = this.scene.gameState;
   if (!state || !state.myTank) {
       this.showMessage('⚠️ Ваш танк не найден');
       return;
   }
   
   var myTank = state.myTank;
   if (!myTank.active) {
       this.showMessage('⚠️ Ваш танк уничтожен');
       return;
   }
   
   var target = this.selectedTarget;
   var distance = HexUtils.distance(myTank.q, myTank.r, target.q, target.r);
   
   if (distance > myTank.range) {
       this.showMessage('⚠️ Слишком далеко! Дистанция ' + distance);
       return;
   }
   
   // Проверяем перезарядку
   var cooldown = this.gameController.getRemainingCooldown();
   if (cooldown > 0) {
       var sec = Math.ceil(cooldown / 1000);
       this.showMessage('⏱️ Перезарядка: ' + sec + ' сек');
       return;
   }
   
   // Отправляем выстрел
   this.gameController.shootAt(target.q, target.r);
   this.showMessage('🔫 Выстрел по (' + target.q + ', ' + target.r + ')!');
};

InputController.prototype.toggleMode = function() {
   this.moveMode = !this.moveMode;
   this.updateUI();
   
   if (this.moveMode) {
       this.showMessage('🚶 РЕЖИМ ДВИЖЕНИЯ');
       this.scene.hexGrid.clearHighlight();
       this.highlightMoveArea();
   } else {
       this.showMessage('🔫 РЕЖИМ СТРЕЛЬБЫ');
       this.scene.hexGrid.clearMoveHighlight();
       if (this.selectedTarget) {
           this.scene.hexGrid.highlightHex(this.selectedTarget.q, this.selectedTarget.r, 0xffeb3b);
       }
   }
};

InputController.prototype.highlightMoveArea = function() {
   var state = this.scene.gameState;
   if (!state || !state.myTank) return;
   
   var myTank = state.myTank;
   var allUnits = [];
   if (state.myTank) allUnits.push(state.myTank);
   if (state.enemies) {
       for (var i = 0; i < state.enemies.length; i++) {
           allUnits.push(state.enemies[i]);
       }
   }
   
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
   this.scene.hexGrid.highlightMoveArea(myTank.q, myTank.r, valid);
};

InputController.prototype.updateUI = function() {
   var modeIndicator = document.getElementById('modeIndicator');
   if (modeIndicator) {
       modeIndicator.textContent = this.moveMode ? '🚶 ДВИЖЕНИЕ' : '🔫 СТРЕЛЬБА';
       modeIndicator.className = this.moveMode ? '' : 'shoot-mode';
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

InputController.prototype.setGameState = function(state) {
   // Обновляем подсветку движения, если в режиме движения
   if (this.moveMode && state && state.myTank) {
       this.scene.hexGrid.clearMoveHighlight();
       this.highlightMoveArea();
   }
};

InputController.prototype.destroy = function() {
   this.scene = null;
   this.gameController = null;
   this.selectedTarget = null;
   this.validMoveNeighbors = [];
};

if (typeof window !== 'undefined') {
   window.InputController = InputController;
}
