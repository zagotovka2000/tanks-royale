// client/utils/HexUtils.js

var HexUtils = {
   // ✅ 6 НАПРАВЛЕНИЙ ДЛЯ ГЕКСАГОНАЛЬНОЙ СЕТКИ (ТОЛЬКО Q И R)
   directions: [
       { q: 1, r: 0, name: 'right' },
       { q: 1, r: -1, name: 'up-right' },
       { q: 0, r: -1, name: 'up-left' },
       { q: -1, r: 0, name: 'left' },
       { q: -1, r: 1, name: 'down-left' },
       { q: 0, r: 1, name: 'down-right' }
   ],

   distance: function(q1, r1, q2, r2) {
       var s1 = -q1 - r1;
       var s2 = -q2 - r2;
       return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
   },

   areAdjacent: function(q1, r1, q2, r2) {
       return this.distance(q1, r1, q2, r2) === 1;
   },

   // ✅ УЛУЧШЕННЫЙ getDirection С ПРОВЕРКОЙ
   getDirection: function(fromQ, fromR, toQ, toR) {
       var dq = toQ - fromQ;
       var dr = toR - fromR;
       
       // Проверяем все направления
       for (var i = 0; i < this.directions.length; i++) {
           var d = this.directions[i];
           if (d.q === dq && d.r === dr) {
               return d.name;
           }
       }
       
       // Если не нашли - возвращаем 'right' по умолчанию
       console.warn('⚠️ Неизвестное направление:', dq, dr, 'используем right');
       return 'right';
   },

   // ✅ getNeighbors с именами направлений
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

   isValidCell: function(q, r, radius) {
       radius = radius || 10;
       var s = -q - r;
       return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius;
   },

   toPixel: function(q, r, hexSize) {
       hexSize = hexSize || 40;
       var x = (q + r / 2) * hexSize * 1.8;
       var y = r * hexSize * 1.6;
       return { x: x, y: y };
   }
};

// Экспорт для браузера
if (typeof window !== 'undefined') {
   window.HexUtils = HexUtils;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
   module.exports = HexUtils;
}
