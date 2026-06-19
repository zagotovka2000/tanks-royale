// client/game/TankGame.js - ИСПРАВЛЕНИЕ: РАЗДЕЛЬНЫЕ КУЛДАУНЫ

// ✅ Загружаем зависимости для сервера
if (typeof module !== 'undefined' && module.exports) {
   var { EffectManager } = require('./EffectManager.js');
   var { TankUnit } = require('./TankUnit.js');
   var HexUtils = require('../utils/HexUtils.js');
} else {
   var EffectManager = window.EffectManager;
   var TankUnit = window.TankUnit;
   var HexUtils = window.HexUtils;
}

function TankGame() {
   this.radius = 10;
   this.gameOver = false;
   this.winner = null;
   
   // ✅ РАЗДЕЛЬНЫЕ КУЛДАУНЫ
   this.lastMoveTime = 0;
   this.moveCooldown = 1000; // 1 секунда между движениями
   this.lastShootTime = 0;
   this.shootCooldown = 2500; // 2.5 секунды между выстрелами
   
   this._lastPositions = new Map();

   this.cells = [];
   this.players = [];
   this.enemies = [];

   this.effectManager = new EffectManager();

   this.generateMap();
   this.initializeUnits();
}

// ✅ МЕТОДЫ ПРОВЕРКИ КУЛДАУНОВ
TankGame.prototype.canMove = function(unit) {
   if (!unit || !unit.active) return false;
   var now = Date.now();
   return (now - this.lastMoveTime) >= this.moveCooldown;
};

TankGame.prototype.canShoot = function(unit) {
   if (!unit || !unit.active) return false;
   var now = Date.now();
   return (now - this.lastShootTime) >= this.shootCooldown;
};

TankGame.prototype.getRemainingMoveCooldown = function() {
   var now = Date.now();
   return Math.max(0, this.moveCooldown - (now - this.lastMoveTime));
};

TankGame.prototype.getRemainingShootCooldown = function() {
   var now = Date.now();
   return Math.max(0, this.shootCooldown - (now - this.lastShootTime));
};

// ✅ ДОБАВЛЯЕМ МЕТОД getRemainingCooldown() ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
TankGame.prototype.getRemainingCooldown = function() {
   // Возвращаем максимальный кулдаун для обратной совместимости
   var moveCooldown = this.getRemainingMoveCooldown ? this.getRemainingMoveCooldown() : 0;
   var shootCooldown = this.getRemainingShootCooldown ? this.getRemainingShootCooldown() : 0;
   return Math.max(moveCooldown, shootCooldown);
};

// ✅ ГЕНЕРАЦИЯ КАРТЫ
TankGame.prototype.generateMap = function() {
   this.cells = [];
   for (var q = -this.radius; q <= this.radius; q++) {
       for (var r = -this.radius; r <= this.radius; r++) {
           var s = -q - r;
           if (Math.abs(q) <= this.radius &&
               Math.abs(r) <= this.radius &&
               Math.abs(s) <= this.radius) {
               this.cells.push({
                   q: q,
                   r: r,
                   s: s,
                   terrain: 'plains'
               });
           }
       }
   }
   console.log('Карта создана: ' + this.cells.length + ' гексов');
};

// ✅ ИНИЦИАЛИЗАЦИЯ ЮНИТОВ
TankGame.prototype.initializeUnits = function() {
   var player = new TankUnit(
       'player1',
       'Командир',
       'player',
       1,
       -8,
       120,
       35,
       '#ffd93d',
       'medium',
       5
   );
   player.isPlayer = true;
   this.players.push(player);

   var enemy = new TankUnit(
       'enemy1',
       'Враг',
       'enemy',
       -1,
       8,
       100,
       30,
       '#e94560',
       'medium',
       5
   );
   this.enemies.push(enemy);

   console.log('Созданы: игрок и враг');
};

TankGame.prototype.getFirstPlayer = function() {
   return this.players.length > 0 ? this.players[0] : null;
};

TankGame.prototype.getAllUnits = function() {
   return this.players.concat(this.enemies);
};

TankGame.prototype.isValidCell = function(q, r) {
   return HexUtils.isValidCell(q, r, this.radius);
};

