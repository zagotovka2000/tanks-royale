// client/main.js
// Главный файл запуска игры

(function() {
   'use strict';
   
   console.log('🚀 Запуск Tank Royale V2...');
   
   // ============================================
   // ПРОВЕРКА ЗАГРУЗКИ КЛАССОВ
   // ============================================
   
   const requiredClasses = [
       'BootScene', 'GameScene', 
       'AnimationEngine', 'ShootAnimation', 'AnimationHelper',
       'TankSprite', 'TankSprite', 'ParticleSystem',
       'InputController', 'GameController', 'CameraController',
       'HexGrid', 'HexUtils', 'TankGame'
   ];
   
   let allLoaded = true;
   const missingClasses = [];
   const loadedClasses = [];
   
   for (const className of requiredClasses) {
       if (typeof window[className] === 'undefined') {
           console.error(`❌ Класс не загружен: ${className}`);
           allLoaded = false;
           missingClasses.push(className);
       } else {
           console.log(`✅ Класс загружен: ${className}`);
           loadedClasses.push(className);
       }
   }
   
   if (!allLoaded) {
       console.error('❌ Не все классы загружены!');
       console.log('🔍 Отсутствуют:', missingClasses.join(', '));
       console.log('📋 Загружены:', loadedClasses.join(', '));
       // Продолжаем, но с предупреждением
   } else {
       console.log('✅ Все классы успешно загружены!');
   }
   
   // ============================================
   // КОНФИГУРАЦИЯ PHASER
   // ============================================
   
   const config = {
       type: Phaser.AUTO,
       width: window.innerWidth,
       height: window.innerHeight,
       backgroundColor: '#1a2a3a',
       parent: 'game-container',
       scene: [BootScene, GameScene],
       scale: {
           mode: Phaser.Scale.RESIZE,
           autoCenter: Phaser.Scale.CENTER_BOTH,
           width: '100%',
           height: '100%'
       },
       render: {
           pixelArt: false,
           antialias: true,
           roundPixels: true
       },
       // Включаем физику для эффектов
       physics: {
           default: 'arcade',
           arcade: {
               gravity: { y: 0 },
               debug: false
           }
       },
       // Оптимизация
       fps: {
           target: 60,
           forceSetTimeOut: false,
           smoothStep: true
       },
       // Настройки камеры
       camera: {
           zoom: 1,
           smooth: true
       }
   };
   
   console.log('📋 Создание игры с конфигурацией:', config);
   
   // ============================================
   // СОЗДАНИЕ ИГРЫ
   // ============================================
   
   let game = null;
   let gameReady = false;
   
   try {
       game = new Phaser.Game(config);
       gameReady = true;
       console.log('✅ Игра создана успешно');
   } catch (error) {
       console.error('❌ Ошибка создания игры:', error);
       showFatalError('Не удалось создать игру');
       return;
   }
   
   // Глобальная ссылка для отладки
   window.__game = game;
   window.__gameScenes = {
       boot: BootScene,
       game: GameScene
   };
   
   // ============================================
   // ОБРАБОТКА РЕСАЙЗА
   // ============================================
   
   let resizeTimeout = null;
   
   window.addEventListener('resize', () => {
       // Троттлинг ресайза
       if (resizeTimeout) {
           clearTimeout(resizeTimeout);
       }
       
       resizeTimeout = setTimeout(() => {
           if (game && game.scale) {
               game.scale.resize(window.innerWidth, window.innerHeight);
               console.log('📐 Размер обновлен:', window.innerWidth, 'x', window.innerHeight);
               
               // Уведомляем сцену о ресайзе
               try {
                   const scene = game.scene.getScene('GameScene');
                   if (scene && typeof scene.onResize === 'function') {
                       scene.onResize();
                   }
               } catch (error) {
                   console.warn('⚠️ Ошибка при ресайзе сцены:', error);
               }
           }
           resizeTimeout = null;
       }, 200);
   });
   
   // ============================================
   // КЛАВИШИ ДЛЯ ОТЛАДКИ
   // ============================================
   
   document.addEventListener('keydown', (event) => {
       // F12 - режим отладки
       if (event.key === 'F12') {
           event.preventDefault();
           console.log('🐛 Режим отладки');
           try {
               const scene = game.scene.getScene('GameScene');
               if (scene && typeof scene.toggleDebug === 'function') {
                   scene.toggleDebug();
               } else {
                   console.warn('⚠️ GameScene не найден или нет toggleDebug');
               }
           } catch (error) {
               console.error('❌ Ошибка переключения отладки:', error);
           }
       }
       
       // F5 - перезагрузка игры
       if (event.key === 'F5' && event.ctrlKey) {
           event.preventDefault();
           console.log('🔄 Перезагрузка игры...');
           try {
               const scene = game.scene.getScene('GameScene');
               if (scene && typeof scene.shutdown === 'function') {
                   scene.shutdown();
               }
               location.reload();
           } catch (error) {
               console.error('❌ Ошибка перезагрузки:', error);
               location.reload();
           }
       }
       
       // R - сброс игры (без перезагрузки страницы)
       if (event.key === 'r' && !event.ctrlKey && !event.metaKey) {
           console.log('🔄 Сброс игры...');
           try {
               const scene = game.scene.getScene('GameScene');
               if (scene && scene.gameController) {
                   scene.gameController.resetGame();
               } else {
                   console.warn('⚠️ GameController не найден');
               }
           } catch (error) {
               console.error('❌ Ошибка сброса:', error);
           }
       }
   });
   
   // ============================================
   // ОБРАБОТКА ОШИБОК
   // ============================================
   
   // Глобальный обработчик ошибок
   window.addEventListener('error', (event) => {
       console.error('🔥 Глобальная ошибка:', event.error || event.message);
       showError('Произошла ошибка. Проверьте консоль.');
   });
   
   // Обработка необработанных промисов
   window.addEventListener('unhandledrejection', (event) => {
       console.error('🔥 Необработанный промис:', event.reason);
       showError('Ошибка в асинхронном коде. Проверьте консоль.');
   });
   
   // ============================================
   // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   // ============================================
   
   /**
    * Показать фатальную ошибку
    */
   function showFatalError(message) {
       const container = document.getElementById('game-container');
       if (container) {
           container.innerHTML = `
               <div style="
                   display: flex;
                   flex-direction: column;
                   align-items: center;
                   justify-content: center;
                   height: 100vh;
                   background: #1a2a3a;
                   color: #ff4444;
                   font-family: Arial, sans-serif;
                   padding: 20px;
               ">
                   <h1 style="font-size: 32px; margin-bottom: 20px;">💥 КРИТИЧЕСКАЯ ОШИБКА</h1>
                   <p style="font-size: 18px; color: #ff8888;">${message}</p>
                   <button onclick="location.reload()" style="
                       margin-top: 30px;
                       padding: 12px 30px;
                       font-size: 18px;
                       background: #4caf50;
                       color: white;
                       border: none;
                       border-radius: 8px;
                       cursor: pointer;
                   ">Перезагрузить</button>
               </div>
           `;
       }
       console.error('💥 Фатальная ошибка:', message);
   }
   
   /**
    * Показать ошибку
    */
   function showError(message) {
       const container = document.getElementById('game-container');
       if (container) {
           // Ищем или создаем элемент ошибки
           let errorEl = document.getElementById('game-error');
           if (!errorEl) {
               errorEl = document.createElement('div');
               errorEl.id = 'game-error';
               errorEl.style.cssText = `
                   position: fixed;
                   bottom: 20px;
                   left: 50%;
                   transform: translateX(-50%);
                   background: rgba(255, 68, 68, 0.9);
                   color: white;
                   padding: 12px 24px;
                   border-radius: 8px;
                   font-family: Arial, sans-serif;
                   font-size: 14px;
                   z-index: 9999;
                   max-width: 80%;
                   text-align: center;
                   box-shadow: 0 4px 20px rgba(0,0,0,0.5);
               `;
               container.appendChild(errorEl);
           }
           errorEl.textContent = `⚠️ ${message}`;
           errorEl.style.display = 'block';
           
           // Автоматически скрываем через 5 секунд
           setTimeout(() => {
               if (errorEl) {
                   errorEl.style.display = 'none';
               }
           }, 5000);
       }
   }
   
   // ============================================
   // МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
   // ============================================
   
   // Проверка FPS
   let frameCount = 0;
   let fpsCheckTime = 0;
   
   function checkPerformance() {
       frameCount++;
       const now = performance.now();
       
       if (now - fpsCheckTime >= 1000) {
           const fps = Math.round(frameCount * 1000 / (now - fpsCheckTime));
           if (fps < 30) {
               console.warn(`⚠️ Низкий FPS: ${fps}`);
               // Можно показать предупреждение пользователю
           }
           frameCount = 0;
           fpsCheckTime = now;
       }
       
       requestAnimationFrame(checkPerformance);
   }
   
   // Запускаем мониторинг производительности (только в режиме отладки)
   if (window.location.search.includes('debug')) {
       setTimeout(checkPerformance, 2000);
   }
   
   // ============================================
   // ПРОВЕРКА СЦЕН
   // ============================================
   
   setTimeout(() => {
       if (game && game.scene) {
           try {
               const sceneKeys = Object.keys(game.scene.keys);
               console.log('📋 Сцены в игре:', sceneKeys);
               
               if (!sceneKeys.includes('GameScene')) {
                   console.error('❌ GameScene не зарегистрирован в игре!');
                   showError('GameScene не зарегистрирован');
               } else {
                   console.log('✅ GameScene зарегистрирован и готов к работе');
                   
                   // Проверяем, что сцена активна
                   const scene = game.scene.getScene('GameScene');
                   if (scene) {
                       console.log('✅ GameScene активен');
                       if (typeof scene.isReady !== 'undefined') {
                           console.log(`📊 GameScene.isReady: ${scene.isReady}`);
                       }
                   } else {
                       console.warn('⚠️ GameScene не активен');
                   }
               }
           } catch (error) {
               console.warn('⚠️ Ошибка проверки сцен:', error);
           }
       } else {
           console.warn('⚠️ Game или scene не инициализированы');
       }
   }, 1000);
   
   // ============================================
   // ЗАВЕРШЕНИЕ ЗАПУСКА
   // ============================================
   
   console.log('✅ Tank Royale V2 успешно запущен!');
   console.log('📊 Game instance:', game);
   console.log('🔧 Доступны команды:');
   console.log('  - F12: Включить отладку');
   console.log('  - R: Сбросить игру');
   console.log('  - Ctrl+F5: Перезагрузить страницу');
   console.log('  - window.__game: Доступ к игре');
   console.log('  - window.__gameScenes: Доступ к сценам');
   
   // ============================================
   // CLEANUP ПРИ ВЫХОДЕ
   // ============================================
   
   window.addEventListener('beforeunload', () => {
       console.log('🔄 Закрытие игры...');
       if (game) {
           try {
               game.destroy(true);
           } catch (error) {
               console.warn('⚠️ Ошибка при уничтожении игры:', error);
           }
       }
       game = null;
   });
   
})();
