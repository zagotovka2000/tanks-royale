export class UIManager {
   constructor() {
       this.cooldownInterval = null;
   }
   
   updateStats(gameState) {
       if (!gameState) return;
       document.getElementById('hpValue').textContent = `${gameState.myTank.hp}/${gameState.myTank.maxHp}`;
       document.getElementById('killsValue').textContent = gameState.myTank.kills;
       document.getElementById('enemiesValue').textContent = gameState.enemies?.length || 0;
   }
   
   updateCooldown(lastActionTime) {
       const update = () => {
           const now = Date.now();
           const elapsed = now - lastActionTime;
           const cooldownTime = 20000;
           
           if (elapsed < cooldownTime) {
               const remaining = cooldownTime - elapsed;
               const percent = (remaining / cooldownTime) * 100;
               const seconds = Math.ceil(remaining / 1000);
               const fill = document.getElementById('cooldownFill');
               const text = document.getElementById('cooldownText');
               if (fill) fill.style.width = `${percent}%`;
               if (text) text.textContent = `${seconds}с`;
               setTimeout(update, 100);
           } else {
               const fill = document.getElementById('cooldownFill');
               const text = document.getElementById('cooldownText');
               if (fill) fill.style.width = `0%`;
               if (text) text.textContent = `готов`;
           }
       };
       update();
   }
   
   updateTargetStatus(status) {
       const element = document.getElementById('targetStatus');
       if (element) element.textContent = status;
   }
   
   showMessage(text) {
       const container = document.getElementById('messages');
       const msg = document.createElement('div');
       msg.className = 'message';
       msg.textContent = text;
       container.appendChild(msg);
       setTimeout(() => msg.remove(), 2500);
   }
   
   showGameOver(winner, kills) {
       document.getElementById('gameScreen').style.display = 'none';
       document.getElementById('gameOverScreen').style.display = 'flex';
       document.getElementById('winnerText').innerHTML = `${winner}<br>🏅 Убийств: ${kills}`;
   }
   
   hideGameOver() {
       document.getElementById('gameOverScreen').style.display = 'none';
       document.getElementById('gameScreen').style.display = 'flex';
   }
}
