// client/objects/TankSprite.js

function TankSprite(scene, unit, hexGrid) {
   this.scene = scene;
   this.unit = unit;
   this.hexGrid = hexGrid;
   this.container = null;
   this.hpText = null;
   this.isAnimating = false;
   this.animationProgress = 0;
   this.fromPos = null;
   this.toPos = null;
   this.animStartTime = 0;
   this.animDuration = 300;
   this.size = 20;
   this.color = null;
   this.lighterColor = null;
}

TankSprite.prototype.create = function() {
   var pos = this.hexGrid.hexToPixel(this.unit.q, this.unit.r);
   console.log('🎨 Создание танка:', this.unit.id, 'на позиции:', pos);
   
   var color = Phaser.Display.Color.HexStringToColor(this.unit.color || '#4caf50');
   this.color = color;
   this.size = this.unit.type === 'heavy' ? 22 : this.unit.type === 'light' ? 14 : 18;
   
   this.container = this.scene.add.container(pos.x, pos.y);
   this.container.setDepth(this.unit.isPlayer ? 10 : 5);
   this.container.setSize(this.size * 2, this.size * 2);
   
   // ТЕНЬ
   var shadow = this.scene.make.graphics({});
   shadow.fillStyle(0x000000, 0.3);
   shadow.fillRoundedRect(-this.size * 0.9, -this.size * 0.7 + 4, this.size * 1.8, this.size * 1.2, 4);
   this.container.add(shadow);
   
   // КОРПУС
   var body = this.scene.make.graphics({});
   body.fillStyle(color.color, 1);
   body.fillRoundedRect(-this.size, -this.size * 0.6, this.size * 2, this.size * 1.2, 4);
   body.fillStyle(0x000000, 0.1);
   body.fillRoundedRect(-this.size * 0.8, -this.size * 0.5, this.size * 1.6, this.size * 1.0, 3);
   this.container.add(body);
   
   // ГУСЕНИЦЫ
   var track = this.scene.make.graphics({});
   track.fillStyle(0x333333, 1);
   track.fillRoundedRect(-this.size * 0.9, -this.size * 0.75, this.size * 0.25, this.size * 0.2, 2);
   track.fillRoundedRect(-this.size * 0.9, this.size * 0.55, this.size * 0.25, this.size * 0.2, 2);
   track.fillRoundedRect(this.size * 0.65, -this.size * 0.75, this.size * 0.25, this.size * 0.2, 2);
   track.fillRoundedRect(this.size * 0.65, this.size * 0.55, this.size * 0.25, this.size * 0.2, 2);
   this.container.add(track);
   
   // БАШНЯ
   var turret = this.scene.make.graphics({});
   var lighterColor = this.lightenColor(color.color, 40);
   this.lighterColor = lighterColor;
   turret.fillStyle(lighterColor, 1);
   turret.fillCircle(0, 0, this.size * 0.7);
   turret.fillStyle(0x000000, 0.08);
   turret.fillCircle(0, 0, this.size * 0.5);
   this.container.add(turret);
   
   // СТВОЛ
   var angle = this.getAngle(this.unit.direction || 'right');
   var barrel = this.scene.make.graphics({});
   barrel.fillStyle(0x555555, 1);
   barrel.fillRoundedRect(-this.size * 0.05, -this.size * 0.4, this.size * 0.7, this.size * 0.1, 2);
   barrel.setPosition(Math.cos(angle) * this.size * 0.3, Math.sin(angle) * this.size * 0.3);
   barrel.setRotation(angle);
   this.container.add(barrel);
   
   // ЛЮК
   var hatch = this.scene.make.graphics({});
   hatch.fillStyle(0x444444, 1);
   hatch.fillCircle(0, -this.size * 0.2, this.size * 0.15);
   this.container.add(hatch);
   
   // HP
   this.hpText = this.scene.add.text(0, -this.size * 1.3, this.unit.hp + '', {
       fontSize: '12px',
       color: '#ffffff',
       stroke: '#000000',
       strokeThickness: 4,
       fontStyle: 'bold'
   }).setOrigin(0.5);
   this.container.add(this.hpText);
   
   // ПОДСВЕТКА ИГРОКА
   if (this.unit.isPlayer) {
       var glow = this.scene.make.graphics({});
       glow.fillStyle(0x44ff44, 0.08);
       glow.fillCircle(0, 0, this.size * 2.2);
       this.container.add(glow);
   }
   
   console.log('✅ Танк создан:', this.unit.id);
   return this.container;
};

TankSprite.prototype.lightenColor = function(color, amount) {
   var r = (color >> 16) & 0xFF;
   var g = (color >> 8) & 0xFF;
   var b = color & 0xFF;
   return (Math.min(255, r + amount) << 16) |
          (Math.min(255, g + amount) << 8) |
          Math.min(255, b + amount);
};

TankSprite.prototype.getAngle = function(direction) {
   var map = {
       'right': 0,
       'up-right': -Math.PI / 6,
       'up': -Math.PI / 2,
       'up-left': -Math.PI * 2 / 3,
       'left': Math.PI,
       'down-left': Math.PI * 2 / 3,
       'down': Math.PI / 2,
       'down-right': Math.PI / 6
   };
   return map[direction] || 0;
};

TankSprite.prototype.updatePosition = function(q, r, direction) {
   var pos = this.hexGrid.hexToPixel(q, r);
   this.container.setPosition(pos.x, pos.y);
   
   if (direction) {
       this.unit.direction = direction;
       var barrel = this.container.list.find(function(child) {
           return child.type === 'Graphics' && child.x !== 0 && child.y !== 0;
       });
       if (barrel) {
           var angle = this.getAngle(direction);
           var size = this.size || 18;
           barrel.setRotation(angle);
           barrel.setPosition(Math.cos(angle) * size * 0.3, Math.sin(angle) * size * 0.3);
       }
   }
   
   if (this.hpText) {
       this.hpText.setText(this.unit.hp + '');
   }
};

TankSprite.prototype.animateMove = function(fromQ, fromR, toQ, toR, duration) {
   if (this.isAnimating) return;
   
   this.isAnimating = true;
   this.animationProgress = 0;
   this.fromPos = this.hexGrid.hexToPixel(fromQ, fromR);
   this.toPos = this.hexGrid.hexToPixel(toQ, toR);
   this.animDuration = duration || 300;
   this.animStartTime = Date.now();
   
   this.unit.q = toQ;
   this.unit.r = toR;
};

TankSprite.prototype.update = function() {
   if (!this.isAnimating) return;
   
   var elapsed = Date.now() - this.animStartTime;
   this.animationProgress = Math.min(1, elapsed / this.animDuration);
   
   var t = this.animationProgress;
   var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
   
   var x = this.fromPos.x + (this.toPos.x - this.fromPos.x) * ease;
   var y = this.fromPos.y + (this.toPos.y - this.fromPos.y) * ease;
   
   var bounce = Math.sin(this.animationProgress * Math.PI) * 3;
   this.container.setPosition(x, y - bounce);
   
   if (this.animationProgress >= 1) {
       this.isAnimating = false;
       this.container.setPosition(this.toPos.x, this.toPos.y);
   }
};

TankSprite.prototype.destroy = function() {
   if (this.container) {
       this.container.destroy();
       this.container = null;
   }
   this.hpText = null;
};

// Экспорт для браузера
if (typeof window !== 'undefined') {
   window.TankSprite = TankSprite;
}
