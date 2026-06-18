// client/utils/HexUtils.js

var HexUtils = {
   directions: [
       { q: 1, r: 0, s: -1, name: 'right' },
       { q: 1, r: -1, s: 0, name: 'up-right' },
       { q: 0, r: -1, s: 1, name: 'up' },
       { q: -1, r: 0, s: 1, name: 'left' },
       { q: -1, r: 1, s: 0, name: 'down-left' },
       { q: 0, r: 1, s: -1, name: 'down' }
   ],

   distance: function(q1, r1, q2, r2) {
       var s1 = -q1 - r1;
       var s2 = -q2 - r2;
       return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
   },

   areAdjacent: function(q1, r1, q2, r2) {
       return this.distance(q1, r1, q2, r2) === 1;
   },

   getDirection: function(fromQ, fromR, toQ, toR) {
       var dq = toQ - fromQ;
       var dr = toR - fromR;
       for (var i = 0; i < this.directions.length; i++) {
           var d = this.directions[i];
           if (d.q === dq && d.r === dr) {
               return d.name;
           }
       }
       return 'right';
   },

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

// ✅ Универсальный экспорт
if (typeof window !== 'undefined') {
   window.HexUtils = HexUtils;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = HexUtils;
}
