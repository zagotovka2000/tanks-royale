let gameController = null;
let threeDRenderer = null;
let socketClient = null;
let isInitialized = false;

async function init() {
    console.log('Initializing Tank Royale...');
    
    try {
        if (window.soundManager) {
            await window.soundManager.init();
        }
        
        socketClient = new window.SocketClient(
            (state) => {
                if (gameController) {
                    gameController.updateGameState(state);
                }
            },
            (result) => {
                if (gameController) {
                    gameController.onShootResult(result);
                }
            },
            (msg) => {
                if (gameController) {
                    gameController.showMessage(msg);
                }
            },
            (data) => {
                if (gameController) {
                    gameController.onGameEnded(data);
                }
            }
        );
        
        threeDRenderer = new window.ThreeDRenderer('canvas3d-container');
        const rendererInit = threeDRenderer.init();
        
        if (!rendererInit) {
            throw new Error('Failed to initialize 3D renderer');
        }
        
        gameController = new window.GameController(socketClient, threeDRenderer);
        gameController.init();
        
        const userId = 'player_' + Math.random().toString(36).substr(2, 8);
        const userName = 'Командир';
        
        socketClient.connect(userId, userName);
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const gameScreen = document.getElementById('gameScreen');
            
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (gameScreen) gameScreen.style.display = 'flex';
            
            if (gameController) {
                gameController.showMessage('✅ Добро пожаловать! Кликните на СВОЙ ТАНК для переключения режима');
                gameController.showMessage('🟢 Режим движения: клик на зеленую клетку');
                gameController.showMessage('🔫 Режим стрельбы: выберите цель и нажмите ВЫСТРЕЛ');
            }
            
            isInitialized = true;
        }, 1000);
        
    } catch (error) {
        console.error('Initialization error:', error);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="color: red; text-align: center;">
                    <h2>❌ Ошибка инициализации</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Перезагрузить</button>
                </div>
            `;
        }
    }
}

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (gameController && isInitialized) {
        gameController.showMessage(`⚠️ Ошибка: ${e.message}`);
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    if (gameController && isInitialized) {
        gameController.showMessage(`⚠️ Ошибка: ${e.reason?.message || 'Неизвестная ошибка'}`);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.addEventListener('beforeunload', () => {
    if (gameController) {
        gameController.dispose();
    }
    if (threeDRenderer) {
        threeDRenderer.dispose();
    }
    if (socketClient) {
        socketClient.disconnect();
    }
});
