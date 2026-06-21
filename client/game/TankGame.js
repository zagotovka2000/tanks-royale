// client/game/TankGame.js - ПОЛНАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ МНОЖЕСТВА ИГРОКОВ

(function() {
   'use strict';
   
   var HexUtils = (typeof module !== 'undefined' && module.exports) ? 
       require('../utils/HexUtils.js') : window.HexUtils;
   var ShootLogic = (typeof module !== 'undefined' && module.exports) ? 
       require('./ShootLogic.js').ShootLogic : window.ShootLogic;
   
   function TankGame() {
       this.radius = 10;
       this.gameOver = false;
       this.winner = null;
       this.cells = [];
       this.players = [];      // Массив всех игроков (включая реальных)
       this.bots = [];         // Массив ботов
       this.enemies = [];      // ВСЕ враги (игроки других команд + боты)
       
       this.unitCooldowns = new Map();
       this.moveCooldown = 1000;
       this.shootCooldown = 2500;
       
       this.shootLogic = new ShootLogic();
       this._lastPositions = new Map();
       this._pendingMoves = new Map(); // Очередь подтвержденных движений
       
       this.generateMap();
       this.initializeUnits();
   }
   
   // ===== КУЛДАУНЫ =====
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
       // === ИГРОК 1 (реальный) ===
       var player1 = {
           id: 'player1', 
           name: 'Командир', 
           team: 'player',
           q: 1, r: -8, 
           hp: 120, maxHp: 120, 
           damage: 35,
           color: '#ffd93d', 
           type: 'medium', 
           range: this.shootLogic.config.playerMaxRange,
           active: true, 
           direction: 'right', 
           kills: 0, 
           isPlayer: true,
           isBot: false
       };
       this.players.push(player1);
       
       // === БОТ 1 (враг) ===
       var bot1 = {
           id: 'bot1', 
           name: 'Враг-1', 
           team: 'enemy',
           q: -1, r: 8, 
           hp: 100, maxHp: 100, 
           damage: 30,
           color: '#e94560', 
           type: 'medium', 
           range: this.shootLogic.config.enemyMaxRange,
           active: true, 
           direction: 'right', 
           kills: 0, 
           isPlayer: false,
           isBot: true,
           botId: 'bot1'
       };
       this.bots.push(bot1);
       
       // === БОТ 2 (союзник или враг) ===
       var bot2 = {
           id: 'bot2', 
           name: 'Враг-2', 
           team: 'enemy',
           q: -2, r: 6, 
           hp: 80, maxHp: 80, 
           damage: 25,
           color: '#ff6b6b', 
           type: 'light', 
           range: 5,
           active: true, 
           direction: 'right', 
           kills: 0, 
           isPlayer: false,
           isBot: true,
           botId: 'bot2'
       };
       this.bots.push(bot2);
       
       // === БОТ 3 (нейтральный / третий игрок) ===
       var bot3 = {
           id: 'bot3', 
           name: 'Нейтрал', 
           team: 'neutral',
           q: 3, r: 5, 
           hp: 150, maxHp: 150, 
           damage: 20,
           color: '#88ccff', 
           type: 'heavy', 
           range: 4,
           active: true, 
           direction: 'right', 
           kills: 0, 
           isPlayer: false,
           isBot: true,
           botId: 'bot3'
       };
       this.bots.push(bot3);
       
       // Обновляем enemies (все, кто не игрок)
       this.updateEnemiesList();
       
       // Инициализируем кулдауны для всех
       var allUnits = this.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           this.getCooldowns(allUnits[i].id);
           this.setLastPosition(allUnits[i].id, allUnits[i].q, allUnits[i].r);
       }
   };
   
   // ===== ОБНОВЛЕНИЕ СПИСКА ВРАГОВ =====
   TankGame.prototype.updateEnemiesList = function() {
       this.enemies = [];
       
       // Добавляем всех ботов (они всегда враги для игрока)
       for (var i = 0; i < this.bots.length; i++) {
           var bot = this.bots[i];
           if (bot.team !== 'player') {
               this.enemies.push(bot);
           }
       }
       
       // Добавляем других игроков (если они есть)
       for (var i = 0; i < this.players.length; i++) {
           var player = this.players[i];
           if (player.team !== 'player' && player.id !== 'player1') {
               this.enemies.push(player);
           }
       }
   };
   
   // ===== ПОЛУЧЕНИЕ ЮНИТОВ =====
   TankGame.prototype.getFirstPlayer = function() {
       return this.players.find(function(p) { return p.active; }) || null;
   };
   
   TankGame.prototype.getPlayerById = function(id) {
       return this.players.find(function(p) { return p.id === id && p.active; }) || null;
   };
   
   TankGame.prototype.getBotById = function(id) {
       return this.bots.find(function(b) { return b.id === id && b.active; }) || null;
   };
   
   TankGame.prototype.getUnitById = function(id) {
       return this.getAllUnits().find(function(u) { return u.id === id && u.active; }) || null;
   };
   
   TankGame.prototype.getAllUnits = function() {
       return this.players.concat(this.bots);
   };
   
   TankGame.prototype.getAllActiveUnits = function() {
       return this.getAllUnits().filter(function(u) { return u.active; });
   };
   
   TankGame.prototype.getUnitsByTeam = function(team) {
       return this.getAllUnits().filter(function(u) { return u.active && u.team === team; });
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
   
   // ===== УНИВЕРСАЛЬНОЕ ДВИЖЕНИЕ =====
   TankGame.prototype.moveUnit = function(unitId, targetQ, targetR) {
       var unit = this.getUnitById(unitId);
       if (!unit || !this.canMove(unit)) return false;
       
       if (!HexUtils || !HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) {
           return false;
       }
       
       // Проверка занятости
       var occupied = this.getAllActiveUnits().some(function(u) {
           return u.id !== unitId && u.q === targetQ && u.r === targetR;
       });
       if (occupied) return false;
       
       // ✅ СОХРАНЯЕМ СТАРУЮ ПОЗИЦИЮ ДО ИЗМЕНЕНИЯ
       this.setLastPosition(unitId, unit.q, unit.r);
       
       var direction = HexUtils.getDirection(unit.q, unit.r, targetQ, targetR);
       unit.direction = direction;
       unit.q = targetQ;
       unit.r = targetR;
       
       var cd = this.getCooldowns(unitId);
       cd.lastMove = Date.now();
       
       return true;
   };
   
   // ===== АЛИАСЫ ДЛЯ СОВМЕСТИМОСТИ =====
   TankGame.prototype.moveToCell = function(unitId, targetQ, targetR) {
       return this.moveUnit(unitId, targetQ, targetR);
   };
   
   // ===== УНИВЕРСАЛЬНАЯ СТРЕЛЬБА =====
   TankGame.prototype.shootAt = function(attackerId, targetQ, targetR) {
       var attacker = this.getUnitById(attackerId);
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
       
       var allUnits = this.getAllActiveUnits();
       var result = this.shootLogic.executeShoot(attacker, targetQ, targetR, allUnits);
       
       if (result.success) {
           var cd = this.getCooldowns(attackerId);
           cd.lastShoot = Date.now();
       }
       
       return result;
   };
   
   TankGame.prototype.shootAtCell = function(attackerId, targetQ, targetR) {
       return this.shootAt(attackerId, targetQ, targetR);
   };
   
   // ===== ЛОГИКА БОТА (УНИВЕРСАЛЬНАЯ) =====
   TankGame.prototype.botAction = function(botId) {
       var bot = this.getBotById(botId);
       if (!bot || !bot.active) return null;
       
       // Находим ближайшего врага
       var enemies = this.getAllActiveUnits().filter(function(u) {
           return u.team !== bot.team && u.id !== bot.id;
       });
       
       if (enemies.length === 0) return null;
       
       // Сортируем по расстоянию
       enemies.sort(function(a, b) {
           var distA = HexUtils.distance(bot.q, bot.r, a.q, a.r);
           var distB = HexUtils.distance(bot.q, bot.r, b.q, b.r);
           return distA - distB;
       });
       
       var target = enemies[0];
       var dist = HexUtils.distance(bot.q, bot.r, target.q, target.r);
       
       // --- Приоритет 1: Стрельба (если в радиусе) ---
       if (dist <= bot.range && this.canShoot(bot) && Math.random() < 0.6) {
           return this.shootAt(bot.id, target.q, target.r);
       }
       
       // --- Приоритет 2: Движение к врагу ---
       if (this.canMove(bot) && Math.random() < 0.7) {
           return this.botMoveTowards(bot.id, target.q, target.r);
       }
       
       return null;
   };
   
   // ===== ДВИЖЕНИЕ БОТА К ЦЕЛИ =====
   TankGame.prototype.botMoveTowards = function(botId, targetQ, targetR) {
       var bot = this.getBotById(botId);
       if (!bot || !bot.active) return null;
       
       var neighbors = this.getNeighbors(bot.q, bot.r);
       var allUnits = this.getAllActiveUnits();
       
       // Фильтруем доступные клетки
       var valid = neighbors.filter(function(n) {
           return this.isValidCell(n.q, n.r) && 
                  !allUnits.some(function(u) { 
                      return u.id !== bot.id && u.q === n.q && u.r === n.r; 
                  });
       }.bind(this));
       
       if (valid.length === 0) return null;
       
       // Выбираем клетку, которая ближе к цели
       var best = valid.reduce(function(a, b) {
           var distA = HexUtils.distance(a.q, a.r, targetQ, targetR);
           var distB = HexUtils.distance(b.q, b.r, targetQ, targetR);
           return distA < distB ? a : b;
       });
       
       var fromQ = bot.q, fromR = bot.r;
       
       if (this.moveUnit(bot.id, best.q, best.r)) {
           return { 
               type: 'move', 
               fromQ: fromQ, 
               fromR: fromR, 
               toQ: best.q, 
               toR: best.r, 
               unitId: bot.id 
           };
       }
       
       return null;
   };
   
   // ===== ПРИНУДИТЕЛЬНОЕ ДВИЖЕНИЕ (для сервера) =====
   TankGame.prototype.forceBotMove = function(botId) {
       var bot = this.getBotById(botId);
       if (!bot || !bot.active) return null;
       
       var enemies = this.getAllActiveUnits().filter(function(u) {
           return u.team !== bot.team && u.id !== bot.id;
       });
       
       if (enemies.length === 0) return null;
       
       // Ближайший враг
       var target = enemies.reduce(function(a, b) {
           var distA = HexUtils.distance(bot.q, bot.r, a.q, a.r);
           var distB = HexUtils.distance(bot.q, bot.r, b.q, b.r);
           return distA < distB ? a : b;
       });
       
       return this.botMoveTowards(bot.id, target.q, target.r);
   };
   
   // ===== ДЕЙСТВИЯ ВСЕХ БОТОВ =====
   TankGame.prototype.botsAction = function() {
       var results = [];
       for (var i = 0; i < this.bots.length; i++) {
           var bot = this.bots[i];
           if (bot.active) {
               var result = this.botAction(bot.id);
               if (result) results.push(result);
           }
       }
       return results;
   };
   
   // ===== ПОЛУЧЕНИЕ СОСТОЯНИЯ =====
   TankGame.prototype.getStateForPlayer = function(playerId) {
       var player = this.getPlayerById(playerId);
       if (!player) return null;
       
       // Все активные юниты
       var allUnits = this.getAllActiveUnits();
       
       // Последние позиции
       var lastPositions = {};
       for (var i = 0; i < allUnits.length; i++) {
           var u = allUnits[i];
           var lp = this.getLastPosition(u.id);
           if (lp) lastPositions[u.id] = lp;
       }
       
       // Кулдауны
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
           bots: this.bots.filter(function(b) { return b.active; }).map(function(b) { return JSON.parse(JSON.stringify(b)); }),
           allUnits: allUnits.map(function(u) { return JSON.parse(JSON.stringify(u)); }),
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
       var teams = {};
       var allUnits = this.getAllActiveUnits();
       
       if (allUnits.length === 0) {
           this.gameOver = true;
           this.winner = 'Ничья! Все уничтожены!';
           return true;
       }
       
       // Проверяем, остались ли юниты в команде player
       var playerAlive = allUnits.some(function(u) { 
           return u.team === 'player' && u.active; 
       });
       
       var enemyAlive = allUnits.some(function(u) { 
           return u.team === 'enemy' && u.active; 
       });
       
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
       
       // Ничья
       if (!playerAlive && !enemyAlive) {
           this.gameOver = true;
           this.winner = 'НИЧЬЯ! Все уничтожены!';
           return true;
       }
       
       return false;
   };
   
   // ===== ДОБАВЛЕНИЕ НОВОГО ИГРОКА =====
   TankGame.prototype.addPlayer = function(id, name, team, q, r, type) {
       // Проверяем, нет ли уже такого игрока
       if (this.getPlayerById(id)) {
           return false;
       }
       
       // Генерируем стартовую позицию если не указана
       if (q === undefined || r === undefined) {
           var pos = this.findSpawnPosition(team);
           if (!pos) return false;
           q = pos.q;
           r = pos.r;
       }
       
       var stats = UnitTypes.getStats(type || 'medium');
       var player = {
           id: id,
           name: name || 'Игрок',
           team: team || 'player',
           q: q,
           r: r,
           hp: stats.hp || 100,
           maxHp: stats.hp || 100,
           damage: stats.damage || 30,
           color: stats.color || '#4caf50',
           type: stats.id || 'medium',
           range: stats.range || 5,
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
   };
   
   // ===== ПОИСК МЕСТА ДЛЯ СПАВНА =====
   TankGame.prototype.findSpawnPosition = function(team) {
       var allUnits = this.getAllActiveUnits();
       var attempts = 0;
       
       while (attempts < 100) {
           var q = Math.floor(Math.random() * 20) - 10;
           var r = Math.floor(Math.random() * 20) - 10;
           
           // Проверяем валидность
           if (!this.isValidCell(q, r)) continue;
           
           // Проверяем, что клетка свободна
           var occupied = allUnits.some(function(u) { 
               return u.q === q && u.r === r; 
           });
           if (occupied) continue;
           
           // Для разных команд - разные зоны
           if (team === 'player') {
               // Северо-восток
               if (q < -3 || r > 3) continue;
           } else if (team === 'enemy') {
               // Юго-запад
               if (q > 3 || r < -3) continue;
           }
           
           return { q: q, r: r };
       }
       
       return null;
   };
   
   // ===== УДАЛЕНИЕ ИГРОКА =====
   TankGame.prototype.removePlayer = function(id) {
       var index = this.players.findIndex(function(p) { return p.id === id; });
       if (index !== -1) {
           this.players.splice(index, 1);
           this.updateEnemiesList();
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
       this._pendingMoves.clear();
       
       // Сброс всех юнитов
       var allUnits = this.getAllUnits();
       for (var i = 0; i < allUnits.length; i++) {
           var u = allUnits[i];
           u.hp = u.maxHp;
           u.active = true;
           u.kills = 0;
           this.getCooldowns(u.id);
       }
       
       // Сброс позиций
       if (this.players.length > 0) {
           var player = this.players[0];
           player.q = 1;
           player.r = -8;
           player.direction = 'right';
           this.setLastPosition(player.id, player.q, player.r);
       }
       
       if (this.bots.length > 0) {
           var botPositions = [
               { q: -1, r: 8 },
               { q: -2, r: 6 },
               { q: 3, r: 5 }
           ];
           for (var i = 0; i < this.bots.length && i < botPositions.length; i++) {
               var bot = this.bots[i];
               bot.q = botPositions[i].q;
               bot.r = botPositions[i].r;
               bot.direction = 'right';
               this.setLastPosition(bot.id, bot.q, bot.r);
           }
       }
   };
   
   // ===== ЭКСПОРТ =====
   if (typeof window !== 'undefined') {
       window.TankGame = TankGame;
       console.log('✅ TankGame зарегистрирован в window');
   }
   if (typeof module !== 'undefined' && module.exports) {
       module.exports = { TankGame: TankGame };
   }
})();
