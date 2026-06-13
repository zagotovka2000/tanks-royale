export class GameRenderer {
   constructor(ctx, canvas, getGameState, getSelectedTarget) {
       this.ctx = ctx;
       this.canvas = canvas;
       this.getGameState = getGameState;
       this.getSelectedTarget = getSelectedTarget;
       this.tankImages = {};
       this.loadImages();
   }
   
   loadImages() {
       const imageNames = ['tank_player', 'tank_ally1', 'tank_ally2', 'tank_enemy1', 'tank_enemy2', 'tank_enemy3', 'tank_enemy_boss'];
       imageNames.forEach(name => {
           const img = new Image();
           img.src = `/images/tanks/${name}.png`;
           this.tankImages[name] = img;
       });
   }
   
   draw(gameState) {
       if (!gameState) return;
       
       const cellSize = this.canvas.width / gameState.size;
       this.drawBackground(gameState, cellSize);
       this.drawGrid(cellSize);
       this.drawFogOfWar(gameState, cellSize);
       this.drawSmokeEffects(gameState, cellSize);
       this.drawUnits(gameState, cellSize);
       this.drawSelectedTarget(gameState, cellSize);
   }
   
   drawBackground(gameState, cellSize) {
       for (let i = 0; i < gameState.size; i++) {
           for (let j = 0; j < gameState.size; j++) {
               this.ctx.fillStyle = (i + j) % 2 === 0 ? '#2a5a3a' : '#1e4a2a';
               this.ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
           }
       }
   }
   
   drawGrid(cellSize) {
       this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
       this.ctx.lineWidth = 1;
       for (let i = 0; i <= 15; i++) {
           this.ctx.beginPath();
           this.ctx.moveTo(i * cellSize, 0);
           this.ctx.lineTo(i * cellSize, this.canvas.width);
           this.ctx.stroke();
           this.ctx.moveTo(0, i * cellSize);
           this.ctx.lineTo(this.canvas.width, i * cellSize);
           this.ctx.stroke();
       }
   }
   
   drawFogOfWar(gameState, cellSize) {
       for (let i = 0; i < gameState.size; i++) {
           for (let j = 0; j < gameState.size; j++) {
               const isVisible = gameState.visibleCells?.some(cell => cell.x === i && cell.y === j);
               if (!isVisible) {
                   this.ctx.fillStyle = 'rgba(30, 40, 50, 0.85)';
                   this.ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
               }
           }
       }
   }
   
   drawSmokeEffects(gameState, cellSize) {
       if (gameState.smokeEffects) {
           gameState.smokeEffects.forEach(smoke => {
               const x = smoke.x * cellSize;
               const y = smoke.y * cellSize;
               this.ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
               this.ctx.beginPath();
               this.ctx.arc(y + cellSize/2, x + cellSize/2, cellSize/2.5, 0, Math.PI * 2);
               this.ctx.fill();
           });
       }
   }
   
   drawUnits(gameState, cellSize) {
       if (gameState.allies) {
           gameState.allies.forEach(ally => this.drawTank(ally, cellSize, false));
       }
       if (gameState.enemies) {
           gameState.enemies.forEach(enemy => this.drawTank(enemy, cellSize, false));
       }
       if (gameState.myTank) {
           this.drawTank(gameState.myTank, cellSize, true);
       }
   }
   
   drawTank(unit, cellSize, isPlayer) {
       const cx = unit.y * cellSize + cellSize/2;
       const cy = unit.x * cellSize + cellSize/2;
       const size = cellSize * 0.7;
       
       const img = this.tankImages[unit.image];
       if (img && img.complete && img.naturalWidth > 0) {
           this.ctx.save();
           this.ctx.shadowBlur = isPlayer ? 10 : 3;
           this.ctx.shadowColor = unit.color;
           
           let rotation = 0;
           switch(unit.direction) {
               case 'up': rotation = -Math.PI / 2; break;
               case 'down': rotation = Math.PI / 2; break;
               case 'left': rotation = Math.PI; break;
               case 'right': rotation = 0; break;
           }
           
           this.ctx.translate(cx, cy);
           this.ctx.rotate(rotation);
           this.ctx.drawImage(img, -size/2, -size/2, size, size);
           this.ctx.setTransform(1, 0, 0, 1, 0, 0);
           this.ctx.restore();
       } else {
           this.ctx.fillStyle = unit.color;
           this.ctx.beginPath();
           this.ctx.arc(cx, cy, size/2, 0, Math.PI * 2);
           this.ctx.fill();
       }
       
       // HP Bar
       const hpPercent = unit.hp / unit.maxHp;
       this.ctx.fillStyle = '#ff5252';
       this.ctx.fillRect(cx - size/2, cy - size/2 - 10, size, 5);
       this.ctx.fillStyle = '#4caf50';
       this.ctx.fillRect(cx - size/2, cy - size/2 - 10, size * hpPercent, 5);
       
       // Name
       this.ctx.fillStyle = 'white';
       this.ctx.font = 'bold 10px Arial';
       this.ctx.shadowBlur = 0;
       this.ctx.fillText(unit.name, cx - 20, cy - size/2 - 15);
       this.ctx.fillStyle = '#ffeb3b';
       this.ctx.font = 'bold 8px Arial';
       this.ctx.fillText(`${unit.hp}`, cx - 8, cy - size/2 - 3);
   }
   
   drawSelectedTarget(gameState, cellSize) {
       const selectedTarget = this.getSelectedTarget();
       if (selectedTarget) {
           this.ctx.strokeStyle = '#ffeb3b';
           this.ctx.lineWidth = 4;
           this.ctx.shadowBlur = 10;
           this.ctx.shadowColor = '#ffeb3b';
           this.ctx.strokeRect(selectedTarget.y * cellSize, selectedTarget.x * cellSize, cellSize, cellSize);
           this.ctx.shadowBlur = 0;
       }
   }
}
