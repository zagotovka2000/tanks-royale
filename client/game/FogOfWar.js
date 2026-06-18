class FogOfWar {
   constructor(radius) {
       this.radius = radius;
       this.visibleCells = new Map();
       this.cacheKey = '';
       this.lastRevealTime = 0;
       this.revealThrottle = 100; // ms
   }
   
   revealCell(q, r) {
       const key = `${q},${r}`;
       this.visibleCells.set(key, true);
   }
   
   isCellVisible(q, r) {
       const key = `${q},${r}`;
       return this.visibleCells.has(key);
   }
   
   revealHexArea(centerQ, centerR, radius) {
       const now = Date.now();
       const key = `${centerQ},${centerR},${radius}`;
       
       // Throttle обновлений
       if (this.cacheKey === key && (now - this.lastRevealTime) < this.revealThrottle) {
           return;
       }
       
       this.cacheKey = key;
       this.lastRevealTime = now;
       
       for (let dq = -radius; dq <= radius; dq++) {
           for (let dr = -radius; dr <= radius; dr++) {
               const q = centerQ + dq;
               const r = centerR + dr;
               const s = -q - r;
               
               // Проверка по гексагональному расстоянию
               const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr)) / 2;
               if (dist <= radius) {
                   if (Math.abs(q) <= this.radius && 
                       Math.abs(r) <= this.radius && 
                       Math.abs(s) <= this.radius) {
                       this.revealCell(q, r);
                   }
               }
           }
       }
   }
   
   getVisibleCells() {
       const cells = [];
       for (let [key] of this.visibleCells) {
           const [q, r] = key.split(',').map(Number);
           cells.push({ q, r });
       }
       return cells;
   }
   
   reset() {
       this.visibleCells.clear();
       this.cacheKey = '';
       this.lastRevealTime = 0;
   }
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { FogOfWar };
}
