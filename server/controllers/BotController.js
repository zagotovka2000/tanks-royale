// server/controllers/BotController.js - БОТ ДВИГАЕТСЯ АКТИВНО
const HexUtils = require('../../client/utils/HexUtils.js');

class BotController {
   constructor(gameService, io) {
       this.gameService = gameService;
       this.io = io;
       this.botInterval = null;
       this.isRunning = false;
       this.lastBotAction = 0;
       this.botDelay = 1500;
   }
   
   start() {
       if (this.isRunning) return;
       this.isRunning = true;
       this.lastBotAction = 0;
       
       // ✅ УМЕНЬШАЕМ ИНТЕРВАЛ ДО 800ms
       this.botInterval = setInterval(() => {
           this.tick();
       }, 800);
       
       console.log('🤖 Бот запущен (интервал 800ms)');
   }
   
   stop() {
       this.isRunning = false;
       if (this.botInterval) {
           clearInterval(this.botInterval);
           this.botInterval = null;
       }
       console.log('🤖 Бот остановлен');
   }
   
   tick() {
       const game = this.gameService.getGame();
       if (!game || game.gameOver) {
           if (game && game.gameOver) {
               this.stop();
           }
           return;
       }
       
       const enemy = game.enemies[0];
       if (!enemy || !enemy.active) return;
       
       const now = Date.now();
       if (now - this.lastBotAction < this.botDelay) return;
       
       // ✅ ПЫТАЕМСЯ СНАЧАЛА ДВИНУТЬСЯ
       let result = null;
       
       // ✅ В 70% СЛУЧАЕВ ПЫТАЕМСЯ ДВИНУТЬСЯ
       if (Math.random() < 0.7) {
           // Пробуем принудительное движение
           result = game.forceBotMove ? game.forceBotMove() : null;
           
           if (result && result.type === 'move') {
               this.lastBotAction = now;
               this.gameService.confirmMove(
                   enemy.id,
                   result.fromQ, result.fromR,
                   result.toQ, result.toR
               );
               this.io.emit('moveAccepted', {
                   unitId: enemy.id,
                   fromQ: result.fromQ,
                   fromR: result.fromR,
                   toQ: result.toQ,
                   toR: result.toR,
                   direction: HexUtils.getDirection(result.fromQ, result.fromR, result.toQ, result.toR)
               });
               this.broadcastState();
               return;
           }
       }
       
       // ✅ ЕСЛИ НЕ ДВИНУЛИСЬ - ПЫТАЕМСЯ СТРЕЛЯТЬ
       const player = game.getFirstPlayer();
       if (player && player.active) {
           // Проверяем, может ли стрелять
           if (game.canShoot(enemy)) {
               const shootResult = game.shootAtCell(enemy.id, player.q, player.r);
               if (shootResult && shootResult.success) {
                   this.lastBotAction = now;
                   this.io.emit('shootResult', shootResult);
                   this.broadcastState();
                   
                   if (game.checkWinner()) {
                       this.stop();
                       this.io.emit('gameEnded', {
                           winner: game.winner,
                           kills: game.getFirstPlayer()?.kills || 0
                       });
                   }
                   return;
               }
           }
       }
       
       // ✅ ЕСЛИ НЕ СТРЕЛЯЛИ - ПРОБУЕМ ЕЩЕ РАЗ ДВИНУТЬСЯ (если не двигались выше)
       if (!result && Math.random() < 0.5) {
           result = game.forceBotMove ? game.forceBotMove() : null;
           if (result && result.type === 'move') {
               this.lastBotAction = now;
               this.gameService.confirmMove(
                   enemy.id,
                   result.fromQ, result.fromR,
                   result.toQ, result.toR
               );
               this.io.emit('moveAccepted', {
                   unitId: enemy.id,
                   fromQ: result.fromQ,
                   fromR: result.fromR,
                   toQ: result.toQ,
                   toR: result.toR,
                   direction: HexUtils.getDirection(result.fromQ, result.fromR, result.toQ, result.toR)
               });
               this.broadcastState();
           }
       }
   }
   
   broadcastState() {
       const game = this.gameService.getGame();
       if (!game) return;
       
       const player = game.getFirstPlayer();
       if (!player) return;
       
       const state = this.gameService.getStateForPlayer(player.id);
       if (state) {
           this.io.emit('gameState', state);
       }
   }
}

module.exports = BotController;
