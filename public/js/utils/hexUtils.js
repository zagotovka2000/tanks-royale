// public/js/utils/HexUtils.js

window.HexUtils = {
   directions: [
       { q: 0, r: -1, name: 'up' },
       { q: 1, r: -1, name: 'up-right' },
       { q: 1, r: 0, name: 'right' },
       { q: 0, r: 1, name: 'down' },
       { q: -1, r: 1, name: 'down-left' },
       { q: -1, r: 0, name: 'left' }
   ],
   
   distanceCache: new Map(),
   
   distance(q1, r1, q2, r2) {
       const key = `${q1},${r1},${q2},${r2}`;
       if (this.distanceCache.has(key)) {
           return this.distanceCache.get(key);
       }
       
       const s1 = -q1 - r1;
       const s2 = -q2 - r2;
       const dist = (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
       
       if (this.distanceCache.size < 1000) {
           this.distanceCache.set(key, dist);
       }
       
       return dist;
   },
   
   getDirection(fromQ, fromR, toQ, toR) {
       const dq = toQ - fromQ;
       const dr = toR - fromR;
       const dir = this.directions.find(d => d.q === dq && d.r === dr);
       return dir ? dir.name : 'right';
   },
   
   areAdjacent(q1, r1, q2, r2) {
       return this.distance(q1, r1, q2, r2) === 1;
   },
   
   getNeighbors(q, r) {
       return this.directions.map(dir => ({
           q: q + dir.q,
           r: r + dir.r,
           name: dir.name
       }));
   },
   
   // Получить только доступные для движения соседи
   getValidMoveNeighbors(q, r, walls, units, cells) {
       const neighbors = this.getNeighbors(q, r);
       const validNeighbors = [];
       
       for (const neighbor of neighbors) {
           // Проверка существования клетки
           const cellExists = cells?.some(cell => cell.q === neighbor.q && cell.r === neighbor.r);
           if (!cellExists) continue;
           
           // Проверка стены
           const hasWall = walls?.some(w => w.q === neighbor.q && w.r === neighbor.r);
           if (hasWall) continue;
           
           // Проверка занятости
           const isOccupied = units?.some(u => u.active && u.q === neighbor.q && u.r === neighbor.r);
           if (isOccupied) continue;
           
           validNeighbors.push(neighbor);
       }
       
       return validNeighbors;
   },
   
   to3DPosition(q, r, hexSize = 0.7) {
       const x = (q + r/2) * hexSize * 1.8;
       const z = r * hexSize * 1.6;
       return { x: x, y: 0, z: z };
   },
   
   clearCache() {
       this.distanceCache.clear();
   }
};
