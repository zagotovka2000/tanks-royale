// client/scenes/BootScene.js

var BootScene = new Phaser.Class({
   Extends: Phaser.Scene,
   
   initialize: function() {
       Phaser.Scene.call(this, { key: 'BootScene' });
   },
   
   preload: function() {
       // Текстуры для танков (генерируем программно)
       this.createTextures();
   },
   
   create: function() {
       console.log('✅ BootScene: Загрузка завершена');
       this.scene.start('GameScene');
   },
   
   createTextures: function() {
       var graphics = this.make.graphics({});
       
       // Текстура для танка игрока (зеленый)
       graphics.fillStyle(0x4caf50);
       graphics.fillRoundedRect(-20, -12, 40, 24, 6);
       graphics.fillStyle(0x66bb6a);
       graphics.fillCircle(0, 0, 14);
       graphics.fillStyle(0x333333);
       graphics.fillRect(-2, -12, 4, 24);
       graphics.generateTexture('tank_player', 40, 24);
       graphics.clear();
       
       // Текстура для танка врага (красный)
       graphics.fillStyle(0xe94560);
       graphics.fillRoundedRect(-20, -12, 40, 24, 6);
       graphics.fillStyle(0xff6b6b);
       graphics.fillCircle(0, 0, 14);
       graphics.fillStyle(0x333333);
       graphics.fillRect(-2, -12, 4, 24);
       graphics.generateTexture('tank_enemy', 40, 24);
       graphics.clear();
       
       // Текстура для гекса
       this.generateHexTexture(graphics);
       
       graphics.destroy();
   },
   
   generateHexTexture: function(graphics) {
       var size = 38;
       var points = [];
       for (var i = 0; i < 6; i++) {
           var angle = Math.PI / 180 * (60 * i - 30);
           points.push({
               x: size * Math.cos(angle),
               y: size * Math.sin(angle)
           });
       }
       
       // Прозрачный гекс с обводкой
       graphics.lineStyle(2, 0x88ccff, 0.5);
       graphics.beginPath();
       for (var i = 0; i < points.length; i++) {
           if (i === 0) graphics.moveTo(points[i].x, points[i].y);
           else graphics.lineTo(points[i].x, points[i].y);
       }
       graphics.closePath();
       graphics.strokePath();
       
       graphics.generateTexture('hex', size * 2, size * 2);
       graphics.clear();
   }
});

// Регистрируем сцену
if (typeof window !== 'undefined') {
   window.BootScene = BootScene;
}
