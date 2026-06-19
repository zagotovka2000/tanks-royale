// server/controllers/BotController.js

class BotController {
   constructor(gameService, io) {
       this.gameService = gameService;
       this.io = io;
       this.botInterval = null;
       this.isRunning = false;
   }
   
   // Запустить бота
   start() {
       if (this.isRunning) return;
       this.isRunning = true;
       
       this.botInterval = setInterval(() => {
           this.tick();
       }, 1000);
       
       console.log('🤖 Бот запущен');
   }
   
   // Остановить бота
   stop() {
       this.isRunning = false;
       if (this.botInterval) {
           clearInterval(this.botInterval);
           this.botInterval = null;
       }
       console.log('🤖 Бот остановлен');
   }
   
   // Тик бота
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
       
       // Сохраняем позицию до действия
       const beforePos = { q: enemy.q, r: enemy.r };
       
       // Выполняем действие
       const result = game.botAction();
       
       if (result) {
           // Если бот двинулся - подтверждаем движение
           if (result.type === 'move') {
               this.gameService.confirmMove(
                   enemy.id,
                   result.fromQ, result.fromR,
                   result.toQ, result.toR
               );
           }
           
           // Отправляем результат всем клиентам
           this.io.emit('shootResult', result);
       }
       
       // Проверяем победителя
       if (game.checkWinner()) {
           this.stop();
           this.io.emit('gameEnded', {
               winner: game.winner,
               kills: game.getFirstPlayer()?.kills || 0
           });
       }
   }
}

module.exports = BotController;
