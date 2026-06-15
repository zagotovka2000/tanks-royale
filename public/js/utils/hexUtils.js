// Единая работа с гексагональными координатами
const HexUtils = {
   directions: [
       { q: 0, r: -1, name: 'up' },
       { q: 1, r: -1, name: 'up-right' },
       { q: 1, r: 0, name: 'right' },
       { q: 0, r: 1, name: 'down' },
       { q: -1, r: 1, name: 'down-left' },
       { q: -1, r: 0, name: 'left' }
   ],
   
   // Вычисление расстояния между гексами
   distance(q1, r1, q2, r2) {
       const s1 = -q1 - r1;
       const s2 = -q2 - r2;
       return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
   },
   
   // Получить направление движения
   getDirection(fromQ, fromR, toQ, toR) {
       const dq = toQ - fromQ;
       const dr = toR - fromR;
       const dir = this.directions.find(d => d.q === dq && d.r === dr);
       return dir ? dir.name : 'right';
   },
   
   // Проверка смежности
   areAdjacent(q1, r1, q2, r2) {
       return this.distance(q1, r1, q2, r2) === 1;
   },
   
   // Получить всех соседей
   getNeighbors(q, r) {
       return this.directions.map(dir => ({
           q: q + dir.q,
           r: r + dir.r
       }));
   },
   
   // Конвертация в 3D позицию
   to3DPosition(q, r, hexSize = 0.7) {
       const x = (q + r/2) * hexSize * 1.8;
       const z = r * hexSize * 1.6;
       return { x: x, y: 0, z: z };
   }
};

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { HexUtils };
}
