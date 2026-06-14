// public/js/main.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
let threeDRenderer = null;

window.gameState = null;
window.selectedTarget = null;
window.isMyTankSelected = false;
window.socketClient = null;

// Конвертация экранных координат в гексагональные
function screenToHex(screenX, screenY) {
    if (!threeDRenderer || !threeDRenderer.camera || !threeDRenderer.scene) {
        return { q: -1, r: -1 };
    }
    
    const container = document.getElementById('canvas3d-container');
    const rect = container.getBoundingClientRect();
    
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), threeDRenderer.camera);
    
    const intersects = raycaster.intersectObjects(Array.from(threeDRenderer.hexMeshes.values()));
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const userData = hit.object.userData;
        if (userData && userData.q !== undefined && userData.r !== undefined) {
            return { q: userData.q, r: userData.r };
        }
    }
    
    return { q: -1, r: -1 };
}

// Обработчик клика
function onCanvasClick(event) {
    if (!threeDRenderer || !window.gameState) return;
    
    const hex = screenToHex(event.clientX, event.clientY);
    
    if (hex.q === -1) return;
    
    const player = window.gameState.myTank;
    const isMyTank = (player.q === hex.q && player.r === hex.r);
    
    const HEX_DIRECTIONS = [
        { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 },
        { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }
    ];
    const adjacent = HEX_DIRECTIONS.some(dir => player.q + dir.q === hex.q && player.r + dir.r === hex.r);
    const hasWall = window.gameState.walls?.some(w => w.q === hex.q && w.r === hex.r);
    
    // Клик по своему танку
    if (isMyTank) {
        window.isMyTankSelected = !window.isMyTankSelected;
        window.selectedTarget = null;
        if (window.isMyTankSelected) {
            window.showMessage('✅ Танк выбран. Нажмите на ЗЕЛЁНУЮ клетку для движения');
            document.getElementById('modeStatus').textContent = '🚶 ДВИЖЕНИЕ';
            document.getElementById('modeStatus').style.color = '#4caf50';
        } else {
            window.showMessage('🔘 Режим: СТРЕЛЬБА');
            document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
            document.getElementById('modeStatus').style.color = '#e94560';
        }
        return;
    }
    
    // Движение
    if (window.isMyTankSelected && adjacent && !hasWall) {
        const dq = hex.q - player.q;
        const dr = hex.r - player.r;
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
        
        window.move(dir);
        window.isMyTankSelected = false;
        document.getElementById('modeStatus').textContent = '🔫 СТРЕЛЬБА';
        document.getElementById('modeStatus').style.color = '#e94560';
        return;
    }
    
    // Выбор цели
    if (!window.isMyTankSelected) {
        window.selectTarget(hex.q, hex.r);
    } else if (hasWall) {
        window.showMessage('🧱 Там стена! Нельзя пройти');
    } else {
        window.showMessage('⚠️ Нажмите на ЗЕЛЁНУЮ подсвеченную клетку для движения');
    }
}

// Инициализация 3D
function init3DRenderer() {
    if (typeof THREE === 'undefined') {
        console.error('THREE not loaded');
        setTimeout(init3DRenderer, 500);
        return;
    }
    
    const container = document.getElementById('canvas3d-container');
    if (!container) {
        console.error('canvas3d-container not found');
        return;
    }
    
    // ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ ВЫСОТУ
    const parent = container.parentElement;
    if (parent) {
        const rect = parent.getBoundingClientRect();
        console.log('Parent rect height:', rect.height);
        if (rect.height === 0) {
            container.style.height = '500px';
            container.style.width = '100%';
            console.log('Set manual height: 500px');
        }
    }
    
    if (typeof window.ThreeDRenderer === 'undefined') {
        console.error('ThreeDRenderer not loaded');
        setTimeout(init3DRenderer, 500);
        return;
    }
    
    try {
        threeDRenderer = new window.ThreeDRenderer('canvas3d-container');
        const success = threeDRenderer.init();
        if (success) {
            console.log('✅ 3D Renderer ready');
            container.addEventListener('click', onCanvasClick);
            
            // Принудительно обновляем размеры
            setTimeout(() => {
                if (threeDRenderer && threeDRenderer.renderer) {
                    const rect = container.getBoundingClientRect();
                    console.log('Final container size:', rect.width, 'x', rect.height);
                    if (rect.width > 0 && rect.height > 0) {
                        threeDRenderer.renderer.setSize(rect.width, rect.height);
                        threeDRenderer.camera.aspect = rect.width / rect.height;
                        threeDRenderer.camera.updateProjectionMatrix();
                    }
                }
            }, 200);
            
            if (window.gameState) {
                threeDRenderer.drawMap(window.gameState);
                threeDRenderer.updateTanks(window.gameState);
            }
        }
    } catch (err) {
        console.error('Failed:', err);
    }
}

// Остальные функции
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
    if (threeDRenderer && threeDRenderer.highlightHex) {
        threeDRenderer.highlightHex(q, r, 0xffeb3b);
    }
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
    
    if (threeDRenderer && threeDRenderer.addShotAnimation) {
        threeDRenderer.addShotAnimation(fromQ, fromR, toQ, toR, () => {
            if (window.socketClient) window.socketClient.sendShoot(target.q, target.r);
        });
    } else {
        if (window.socketClient) window.socketClient.sendShoot(target.q, target.r);
    }
};

window.resetGame = function() {
    if (window.socketClient) window.socketClient.resetGame();
    window.selectedTarget = null;
    window.isMyTankSelected = false;
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    window.showMessage('🔄 Новая битва!');
};

function initButtons() {
    document.querySelectorAll('.hex-controls button[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => window.move(btn.getAttribute('data-dir')));
    });
    
    document.getElementById('shootBtn')?.addEventListener('click', () => window.shoot());
    document.getElementById('resetBtn')?.addEventListener('click', () => window.resetGame());
    document.getElementById('newGameBtn')?.addEventListener('click', () => window.resetGame());
    
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        if (threeDRenderer && threeDRenderer.zoomIn) threeDRenderer.zoomIn();
    });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        if (threeDRenderer && threeDRenderer.zoomOut) threeDRenderer.zoomOut();
    });
    document.getElementById('resetZoomBtn')?.addEventListener('click', () => {
        if (threeDRenderer && threeDRenderer.resetZoom) threeDRenderer.resetZoom();
    });
}

async function init() {
    console.log('Initializing game...');
    
    await window.soundManager.init();
    
    window.socketClient = new window.SocketClient(
        (state) => {
            window.gameState = state;
            window.updateStats();
            window.updateCooldown(state.lastActionTime);
            
            if (threeDRenderer) {
                threeDRenderer.drawMap(state);
                threeDRenderer.updateTanks(state);
            }
        },
        (result) => {
            // Временно отключаем эффекты, пока не заработает 3D
            console.log('Shot result:', result);
            window.showMessage(result.message);
        },
        (msg) => window.showMessage(msg),
        (data) => {
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('gameOverScreen').style.display = 'flex';
            document.getElementById('winnerText').innerHTML = `${data.winner}<br>🏅 Убийств: ${data.kills || 0}`;
        }
    );
    
    const userId = 'player_' + Math.random().toString(36).substr(2, 6);
    const userName = 'Командир';
    
    window.socketClient.connect(userId, userName);
    
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'flex';
    window.showMessage('✅ Добро пожаловать! Кликните на СВОЙ ТАНК для движения');
}

// Запуск
init();
initButtons();
window.addEventListener('load', () => {
    setTimeout(init3DRenderer, 1000);
});
