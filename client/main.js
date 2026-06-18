// client/main.js

(function() {
   console.log('🚀 Запуск Tank Royale...');
   
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
   
   // Создаем игру
   var game = new Phaser.Game(config);
   
   // Обработка ресайза
   window.addEventListener('resize', function() {
       game.scale.resize(window.innerWidth, window.innerHeight);
   });
   
   console.log('✅ Игра создана!');
   
   // Глобальная ссылка для отладки
   window.__game = game;
})();
