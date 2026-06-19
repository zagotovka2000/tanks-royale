// client/main.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

(function() {
   'use strict';
   
   console.log('🚀 Запуск Tank Royale...');
   console.log('🔍 Проверка загрузки сцен:');
   console.log('  - BootScene:', typeof BootScene);
   console.log('  - GameScene:', typeof GameScene);
   
   // Проверяем загрузку всех необходимых классов
   var requiredClasses = ['BootScene', 'GameScene', 'HexGrid', 'GameController', 'InputController', 'TankSprite', 'HexUtils'];
   var allLoaded = true;
   var missingClasses = [];
   
   requiredClasses.forEach(function(className) {
       if (typeof window[className] === 'undefined') {
           console.error('❌ Класс не загружен:', className);
           allLoaded = false;
           missingClasses.push(className);
       } else {
           console.log('✅ Класс загружен:', className);
       }
   });
   
   // Если чего-то не хватает
   if (!allLoaded) {
       console.error('❌ Не все классы загружены!');
       console.log('🔍 Отсутствуют:', missingClasses.join(', '));
   }
   
   // Конфигурация Phaser
   var config = {
       type: Phaser.AUTO,
       width: window.innerWidth,
       height: window.innerHeight,
       backgroundColor: '#1a2a3a',
       parent: 'game-container',
       scene: [BootScene, GameScene],
       scale: {
           mode: Phaser.Scale.RESIZE,
           autoCenter: Phaser.Scale.CENTER_BOTH
       },
       render: {
           pixelArt: false,
           antialias: true
       }
   };
   
   console.log('📋 Создание игры с конфигурацией:', config);
   
   // Создаем игру
   var game = new Phaser.Game(config);
   
   // Обработка ресайза
   window.addEventListener('resize', function() {
       if (game && game.scale) {
           game.scale.resize(window.innerWidth, window.innerHeight);
           console.log('📐 Размер обновлен:', window.innerWidth, 'x', window.innerHeight);
       }
   });
   
   // Глобальная ссылка для отладки
   window.__game = game;
   window.__gameScenes = {
       boot: BootScene,
       game: GameScene
   };
   
   console.log('✅ Tank Royale запущен!');
   console.log('📊 Game instance:', game);
   
   // ✅ ИСПРАВЛЕННАЯ ПРОВЕРКА СЦЕН
   setTimeout(function() {
       if (game && game.scene) {
           var sceneKeys = Object.keys(game.scene.keys);
           console.log('📋 Сцены в игре:', sceneKeys);
           if (!sceneKeys.includes('GameScene')) {
               console.error('❌ GameScene не зарегистрирован в игре!');
           } else {
               console.log('✅ GameScene зарегистрирован и готов к работе');
           }
       }
   }, 100);
   
})();
