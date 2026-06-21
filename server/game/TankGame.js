// server/game/TankGame.js - С ПРАВИЛЬНЫМ ИМПОРТОМ HexUtils

const HexUtils = require('../../shared/utils/HexUtils.js');

class TankGame {
   constructor() {
       this.radius = 10;
       this.gameOver = false;
       this.winner = null;
       this.cells = [];
       this.players = [];
       this.bots = [];
       this.enemies = [];
       
       this.unitCooldowns = new Map();
       this.moveCooldown = 1000;
       this.shootCooldown = 2500;
       
       this._lastPositions = new Map();
       this._pendingMoves = new Map();
       
       // Таймер ботов
       this.botTimer = null;
       this.botInterval = 1200;
       this.isBotRunning = false;
       this._pendingBotResults = [];
       this._botCallbacks = [];
       
       this.generateMap();
       this.initializeUnits();
       this.startBots();
       
       console.log('🎮 TankGame создан на сервере');
   }
   
   // ============================================
   // БОТЫ НА СЕРВЕРЕ
   // ============================================
   
   startBots() {
       if (this.isBotRunning) return;
       this.isBotRunning = true;
       
       if (this.botTimer) {
           clearInterval(this.botTimer);
           this.botTimer = null;
       }
       
       console.log('🤖 Запуск ботов на сервере...');
       
       this.botTimer = setInterval(() => {
           if (this.gameOver) {
               this.stopBots();
               return;
           }
           this.botTick();
       }, this.botInterval);
   }
   
   stopBots() {
       this.isBotRunning = false;
       if (this.botTimer) {
           clearInterval(this.botTimer);
           this.botTimer = null;
       }
       console.log('🤖 Боты на сервере остановлены');
   }
   
   botTick() {
       if (this.gameOver) return;
       
       const activeBots = this.bots.filter(b => b.active);
       if (activeBots.length === 0) return;
       
       const results = [];
       
       for (const bot of activeBots) {
           const result = this.botAction(bot.id);
           if (result) {
               results.push(result);
               console.log(`🤖 Бот ${bot.name} выполнил действие:`, result.type || 'shoot');
           }
       }
       
       if (results.length > 0) {
           this._pendingBotResults = results;
           
           // Вызываем колбэки
           for (const callback of this._botCallbacks) {
               try {
                   callback(results);
               } catch (e) {
                   console.error('Ошибка в callback ботов:', e);
               }
           }
       }
   }
   
   onBotAction(callback) {
       if (typeof callback === 'function') {
           this._botCallbacks.push(callback);
       }
   }
   
   getBotResults() {
       const results = this._pendingBotResults || [];
       this._pendingBotResults = [];
       return results;
   }
   
   // ============================================
   // ЛОГИКА БОТА
   // ============================================
   
   botAction(botId) {
       const bot = this.getBotById(botId);
       if (!bot || !bot.active) return null;
       
       // Находим ближайшего врага
       const enemies = this.getAllActiveUnits().filter(u => {
           return u.team !== bot.team && u.id !== bot.id;
       });
       
       if (enemies.length === 0) return null;
       
       enemies.sort((a, b) => {
           const distA = HexUtils.distance(bot.q, bot.r, a.q, a.r);
           const distB = HexUtils.distance(bot.q, bot.r, b.q, b.r);
           return distA - distB;
       });
       
       const target = enemies[0];
       const dist = HexUtils.distance(bot.q, bot.r, target.q, target.r);
       
       // Приоритет 1: Стрельба
       if (dist <= bot.range && this.canShoot(bot) && Math.random() < 0.6) {
           const shootResult = this.shootAt(bot.id, target.q, target.r);
           if (shootResult && shootResult.success) {
               return {
                   type: 'shoot',
                   result: shootResult,
                   botId: bot.id
               };
           }
       }
       
       // Приоритет 2: Движение
       if (this.canMove(bot) && Math.random() < 0.7) {
           const moveResult = this.botMoveTowards(bot.id, target.q, target.r);
           if (moveResult) {
               return moveResult;
           }
       }
       
       return null;
   }
   
   botMoveTowards(botId, targetQ, targetR) {
       const bot = this.getBotById(botId);
       if (!bot || !bot.active) return null;
       
       const neighbors = this.getNeighbors(bot.q, bot.r);
       const allUnits = this.getAllActiveUnits();
       
       const valid = neighbors.filter(n => {
           return this.isValidCell(n.q, n.r) && 
                  !allUnits.some(u => u.id !== bot.id && u.q === n.q && u.r === n.r);
       });
       
       if (valid.length === 0) return null;
       
       // Выбираем клетку ближе к цели
       const best = valid.reduce((a, b) => {
           const distA = HexUtils.distance(a.q, a.r, targetQ, targetR);
           const distB = HexUtils.distance(b.q, b.r, targetQ, targetR);
           return distA < distB ? a : b;
       });
       
       const fromQ = bot.q, fromR = bot.r;
       
       if (this.moveUnit(bot.id, best.q, best.r)) {
           return { 
               type: 'move', 
               fromQ, fromR, 
               toQ: best.q, toR: best.r, 
               unitId: bot.id 
           };
       }
       
       return null;
   }
   
