// public/js/renderers/HexRenderer.js
export class HexRenderer {
   constructor(ctx, canvas) {
       this.ctx = ctx;
       this.canvas = canvas;
       this.hexSize = 35; // размер гекса
   }
   
   // Конвертация кубических координат в экранные
   hexToPixel(q, r) {
       const x = (q + r/2) * this.hexSize * 1.5;
       const y = r * this.hexSize * Math.sqrt(3);
       return { x: x + this.canvas.width/2, y: y + this.canvas.height/2 };
   }
   
   // Рисование одного гекса
   drawHex(q, r, color, isVisible = true) {
       const center = this.hexToPixel(q, r);
       const points = [];
       
       for (let i = 0; i < 6; i++) {
           const angle = Math.PI / 3 * i;
           const x = center.x + this.hexSize * Math.cos(angle);
           const y = center.y + this.hexSize * Math.sin(angle);
           points.push({ x, y });
       }
       
       this.ctx.beginPath();
       this.ctx.moveTo(points[0].x, points[0].y);
       for (let i = 1; i < points.length; i++) {
           this.ctx.lineTo(points[i].x, points[i].y);
       }
       this.ctx.closePath();
       
       // Заливка (с учетом тумана войны)
       this.ctx.fillStyle = isVisible ? color : '#2a2a2a';
       this.ctx.fill();
       
       // Обводка
       this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
       this.ctx.stroke();
   }
   
   // Отрисовка всей карты
   drawMap(gameState) {
       for (let q = 0; q < gameState.size; q++) {
           for (let r = 0; r < gameState.size; r++) {
               const isVisible = gameState.visibleCells?.some(cell => cell.q === q && cell.r === r);
               let terrainColor = '#3a7a3a'; // трава
               
               if (gameState.walls?.some(w => w.q === q && w.r === r)) {
                   terrainColor = '#8B7355'; // стена
               }
               
               if (gameState.bases?.some(b => b.q === q && b.r === r)) {
                   terrainColor = '#DAA520'; // база (золотая)
               }
               
               this.drawHex(q, r, terrainColor, isVisible);
           }
       }
   }
   
   // Рисование танка на гексе
   drawTank(unit, isVisible) {
       if (!isVisible && unit.team !== 'ally') return;
       
       const center = this.hexToPixel(unit.q, unit.r);
       const size = this.hexSize * 0.6;
       
       this.ctx.save();
       this.ctx.translate(center.x, center.y);
       
       // Поворот танка в зависимости от направления
       const rotations = {
           'up': -Math.PI/2,
           'up-right': -Math.PI/6,
           'right': 0,
           'down-right': Math.PI/6,
           'down': Math.PI/2,
           'down-left': Math.PI*5/6,
           'left': Math.PI
       };
       this.ctx.rotate(rotations[unit.direction] || 0);
       
       // Корпус (как в Battle City)
       this.ctx.fillStyle = unit.color;
       this.ctx.fillRect(-size/2, -size/3, size, size*0.66);
       
       // Башня
       this.ctx.fillStyle = this.lightenColor(unit.color);
       this.ctx.beginPath();
       this.ctx.arc(0, 0, size*0.35, 0, Math.PI*2);
       this.ctx.fill();
       
       // Дуло
       this.ctx.fillStyle = '#666';
       this.ctx.fillRect(size*0.3, -size*0.08, size*0.3, size*0.16);
       
       this.ctx.restore();
       
       // HP Bar
       const hpPercent = unit.hp / unit.maxHp;
       this.ctx.fillStyle = '#ff5252';
       this.ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size, 4);
       this.ctx.fillStyle = '#4caf50';
       this.ctx.fillRect(center.x - size/2, center.y - size/2 - 8, size * hpPercent, 4);
   }
   
   lightenColor(color) {
       // Простое осветление для башни
       return color === '#e94560' ? '#ff6b6b' : '#66bb6a';
   }
}
