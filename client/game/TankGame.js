// client/game/TankGame.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
(function() {
   'use strict';
   
   // Получаем зависимости
   const HexUtils = (typeof module !== 'undefined' && module.exports) ? 
       require('../utils/HexUtils.js') : window.HexUtils;
   const EffectManager = (typeof module !== 'undefined' && module.exports) ? 
       require('./EffectManager.js').EffectManager : window.EffectManager;
   
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
       this.generateMap();
       this.initializeUnits();
   }
   
   // ===== ВСЕ МЕТОДЫ =====
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
   
   TankGame.prototype.generateMap = function() {
       this.cells = [];
       for (let q = -this.radius; q <= this.radius; q++) {
           for (let r = -this.radius; r <= this.radius; r++) {
               const s = -q - r;
               if (Math.abs(q) <= this.radius && Math.abs(r) <= this.radius && Math.abs(s) <= this.radius) {
                   this.cells.push({ q, r, s, terrain: 'plains' });
               }
           }
       }
   };
   
   TankGame.prototype.initializeUnits = function() {
       const player = {
           id: 'player1', name: 'Командир', team: 'player',
           q: 1, r: -8, hp: 120, maxHp: 120, damage: 35,
           color: '#ffd93d', type: 'medium', range: 5,
           active: true, direction: 'right', kills: 0, isPlayer: true
       };
       this.players.push(player);
       
       const enemy = {
           id: 'enemy1', name: 'Враг', team: 'enemy',
           q: -1, r: 8, hp: 100, maxHp: 100, damage: 30,
           color: '#e94560', type: 'medium', range: 5,
           active: true, direction: 'right', kills: 0, isPlayer: false
       };
       this.enemies.push(enemy);
   };
   
   TankGame.prototype.getFirstPlayer = function() {
       return this.players[0] || null;
   };
   
   TankGame.prototype.getAllUnits = function() {
       return [...this.players, ...this.enemies];
   };
   
   TankGame.prototype.isValidCell = function(q, r) {
       if (!HexUtils) return false;
       return HexUtils.isValidCell(q, r, this.radius);
   };
   
   TankGame.prototype.getNeighbors = function(q, r) {
       if (!HexUtils) return [];
       const dirs = HexUtils.directions || [];
       const result = [];
       for (const d of dirs) {
           const nq = q + d.q, nr = r + d.r;
           if (this.isValidCell(nq, nr)) result.push({ q: nq, r: nr });
       }
       return result;
   };
   
   TankGame.prototype.getLastPosition = function(unitId) {
       return this._lastPositions.get(unitId) || null;
   };
   
   TankGame.prototype.setLastPosition = function(unitId, q, r) {
       this._lastPositions.set(unitId, { q, r });
   };
   
   TankGame.prototype.moveToCell = function(unitId, targetQ, targetR) {
       const unit = this.getAllUnits().find(u => u.id === unitId && u.active);
       if (!unit || !this.canMove(unit)) return false;
       if (!HexUtils || !HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) return false;
       
       const occupied = this.getAllUnits().some(u => u.active && u !== unit && u.q === targetQ && u.r === targetR);
       if (occupied) return false;
       
       this.setLastPosition(unitId, unit.q, unit.r);
       const direction = HexUtils.getDirection(unit.q, unit.r, targetQ, targetR);
       unit.direction = direction;
       unit.q = targetQ;
       unit.r = targetR;
       this.lastMoveTime = Date.now();
       return true;
   };
   
   TankGame.prototype.shootAtCell = function(attackerId, targetQ, targetR) {
       const attacker = this.getAllUnits().find(u => u.id === attackerId && u.active);
       if (!attacker) return { success: false, message: 'Танк не найден' };
       if (!this.canShoot(attacker)) {
           const remaining = this.getRemainingShootCooldown();
           return { success: false, message: `Перезарядка: ${Math.ceil(remaining/1000)}с`, cooldown: remaining };
       }
       if (!HexUtils) return { success: false, message: 'Ошибка вычислений' };
       
       const distance = HexUtils.distance(attacker.q, attacker.r, targetQ, targetR);
       if (distance > attacker.range) return { success: false, message: 'Слишком далеко' };
       
       this.lastShootTime = Date.now();
       const target = this.getAllUnits().find(u => u.active && u.team !== attacker.team && u.q === targetQ && u.r === targetR);
       
       if (!target) {
           return { success: true, hit: false, message: 'Промах!', targetQ, targetR, fromQ: attacker.q, fromR: attacker.r, attackerId: attacker.id };
       }
       
       target.hp -= attacker.damage;
       let killed = false;
       if (target.hp <= 0) {
           target.active = false;
           killed = true;
           attacker.kills++;
           if (this.effectManager && this.effectManager.addSmoke) {
               this.effectManager.addSmoke(target.q, target.r, target.name);
           }
       }
       
       return {
           success: true, hit: true, killed,
           message: killed ? `💀 ${target.name} уничтожен!` : `💥 Попадание в ${target.name}! -${attacker.damage} HP`,
           targetQ: target.q, targetR: target.r, fromQ: attacker.q, fromR: attacker.r, attackerId: attacker.id
       };
   };
   
   TankGame.prototype.botAction = function() {
       const player = this.getFirstPlayer();
       if (!player || !player.active) return null;
       const enemy = this.enemies[0];
       if (!enemy || !enemy.active) return null;
       if (!HexUtils) return null;
       
       const distance = HexUtils.distance(enemy.q, enemy.r, player.q, player.r);
       if (distance <= enemy.range && Math.random() < 0.4 && this.canShoot(enemy)) {
           return this.shootAtCell(enemy.id, player.q, player.r);
       }
       
       if (!this.canMove(enemy) || Math.random() > 0.6) return null;
       
       const neighbors = this.getNeighbors(enemy.q, enemy.r);
       const valid = neighbors.filter(n => {
           return !this.getAllUnits().some(u => u.active && u.q === n.q && u.r === n.r);
       });
       
       if (valid.length > 0) {
           const target = valid[Math.floor(Math.random() * valid.length)];
           const fromQ = enemy.q, fromR = enemy.r;
           if (this.moveToCell(enemy.id, target.q, target.r)) {
               return { type: 'move', fromQ, fromR, toQ: target.q, toR: target.r, unitId: enemy.id };
           }
       }
       return null;
   };
   
   TankGame.prototype.getStateForPlayer = function(playerId) {
       const player = this.players.find(p => p.id === playerId);
       if (!player) return null;
       
       const lastPositions = {};
       for (const u of this.getAllUnits()) {
           const lp = this.getLastPosition(u.id);
           if (lp) lastPositions[u.id] = lp;
       }
       
       return {
           radius: this.radius,
           myTank: { ...player },
           enemies: this.enemies.filter(e => e.active).map(e => ({ ...e })),
           cells: this.cells.slice(),
           lastMoveTime: this.lastMoveTime,
           moveCooldown: this.moveCooldown,
           lastShootTime: this.lastShootTime,
           shootCooldown: this.shootCooldown,
           gameOver: this.gameOver,
           winner: this.winner,
           lastPositions
       };
   };
   
   TankGame.prototype.checkWinner = function() {
       const playerAlive = this.players.some(p => p.active);
       const enemyAlive = this.enemies.some(e => e.active);
       
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
       module.exports = { TankGame };
   }
})();
