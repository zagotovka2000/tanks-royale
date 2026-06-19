// server/services/GameService.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const path = require('path');

// Правильный импорт TankGame
const TankGameModule = require('../../client/game/TankGame.js');
const TankGame = TankGameModule.TankGame || TankGameModule;

class GameService {
    constructor() {
        this.currentGame = null;
        this.confirmedMoves = new Map();
    }
    
    createGame() {
        this.currentGame = new TankGame();
        this.confirmedMoves.clear();
        return this.currentGame;
    }
    
    getGame() { return this.currentGame; }
    
    confirmMove(unitId, fromQ, fromR, toQ, toR) {
        this.confirmedMoves.set(unitId, { fromQ, fromR, toQ, toR, timestamp: Date.now() });
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
    
    getStateForPlayer(playerId) {
        if (!this.currentGame) return null;
        const state = this.currentGame.getStateForPlayer(playerId);
        if (state) {
            state.confirmedMoves = this.getAllConfirmedMoves();
        }
        return state;
    }
    
    checkWinner() {
        return this.currentGame ? this.currentGame.checkWinner() : null;
    }
}

module.exports = GameService;
