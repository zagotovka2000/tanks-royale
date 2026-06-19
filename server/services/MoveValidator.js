// server/services/MoveValidator.js

const HexUtils = require('../../client/utils/HexUtils.js');

class MoveValidator {
    constructor(gameInstance) {
        this.game = gameInstance;
    }
    
    // Проверить возможность движения
    validateMove(unit, targetQ, targetR) {
        const errors = [];
        
        // Проверка активности
        if (!unit || !unit.active) {
            errors.push('Юнит не активен');
            return errors;
        }
        
        // Проверка кулдауна
        if (!this.game.canMove(unit)) {
            errors.push('Кулдаун движения');
        }
        
        // Проверка смежности
        if (!HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) {
            errors.push('Можно двигаться только на соседнюю клетку');
        }
        
        // Проверка занятости
        const occupied = this.game.getAllUnits().some(u => 
            u.active && u !== unit && u.q === targetQ && u.r === targetR
        );
        if (occupied) {
            errors.push('Клетка занята');
        }
        
        // Проверка существования клетки
        if (!this.game.isValidCell(targetQ, targetR)) {
            errors.push('Клетка не существует');
        }
        
        return errors;
    }
    
    // Проверить возможность выстрела
    validateShoot(unit, targetQ, targetR) {
        const errors = [];
        
        // Проверка активности
        if (!unit || !unit.active) {
            errors.push('Юнит не активен');
            return errors;
        }
        
        // Проверка кулдауна
        if (!this.game.canShoot(unit)) {
            errors.push('Кулдаун стрельбы');
        }
        
        // Проверка дальности
        const distance = HexUtils.distance(unit.q, unit.r, targetQ, targetR);
        if (distance > unit.range) {
            errors.push('Слишком далеко');
        }
        
        return errors;
    }
    
    // Получить доступные для движения клетки
    getAvailableMoves(unit) {
        if (!unit || !unit.active) return [];
        
        const neighbors = HexUtils.getNeighbors(unit.q, unit.r);
        const allUnits = this.game.getAllUnits();
        
        return neighbors.filter(n => {
            if (!this.game.isValidCell(n.q, n.r)) return false;
            
            const occupied = allUnits.some(u => 
                u.active && u !== unit && u.q === n.q && u.r === n.r
            );
            
            return !occupied;
        });
    }
}

module.exports = MoveValidator;
