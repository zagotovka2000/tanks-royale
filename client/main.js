// client/main.js

(function() {
   'use strict';
   
   console.log('🚀 Запуск Tank Royale...');
   console.log('🔍 Проверка загрузки сцен:');
   console.log('  - BootScene:', typeof BootScene);
   console.log('  - GameScene:', typeof GameScene);
   
   // Проверяем, что сцены загружены
   if (typeof BootScene === 'undefined' || typeof GameScene === 'undefined') {
       console.error('❌ Сцены не загружены!');
       console.log('🔍 Доступные сцены:', Object.keys(window).filter(k => k.includes('Scene')));
   }
   
   // Конфигурация Phaser
   const config = {
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
   
   // Создаем игру
   const game = new Phaser.Game(config);
   
   // Обработка ресайза
   window.addEventListener('resize', () => {
       game.scale.resize(window.innerWidth, window.innerHeight);
   });
   
   // Глобальная ссылка для отладки
   window.__game = game;
   
   console.log('✅ Tank Royale запущен!');
   console.log('📊 Game instance:', game);
   
})();
