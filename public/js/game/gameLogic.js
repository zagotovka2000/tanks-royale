// public/js/game/gameLogic.js
window.gameState = null;
window.selectedTarget = null;
window.isMyTankSelected = false;
window.socketClient = null;

window.updateStats = function() {
    if (!window.gameState) return;
    document.getElementById('hpValue').textContent = `${window.gameState.myTank.hp}/${window.gameState.myTank.maxHp}`;
    document.getElementById('killsValue').textContent = window.gameState.myTank.kills || 0;
    document.getElementById('enemiesValue').textContent = window.gameState.enemies?.length || 0;
};

window.updateCooldown = function(lastActionTime) {
    const COOLDOWN_TIME = 2000;
    function update() {
        const now = Date.now();
        const elapsed = now - lastActionTime;
        if (elapsed < COOLDOWN_TIME) {
            const remaining = COOLDOWN_TIME - elapsed;
            const percent = (remaining / COOLDOWN_TIME) * 100;
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
    }
    update();
};

window.selectTarget = function(q, r) {
    window.selectedTarget = { q, r };
    window.showMessage(`🎯 Цель: (${q},${r})`);
    document.getElementById('targetStatus').textContent = `(${q},${r})`;
    if (window.drawGame) window.drawGame();
};

window.showMessage = function(text) {
    const container = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
};

window.handleShootResult = function(result) {
    if (result.attackerId && window.gameState && result.attackerId !== window.gameState.myTank?.id) {
        if (result.fromQ !== undefined && result.fromR !== undefined) {
            if (window.soundManager) window.soundManager.play('shoot');
            const targetQ = result.targetQ !== undefined ? result.targetQ : result.targetX;
            const targetR = result.targetR !== undefined ? result.targetR : result.targetY;
            window.addProjectileAnimationFromServer(result.fromQ, result.fromR, targetQ, targetR, () => {
                if (result.hit) window.addExplosionEffect(result.targetX, result.targetY);
                else window.addMissEffect(result.targetQ, result.targetR);
                if (result.wallDestroyed) window.addWallBreakEffect(result.targetQ, result.targetR);
                window.showMessage(result.message);
                if (window.drawGame) window.drawGame();
            });
            if (window.drawGame) window.drawGame();
            return;
        }
    }
    if (result.hit) window.addExplosionEffect(result.targetX, result.targetY);
    else window.addMissEffect(result.targetQ, result.targetR);
    if (result.wallDestroyed) window.addWallBreakEffect(result.targetQ, result.targetR);
    window.showMessage(result.message);
    if (window.drawGame) window.drawGame();
};

window.move = function(direction) {
   if (!window.gameState?.myTank || window.gameState.gameOver) return;
   const myTank = window.gameState.myTank;
   let targetQ = myTank.q, targetR = myTank.r;
   
   switch(direction) {
       case 'up': targetR--; break;
       case 'up-right': targetQ++; targetR--; break;
       case 'right': targetQ++; break;
       case 'down-right': targetQ++; targetR++; break;
       case 'down': targetR++; break;
       case 'down-left': targetQ--; targetR++; break;
       case 'left': targetQ--; break;
       case 'up-left': targetQ--; targetR--; break;
       default: return;
   }
   
   const cellExists = window.gameState.cells?.some(cell => cell.q === targetQ && cell.r === targetR);
   if (!cellExists) {
       window.showMessage(`❌ Нельзя туда двигаться`);
       return;
   }
   const hasWall = window.gameState.walls?.some(w => w.q === targetQ && w.r === targetR);
   if (hasWall) {
       window.showMessage(`🧱 Там стена! Нельзя пройти`);
       return;
   }
   const isOccupied = [...(window.gameState.enemies || []), ...(window.gameState.allies || [])].some(
       u => u.active !== false && u.q === targetQ && u.r === targetR
   );
   if (isOccupied) {
       window.showMessage(`⚠️ Клетка занята другим танком`);
       return;
   }
   
   // Поворачиваем танк перед движением
   if (window.gameState.myTank) {
       window.gameState.myTank.direction = direction;
   }
   
   if (window.socketClient) window.socketClient.sendMove(targetQ, targetR);
   window.showMessage(`🚶 Движение на (${targetQ},${targetR})`);
};
window.shoot = function() {
   if (!window.selectedTarget) {
       window.showMessage('⚠️ Сначала выберите цель (нажмите на клетку)');
       return;
   }
   if (!window.gameState || window.gameState.gameOver) return;
   if (window.projectiles && window.projectiles.length > 0) {
       window.showMessage('⏳ Дождитесь окончания выстрела');
       return;
   }
   
   // Поворачиваем танк в сторону цели
   const fromQ = window.gameState.myTank.q;
   const fromR = window.gameState.myTank.r;
   const toQ = window.selectedTarget.q;
   const toR = window.selectedTarget.r;
   
   const dq = toQ - fromQ;
   const dr = toR - fromR;
   let dir = 'right';
   
   if (dq === 0 && dr === -1) dir = 'up';
   else if (dq === 1 && dr === -1) dir = 'up-right';
   else if (dq === 1 && dr === 0) dir = 'right';
   else if (dq === 0 && dr === 1) dir = 'down';
   else if (dq === -1 && dr === 1) dir = 'down-left';
   else if (dq === -1 && dr === 0) dir = 'left';
   else if (dq === -1 && dr === -1) dir = 'up-left';
   else if (dq === 1 && dr === 1) dir = 'down-right';
   
   if (window.gameState.myTank) {
       window.gameState.myTank.direction = dir;
   }
   
   if (window.soundManager) window.soundManager.play('shoot');
   
   const target = window.selectedTarget;
   window.selectedTarget = null;
   document.getElementById('targetStatus').textContent = 'нет';
   
   window.addProjectileAnimation(fromQ, fromR, toQ, toR, () => {
       if (window.socketClient) window.socketClient.sendShoot(target.q, target.r);
   });
};
window.resetGame = function() {
    if (window.socketClient) window.socketClient.resetGame();
    window.selectedTarget = null;
    window.isMyTankSelected = false;
    window.clearAnimations();
    window.panX = 0;
    window.panY = 0;
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    window.showMessage('🔄 Новая битва!');
    if (window.drawGame) window.drawGame();
};
