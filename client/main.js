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
// client/main.js - ДОБАВЛЯЕМ В КОНЕЦ ФАЙЛА

// ✅ ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ СИНХРОНИЗАЦИИ АНИМАЦИЙ
window.forceUpdateAllTanks = function() {
   var scene = window.__game?.scene?.getScene('GameScene');
   if (scene && scene.gameState) {
       console.log('🔄 Принудительное обновление всех танков');
       scene.updateTanks(scene.gameState);
   }
};

// ✅ ПЕРИОДИЧЕСКАЯ ПРОВЕРКА ДЛЯ ЗАВЕРШЕННЫХ АНИМАЦИЙ
setInterval(function() {
   var scene = window.__game?.scene?.getScene('GameScene');
   if (!scene) return;
   
   // Проверяем, все ли анимации завершены
   var allComplete = true;
   for (var key of scene.tankSprites.keys()) {
       var sprite = scene.tankSprites.get(key);
       if (sprite && sprite.isAnimating) {
           allComplete = false;
           break;
       }
   }
   
   // Если все анимации завершены и есть состояние - обновляем
   if (allComplete && scene.gameState) {
       // Проверяем, нужно ли обновить позиции
       var needUpdate = false;
       if (scene.gameState.lastPositions) {
           for (var key of scene.tankSprites.keys()) {
               var sprite = scene.tankSprites.get(key);
               if (sprite && sprite.unit) {
                   var lastPos = scene.gameState.lastPositions[sprite.unit.id];
                   if (lastPos) {
                       if (lastPos.q !== sprite.unit.q || lastPos.r !== sprite.unit.r) {
                           needUpdate = true;
                           break;
                       }
                   }
               }
           }
       }
       
       if (needUpdate) {
           console.log('🔄 Обновление позиций танков (анимации завершены)');
           scene.updateTanks(scene.gameState);
       }
   }
}, 500); // Проверяем каждые 500мс
