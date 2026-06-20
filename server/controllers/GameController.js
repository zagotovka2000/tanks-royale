// server/controllers/GameController.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

var HexUtils = require('../../client/utils/HexUtils.js');

class ServerGameController {
    constructor(io, gameService, botController) {
        this.io = io;
        this.gameService = gameService;
        this.botController = botController;
    }
    
    handleMoveRequest(socket, data) {
        var game = this.gameService.getGame();
        if (!game) {
            socket.emit('moveRejected', { message: 'Игра не создана' });
            return;
        }
        
        if (game.gameOver) {
            socket.emit('moveRejected', { message: 'Игра окончена' });
            return;
        }
        
        var player = game.getFirstPlayer();
        if (!player || !player.active) {
            socket.emit('moveRejected', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        var errors = this.validateMove(player, data.q, data.r);
        
        if (errors.length > 0) {
            socket.emit('moveRejected', {
                message: errors[0],
                reason: errors[0].toLowerCase().replace(/ /g, '_'),
                errors: errors
            });
            return;
        }
        
        var fromQ = player.q;
        var fromR = player.r;
        var moved = game.moveToCell(player.id, data.q, data.r);
        
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
    
    handleShootRequest(socket, data) {
        var game = this.gameService.getGame();
        if (!game || game.gameOver) {
            socket.emit('shootRejected', { message: game?.gameOver ? 'Игра окончена' : 'Игра не создана' });
            return;
        }
        
        var player = game.getFirstPlayer();
        if (!player || !player.active) {
            socket.emit('shootRejected', { message: 'Ваш танк уничтожен' });
            return;
        }
        
        var errors = this.validateShoot(player, data.q, data.r);
        
        if (errors.length > 0) {
            socket.emit('shootRejected', {
                message: errors[0],
                reason: errors[0].toLowerCase().replace(/ /g, '_')
            });
            return;
        }
        
        var result = game.shootAtCell(player.id, data.q, data.r);
        
        this.io.emit('shootResult', result);
        this.broadcastState();
        
        if (game.checkWinner()) {
            this.botController.stop();
            this.io.emit('gameEnded', {
                winner: game.winner,
                kills: player.kills || 0
            });
            this.broadcastState();
        }
    }
    
    handleMoveComplete(socket, data) {
        this.gameService.removeConfirmedMove(data.unitId);
        this.broadcastState();
    }
    
    handleReset() {
        this.botController.stop();
        this.gameService.createGame();
        this.botController.start();
        this.io.emit('gameReset', { message: 'Новая игра началась!' });
        this.broadcastState();
    }
    
    validateMove(unit, targetQ, targetR) {
        var errors = [];
        var game = this.gameService.getGame();
        
        if (!unit || !unit.active) {
            errors.push('Юнит не активен');
            return errors;
        }
        
        if (!game.canMove(unit)) {
            errors.push('Кулдаун движения');
        }
        
        if (!HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) {
            errors.push('Можно двигаться только на соседнюю клетку');
        }
        
        var occupied = game.getAllUnits().some(function(u) {
            return u.active && u !== unit && u.q === targetQ && u.r === targetR;
        });
        if (occupied) {
            errors.push('Клетка занята');
        }
        
        if (!game.isValidCell(targetQ, targetR)) {
            errors.push('Клетка не существует');
        }
        
        return errors;
    }
    
    validateShoot(unit, targetQ, targetR) {
        var errors = [];
        var game = this.gameService.getGame();
        
        if (!unit || !unit.active) {
            errors.push('Юнит не активен');
            return errors;
        }
        
        if (!game.canShoot(unit)) {
            errors.push('Кулдаун стрельбы');
        }
        
        return errors;
    }
    
    broadcastState() {
        var game = this.gameService.getGame();
        if (!game) return;
        
        var player = game.getFirstPlayer();
        if (!player) return;
        
        var state = this.gameService.getStateForPlayer(player.id);
        if (state) {
            this.io.emit('gameState', state);
        }
    }
    
    getStateForPlayer(playerId) {
        return this.gameService.getStateForPlayer(playerId);
    }
}

module.exports = ServerGameController;
