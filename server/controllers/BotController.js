// server/controllers/BotController.js - ПОДДЕРЖКА МНОЖЕСТВА БОТОВ

const HexUtils = require('../../shared/utils/HexUtils.js');

class BotController {
   constructor(gameService, io) {
       this.gameService = gameService;
       this.io = io;
       this.botInterval = null;
       this.isRunning = false;
       this.lastBotActions = new Map(); // Для каждого бота свой таймер
       this.botDelay = 1200; // Задержка между действиями бота
       this.botVariation = 500; // Вариация задержки
   }
   
   start() {
       if (this.isRunning) return;
       this.isRunning = true;
       this.lastBotActions.clear();
       
       this.botInterval = setInterval(() => {
           this.tick();
       }, 300); // Проверяем каждые 300 мс
       
       console.log('🤖 Боты запущены (интервал 300ms)');
   }
   
   stop() {
       this.isRunning = false;
       if (this.botInterval) {
           clearInterval(this.botInterval);
           this.botInterval = null;
       }
       console.log('🤖 Боты остановлены');
   }
   
   tick() {
       const game = this.gameService.getGame();
       if (!game || game.gameOver) {
           if (game && game.gameOver) {
               this.stop();
           }
           return;
       }
       
       const now = Date.now();
       
       // Получаем всех активных ботов
       const bots = game.bots || [];
       let anyAction = false;
       
       for (const bot of bots) {
           if (!bot.active) continue;
           
           // Проверяем, может ли бот действовать
           if (!game.canMove(bot) && !game.canShoot(bot)) continue;
           
           // Получаем время последнего действия бота
           const lastAction = this.lastBotActions.get(bot.id) || 0;
           const delay = this.botDelay + (Math.random() - 0.5) * this.botVariation;
           
           if (now - lastAction < delay) continue;
           
           // Выполняем действие
           const result = game.botAction(bot.id);
           
           if (result) {
               this.lastBotActions.set(bot.id, now);
               anyAction = true;
               
               // Обрабатываем результат
               if (result.type === 'move') {
                   // ✅ ИСПРАВЛЕННАЯ ОТПРАВКА ДВИЖЕНИЯ
                   this.handleBotMove(game, bot, result);
               } else if (result.success) {
                   // Выстрел
                   this.io.emit('shootResult', result);
                   this.broadcastState();
                   
                   // Проверяем победу
                   if (game.checkWinner()) {
                       this.stop();
                       this.io.emit('gameEnded', {
                           winner: game.winner,
                           kills: game.getFirstPlayer()?.kills || 0
                       });
                   }
               }
           }
       }
       
       if (anyAction) {
           this.broadcastState();
       }
   }
   
   handleBotMove(game, bot, moveResult) {
       // Применяем движение к игровому объекту
       const fromQ = moveResult.fromQ;
       const fromR = moveResult.fromR;
       const toQ = moveResult.toQ;
       const toR = moveResult.toR;
       
       // Убеждаемся, что координаты обновлены
       bot.q = toQ;
       bot.r = toR;
       const direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
       bot.direction = direction;
       
       // Сохраняем последнюю позицию для анимации
       game.setLastPosition(bot.id, fromQ, fromR);
       
       // Отправляем событие клиенту
       this.io.emit('moveAccepted', {
           unitId: bot.id,
           fromQ: fromQ,
           fromR: fromR,
           toQ: toQ,
           toR: toR,
           direction: direction,
           isBot: true
       });
       
       console.log(`🤖 Бот ${bot.name} двинулся на (${toQ}, ${toR})`);
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
   
   // Добавление нового бота
   addBot(botData) {
       const game = this.gameService.getGame();
       if (!game) return false;
       
       // Проверяем, нет ли бота с таким ID
       if (game.getBotById(botData.id)) {
           return false;
       }
       
       // Добавляем бота в игру
       const bot = {
           id: botData.id || 'bot_' + Date.now(),
           name: botData.name || 'Бот',
           team: botData.team || 'enemy',
           q: botData.q || 0,
           r: botData.r || 0,
           hp: botData.hp || 100,
           maxHp: botData.hp || 100,
           damage: botData.damage || 30,
           color: botData.color || '#e94560',
           type: botData.type || 'medium',
           range: botData.range || 5,
           active: true,
           direction: 'right',
           kills: 0,
           isPlayer: false,
           isBot: true,
           botId: botData.id || 'bot_' + Date.now()
       };
       
       game.bots.push(bot);
       game.updateEnemiesList();
       game.getCooldowns(bot.id);
       game.setLastPosition(bot.id, bot.q, bot.r);
       
       console.log(`🤖 Добавлен бот: ${bot.name} (${bot.id})`);
       return bot;
   }
   
   // Удаление бота
   removeBot(botId) {
       const game = this.gameService.getGame();
       if (!game) return false;
       
       const index = game.bots.findIndex(b => b.id === botId);
       if (index === -1) return false;
       
       game.bots.splice(index, 1);
       game.updateEnemiesList();
       this.lastBotActions.delete(botId);
       
       console.log(`🤖 Удален бот: ${botId}`);
       return true;
   }
}

module.exports = BotController;
