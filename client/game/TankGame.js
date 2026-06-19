// client/game/TankGame.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С SHOOTLOGIC

(function() {
   'use strict';
   
   // Получаем зависимости
   var HexUtils = (typeof module !== 'undefined' && module.exports) ? 
       require('../utils/HexUtils.js') : window.HexUtils;
   var EffectManager = (typeof module !== 'undefined' && module.exports) ? 
       require('./EffectManager.js').EffectManager : window.EffectManager;
   var ShootLogic = (typeof module !== 'undefined' && module.exports) ? 
       require('./ShootLogic.js').ShootLogic : window.ShootLogic;
   
   function TankGame() {
       this.radius = 10;
       this.gameOver = false;
       this.winner = null;
       this.lastMoveTime = 0;
       this.moveCooldown = 1000;
       this.lastShootTime = 0;
       this.shootCooldown = 2500;
       this._lastPositions = new Map();
       this.cells = [];
       this.players = [];
       this.enemies = [];
       this.effectManager = new EffectManager();
       
       // Инициализируем логику стрельбы
       this.shootLogic = new ShootLogic();
       
       this.generateMap();
       this.initializeUnits();
   }
   
   // ===== МЕТОДЫ КУЛДАУНА =====
   TankGame.prototype.canMove = function(unit) {
       return unit && unit.active && (Date.now() - this.lastMoveTime) >= this.moveCooldown;
   };
   
   TankGame.prototype.canShoot = function(unit) {
       return unit && unit.active && (Date.now() - this.lastShootTime) >= this.shootCooldown;
   };
   
   TankGame.prototype.getRemainingMoveCooldown = function() {
       return Math.max(0, this.moveCooldown - (Date.now() - this.lastMoveTime));
   };
   
   TankGame.prototype.getRemainingShootCooldown = function() {
       return Math.max(0, this.shootCooldown - (Date.now() - this.lastShootTime));
   };
   
   TankGame.prototype.getRemainingCooldown = function() {
       return Math.max(this.getRemainingMoveCooldown(), this.getRemainingShootCooldown());
   };
   
   // ===== ГЕНЕРАЦИЯ КАРТЫ =====
   TankGame.prototype.generateMap = function() {
       this.cells = [];
       for (var q = -this.radius; q <= this.radius; q++) {
           for (var r = -this.radius; r <= this.radius; r++) {
               var s = -q - r;
               if (Math.abs(q) <= this.radius && Math.abs(r) <= this.radius && Math.abs(s) <= this.radius) {
                   this.cells.push({ q: q, r: r, s: s, terrain: 'plains' });
               }
           }
       }
   };
   
   // ===== ИНИЦИАЛИЗАЦИЯ ЮНИТОВ =====
   TankGame.prototype.initializeUnits = function() {
       var player = {
           id: 'player1', name: 'Командир', team: 'player',
           q: 1, r: -8, hp: 120, maxHp: 120, damage: 35,
           color: '#ffd93d', type: 'medium', range: this.shootLogic.config.playerMaxRange,
           active: true, direction: 'right', kills: 0, isPlayer: true
       };
       this.players.push(player);
       
       var enemy = {
           id: 'enemy1', name: 'Враг', team: 'enemy',
           q: -1, r: 8, hp: 100, maxHp: 100, damage: 30,
           color: '#e94560', type: 'medium', range: this.shootLogic.config.enemyMaxRange,
           active: true, direction: 'right', kills: 0, isPlayer: false
       };
       this.enemies.push(enemy);
   };
   
   // ===== ПОЛУЧЕНИЕ ЮНИТОВ =====
   TankGame.prototype.getFirstPlayer = function() {
       return this.players[0] || null;
   };
   
   TankGame.prototype.getAllUnits = function() {
       return this.players.concat(this.enemies);
   };
   
   // ===== РАБОТА С КАРТОЙ =====
   TankGame.prototype.isValidCell = function(q, r) {
       if (!HexUtils) return false;
       return HexUtils.isValidCell(q, r, this.radius);
   };
   
   TankGame.prototype.getNeighbors = function(q, r) {
       if (!HexUtils) return [];
       var dirs = HexUtils.directions || [];
       var result = [];
       for (var i = 0; i < dirs.length; i++) {
           var d = dirs[i];
           var nq = q + d.q, nr = r + d.r;
           if (this.isValidCell(nq, nr)) result.push({ q: nq, r: nr });
       }
       return result;
   };
   
   // ===== ПОЗИЦИИ =====
   TankGame.prototype.getLastPosition = function(unitId) {
       return this._lastPositions.get(unitId) || null;
   };
   
   TankGame.prototype.setLastPosition = function(unitId, q, r) {
       this._lastPositions.set(unitId, { q: q, r: r });
   };
   
   // ===== ДВИЖЕНИЕ =====
   TankGame.prototype.moveToCell = function(unitId, targetQ, targetR) {
       var unit = this.getAllUnits().find(function(u) { return u.id === unitId && u.active; });
       if (!unit || !this.canMove(unit)) return false;
       if (!HexUtils || !HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) return false;
       
       var occupied = this.getAllUnits().some(function(u) {
           return u.active && u !== unit && u.q === targetQ && u.r === targetR;
       });
       if (occupied) return false;
       
       this.setLastPosition(unitId, unit.q, unit.r);
       var direction = HexUtils.getDirection(unit.q, unit.r, targetQ, targetR);
       unit.direction = direction;
       unit.q = targetQ;
       unit.r = targetR;
       this.lastMoveTime = Date.now();
       return true;
   };
   
   // ===== СТРЕЛЬБА (использует ShootLogic) =====
   TankGame.prototype.shootAtCell = function(attackerId, targetQ, targetR) {
       var attacker = this.getAllUnits().find(function(u) { return u.id === attackerId && u.active; });
       if (!attacker) {
           return { success: false, message: 'Танк не найден' };
       }
       
       if (!this.canShoot(attacker)) {
           var remaining = this.getRemainingShootCooldown();
           return { success: false, message: 'Перезарядка: ' + Math.ceil(remaining/1000) + 'с', cooldown: remaining };
       }
       
       // Используем ShootLogic для выполнения выстрела
       var allUnits = this.getAllUnits();
       var result = this.shootLogic.executeShoot(attacker, targetQ, targetR, allUnits);
       
       if (result.success) {
           this.lastShootTime = Date.now();
           
           // Если попали и убили - добавляем дым
           if (result.hit && result.killed) {
               if (this.effectManager && this.effectManager.addSmoke) {
                   this.effectManager.addSmoke(result.targetQ, result.targetR, result.targetName);
               }
           }
       }
       
       return result;
   };
   
   // ===== ДЕЙСТВИЯ БОТА =====
   TankGame.prototype.botAction = function() {
       var player = this.getFirstPlayer();
       if (!player || !player.active) return null;
       
       var enemy = this.enemies[0];
       if (!enemy || !enemy.active) return null;
       
       if (!HexUtils) return null;
       
       // Проверяем возможность стрельбы с использованием ShootLogic
       var allUnits = this.getAllUnits();
       var shootCheck = this.shootLogic.canShootAt(enemy, player.q, player.r, allUnits);
       
       if (shootCheck.canShoot && Math.random() < 0.4 && this.canShoot(enemy)) {
           return this.shootAtCell(enemy.id, player.q, player.r);
       }
       
       // Движение
       if (!this.canMove(enemy) || Math.random() > 0.6) return null;
       
       var neighbors = this.getNeighbors(enemy.q, enemy.r);
       var valid = neighbors.filter(function(n) {
           return !this.getAllUnits().some(function(u) { return u.active && u.q === n.q && u.r === n.r; });
       }.bind(this));
       
       if (valid.length > 0) {
           var target = valid[Math.floor(Math.random() * valid.length)];
           var fromQ = enemy.q, fromR = enemy.r;
           if (this.moveToCell(enemy.id, target.q, target.r)) {
               return { type: 'move', fromQ: fromQ, fromR: fromR, toQ: target.q, toR: target.r, unitId: enemy.id };
           }
       }
       return null;
   };
   
   // ===== ПОЛУЧЕНИЕ СОСТОЯНИЯ =====
   TankGame.prototype.getStateForPlayer = function(playerId) {
       var player = this.players.find(function(p) { return p.id === playerId; });
       if (!player) return null;
       
       var lastPositions = {};
       var allUnits = this.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           var u = allUnits[i];
           var lp = this.getLastPosition(u.id);
           if (lp) lastPositions[u.id] = lp;
       }
       
       return {
           radius: this.radius,
           myTank: JSON.parse(JSON.stringify(player)),
           enemies: this.enemies.filter(function(e) { return e.active; }).map(function(e) { return JSON.parse(JSON.stringify(e)); }),
           cells: this.cells.slice(),
           lastMoveTime: this.lastMoveTime,
           moveCooldown: this.moveCooldown,
           lastShootTime: this.lastShootTime,
           shootCooldown: this.shootCooldown,
           gameOver: this.gameOver,
           winner: this.winner,
           lastPositions: lastPositions,
           shootConfig: this.shootLogic.getConfig()
       };
   };
   
   // ===== ПРОВЕРКА ПОБЕДИТЕЛЯ =====
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
   
   // ===== ЭКСПОРТ =====
   if (typeof window !== 'undefined') {
       window.TankGame = TankGame;
   }
   if (typeof module !== 'undefined' && module.exports) {
       module.exports = { TankGame: TankGame };
   }
})();
