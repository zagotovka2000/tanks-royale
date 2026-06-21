// server/controllers/GameController.js - С ПРАВИЛЬНЫМ ИМПОРТОМ HexUtils

const HexUtils = require('../../shared/utils/HexUtils');
class ServerGameController {
   constructor(io, gameService) {
       this.io = io;
       this.gameService = gameService;
       
       // Передаем io в GameService для broadcast
       this.gameService.setIO(io);
   }
   
   // ============================================
   // ✅ ДВИЖЕНИЕ ИГРОКА
   // ============================================
   
   handleMoveRequest(socket, data) {
       const playerId = data.playerId || 'player1';
       const result = this.gameService.playerMove(playerId, data.q, data.r);
       
       if (result.success) {
           // Отправляем подтверждение клиенту
           socket.emit('moveAccepted', {
               unitId: result.unitId,
               fromQ: result.fromQ,
               fromR: result.fromR,
               toQ: result.toQ,
               toR: result.toR,
               direction: HexUtils.getDirection(result.fromQ, result.fromR, result.toQ, result.toR),
               isBot: false
           });
           
           // Обновляем состояние для всех
           this.gameService.broadcastState();
           
       } else {
           socket.emit('moveRejected', {
               message: result.message,
               reason: result.message?.toLowerCase().replace(/ /g, '_'),
               remaining: result.remaining
           });
       }
   }
   
   // ============================================
   // ✅ СТРЕЛЬБА ИГРОКА
   // ============================================
   
   handleShootRequest(socket, data) {
       const playerId = data.playerId || 'player1';
       const result = this.gameService.playerShoot(playerId, data.q, data.r);
       
       if (result && result.success) {
           // Отправляем результат всем
           this.io.emit('shootResult', result);
           
           // Проверяем победу
           const game = this.gameService.getGame();
           if (game && game.checkWinner()) {
               this.io.emit('gameEnded', {
                   winner: game.winner,
                   kills: game.getFirstPlayer()?.kills || 0
               });
               game.stopBots();
           }
           
           // Обновляем состояние
           this.gameService.broadcastState();
           
       } else if (result && !result.success) {
           socket.emit('shootRejected', {
               message: result.message,
               cooldown: result.cooldown
           });
       }
   }
   
   // ============================================
   // СБРОС
   // ============================================
   
   handleReset() {
       this.gameService.resetGame();
       this.io.emit('gameReset', { message: 'Новая игра началась!' });
   }
}

module.exports = ServerGameController;
