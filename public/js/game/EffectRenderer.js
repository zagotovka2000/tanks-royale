export class EffectRenderer {
   constructor(ctx, getGameState) {
       this.ctx = ctx;
       this.getGameState = getGameState;
       this.particles = [];
       this.smokeParticles = [];
   }
   
   addExplosion(x, y) {
       for (let i = 0; i < 30; i++) {
           this.particles.push({
               x: x, y: y,
               vx: (Math.random() - 0.5) * 12,
               vy: (Math.random() - 0.5) * 12 - 2,
               life: 1,
               size: Math.random() * 6 + 3,
               color: `hsl(${Math.random() * 60 + 20}, 100%, 55%)`
           });
       }
       
       for (let i = 0; i < 15; i++) {
           this.smokeParticles.push({
               x: x, y: y,
               vx: (Math.random() - 0.5) * 3,
               vy: (Math.random() - 0.5) * 3 - 1,
               life: 1,
               size: Math.random() * 8 + 4,
               color: `rgba(100, 100, 100, ${Math.random() * 0.5 + 0.3})`
           });
       }
   }
   
   addHit(x, y) {
       for (let i = 0; i < 15; i++) {
           this.particles.push({
               x: x, y: y,
               vx: (Math.random() - 0.5) * 8,
               vy: (Math.random() - 0.5) * 8,
               life: 0.8,
               size: Math.random() * 4 + 2,
               color: `hsl(${Math.random() * 40 + 40}, 100%, 60%)`
           });
       }
   }
   
   update() {
       this.particles = this.particles.filter(p => {
           p.x += p.vx * 0.1;
           p.y += p.vy * 0.1;
           p.life -= 0.03;
           return p.life > 0;
       });
       
       this.smokeParticles = this.smokeParticles.filter(p => {
           p.x += p.vx * 0.05;
           p.y += p.vy * 0.05;
           p.life -= 0.01;
           return p.life > 0;
       });
   }
   
   draw(gameState) {
       this.update();
       
       const cellSize = 600 / (gameState?.size || 15);
       
       this.particles.forEach(p => {
           this.ctx.fillStyle = p.color;
           this.ctx.globalAlpha = p.life;
           this.ctx.fillRect(p.y * cellSize + cellSize/2 - p.size/2, p.x * cellSize + cellSize/2 - p.size/2, p.size, p.size);
       });
       
       this.smokeParticles.forEach(p => {
           this.ctx.fillStyle = p.color;
           this.ctx.globalAlpha = p.life;
           this.ctx.beginPath();
           this.ctx.arc(p.y * cellSize + cellSize/2, p.x * cellSize + cellSize/2, p.size, 0, Math.PI * 2);
           this.ctx.fill();
       });
       
       this.ctx.globalAlpha = 1;
   }
   
   clearEffects() {
       this.particles = [];
       this.smokeParticles = [];
   }
}
