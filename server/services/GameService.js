// server/services/GameService.js - УПРАВЛЕНИЕ ИГРОЙ

const TankGame = require('../game/TankGame.js');
const HexUtils = require('../../shared/utils/HexUtils.js');
class GameService {
   constructor() {
       this.currentGame = null;
       this.confirmedMoves = new Map();
       this.gameHistory = [];
       this.maxHistorySize = 50;
       this.clients = new Map();
   }
   
   createGame() {
       this.currentGame = new TankGame();
       this.confirmedMoves.clear();
       
       // Подписываемся на действия ботов
       this.currentGame.onBotAction((results) => {
           this.handleBotResults(results);
       });
       
       console.log('🎮 Новая игра создана на сервере');
       return this.currentGame;
   }
   
   getGame() { return this.currentGame; }
   
   // ============================================
   // ✅ ОБРАБОТКА ДЕЙСТВИЙ БОТОВ
   // ============================================
   
   handleBotResults(results) {
       if (!results || results.length === 0) return;
       
       const io = this.io;
       if (!io) return;
       
       for (const result of results) {
           if (result.type === 'move') {
               // Подтверждаем движение бота
               this.confirmMove(result.unitId, result.fromQ, result.fromR, result.toQ, result.toR);
               
               // Отправляем клиентам
               io.emit('moveAccepted', {
                   unitId: result.unitId,
                   fromQ: result.fromQ,
                   fromR: result.fromR,
                   toQ: result.toQ,
                   toR: result.toR,
                   direction: HexUtils.getDirection(result.fromQ, result.fromR, result.toQ, result.toR),
                   isBot: true
               });
               
               console.log('🤖 Бот двинулся:', result.unitId);
               
           } else if (result.type === 'shoot' && result.result) {
               // Отправляем результат выстрела
               io.emit('shootResult', result.result);
               console.log('🔫 Бот выстрелил:', result.botId);
           }
       }
       
       // Проверяем победу
       if (this.currentGame && this.currentGame.checkWinner()) {
           io.emit('gameEnded', {
               winner: this.currentGame.winner,
               kills: this.currentGame.getFirstPlayer()?.kills || 0
           });
           this.currentGame.stopBots();
       }
       
       // Отправляем обновленное состояние
       this.broadcastState();
   }
   
   setIO(io) {
       this.io = io;
   }
   
   // ============================================
   // ✅ ПОДТВЕРЖДЕНИЕ ДВИЖЕНИЯ (ДЛЯ ВСЕХ ТАНКОВ)
   // ============================================
   
   confirmMove(unitId, fromQ, fromR, toQ, toR) {
       this.confirmedMoves.set(unitId, { 
           fromQ, fromR, toQ, toR, 
           timestamp: Date.now() 
       });
       
       const game = this.currentGame;
       if (!game) return;
       
       const unit = game.getUnitById(unitId);
       if (!unit) return;
       
       // Обновляем позицию в игровом объекте
       unit.q = toQ;
       unit.r = toR;
       const direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
       unit.direction = direction;
       game.setLastPosition(unitId, fromQ, fromR);
   }
   
   // ============================================
   // ✅ ДВИЖЕНИЕ ИГРОКА (ЗАПРОС ОТ КЛИЕНТА)
   // ============================================
   
   playerMove(playerId, targetQ, targetR) {
       const game = this.currentGame;
       if (!game || game.gameOver) {
           return { success: false, message: game?.gameOver ? 'Игра окончена' : 'Игра не создана' };
       }
       
       const player = game.getPlayerById(playerId);
       if (!player || !player.active) {
           return { success: false, message: 'Ваш танк уничтожен' };
       }
       
       // Проверяем валидность
       if (!HexUtils.areAdjacent(player.q, player.r, targetQ, targetR)) {
           return { success: false, message: 'Можно двигаться только на соседнюю клетку' };
       }
       
       const occupied = game.getAllActiveUnits().some(u => {
           return u.id !== playerId && u.q === targetQ && u.r === targetR;
       });
       if (occupied) {
           return { success: false, message: 'Клетка занята' };
       }
       
       if (!game.isValidCell(targetQ, targetR)) {
           return { success: false, message: 'Клетка не существует' };
       }
       
       if (!game.canMove(player)) {
           const remaining = game.getRemainingMoveCooldown(playerId);
           return { success: false, message: 'Кулдаун движения', remaining };
       }
       
       const fromQ = player.q;
       const fromR = player.r;
       
       // Выполняем движение
       const moved = game.moveUnit(playerId, targetQ, targetR);
       
       if (moved) {
           this.confirmMove(playerId, fromQ, fromR, targetQ, targetR);
           return { 
               success: true, 
               fromQ, fromR, 
               toQ: targetQ, toR: targetR, 
               unitId: playerId 
           };
       }
       
       return { success: false, message: 'Неизвестная ошибка' };
   }
   
   // ============================================
   // ✅ СТРЕЛЬБА ИГРОКА (ЗАПРОС ОТ КЛИЕНТА)
   // ============================================
   
   playerShoot(playerId, targetQ, targetR) {
       const game = this.currentGame;
       if (!game || game.gameOver) {
           return { success: false, message: game?.gameOver ? 'Игра окончена' : 'Игра не создана' };
       }
       
       const player = game.getPlayerById(playerId);
       if (!player || !player.active) {
           return { success: false, message: 'Ваш танк уничтожен' };
       }
       
       if (!game.canShoot(player)) {
           const remaining = game.getRemainingShootCooldown(playerId);
           return { success: false, message: 'Перезарядка', cooldown: remaining };
       }
       
       return game.shootAt(playerId, targetQ, targetR);
   }
   
   // ============================================
   // ПОЛУЧЕНИЕ СОСТОЯНИЯ
   // ============================================
   
   getStateForPlayer(playerId) {
       if (!this.currentGame) return null;
       const state = this.currentGame.getStateForPlayer(playerId);
       if (state) {
           state.confirmedMoves = this.getAllConfirmedMoves();
       }
       return state;
   }
   
   getAllConfirmedMoves() {
       const result = {};
       for (const [key, value] of this.confirmedMoves) {
           result[key] = value;
       }
       return result;
   }
   
   removeConfirmedMove(unitId) {
       this.confirmedMoves.delete(unitId);
   }
   
   // ============================================
   // BROADCAST
   // ============================================
   
   broadcastState() {
       const game = this.currentGame;
       if (!game) return;
       
       const player = game.getFirstPlayer();
       if (!player) return;
       
       const state = this.getStateForPlayer(player.id);
       if (state && this.io) {
           this.io.emit('gameState', state);
       }
   }
   
   // ============================================
   // СБРОС
   // ============================================
   
   resetGame() {
       if (this.currentGame) {
           this.gameHistory.push({
               state: this.currentGame.getStateForPlayer('player1'),
               timestamp: Date.now()
           });
           
           if (this.gameHistory.length > this.maxHistorySize) {
               this.gameHistory.shift();
           }
       }
       
       this.createGame();
       this.broadcastState();
   }
}

module.exports = GameService;
