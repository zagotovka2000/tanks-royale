// client/utils/HexUtils.js - УНИВЕРСАЛЬНАЯ ВЕРСИЯ (работает и на клиенте, и на сервере)

(function() {
   'use strict';
   
   const HexUtils = {
       // ✅ 6 НАПРАВЛЕНИЙ ДЛЯ ГЕКСАГОНАЛЬНОЙ СЕТКИ
       directions: [
           { q: 1, r: 0, name: 'right' },
           { q: 1, r: -1, name: 'up-right' },
           { q: 0, r: -1, name: 'up-left' },
           { q: -1, r: 0, name: 'left' },
           { q: -1, r: 1, name: 'down-left' },
           { q: 0, r: 1, name: 'down-right' }
       ],

       // ============================================
       // РАССТОЯНИЕ МЕЖДУ ДВУМЯ ГЕКСАМИ
       // ============================================
       distance: function(q1, r1, q2, r2) {
           var s1 = -q1 - r1;
           var s2 = -q2 - r2;
           return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
       },

       // ============================================
       // ПРОВЕРКА, ЯВЛЯЮТСЯ ЛИ ГЕКСЫ СОСЕДНИМИ
       // ============================================
       areAdjacent: function(q1, r1, q2, r2) {
           return this.distance(q1, r1, q2, r2) === 1;
       },

       // ============================================
       // ПОЛУЧЕНИЕ НАПРАВЛЕНИЯ
       // ============================================
       getDirection: function(fromQ, fromR, toQ, toR) {
           var dq = toQ - fromQ;
           var dr = toR - fromR;
           
           // Если это соседняя клетка - точное совпадение
           for (var i = 0; i < this.directions.length; i++) {
               var d = this.directions[i];
               if (d.q === dq && d.r === dr) {
                   return d.name;
               }
           }
           
           // Для дальних целей - находим ближайшее направление
           var length = Math.sqrt(dq * dq + dr * dr);
           if (length === 0) return 'right';
           
           var normQ = dq / length;
           var normR = dr / length;
           
           var bestDirection = 'right';
           var bestDot = -Infinity;
           
           for (var i = 0; i < this.directions.length; i++) {
               var d = this.directions[i];
               var dot = normQ * d.q + normR * d.r;
               if (dot > bestDot) {
                   bestDot = dot;
                   bestDirection = d.name;
               }
           }
           
           return bestDirection;
       },

       // ============================================
       // ПОЛУЧЕНИЕ СОСЕДЕЙ
       // ============================================
       getNeighbors: function(q, r) {
           var result = [];
           for (var i = 0; i < this.directions.length; i++) {
               var d = this.directions[i];
               result.push({
                   q: q + d.q,
                   r: r + d.r,
                   name: d.name
               });
           }
           return result;
       },

       // ============================================
       // ПРОВЕРКА ВАЛИДНОСТИ КЛЕТКИ
       // ============================================
       isValidCell: function(q, r, radius) {
           radius = radius || 10;
           var s = -q - r;
           return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius;
       },

       // ============================================
       // КОНВЕРТАЦИЯ ГЕКСА В ПИКСЕЛИ
       // ============================================
       toPixel: function(q, r, hexSize) {
           hexSize = hexSize || 40;
           var x = (q + r / 2) * hexSize * 1.8;
           var y = r * hexSize * 1.6;
           return { x: x, y: y };
       },

       // ============================================
       // ПОЛУЧЕНИЕ ВСЕХ КЛЕТОК В РАДИУСЕ
       // ============================================
       getCellsInRadius: function(centerQ, centerR, radius, maxRadius) {
           var cells = [];
           maxRadius = maxRadius || 10;
           
           for (var dq = -radius; dq <= radius; dq++) {
               for (var dr = -radius; dr <= radius; dr++) {
                   var q = centerQ + dq;
                   var r = centerR + dr;
                   
                   var dist = this.distance(centerQ, centerR, q, r);
                   if (dist <= radius && this.isValidCell(q, r, maxRadius)) {
                       cells.push({ q: q, r: r });
                   }
               }
           }
           return cells;
       },

       // ============================================
       // ПРОВЕРКА ЗАНЯТОСТИ КЛЕТКИ
       // ============================================
       isCellOccupied: function(q, r, units) {
           if (!units || !Array.isArray(units)) return false;
           
           return units.some(function(u) {
               return u && u.active !== false && u.q === q && u.r === r;
           });
       },

       // ============================================
       // ПОЛУЧЕНИЕ СВОБОДНЫХ СОСЕДЕЙ
       // ============================================
       getFreeNeighbors: function(q, r, units, maxRadius) {
           var neighbors = this.getNeighbors(q, r);
           var free = [];
           
           for (var i = 0; i < neighbors.length; i++) {
               var n = neighbors[i];
               if (this.isValidCell(n.q, n.r, maxRadius) && 
                   !this.isCellOccupied(n.q, n.r, units)) {
                   free.push(n);
               }
           }
           return free;
       },

       // ============================================
       // ПОЛУЧЕНИЕ ВРАГОВ В РАДИУСЕ
       // ============================================
       getEnemiesInRadius: function(centerQ, centerR, radius, enemies, maxRadius) {
           var result = [];
           
           if (!enemies || !Array.isArray(enemies)) return result;
           
           for (var i = 0; i < enemies.length; i++) {
               var enemy = enemies[i];
               if (enemy.active === false) continue;
               
               var dist = this.distance(centerQ, centerR, enemy.q, enemy.r);
               if (dist <= radius && this.isValidCell(enemy.q, enemy.r, maxRadius)) {
                   result.push(enemy);
               }
           }
           
           return result;
       },

       // ============================================
       // ПОВОРОТ НАПРАВЛЕНИЯ
       // ============================================
       rotateDirection: function(directionName, steps) {
           var index = -1;
           for (var i = 0; i < this.directions.length; i++) {
               if (this.directions[i].name === directionName) {
                   index = i;
                   break;
               }
           }
           
           if (index === -1) return 'right';
           
           var newIndex = (index + steps + this.directions.length) % this.directions.length;
           return this.directions[newIndex].name;
       },

       // ============================================
       // ПРОВЕРКА НА ВРАЖДЕБНОСТЬ
       // ============================================
       isEnemy: function(unit1, unit2) {
           if (!unit1 || !unit2) return false;
           return unit1.team !== unit2.team;
       }
   };

   // ============================================
   // ✅ УНИВЕРСАЛЬНЫЙ ЭКСПОРТ
   // ============================================
   
   // Для браузера
   if (typeof window !== 'undefined') {
       window.HexUtils = HexUtils;
       console.log('✅ HexUtils зарегистрирован в window');
   }
   
   // Для Node.js (сервер)
   if (typeof module !== 'undefined' && module.exports) {
       module.exports = HexUtils;
       console.log('✅ HexUtils экспортирован для Node.js');
   }

})();