TankGame.prototype.getNeighbors = function(q, r) {
   var neighbors = [];
   var dirs = HexUtils.directions;
   for (var i = 0; i < dirs.length; i++) {
       var d = dirs[i];
       var nq = q + d.q;
       var nr = r + d.r;
       if (this.isValidCell(nq, nr)) {
           neighbors.push({ q: nq, r: nr });
       }
   }
   return neighbors;
};

// ✅ ЗАПОМИНАЕМ ПОСЛЕДНИЕ КООРДИНАТЫ ДЛЯ АНИМАЦИИ
TankGame.prototype.getLastPosition = function(unitId) {
    if (!this._lastPositions) {
        this._lastPositions = new Map();
    }
    return this._lastPositions.get(unitId) || null;
};

TankGame.prototype.setLastPosition = function(unitId, q, r) {
    if (!this._lastPositions) {
        this._lastPositions = new Map();
    }
    this._lastPositions.set(unitId, { q: q, r: r });
};

// ✅ ИСПРАВЛЕННЫЙ moveToCell - ИСПОЛЬЗУЕТ canMove()
TankGame.prototype.moveToCell = function(unitId, targetQ, targetR) {
   var unit = this.getAllUnits().find(function(u) {
       return u.id === unitId && u.active;
   });
   if (!unit) return false;

   // ✅ ПРОВЕРЯЕМ КУЛДАУН ДВИЖЕНИЯ
   if (!this.canMove(unit)) {
       console.log('⏳ Кулдаун движения:', this.getRemainingMoveCooldown(), 'мс');
       return false;
   }

   if (!HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) return false;

   var occupied = this.getAllUnits().some(function(u) {
       return u.active && u !== unit && u.q === targetQ && u.r === targetR;
   });
   if (occupied) return false;

   // Сохраняем предыдущую позицию
   this.setLastPosition(unitId, unit.q, unit.r);

   var direction = HexUtils.getDirection(unit.q, unit.r, targetQ, targetR);
   unit.setDirection(direction);
   unit.moveTo(targetQ, targetR);
   
   // ✅ ОБНОВЛЯЕМ ТОЛЬКО КУЛДАУН ДВИЖЕНИЯ
   this.lastMoveTime = Date.now();

   console.log('✅ Танк', unitId, 'перемещен на', targetQ, targetR, 'направление:', direction);
   return true;
};

// ✅ ИСПРАВЛЕННЫЙ shootAtCell - ИСПОЛЬЗУЕТ canShoot()
TankGame.prototype.shootAtCell = function(attackerId, targetQ, targetR) {
   var attacker = this.getAllUnits().find(function(u) {
       return u.id === attackerId && u.active;
   });
   if (!attacker) {
       return { success: false, message: 'Танк не найден' };
   }

   // ✅ ПРОВЕРЯЕМ КУЛДАУН СТРЕЛЬБЫ
   if (!this.canShoot(attacker)) {
       var remaining = this.getRemainingShootCooldown();
       return { 
           success: false, 
           message: 'Перезарядка: ' + Math.ceil(remaining / 1000) + 'с',
           cooldown: remaining
       };
   }

   var distance = HexUtils.distance(attacker.q, attacker.r, targetQ, targetR);
   if (distance > attacker.range) {
       return { success: false, message: 'Слишком далеко' };
   }

   // ✅ ОБНОВЛЯЕМ ТОЛЬКО КУЛДАУН СТРЕЛЬБЫ
   this.lastShootTime = Date.now();

   var target = this.getAllUnits().find(function(u) {
       return u.active && u.team !== attacker.team &&
              u.q === targetQ && u.r === targetR;
   });

   if (!target) {
       return {
           success: true,
           hit: false,
           message: 'Промах!',
           targetQ: targetQ,
           targetR: targetR,
           fromQ: attacker.q,
           fromR: attacker.r,
           attackerId: attacker.id
       };
   }

   target.hp -= attacker.damage;
   var killed = false;

   if (target.hp <= 0) {
       target.active = false;
       killed = true;
       attacker.kills++;
       this.effectManager.addSmoke(target.q, target.r, target.name);
   }

   return {
       success: true,
       hit: true,
       killed: killed,
       message: killed ? '💀 ' + target.name + ' уничтожен!' :
                        '💥 Попадание в ' + target.name + '! -' + attacker.damage + ' HP',
       targetQ: target.q,
       targetR: target.r,
       fromQ: attacker.q,
       fromR: attacker.r,
       attackerId: attacker.id
   };
};