   // ============================================
   // КУЛДАУНЫ
   // ============================================
   
   getCooldowns(unitId) {
       if (!this.unitCooldowns.has(unitId)) {
           this.unitCooldowns.set(unitId, { lastMove: 0, lastShoot: 0 });
       }
       return this.unitCooldowns.get(unitId);
   }
   
   canMove(unit) {
       if (!unit || !unit.active) return false;
       const cd = this.getCooldowns(unit.id);
       return (Date.now() - cd.lastMove) >= this.moveCooldown;
   }
   
   canShoot(unit) {
       if (!unit || !unit.active) return false;
       const cd = this.getCooldowns(unit.id);
       return (Date.now() - cd.lastShoot) >= this.shootCooldown;
   }
   
   getRemainingMoveCooldown(unitId) {
       const cd = this.getCooldowns(unitId);
       return Math.max(0, this.moveCooldown - (Date.now() - cd.lastMove));
   }
   
   getRemainingShootCooldown(unitId) {
       const cd = this.getCooldowns(unitId);
       return Math.max(0, this.shootCooldown - (Date.now() - cd.lastShoot));
   }
   
   // ============================================
   // ГЕНЕРАЦИЯ КАРТЫ
   // ============================================
   
   generateMap() {
       this.cells = [];
       for (let q = -this.radius; q <= this.radius; q++) {
           for (let r = -this.radius; r <= this.radius; r++) {
               const s = -q - r;
               if (Math.abs(q) <= this.radius && Math.abs(r) <= this.radius && Math.abs(s) <= this.radius) {
                   this.cells.push({ q, r, s, terrain: 'plains' });
               }
           }
       }
   }
   
   // ============================================
   // ИНИЦИАЛИЗАЦИЯ ЮНИТОВ
   // ============================================
   
   initializeUnits() {
       // Игрок
       const player1 = {
           id: 'player1',
           name: 'Командир',
           team: 'player',
           q: 1, r: -8,
           hp: 120, maxHp: 120,
           damage: 35,
           color: '#ffd93d',
           type: 'medium',
           range: Infinity,
           active: true,
           direction: 'right',
           kills: 0,
           isPlayer: true,
           isBot: false
       };
       this.players.push(player1);
       
       // Боты
       const botConfigs = [
           { id: 'bot1', name: 'Враг-1', team: 'enemy', q: -1, r: 8, hp: 100, damage: 30, color: '#e94560', type: 'medium', range: 5 },
           { id: 'bot2', name: 'Враг-2', team: 'enemy', q: -2, r: 6, hp: 80, damage: 25, color: '#ff6b6b', type: 'light', range: 5 },
           { id: 'bot3', name: 'Нейтрал', team: 'neutral', q: 3, r: 5, hp: 150, damage: 20, color: '#88ccff', type: 'heavy', range: 4 }
       ];
       
       for (const cfg of botConfigs) {
           const bot = {
               id: cfg.id,
               name: cfg.name,
               team: cfg.team,
               q: cfg.q,
               r: cfg.r,
               hp: cfg.hp,
               maxHp: cfg.hp,
               damage: cfg.damage,
               color: cfg.color,
               type: cfg.type,
               range: cfg.range,
               active: true,
               direction: 'right',
               kills: 0,
               isPlayer: false,
               isBot: true,
               botId: cfg.id
           };
           this.bots.push(bot);
       }
       
       this.updateEnemiesList();
       
       // Инициализируем кулдауны
       const allUnits = this.getAllUnits();
       for (const unit of allUnits) {
           this.getCooldowns(unit.id);
           this.setLastPosition(unit.id, unit.q, unit.r);
       }
   }
   
   updateEnemiesList() {
       this.enemies = [];
       
       for (const bot of this.bots) {
           if (bot.team !== 'player') {
               this.enemies.push(bot);
           }
       }
       
       for (const player of this.players) {
           if (player.team !== 'player' && player.id !== 'player1') {
               this.enemies.push(player);
           }
       }
   }
   
   // ============================================
   // ПОЛУЧЕНИЕ ЮНИТОВ
   // ============================================
   
   getFirstPlayer() {
       return this.players.find(p => p.active) || null;
   }
   
