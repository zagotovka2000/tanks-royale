// server/controllers/GameController.js

const GameService = require('../services/GameService.js');
const BotController = require('./BotController.js');

class ServerGameController {
    constructor(io) {
        this.io = io;
        this.gameService = new GameService();
        this.botController = new BotController(this.gameService, io);
        
        // Создаем начальную игру
        this.gameService.createGame();
        this.botController.start();
    }
    
    // Обработка запроса движения
    handleMoveRequest(socket, data) {
        const game = this.gameService.getGame();
        if (!game) {
            socket.emit('moveRejected', { message: 'Игра не создана' });
            return;
        }
        
        if (game.gameOver) {
            socket.emit('moveRejected', { message: 'Игра окончена' });
            return;
        }
        
        const player = game.getFirstPlayer();
        if (!player || !player.active) {
            socket.emit('moveRejected', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        // Валидация
        const validator = this.gameService.validator;
        const errors = validator.validateMove(player, data.q, data.r);
        
        if (errors.length > 0) {
            socket.emit('moveRejected', {
                message: errors[0],
                reason: errors[0].toLowerCase().replace(/ /g, '_'),
                errors: errors
            });
            return;
        }
        
        // Выполняем движение
        const fromQ = player.q;
        const fromR = player.r;
        const moved = game.moveToCell(player.id, data.q, data.r);
        
        if (moved) {
            this.gameService.confirmMove(player.id, fromQ, fromR, data.q, data.r);
            
            socket.emit('moveAccepted', {
                unitId: player.id,
                fromQ: fromQ,
                fromR: fromR,
                toQ: data.q,
                toR: data.r,
                direction: HexUtils.getDirection(fromQ, fromR, data.q, data.r)
            });
            
            this.broadcastState();
        } else {
            socket.emit('moveRejected', {
                message: 'Неизвестная ошибка',
                reason: 'unknown'
            });
        }
    }
    
    // Обработка запроса выстрела
    handleShootRequest(socket, data) {
        const game = this.gameService.getGame();
        if (!game || game.gameOver) {
            socket.emit('shootRejected', { message: game?.gameOver ? 'Игра окончена' : 'Игра не создана' });
            return;
        }
        
        const player = game.getFirstPlayer();
        if (!player || !player.active) {
            socket.emit('shootRejected', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        // Валидация
        const validator = this.gameService.validator;
        const errors = validator.validateShoot(player, data.q, data.r);
        
        if (errors.length > 0) {
            socket.emit('shootRejected', {
                message: errors[0],
                reason: errors[0].toLowerCase().replace(/ /g, '_')
            });
            return;
        }
        
        // Выполняем выстрел
        const result = game.shootAtCell(player.id, data.q, data.r);
        
        // Отправляем результат всем
        this.io.emit('shootResult', result);
        this.broadcastState();
        
        // Проверяем победителя
        if (game.checkWinner()) {
            this.botController.stop();
            this.io.emit('gameEnded', {
                winner: game.winner,
                kills: player.kills || 0
            });
        }
    }
    
    // Обработка завершения анимации
    handleMoveComplete(socket, data) {
        this.gameService.removeConfirmedMove(data.unitId);
        this.broadcastState();
    }
    
    // Сброс игры
    handleReset() {
        this.botController.stop();
        this.gameService.createGame();
        this.botController.start();
        this.io.emit('gameReset', { message: 'Новая игра началась!' });
        this.broadcastState();
    }
    
    // Отправить состояние всем
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
    
    // Получить состояние для игрока
    getStateForPlayer(playerId) {
        return this.gameService.getStateForPlayer(playerId);
    }
}

module.exports = ServerGameController;
