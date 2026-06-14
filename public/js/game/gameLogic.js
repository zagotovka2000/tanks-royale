// public/js/game/gameLogic.js - УДАЛИТЕ ВСЕ и оставьте только:

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
};

window.showMessage = function(text) {
    const container = document.getElementById('messages');
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
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
    
    if (window.gameState.myTank) {
        window.gameState.myTank.direction = dir;
    }
    
    if (window.soundManager) window.soundManager.play('shoot');
    
    const target = window.selectedTarget;
    window.selectedTarget = null;
    document.getElementById('targetStatus').textContent = 'нет';
    
    if (window.socketClient) window.socketClient.sendShoot(target.q, target.r);
};

window.resetGame = function() {
    if (window.socketClient) window.socketClient.resetGame();
    window.selectedTarget = null;
    window.isMyTankSelected = false;
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    window.showMessage('🔄 Новая битва!');
};
