// public/js/main.js

let gameController = null;
let threeDRenderer = null;
let socketClient = null;
let isInitialized = false;

async function init() {
    console.log('Initializing Tank Royale...');
    
    if (document.readyState !== 'complete') {
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = loadingScreen?.querySelector('h2');
    
    try {
        const container = document.getElementById('canvas3d-container');
        if (!container) {
            throw new Error('Canvas container not found');
        }
        
        const rect = container.parentElement?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            console.log('Container not ready, waiting...');
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (window.soundManager) {
            if (loadingText) loadingText.textContent = 'Загрузка звуков...';
            await window.soundManager.init();
        }
        
        if (loadingText) loadingText.textContent = 'Подключение к серверу...';
        socketClient = new window.SocketClient(
            (state) => {
                if (gameController && isInitialized) {
                    gameController.updateGameState(state);
                }
            },
            (result) => {
                if (gameController && isInitialized) {
                    gameController.onShootResult(result);
                }
            },
            (msg) => {
                if (gameController && isInitialized) {
                    gameController.showMessage(msg);
                }
            },
            (data) => {
                if (gameController && isInitialized) {
                    gameController.onGameEnded(data);
                }
            }
        );
        
        if (loadingText) loadingText.textContent = 'Загрузка 3D движка...';
        threeDRenderer = new window.ThreeDRenderer('canvas3d-container');
        
        let rendererReady = false;
        let retries = 0;
        const maxRetries = 10;
        
        while (!rendererReady && retries < maxRetries) {
            rendererReady = threeDRenderer.init();
            if (!rendererReady) {
                console.log(`Renderer init attempt ${retries + 1} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 200));
                retries++;
            }
        }
        
        if (!rendererReady) {
            throw new Error('3D renderer failed to initialize');
        }
        
        if (loadingText) loadingText.textContent = 'Подготовка игры...';
        gameController = new window.GameController(socketClient, threeDRenderer);
        window.gameController = gameController; // ВАЖНО: обновляем глобальную переменную
        gameController.init();
        
        const userId = 'player_' + Math.random().toString(36).substr(2, 8);
        const userName = 'Командир';
        
        socketClient.connect(userId, userName);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        isInitialized = true;
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) gameScreen.style.display = 'flex';
        
        setTimeout(() => {
            if (threeDRenderer && threeDRenderer.onWindowResize) {
                threeDRenderer.onWindowResize();
            }
        }, 200);
        
        setTimeout(() => {
            if (gameController) {
                gameController.showMessage('✅ Добро пожаловать в Tank Royale!');
                gameController.showMessage('🔫 По умолчанию - РЕЖИМ СТРЕЛЬБЫ');
                gameController.showMessage('👆 Нажмите на СВОЙ ТАНК для переключения на ДВИЖЕНИЕ');
                gameController.showMessage('🎯 В режиме стрельбы кликните на ВРАГА для выбора цели');
                gameController.showMessage('🔫 Затем нажмите красную кнопку для выстрела');
            }
        }, 1000);
        
        console.log('Game initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="color: red; text-align: center; padding: 20px;">
                    <h2>❌ Ошибка инициализации</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #e94560; color: white; border: none; border-radius: 10px;">Перезагрузить</button>
                </div>
            `;
        }
    }
}

init();

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

window.addEventListener('resize', () => {
    if (threeDRenderer && threeDRenderer.onWindowResize) {
        setTimeout(() => threeDRenderer.onWindowResize(), 100);
    }
});

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
