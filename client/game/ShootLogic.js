// client/game/ShootLogic.js
// Логика стрельбы - вынесена в отдельный файл для удобного редактирования

(function() {
   'use strict';
   
   // Получаем HexUtils для Node.js и браузера
   var HexUtils;
   if (typeof module !== 'undefined' && module.exports) {
       // Node.js окружение
       HexUtils = require('../utils/HexUtils.js');
   } else if (typeof window !== 'undefined' && window.HexUtils) {
       // Браузерное окружение
       HexUtils = window.HexUtils;
   } else {
       // Fallback - пытаемся загрузить
       console.warn('⚠️ HexUtils не найден, создаем базовую версию');
       HexUtils = {
           distance: function(q1, r1, q2, r2) {
               var s1 = -q1 - r1;
               var s2 = -q2 - r2;
               return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
           }
       };
   }
   
   /**
    * Класс для управления логикой стрельбы
    * Все параметры и вычисления вынесены сюда
    */
   function ShootLogic() {
       // Настройки стрельбы
       this.config = {
           // Для игрока - без ограничений по дальности
           playerMaxRange: Infinity,
           // Для врага - ограничение 6 гексов
           enemyMaxRange: 6,
           // Базовый урон
           baseDamage: 30,
           // Шанс критического попадания (для врага)
           enemyCritChance: 0.15,
           // Множитель критического урона
           critMultiplier: 1.5,
       };
       
       // Сохраняем ссылку на HexUtils
       this.HexUtils = HexUtils;
   }

   /**
    * Проверка, может ли юнит стрелять по цели
    */
   ShootLogic.prototype.canShootAt = function(attacker, targetQ, targetR, allUnits) {
       if (!attacker || !attacker.active) {
           return { canShoot: false, reason: 'Атакующий неактивен' };
       }
       
       // Проверка дальности
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
       
       // Проверка, есть ли цель на этой клетке
       var target = this.getTargetAt(allUnits, targetQ, targetR, attacker.team);
       
       return {
           canShoot: true,
           target: target,
           distance: distance,
           maxRange: maxRange
       };
   };

   /**
    * Получение максимальной дальности для юнита
    */
   ShootLogic.prototype.getMaxRange = function(unit) {
       if (unit.isPlayer) {
           return this.config.playerMaxRange;
       } else {
           return Math.min(unit.range || this.config.enemyMaxRange, this.config.enemyMaxRange);
       }
   };

   /**
    * Поиск цели на клетке
    */
   ShootLogic.prototype.getTargetAt = function(allUnits, q, r, team) {
       for (var i = 0; i < allUnits.length; i++) {
           var unit = allUnits[i];
           if (unit.active && unit.q === q && unit.r === r && unit.team !== team) {
               return unit;
           }
       }
       return null;
   };

   /**
    * Выполнение выстрела
    */
   ShootLogic.prototype.executeShoot = function(attacker, targetQ, targetR, allUnits) {
       // Проверяем возможность стрельбы
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
       
       // Если цели нет - промах
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
       
       // Расчет урона
       var damage = this.calculateDamage(attacker, target);
       var isCritical = false;
       
       // Для врага - шанс крита
       if (!isPlayer) {
           if (Math.random() < this.config.enemyCritChance) {
               damage = Math.round(damage * this.config.critMultiplier);
               isCritical = true;
           }
       }
       
       // Наносим урон
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

   /**
    * Расчет урона с учетом брони и модификаторов
    */
   ShootLogic.prototype.calculateDamage = function(attacker, target) {
       var baseDamage = attacker.damage || this.config.baseDamage;
       
       // Модификаторы для игрока (можно добавить позже)
       if (attacker.isPlayer) {
           // Игрок наносит полный урон
           return baseDamage;
       }
       
       // Для врага - немного меньше урона
       return Math.round(baseDamage * 0.8);
   };

   /**
    * Проверка, может ли игрок стрелять на любое расстояние
    */
   ShootLogic.prototype.canPlayerShootAnywhere = function() {
       return this.config.playerMaxRange === Infinity;
   };

   /**
    * Получить конфигурацию стрельбы
    */
   ShootLogic.prototype.getConfig = function() {
       return {
           playerMaxRange: this.config.playerMaxRange === Infinity ? '∞' : this.config.playerMaxRange,
           enemyMaxRange: this.config.enemyMaxRange,
           baseDamage: this.config.baseDamage,
           enemyCritChance: this.config.enemyCritChance,
           critMultiplier: this.config.critMultiplier
       };
   };

   /**
    * Обновить конфигурацию
    */
   ShootLogic.prototype.updateConfig = function(newConfig) {
       for (var key in newConfig) {
           if (newConfig.hasOwnProperty(key) && this.config.hasOwnProperty(key)) {
               this.config[key] = newConfig[key];
           }
       }
   };

   // Экспорт
   if (typeof window !== 'undefined') {
       window.ShootLogic = ShootLogic;
   }

   if (typeof module !== 'undefined' && module.exports) {
       module.exports = { ShootLogic: ShootLogic };
   }

})();
