console.log('GameController.js loading...');

class GameController {
    constructor(socketClient, renderer) {
        this.socket = socketClient;
        this.renderer = renderer;
        this.updateBuffer = null;
        this.gameState = null;
        this.selectedTarget = null;
        this.moveMode = false;
        this.lastShootTime = 0;
        this.lastMoveTime = 0;
        this.shootCooldown = 5000; // 5 seconds
        this.moveCooldown = 5000; // 5 seconds
        this.boundHandlers = new Map();
        this.throttleDelay = 100;
        this.lastClickTime = 0;
    }

    init() {
        this.updateBuffer = new UpdateBuffer(this.renderer, 50);
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        const container = document.getElementById('canvas3d-container');
        if (container) {
            const clickHandler = (e) => this.throttleClick(e);
            container.addEventListener('click', clickHandler);
            this.boundHandlers.set('canvasClick', clickHandler);
        }

        const moveModeBtn = document.getElementById('moveModeBtn');
        if (moveModeBtn) {
            const handler = () => this.setMode('move');
            moveModeBtn.addEventListener('click', handler);
            this.boundHandlers.set('moveMode', handler);
        }

        const shootModeBtn = document.getElementById('shootModeBtn');
        if (shootModeBtn) {
            const handler = () => this.setMode('shoot');
            shootModeBtn.addEventListener('click', handler);
            this.boundHandlers.set('shootMode', handler);
        }

        const shootActionBtn = document.querySelector('.shoot-action-btn') || document.querySelector('.shoot-btn');
        if (shootActionBtn) {
            const handler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.executeShoot();
            };
            shootActionBtn.addEventListener('click', handler);
            this.boundHandlers.set('shootAction', handler);
        }
    }

    setMode(mode) {
        this.moveMode = (mode === 'move');
        this.updateUI();
    }

    throttleClick(event) {
        const now = Date.now();
        if (now - this.lastClickTime < this.throttleDelay) return;
        this.lastClickTime = now;
        this.onCanvasClick(event);
    }

    updateGameState(state) {
        this.gameState = state;
        this.updateUI();
        if (this.updateBuffer) {
            this.updateBuffer.scheduleUpdate(state, 'full');
        }
    }

    updateUI() {
        if (!this.gameState?.myTank) return;
        
        const hpValue = document.getElementById('hpValue');
        if (hpValue) hpValue.textContent = `${this.gameState.myTank.hp}/${this.gameState.myTank.maxHp}`;
        
        const killsValue = document.getElementById('killsValue');
        if (killsValue) killsValue.textContent = this.gameState.myTank.kills || 0;
    }

    screenToHex(screenX, screenY) {
        if (!this.renderer?.camera || !this.renderer.scene) {
            return { q: -1, r: -1 };
        }
        
        const container = document.getElementById('canvas3d-container');
        if (!container) return { q: -1, r: -1 };
        
        const rect = container.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.renderer.camera);
        
        const intersects = raycaster.intersectObjects(
            Array.from(this.renderer.hexMeshes.values())
        );
        
        if (intersects.length > 0) {
            const userData = intersects[0].object.userData;
            if (userData && userData.q !== undefined && userData.r !== undefined) {
                return { q: userData.q, r: userData.r };
            }
        }
        
        return { q: -1, r: -1 };
    }

    onCanvasClick(event) {
        if (!this.renderer || !this.gameState?.myTank) return;
        
        const hex = this.screenToHex(event.clientX, event.clientY);
        if (!hex || (hex.q === -1 && hex.r === -1)) return;
        
        if (this.moveMode) {
            const now = Date.now();
            const moveCooldown = Math.max(0, this.moveCooldown - (now - this.lastMoveTime));
            if (moveCooldown > 0) {
                this.showMessage(`Перезарядка движения: ${Math.ceil(moveCooldown/1000)}с`);
            } else {
                this.socket.sendMove(hex.q, hex.r);
                this.lastMoveTime = now;
            }
        } else {
            this.selectedTarget = { q: hex.q, r: hex.r };
        }
    }

    executeShoot() {
        if (!this.selectedTarget || !this.gameState?.myTank) return;
        const now = Date.now();
        const shootCooldown = Math.max(0, this.shootCooldown - (now - this.lastShootTime));
        if (shootCooldown > 0) {
            this.showMessage(`Перезарядка стрельбы: ${Math.ceil(shootCooldown/1000)}с`);
        } else {
            this.socket.sendShoot(this.selectedTarget.q, this.selectedTarget.r);
            this.lastShootTime = now;
        }
    }

    showMessage(text) {
        console.log('Message:', text);
        const container = document.getElementById('messages');
        if (!container) return;
        
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = text;
        container.appendChild(msg);
        
        setTimeout(() => {
            if (msg && msg.remove) msg.remove();
        }, 3000);
    }

    onShootResult(result) {
        if (!result) return;
        
        if (result.hit) {
            this.showMessage(result.message || 'Попадание!');
        } else {
            this.showMessage(result.message || 'Промах!');
        }
    }

    dispose() {
        this.boundHandlers.forEach((handler, name) => {
            if (name === 'canvasClick') {
                document.getElementById('canvas3d-container')?.removeEventListener('click', handler);
            } else {
                document.getElementById(name + 'Btn')?.removeEventListener('click', handler);
            }
        });
    }
}

if (typeof window !== 'undefined') {
    window.GameController = GameController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameController };
}
