// client/game/ShootLogic.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

(function() {
   'use strict';
   
   var HexUtils;
   if (typeof module !== 'undefined' && module.exports) {
       HexUtils = require('../utils/HexUtils.js');
   } else if (typeof window !== 'undefined' && window.HexUtils) {
       HexUtils = window.HexUtils;
   } else {
       console.warn('⚠️ HexUtils не найден, создаем базовую версию');
       HexUtils = {
           distance: function(q1, r1, q2, r2) {
               var s1 = -q1 - r1;
               var s2 = -q2 - r2;
               return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
           }
       };
   }
   
   function ShootLogic() {
       this.config = {
           playerMaxRange: Infinity,
           enemyMaxRange: 6,
           baseDamage: 30,
           enemyCritChance: 0.15,
           critMultiplier: 1.5,
       };
       
       this.HexUtils = HexUtils;
   }

   ShootLogic.prototype.canShootAt = function(attacker, targetQ, targetR, allUnits) {
       if (!attacker || !attacker.active) {
           return { canShoot: false, reason: 'Атакующий неактивен' };
       }
       
       var distance = this.HexUtils.distance(attacker.q, attacker.r, targetQ, targetR);
       var maxRange = this.getMaxRange(attacker);
       
       if (distance > maxRange) {
           return { 
               canShoot: false, 
               reason: 'Слишком далеко', 
               distance: distance, 
               maxRange: maxRange 
           };
       }
       
       var target = this.getTargetAt(allUnits, targetQ, targetR, attacker.team);
       
       return {
           canShoot: true,
           target: target,
           distance: distance,
           maxRange: maxRange
       };
   };

   ShootLogic.prototype.getMaxRange = function(unit) {
       if (unit.isPlayer) {
           return this.config.playerMaxRange;
       } else {
           return Math.min(unit.range || this.config.enemyMaxRange, this.config.enemyMaxRange);
       }
   };

   ShootLogic.prototype.getTargetAt = function(allUnits, q, r, team) {
       for (var i = 0; i < allUnits.length; i++) {
           var unit = allUnits[i];
           if (unit.active && unit.q === q && unit.r === r && unit.team !== team) {
               return unit;
           }
       }
       return null;
   };

   ShootLogic.prototype.executeShoot = function(attacker, targetQ, targetR, allUnits) {
       var check = this.canShootAt(attacker, targetQ, targetR, allUnits);
       
       if (!check.canShoot) {
           return {
               success: false,
               message: check.reason,
               distance: check.distance,
               maxRange: check.maxRange
           };
       }
       
       var target = check.target;
       var isPlayer = attacker.isPlayer;
       
       if (!target) {
           return {
               success: true,
               hit: false,
               message: '💨 Промах!',
               targetQ: targetQ,
               targetR: targetR,
               fromQ: attacker.q,
               fromR: attacker.r,
               attackerId: attacker.id
           };
       }
       
       var damage = this.calculateDamage(attacker, target);
       var isCritical = false;
       
       if (!isPlayer) {
           if (Math.random() < this.config.enemyCritChance) {
               damage = Math.round(damage * this.config.critMultiplier);
               isCritical = true;
           }
       }
       
       target.hp -= damage;
       var killed = false;
       var message = '';
       
       if (target.hp <= 0) {
           target.hp = 0;
           target.active = false;
           killed = true;
           attacker.kills = (attacker.kills || 0) + 1;
           message = '💀 ' + target.name + ' уничтожен!';
       } else {
           var critText = isCritical ? ' 💥КРИТ!' : '';
           message = '💥 Попадание в ' + target.name + '! -' + damage + ' HP' + critText;
       }
       
       return {
           success: true,
           hit: true,
           killed: killed,
           damage: damage,
           isCritical: isCritical,
           message: message,
           targetQ: target.q,
           targetR: target.r,
           targetId: target.id,
           targetName: target.name,
           targetHp: target.hp,
           targetMaxHp: target.maxHp,
           fromQ: attacker.q,
           fromR: attacker.r,
           attackerId: attacker.id,
           isPlayer: isPlayer
       };
   };

   ShootLogic.prototype.calculateDamage = function(attacker, target) {
       var baseDamage = attacker.damage || this.config.baseDamage;
       
       if (attacker.isPlayer) {
           return baseDamage;
       }
       
       return Math.round(baseDamage * 0.8);
   };

   ShootLogic.prototype.canPlayerShootAnywhere = function() {
       return this.config.playerMaxRange === Infinity;
   };

   ShootLogic.prototype.getConfig = function() {
       return {
           playerMaxRange: this.config.playerMaxRange === Infinity ? '∞' : this.config.playerMaxRange,
           enemyMaxRange: this.config.enemyMaxRange,
           baseDamage: this.config.baseDamage,
           enemyCritChance: this.config.enemyCritChance,
           critMultiplier: this.config.critMultiplier
       };
   };

   ShootLogic.prototype.updateConfig = function(newConfig) {
       for (var key in newConfig) {
           if (newConfig.hasOwnProperty(key) && this.config.hasOwnProperty(key)) {
               this.config[key] = newConfig[key];
           }
       }
   };

   if (typeof window !== 'undefined') {
       window.ShootLogic = ShootLogic;
   }

   if (typeof module !== 'undefined' && module.exports) {
       module.exports = { ShootLogic: ShootLogic };
   }

})();
