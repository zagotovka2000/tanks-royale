// Главный файл инициализации
let gameController = null;
let threeDRenderer = null;
let socketClient = null;

async function init() {
    console.log('Initializing Tank Royale...');
    
    // Инициализируем звуки
    if (window.soundManager) {
        await window.soundManager.init();
    }
    
    // Создаем сокет клиент
    socketClient = new window.SocketClient(
        (state) => {
            // Обновление состояния игры
            if (gameController) {
                gameController.updateGameState(state);
            }
        },
        (result) => {
            // Результат выстрела
            if (gameController) {
                gameController.onShootResult(result);
            }
        },
        (msg) => {
            // Сообщения
            if (gameController) {
                gameController.showMessage(msg);
            }
        },
        (data) => {
            // Конец игры
            if (gameController) {
                gameController.onGameEnded(data);
            }
        }
    );
    
    // Создаем 3D рендерер
    threeDRenderer = new window.ThreeDRenderer('canvas3d-container');
    const rendererInit = threeDRenderer.init();
    
    if (!rendererInit) {
        console.error('Failed to initialize 3D renderer');
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'flex';
        gameController?.showMessage('⚠️ Ошибка инициализации 3D. Перезагрузите страницу');
        return;
    }
    
    // Создаем контроллер игры
    gameController = new window.GameController(socketClient, threeDRenderer);
    gameController.init();
    
    // Подключаемся к серверу
    const userId = 'player_' + Math.random().toString(36).substr(2, 8);
    const userName = 'Командир';
    
    socketClient.connect(userId, userName);
    
    // Скрываем загрузочный экран
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const gameScreen = document.getElementById('gameScreen');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex';
        
        gameController?.showMessage('✅ Добро пожаловать! Кликните на СВОЙ ТАНК для переключения режима');
        gameController?.showMessage('🟢 Режим движения: клик на зеленую клетку');
        gameController?.showMessage('🔴 Режим стрельбы: выберите цель и нажмите ВЫСТРЕЛ');
    }, 1000);
}

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    gameController?.showMessage(`⚠️ Ошибка: ${e.message}`);
});

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Очистка при выгрузке страницы
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
