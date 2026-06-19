// client/game/TankGame.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С ИНДИВИДУАЛЬНЫМИ КУЛДАУНАМИ

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
       this.cells = [];
       this.players = [];
       this.enemies = [];
       this.effectManager = new EffectManager();
       
       // ⏱️ ИНДИВИДУАЛЬНЫЕ КУЛДАУНЫ ДЛЯ КАЖДОГО ЮНИТА
       this.unitCooldowns = new Map(); // key: unitId, value: { lastMove: 0, lastShoot: 0 }
       
       // Базовые настройки кулдаунов
       this.moveCooldown = 1000;
       this.shootCooldown = 2500;
       
       // Инициализируем логику стрельбы
       this.shootLogic = new ShootLogic();
       
       this._lastPositions = new Map();
       
       this.generateMap();
       this.initializeUnits();
   }
   
   // ===== МЕТОДЫ КУЛДАУНА (индивидуальные) =====
   TankGame.prototype.getCooldowns = function(unitId) {
       if (!this.unitCooldowns.has(unitId)) {
           this.unitCooldowns.set(unitId, { lastMove: 0, lastShoot: 0 });
       }
       return this.unitCooldowns.get(unitId);
   };
   
   TankGame.prototype.canMove = function(unit) {
       if (!unit || !unit.active) return false;
       var cd = this.getCooldowns(unit.id);
       return (Date.now() - cd.lastMove) >= this.moveCooldown;
   };
   
   TankGame.prototype.canShoot = function(unit) {
       if (!unit || !unit.active) return false;
       var cd = this.getCooldowns(unit.id);
       return (Date.now() - cd.lastShoot) >= this.shootCooldown;
   };
   
   TankGame.prototype.getRemainingMoveCooldown = function(unitId) {
       var cd = this.getCooldowns(unitId);
       return Math.max(0, this.moveCooldown - (Date.now() - cd.lastMove));
   };
   
   TankGame.prototype.getRemainingShootCooldown = function(unitId) {
       var cd = this.getCooldowns(unitId);
       return Math.max(0, this.shootCooldown - (Date.now() - cd.lastShoot));
   };
   
   TankGame.prototype.getRemainingCooldown = function(unitId) {
       return Math.max(
           this.getRemainingMoveCooldown(unitId),
           this.getRemainingShootCooldown(unitId)
       );
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
       
       // Инициализируем кулдауны для всех юнитов
       var allUnits = this.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           this.getCooldowns(allUnits[i].id);
       }
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
   
   // ===== ДВИЖЕНИЕ (с индивидуальным кулдауном) =====
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
       
       // ✅ ОБНОВЛЯЕМ ИНДИВИДУАЛЬНЫЙ КУЛДАУН
       var cd = this.getCooldowns(unitId);
       cd.lastMove = Date.now();
       
       return true;
   };
   
   // ===== СТРЕЛЬБА (с индивидуальным кулдауном) =====
   TankGame.prototype.shootAtCell = function(attackerId, targetQ, targetR) {
       var attacker = this.getAllUnits().find(function(u) { return u.id === attackerId && u.active; });
       if (!attacker) {
           return { success: false, message: 'Танк не найден' };
       }
       
       if (!this.canShoot(attacker)) {
           var remaining = this.getRemainingShootCooldown(attackerId);
           return { 
               success: false, 
               message: 'Перезарядка: ' + Math.ceil(remaining/1000) + 'с', 
               cooldown: remaining 
           };
       }
       
       // Используем ShootLogic для выполнения выстрела
       var allUnits = this.getAllUnits();
       var result = this.shootLogic.executeShoot(attacker, targetQ, targetR, allUnits);
       
       if (result.success) {
           // ✅ ОБНОВЛЯЕМ ИНДИВИДУАЛЬНЫЙ КУЛДАУН
           var cd = this.getCooldowns(attackerId);
           cd.lastShoot = Date.now();
           
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
       
       // Стреляем с вероятностью 40%
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
       
       // Собираем кулдауны для всех юнитов
       var cooldowns = {};
       for (var i = 0; i < allUnits.length; i++) {
           var u = allUnits[i];
           var cd = this.getCooldowns(u.id);
           cooldowns[u.id] = {
               lastMove: cd.lastMove,
               lastShoot: cd.lastShoot,
               moveRemaining: this.getRemainingMoveCooldown(u.id),
               shootRemaining: this.getRemainingShootCooldown(u.id)
           };
       }
       
       return {
           radius: this.radius,
           myTank: JSON.parse(JSON.stringify(player)),
           enemies: this.enemies.filter(function(e) { return e.active; }).map(function(e) { return JSON.parse(JSON.stringify(e)); }),
           cells: this.cells.slice(),
           moveCooldown: this.moveCooldown,
           shootCooldown: this.shootCooldown,
           gameOver: this.gameOver,
           winner: this.winner,
           lastPositions: lastPositions,
           cooldowns: cooldowns,
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
   
   // ===== СБРОС ИГРЫ =====
   TankGame.prototype.resetGame = function() {
       this.gameOver = false;
       this.winner = null;
       this._lastPositions.clear();
       this.unitCooldowns.clear();
       
       // Восстанавливаем игрока
       if (this.players.length > 0) {
           var player = this.players[0];
           player.hp = player.maxHp;
           player.active = true;
           player.q = 1;
           player.r = -8;
           player.direction = 'right';
           player.kills = 0;
       }
       
       // Восстанавливаем врага
       if (this.enemies.length > 0) {
           var enemy = this.enemies[0];
           enemy.hp = enemy.maxHp;
           enemy.active = true;
           enemy.q = -1;
           enemy.r = 8;
           enemy.direction = 'right';
           enemy.kills = 0;
       }
       
       // Инициализируем кулдауны
       var allUnits = this.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           this.getCooldowns(allUnits[i].id);
       }
   };
   
   // ===== ЭКСПОРТ =====
   if (typeof window !== 'undefined') {
       window.TankGame = TankGame;
   }
   if (typeof module !== 'undefined' && module.exports) {
       module.exports = { TankGame: TankGame };
   }
})();