   getPlayerById(id) {
       return this.players.find(p => p.id === id && p.active) || null;
   }
   
   getBotById(id) {
       return this.bots.find(b => b.id === id && b.active) || null;
   }
   
   getUnitById(id) {
       return this.getAllUnits().find(u => u.id === id && u.active) || null;
   }
   
   getAllUnits() {
       return [...this.players, ...this.bots];
   }
   
   getAllActiveUnits() {
       return this.getAllUnits().filter(u => u.active);
   }
   
   getUnitsByTeam(team) {
       return this.getAllUnits().filter(u => u.active && u.team === team);
   }
   
   // ============================================
   // РАБОТА С КАРТОЙ
   // ============================================
   
   isValidCell(q, r) {
       return HexUtils.isValidCell(q, r, this.radius);
   }
   
   getNeighbors(q, r) {
       const dirs = HexUtils.directions || [];
       const result = [];
       for (const d of dirs) {
           const nq = q + d.q, nr = r + d.r;
           if (this.isValidCell(nq, nr)) result.push({ q: nq, r: nr });
       }
       return result;
   }
   
   // ============================================
   // ПОЗИЦИИ
   // ============================================
   
   getLastPosition(unitId) {
       return this._lastPositions.get(unitId) || null;
   }
   
   setLastPosition(unitId, q, r) {
       this._lastPositions.set(unitId, { q, r });
   }
   
   // ============================================
   // ✅ УНИВЕРСАЛЬНОЕ ДВИЖЕНИЕ (ДЛЯ ВСЕХ ТАНКОВ)
   // ============================================
   
   moveUnit(unitId, targetQ, targetR) {
       const unit = this.getUnitById(unitId);
       if (!unit || !this.canMove(unit)) return false;
       
       if (!HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) {
           return false;
       }
       
       const occupied = this.getAllActiveUnits().some(u => {
           return u.id !== unitId && u.q === targetQ && u.r === targetR;
       });
       if (occupied) return false;
       
       // Сохраняем старую позицию
       this.setLastPosition(unitId, unit.q, unit.r);
       
       const direction = HexUtils.getDirection(unit.q, unit.r, targetQ, targetR);
       unit.direction = direction;
       unit.q = targetQ;
       unit.r = targetR;
       
       const cd = this.getCooldowns(unitId);
       cd.lastMove = Date.now();
       
       return true;
   }
   
   // ============================================
   // ✅ УНИВЕРСАЛЬНАЯ СТРЕЛЬБА (ДЛЯ ВСЕХ ТАНКОВ)
   // ============================================
   
   shootAt(attackerId, targetQ, targetR) {
       const attacker = this.getUnitById(attackerId);
       if (!attacker) {
           return { success: false, message: 'Танк не найден' };
       }
       
       if (!this.canShoot(attacker)) {
           const remaining = this.getRemainingShootCooldown(attackerId);
           return { 
               success: false, 
               message: 'Перезарядка: ' + Math.ceil(remaining/1000) + 'с', 
               cooldown: remaining 
           };
       }
       
       // Проверяем дальность
       const dist = HexUtils.distance(attacker.q, attacker.r, targetQ, targetR);
       if (dist > attacker.range) {
           return { 
               success: false, 
               message: 'Слишком далеко (макс. ' + attacker.range + ')' 
           };
       }
       
       const allUnits = this.getAllActiveUnits();
       
       // Находим цель
       let target = null;
       for (const unit of allUnits) {
           if (unit.id !== attackerId && unit.q === targetQ && unit.r === targetR) {
               target = unit;
               break;
           }
       }
       
       // Если цели нет - промах
       if (!target) {
           const cd = this.getCooldowns(attackerId);
           cd.lastShoot = Date.now();
           
           return {
               success: true,
               hit: false,
               message: '💨 Промах!',
               targetQ, targetR,
               fromQ: attacker.q,
               fromR: attacker.r,
               attackerId: attacker.id
           };
       }
       
       // Расчет урона
       let damage = attacker.damage || 30;
       let isCritical = false;
       
       // Критический урон для ботов
       if (!attacker.isPlayer && Math.random() < 0.15) {
           damage = Math.round(damage * 1.5);
           isCritical = true;
       }
       
       // Наносим урон
       target.hp -= damage;
       let killed = false;
       
       if (target.hp <= 0) {
           target.hp = 0;
           target.active = false;
           killed = true;
           attacker.kills = (attacker.kills || 0) + 1;
       }
       
       const cd = this.getCooldowns(attackerId);
       cd.lastShoot = Date.now();
       
       return {
           success: true,
           hit: true,
           killed,
           damage,
           isCritical,
           message: killed ? '💀 ' + target.name + ' уничтожен!' : '💥 Попадание! -' + damage + ' HP',
           targetQ: target.q,
           targetR: target.r,
           targetId: target.id,
           targetName: target.name,
           targetHp: target.hp,
           targetMaxHp: target.maxHp,
           fromQ: attacker.q,
           fromR: attacker.r,
           attackerId: attacker.id,
           isPlayer: attacker.isPlayer
       };
   }
   
