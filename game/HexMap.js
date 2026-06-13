// Новая структура карты (HexMap.js)
class HexMap {
   constructor(radius = 5) { // radius=5 даёт 61 гекс (как в Territory of Conquests)
       this.radius = radius;
       this.cells = new Map(); // key: "q,r" -> Cell
       this.generateMap();
   }
   
   generateMap() {
       // Генерируем все гексы в радиусе radius
       for (let q = -this.radius; q <= this.radius; q++) {
           for (let r = -this.radius; r <= this.radius; r++) {
               const s = -q - r; // кубическая координата
               if (Math.abs(q) <= this.radius && 
                   Math.abs(r) <= this.radius && 
                   Math.abs(s) <= this.radius) {
                   
                   const key = `${q},${r}`;
                   this.cells.set(key, {
                       q, r, s,
                       terrain: this.getTerrainType(q, r),
                       owner: null,
                       hasBase: false,
                       baseOwner: null
                   });
               }
           }
       }
   }
   
   getTerrainType(q, r) {
       // Разные типы местности
       const dist = Math.abs(q) + Math.abs(r) + Math.abs(-q-r);
       if (dist < 3) return 'base';      // центр — базы
       if (dist > this.radius - 1) return 'edge'; // края
       return 'normal';
   }
   
   getAllCells() {
       return Array.from(this.cells.values());
   }
   
   getNeighbors(q, r) {
       const neighbors = [];
       const directions = [
           { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
           { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
       ];
       
       for (const dir of directions) {
           const nq = q + dir.q;
           const nr = r + dir.r;
           const key = `${nq},${nr}`;
           if (this.cells.has(key)) {
               neighbors.push(this.cells.get(key));
           }
       }
       return neighbors;
   }
}
