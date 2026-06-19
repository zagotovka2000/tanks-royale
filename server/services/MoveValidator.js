// server/services/MoveValidator.js - ОБНОВЛЕННЫЙ

var HexUtils = require('../../client/utils/HexUtils.js');

class MoveValidator {
   constructor(gameInstance) {
       this.game = gameInstance;
   }
   
   validateMove(unit, targetQ, targetR) {
       var errors = [];
       
       if (!unit || !unit.active) {
           errors.push('Юнит не активен');
           return errors;
       }
       
       if (!this.game.canMove(unit)) {
           errors.push('Кулдаун движения');
       }
       
       if (!HexUtils.areAdjacent(unit.q, unit.r, targetQ, targetR)) {
           errors.push('Можно двигаться только на соседнюю клетку');
       }
       
       var occupied = this.game.getAllUnits().some(function(u) {
           return u.active && u !== unit && u.q === targetQ && u.r === targetR;
       });
       if (occupied) {
           errors.push('Клетка занята');
       }
       
       if (!this.game.isValidCell(targetQ, targetR)) {
           errors.push('Клетка не существует');
       }
       
       return errors;
   }
   
   validateShoot(unit, targetQ, targetR) {
       var errors = [];
       
       if (!unit || !unit.active) {
           errors.push('Юнит не активен');
           return errors;
       }
       
       if (!this.game.canShoot(unit)) {
           errors.push('Кулдаун стрельбы');
       }
       
       // Для игрока - без ограничений
       if (unit.isPlayer) {
           return errors;
       }
       
       // Для врага - проверка дальности (макс 6 гексов)
       var distance = HexUtils.distance(unit.q, unit.r, targetQ, targetR);
       var maxRange = Math.min(unit.range || 6, 6);
       if (distance > maxRange) {
           errors.push('Слишком далеко (макс. ' + maxRange + ' гексов)');
       }
       
       return errors;
   }
   
   getAvailableMoves(unit) {
       if (!unit || !unit.active) return [];
       
       var neighbors = HexUtils.getNeighbors(unit.q, unit.r);
       var allUnits = this.game.getAllUnits();
       
       return neighbors.filter(function(n) {
           if (!this.game.isValidCell(n.q, n.r)) return false;
           
           var occupied = allUnits.some(function(u) {
               return u.active && u !== unit && u.q === n.q && u.r === n.r;
           });
           
           return !occupied;
       }.bind(this));
   }
}

module.exports = MoveValidator;