   // ============================================
   // ПОЛУЧЕНИЕ СОСТОЯНИЯ
   // ============================================
   
   getStateForPlayer(playerId) {
       const player = this.getPlayerById(playerId);
       if (!player) return null;
       
       const allUnits = this.getAllActiveUnits();
       
       const lastPositions = {};
       for (const u of allUnits) {
           const lp = this.getLastPosition(u.id);
           if (lp) lastPositions[u.id] = lp;
       }
       
       const cooldowns = {};
       for (const u of allUnits) {
           const cd = this.getCooldowns(u.id);
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
           enemies: this.enemies.filter(e => e.active).map(e => JSON.parse(JSON.stringify(e))),
           bots: this.bots.filter(b => b.active).map(b => JSON.parse(JSON.stringify(b))),
           allUnits: allUnits.map(u => JSON.parse(JSON.stringify(u))),
           cells: this.cells.slice(),
           moveCooldown: this.moveCooldown,
           shootCooldown: this.shootCooldown,
           gameOver: this.gameOver,
           winner: this.winner,
           lastPositions,
           cooldowns
       };
   }
   
   // ============================================
   // ПРОВЕРКА ПОБЕДИТЕЛЯ
   // ============================================
   
   checkWinner() {
       const allUnits = this.getAllActiveUnits();
       
       if (allUnits.length === 0) {
           this.gameOver = true;
           this.winner = 'Ничья! Все уничтожены!';
           return true;
       }
       
       const playerAlive = allUnits.some(u => u.team === 'player' && u.active);
       const enemyAlive = allUnits.some(u => u.team === 'enemy' && u.active);
       
       if (!playerAlive && enemyAlive) {
           this.gameOver = true;
           this.winner = 'ПОРАЖЕНИЕ! Все ваши танки уничтожены!';
           return true;
       }
       
       if (!enemyAlive && playerAlive) {
           this.gameOver = true;
           this.winner = 'ПОБЕДА! Все враги уничтожены!';
           return true;
       }
       
       if (!playerAlive && !enemyAlive) {
           this.gameOver = true;
           this.winner = 'НИЧЬЯ! Все уничтожены!';
           return true;
       }
       
       return false;
   }
   
   // ============================================
   // ДОБАВЛЕНИЕ ИГРОКА
   // ============================================
   
   addPlayer(id, name, team, q, r, type) {
       if (this.getPlayerById(id)) return false;
       
       const stats = { hp: 100, damage: 30, color: '#4caf50', id: 'medium', range: 5 };
       
       const player = {
           id,
           name: name || 'Игрок',
           team: team || 'player',
           q: q || 0,
           r: r || 0,
           hp: stats.hp,
           maxHp: stats.hp,
           damage: stats.damage,
           color: stats.color,
           type: stats.id,
           range: stats.range,
           active: true,
           direction: 'right',
           kills: 0,
           isPlayer: true,
           isBot: false
       };
       
       this.players.push(player);
       this.updateEnemiesList();
       this.getCooldowns(player.id);
       this.setLastPosition(player.id, player.q, player.r);
       
       return player;
   }
   
   // ============================================
   // СБРОС ИГРЫ
   // ============================================
   
   resetGame() {
       this.gameOver = false;
       this.winner = null;
       this._lastPositions.clear();
       this.unitCooldowns.clear();
       this._pendingMoves.clear();
       this._pendingBotResults = [];
       
       const allUnits = this.getAllUnits();
       for (const u of allUnits) {
           u.hp = u.maxHp;
           u.active = true;
           u.kills = 0;
           this.getCooldowns(u.id);
       }
       
       if (this.players.length > 0) {
           const player = this.players[0];
           player.q = 1;
           player.r = -8;
           player.direction = 'right';
           this.setLastPosition(player.id, player.q, player.r);
       }
       
       const botPositions = [
           { q: -1, r: 8 },
           { q: -2, r: 6 },
           { q: 3, r: 5 }
       ];
       for (let i = 0; i < this.bots.length && i < botPositions.length; i++) {
           const bot = this.bots[i];
           bot.q = botPositions[i].q;
           bot.r = botPositions[i].r;
           bot.direction = 'right';
           this.setLastPosition(bot.id, bot.q, bot.r);
       }
       
       this.startBots();
   }
}

module.exports = TankGame;
