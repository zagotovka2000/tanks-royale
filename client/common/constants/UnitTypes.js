// common/constants/UnitTypes.js - УПРОЩЕННАЯ ВЕРСИЯ
const UnitTypes = {
   MEDIUM: { id: 'medium', name: 'Средний', hp: 100, damage: 30, range: 5, size: 30, speed: 1, color: '#4caf50' },
   HEAVY: { id: 'heavy', name: 'Тяжелый', hp: 150, damage: 25, range: 4, size: 34, speed: 0.7, color: '#e94560' },
   LIGHT: { id: 'light', name: 'Легкий', hp: 70, damage: 20, range: 6, size: 26, speed: 1.3, color: '#ffd93d' },
   
   getStats(typeId) {
       return this[typeId.toUpperCase()] || this.MEDIUM;
   },
   
   createUnit(typeId, id, name, team, q, r) {
       const stats = this.getStats(typeId);
       return { id, name: name || stats.name, team, q, r, hp: stats.hp, maxHp: stats.hp, damage: stats.damage, range: stats.range, type: stats.id, color: stats.color, size: stats.size, speed: stats.speed, active: true, direction: 'right', kills: 0, isPlayer: false };
   }
};

if (typeof module !== 'undefined' && module.exports) module.exports = UnitTypes;
if (typeof window !== 'undefined') window.UnitTypes = UnitTypes;
