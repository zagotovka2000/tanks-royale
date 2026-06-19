// common/types/Direction.js

const Direction = {
   RIGHT: 'right',
   UP_RIGHT: 'up-right',
   UP_LEFT: 'up-left',
   LEFT: 'left',
   DOWN_LEFT: 'down-left',
   DOWN_RIGHT: 'down-right',
   
   // Все направления в порядке по часовой стрелке
   ALL: ['right', 'up-right', 'up-left', 'left', 'down-left', 'down-right'],
   
   // Векторы направлений
   VECTORS: {
       'right': { q: 1, r: 0 },
       'up-right': { q: 1, r: -1 },
       'up-left': { q: 0, r: -1 },
       'left': { q: -1, r: 0 },
       'down-left': { q: -1, r: 1 },
       'down-right': { q: 0, r: 1 }
   },
   
   // Углы для поворота ствола (в радианах)
   ANGLES: {
       'right': 0,
       'up-right': -Math.PI / 3,
       'up-left': -Math.PI * 2 / 3,
       'left': Math.PI,
       'down-left': Math.PI * 2 / 3,
       'down-right': Math.PI / 3
   },
   
   // Получить вектор направления
   getVector: function(direction) {
       return this.VECTORS[direction] || this.VECTORS['right'];
   },
   
   // Получить угол направления
   getAngle: function(direction) {
       return this.ANGLES[direction] || 0;
   },
   
   // Повернуть направление на N шагов
   rotate: function(direction, steps) {
       const index = this.ALL.indexOf(direction);
       if (index === -1) return 'right';
       const newIndex = (index + steps + this.ALL.length) % this.ALL.length;
       return this.ALL[newIndex];
   },
   
   // Получить противоположное направление
   opposite: function(direction) {
       return this.rotate(direction, 3);
   },
   
   // Проверить валидность направления
   isValid: function(direction) {
       return this.ALL.includes(direction);
   }
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
   module.exports = Direction;
}

if (typeof window !== 'undefined') {
   window.Direction = Direction;
}
