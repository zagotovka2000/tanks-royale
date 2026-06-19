// client/main.js - ИСПРАВЛЕННЫЙ ПОРЯДОК ЗАГРУЗКИ

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
   
   // Проверяем, загружены ли сцены
   if (typeof BootScene === 'undefined' || typeof GameScene === 'undefined') {
       console.error('❌ Сцены не загружены!');
       console.log('🔍 Доступные сцены:', Object.keys(window).filter(function(k) { 
           return k.includes('Scene'); 
       }));
       allLoaded = false;
   }
   
   // Если чего-то не хватает, пробуем загрузить
   if (!allLoaded) {
       console.error('❌ Не все классы загружены! Проверьте порядок подключения скриптов.');
       console.log('🔍 Отсутствуют:', missingClasses.join(', '));
       console.log('🔍 Доступные классы:', Object.keys(window).filter(function(k) { 
           return typeof window[k] === 'function'; 
       }));
       
       // Пытаемся загрузить недостающие классы динамически
       if (typeof BootScene === 'undefined') {
           console.warn('⚠️ BootScene не найден, создаем заглушку...');
           window.BootScene = function() {
               Phaser.Scene.call(this, { key: 'BootScene' });
           };
           BootScene.prototype = Object.create(Phaser.Scene.prototype);
           BootScene.prototype.constructor = BootScene;
           BootScene.prototype.create = function() {
               console.log('🔄 BootScene: переход к GameScene');
               this.scene.start('GameScene');
           };
       }
       
       if (typeof GameScene === 'undefined') {
           console.error('❌ GameScene не загружен! Игра не может быть запущена.');
           // Создаем заглушку, чтобы игра не падала
           window.GameScene = function() {
               Phaser.Scene.call(this, { key: 'GameScene' });
           };
           GameScene.prototype = Object.create(Phaser.Scene.prototype);
           GameScene.prototype.constructor = GameScene;
           GameScene.prototype.create = function() {
               console.error('❌ GameScene - заглушка! Реальная сцена не загружена.');
               this.add.text(400, 300, 'ОШИБКА ЗАГРУЗКИ!\nGameScene не найден', {
                   fontSize: '32px',
                   color: '#ff0000',
                   align: 'center'
               }).setOrigin(0.5);
           };
       }
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
   console.log('📋 Доступные сцены:', game.scene ? game.scene.keys : 'недоступно');
   
   // Проверяем, что сцены зарегистрированы
   setTimeout(function() {
       if (game && game.scene) {
           console.log('📋 Сцены в игре:', game.scene.keys);
           if (game.scene.keys.indexOf('GameScene') === -1) {
               console.error('❌ GameScene не зарегистрирован в игре!');
           } else {
               console.log('✅ GameScene зарегистрирован и готов к работе');
           }
       }
   }, 100);
   
})();