// ✅ ИСПРАВЛЕННЫЙ botAction - ИСПОЛЬЗУЕТ ИНДИВИДУАЛЬНЫЕ КУЛДАУНЫ
TankGame.prototype.botAction = function() {
   var player = this.getFirstPlayer();
   if (!player || !player.active) return null;

   var enemy = this.enemies[0];
   if (!enemy || !enemy.active) return null;

   // ✅ БОТ ПРОВЕРЯЕТ СВОЙ КУЛДАУН СТРЕЛЬБЫ
   if (!this.canShoot(enemy)) return null;

   var distance = HexUtils.distance(enemy.q, enemy.r, player.q, player.r);

   if (distance <= enemy.range && Math.random() < 0.4) {
       return this.shootAtCell(enemy.id, player.q, player.r);
   }

   // ✅ БОТ ПРОВЕРЯЕТ СВОЙ КУЛДАУН ДВИЖЕНИЯ
   if (!this.canMove(enemy)) return null;
   if (Math.random() > 0.6) return null;

   var neighbors = this.getNeighbors(enemy.q, enemy.r);
   var valid = neighbors.filter(function(n) {
       var occupied = this.getAllUnits().some(function(u) {
           return u.active && u.q === n.q && u.r === n.r;
       });
       return !occupied;
   }.bind(this));

   if (valid.length > 0) {
       var target = valid[Math.floor(Math.random() * valid.length)];
       var fromQ = enemy.q;
       var fromR = enemy.r;
       
       var moved = this.moveToCell(enemy.id, target.q, target.r);
       if (moved) {
           console.log('🤖 Бот двинулся с', fromQ, fromR, 'на', target.q, target.r);
           return {
               type: 'move',
               fromQ: fromQ,
               fromR: fromR,
               toQ: target.q,
               toR: target.r,
               unitId: enemy.id
           };
       }
   }

   return null;
};

// ✅ ОБНОВЛЕННЫЙ getStateForPlayer - ДОБАВЛЯЕТ ИНФОРМАЦИЮ О ПОСЛЕДНЕЙ ПОЗИЦИИ
TankGame.prototype.getStateForPlayer = function(playerId) {
    var player = this.players.find(function(p) { return p.id === playerId; });
    if (!player) return null;

    // ✅ ПОЛУЧАЕМ ИНФОРМАЦИЮ О ПОСЛЕДНИХ ПОЗИЦИЯХ ДЛЯ ВСЕХ ЮНИТОВ
    var lastPositions = {};
    var allUnits = this.getAllUnits();
    for (var i = 0; i < allUnits.length; i++) {
        var unit = allUnits[i];
        var lastPos = this.getLastPosition(unit.id);
        if (lastPos) {
            lastPositions[unit.id] = lastPos;
        }
    }

    return {
        radius: this.radius,
        myTank: player.toJSON(), // ✅ toJSON() уже включает direction
        enemies: this.enemies.filter(function(e) { return e.active; }).map(function(e) { return e.toJSON(); }),
        cells: this.cells.slice(0),
        lastMoveTime: this.lastMoveTime,
        moveCooldown: this.moveCooldown,
        lastShootTime: this.lastShootTime,
        shootCooldown: this.shootCooldown,
        gameOver: this.gameOver,
        winner: this.winner,
        lastPositions: lastPositions,  // ✅ ДОБАВЛЯЕМ
        lastMoves: {} // Пустой объект для совместимости
    };
};

// ✅ ПРОВЕРКА ПОБЕДИТЕЛЯ
TankGame.prototype.checkWinner = function() {
   var playerAlive = this.players.some(function(p) { return p.active; });
   var enemyAlive = this.enemies.some(function(e) { return e.active; });

   if (!playerAlive && enemyAlive) {
       this.gameOver = true;
       this.winner = 'ПОРАЖЕНИЕ! Ваш танк уничтожен!';
       return true;
   }

   if (!enemyAlive && playerAlive) {
       this.gameOver = true;
       this.winner = 'ПОБЕДА! Враг уничтожен!';
       return true;
   }

   return false;
};

// ✅ Универсальный экспорт
if (typeof window !== 'undefined') {
   window.TankGame = TankGame;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { TankGame: TankGame };
}
