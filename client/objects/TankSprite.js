// client/objects/TankSprite.js - ИСПРАВЛЕННАЯ ОРИЕНТАЦИЯ СТВОЛА

function TankSprite(scene, unit, hexGrid) {
   this.scene = scene;
   this.unit = unit;
   this.hexGrid = hexGrid;
   this.container = null;
   this.hpText = null;
   this.hpBar = null;
   this.hpBarBg = null;
   this.isAnimating = false;
   this.animationProgress = 0;
   this.fromPos = null;
   this.toPos = null;
   this.animStartTime = 0;
   this.animDuration = 3000;
   this.size = 30;
   this.color = null;
   this.lighterColor = null;
   this.moveSound = null;
   this.soundLoaded = false;
   this.onComplete = null;
   
   this.barrel = null;
   this.currentDirection = unit.direction || 'right';
   this.turretGroup = null;
}

TankSprite.prototype.loadMoveSound = function() {
   try {
       this.moveSound = new Audio('/sounds/move.mp3');
       this.moveSound.volume = 0.3;
       this.moveSound.loop = true;
       this.moveSound.load();
       this.soundLoaded = true;
   } catch (e) {
       this.soundLoaded = false;
   }
};

TankSprite.prototype.create = function() {
   var pos = this.hexGrid.hexToPixel(this.unit.q, this.unit.r);
   
   this.loadMoveSound();
   
   var color = Phaser.Display.Color.HexStringToColor(this.unit.color || '#4caf50');
   this.color = color;
   
   if (this.unit.type === 'heavy') {
       this.size = 34;
   } else if (this.unit.type === 'light') {
       this.size = 26;
   } else {
       this.size = 30;
   }
   
   this.container = this.scene.add.container(pos.x, pos.y);
   this.container.setDepth(this.unit.isPlayer ? 10 : 5);
   this.container.setSize(this.size * 2.5, this.size * 2.5);
   
   var s = this.size;
   
   // ============================================
   // 1. ТЕНЬ ПОД ТАНКОМ
   // ============================================
   var shadow = this.scene.make.graphics({});
   shadow.fillStyle(0x000000, 0.35);
   shadow.fillEllipse(0, s * 0.6, s * 1.6, s * 0.5);
   this.container.add(shadow);
   
   // ============================================
   // 2. КОРПУС ТАНКА (НЕ ПОВОРАЧИВАЕТСЯ)
   // ============================================
   var body = this.scene.make.graphics({});
   body.fillStyle(color.color, 1);
   body.fillRoundedRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0, 6);
   
   var lighterColor = this.lightenColor(color.color, 30);
   body.fillStyle(lighterColor, 0.3);
   body.fillRoundedRect(-s * 0.7, -s * 0.4, s * 1.4, s * 0.5, 4);
   
   body.fillStyle(0x000000, 0.1);
   body.fillRoundedRect(-s * 0.8, s * 0.2, s * 1.6, s * 0.3, 3);
   this.container.add(body);
   
   // ============================================
   // 3. ГУСЕНИЦЫ
   // ============================================
   var track = this.scene.make.graphics({});
   track.fillStyle(0x2a2a2a, 1);
   track.fillRoundedRect(-s * 1.0, -s * 0.65, s * 0.3, s * 0.35, 3);
   track.fillRoundedRect(-s * 1.0, s * 0.3, s * 0.3, s * 0.35, 3);
   track.fillRoundedRect(s * 0.7, -s * 0.65, s * 0.3, s * 0.35, 3);
   track.fillRoundedRect(s * 0.7, s * 0.3, s * 0.3, s * 0.35, 3);
   
   track.fillStyle(0x444444, 1);
   for (var i = -2; i <= 2; i++) {
       track.fillRect(-s * 0.95 + i * s * 0.12, -s * 0.55, s * 0.08, s * 0.15);
       track.fillRect(-s * 0.95 + i * s * 0.12, s * 0.4, s * 0.08, s * 0.15);
       track.fillRect(s * 0.87 + i * s * 0.12, -s * 0.55, s * 0.08, s * 0.15);
       track.fillRect(s * 0.87 + i * s * 0.12, s * 0.4, s * 0.08, s * 0.15);
   }
   this.container.add(track);
   
   // ============================================
   // 4. КОЛЕСА
   // ============================================
   var wheel = this.scene.make.graphics({});
   wheel.fillStyle(0x1a1a1a, 1);
   var wheelPositions = [
       [-s * 0.85, -s * 0.48],
       [-s * 0.85, s * 0.48],
       [s * 0.85, -s * 0.48],
       [s * 0.85, s * 0.48]
   ];
   for (var i = 0; i < wheelPositions.length; i++) {
       var wx = wheelPositions[i][0];
       var wy = wheelPositions[i][1];
       wheel.fillCircle(wx, wy, s * 0.12);
       wheel.fillStyle(0x333333, 1);
       wheel.fillCircle(wx, wy, s * 0.06);
       wheel.fillStyle(0x1a1a1a, 1);
   }
   this.container.add(wheel);
   
   // ============================================
   // 5. БАШНЯ + СТВОЛ (В КОНТЕЙНЕРЕ ДЛЯ ПОВОРОТА)
   // ============================================
   this.turretGroup = this.scene.add.container(0, -s * 0.05);
   this.container.add(this.turretGroup);
   
   // Башня
   var turret = this.scene.make.graphics({});
   var turretColor = this.lightenColor(color.color, 50);
   turret.fillStyle(turretColor, 1);
   turret.fillCircle(0, 0, s * 0.65);
   turret.fillStyle(0xffffff, 0.08);
   turret.fillCircle(-s * 0.15, -s * 0.15, s * 0.3);
   turret.fillStyle(0x000000, 0.1);
   turret.fillCircle(s * 0.15, s * 0.15, s * 0.35);
   this.turretGroup.add(turret);
   
   // ============================================
   // 6. СТВОЛ - ПРАВИЛЬНАЯ ОРИЕНТАЦИЯ (ВПРАВО)
   // ============================================
   var barrel = this.scene.make.graphics({});
   var barrelLength = s * 1.2;
   var barrelWidth = s * 0.1;
   
   // ✅ СТВОЛ РИСУЕМ ГОРИЗОНТАЛЬНО (ВПРАВО)
   // Основной ствол - теперь горизонтальный
   barrel.fillStyle(0x444444, 1);
   barrel.fillRoundedRect(0, -barrelWidth/2, barrelLength, barrelWidth, 3);
   
   // Наконечник ствола
   barrel.fillStyle(0x333333, 1);
   barrel.fillRoundedRect(barrelLength - s * 0.2, -barrelWidth/2 - 0.02 * s, s * 0.2, barrelWidth + 0.04 * s, 2);
   
   // Дуло
   barrel.fillStyle(0x222222, 1);
   barrel.fillRoundedRect(barrelLength - s * 0.08, -barrelWidth/2 - 0.01 * s, s * 0.08, barrelWidth + 0.02 * s, 2);
   
   // Блик на стволе
   barrel.fillStyle(0x888888, 0.2);
   barrel.fillRoundedRect(s * 0.1, -barrelWidth/4, s * 0.6, barrelWidth/2, 2);
   
   // ✅ СТВОЛ НАЧИНАЕТСЯ ОТ ЦЕНТРА БАШНИ И ТОРЧИТ ВПРАВО
   // Никакого смещения - ствол уже нарисован вправо от центра
   this.barrel = barrel;
   this.turretGroup.add(barrel);
   
   // ============================================
   // 7. ЛЮК
   // ============================================
   var hatch = this.scene.make.graphics({});
   hatch.fillStyle(0x555555, 1);
   hatch.fillCircle(s * 0.2, -s * 0.15, s * 0.12);
   hatch.fillStyle(0x777777, 0.5);
   hatch.fillCircle(s * 0.18, -s * 0.17, s * 0.05);
   this.turretGroup.add(hatch);
   
   // ============================================
   // 8. БРОНЯ
   // ============================================
   var armor = this.scene.make.graphics({});
   armor.lineStyle(2, color.color, 0.3);
   armor.strokeRoundedRect(-s * 0.6, -s * 0.3, s * 1.2, s * 0.6, 4);
   this.container.add(armor);
   
   // ============================================
   // 9. ЗВЕЗДА (ДЛЯ ИГРОКА)
   // ============================================
   if (this.unit.isPlayer) {
       var star = this.scene.make.graphics({});
       star.fillStyle(0xffd700, 0.6);
       this.drawStar(star, 0, -s * 0.05, 5, s * 0.2, s * 0.08);
       this.container.add(star);
   }
   
   // ============================================
   // 10. СВЕЧЕНИЕ
   // ============================================
   if (this.unit.isPlayer) {
       var glow = this.scene.make.graphics({});
       glow.fillStyle(0x44ff44, 0.06);
       glow.fillCircle(0, 0, s * 2.2);
       this.container.add(glow);
       
       var ring = this.scene.make.graphics({});
       ring.lineStyle(2, 0x44ff44, 0.3);
       ring.strokeCircle(0, 0, s * 1.6);
       this.container.add(ring);
   }
   
   // ============================================
   // 11. HP БАР
   // ============================================
   this.hpBarBg = this.scene.make.graphics({});
   this.hpBarBg.fillStyle(0x222222, 0.9);
   this.hpBarBg.fillRoundedRect(-s * 0.9, -s * 1.4, s * 1.8, s * 0.22, 4);
   this.container.add(this.hpBarBg);
   
   var hpFrame = this.scene.make.graphics({});
   hpFrame.lineStyle(2, 0x444444, 0.8);
   hpFrame.strokeRoundedRect(-s * 0.9, -s * 1.4, s * 1.8, s * 0.22, 4);
   this.container.add(hpFrame);
   
   var hpPercent = this.unit.hp / this.unit.maxHp;
   var hpColor = hpPercent > 0.5 ? 0x44ff44 : (hpPercent > 0.25 ? 0xffaa00 : 0xff4444);
   this.hpBar = this.scene.make.graphics({});
   this.hpBar.fillStyle(hpColor, 1);
   this.hpBar.fillRoundedRect(
       -s * 0.88,
       -s * 1.38,
       s * 1.76 * hpPercent,
       s * 0.18,
       3
   );
   this.container.add(this.hpBar);
   
   this.hpText = this.scene.add.text(0, -s * 1.3, Math.ceil(this.unit.hp) + '/' + this.unit.maxHp, {
       fontSize: '12px',
       color: '#ffffff',
       stroke: '#000000',
       strokeThickness: 3,
       fontStyle: 'bold'
   }).setOrigin(0.5);
   this.container.add(this.hpText);
   
   // ✅ УСТАНАВЛИВАЕМ НАЧАЛЬНОЕ НАПРАВЛЕНИЕ
   this.updateBarrel();
   
   console.log('✅ Танк создан:', this.unit.id, 'направление:', this.unit.direction);
   return this.container;
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ ЗВЕЗДЫ
// ============================================
TankSprite.prototype.drawStar = function(graphics, cx, cy, spikes, outerRadius, innerRadius) {
   var rot = -Math.PI / 2;
   var step = Math.PI / spikes;
   graphics.beginPath();
   for (var i = 0; i < spikes * 2; i++) {
       var radius = i % 2 === 0 ? outerRadius : innerRadius;
       var x = cx + Math.cos(rot) * radius;
       var y = cy + Math.sin(rot) * radius;
       if (i === 0) graphics.moveTo(x, y);
       else graphics.lineTo(x, y);
       rot += step;
   }
   graphics.closePath();
   graphics.fillPath();
};

// ============================================
// ✅ ИСПРАВЛЕННЫЙ updateBarrel - ПРАВИЛЬНЫЕ УГЛЫ
// ============================================
TankSprite.prototype.updateBarrel = function() {
   if (!this.turretGroup) {
       console.warn('⚠️ turretGroup не найден');
       return;
   }
   
   // ✅ ИСПОЛЬЗУЕМ ТЕКУЩЕЕ НАПРАВЛЕНИЕ ИЗ UNIT
   var direction = this.unit.direction || 'right';
   var angle = this.getAngle(direction);
   
   // ✅ ПОВОРАЧИВАЕМ ВСЮ БАШНЮ
   this.turretGroup.setRotation(angle);
   
   // ✅ СОХРАНЯЕМ ТЕКУЩЕЕ НАПРАВЛЕНИЕ
   this.currentDirection = direction;
   
   console.log('🔄 updateBarrel() - направление:', direction, 'угол:', angle);
};

// ============================================
// ОБНОВЛЕНИЕ ПОЗИЦИИ И НАПРАВЛЕНИЯ
// ============================================
TankSprite.prototype.updatePosition = function(q, r, direction) {
   var pos = this.hexGrid.hexToPixel(q, r);
   this.container.setPosition(pos.x, pos.y);
   
   if (direction) {
       this.unit.direction = direction;
       this.currentDirection = direction;
   }
   
   this.updateBarrel();
   this.updateHPBar();
};

// ============================================
// ОБНОВЛЕНИЕ HP БАРА
// ============================================
TankSprite.prototype.updateHPBar = function() {
   if (!this.hpBar || !this.hpBarBg) return;
   
   var s = this.size || 30;
   var hpPercent = Math.max(0, this.unit.hp / this.unit.maxHp);
   var hpColor = hpPercent > 0.5 ? 0x44ff44 : (hpPercent > 0.25 ? 0xffaa00 : 0xff4444);
   
   this.hpBar.clear();
   this.hpBar.fillStyle(hpColor, 1);
   this.hpBar.fillRoundedRect(
       -s * 0.88,
       -s * 1.38,
       s * 1.76 * hpPercent,
       s * 0.18,
       3
   );
   
   if (this.hpText) {
       this.hpText.setText(Math.ceil(this.unit.hp) + '/' + this.unit.maxHp);
   }
};

TankSprite.prototype.lightenColor = function(color, amount) {
   var r = (color >> 16) & 0xFF;
   var g = (color >> 8) & 0xFF;
   var b = color & 0xFF;
   return (Math.min(255, r + amount) << 16) |
          (Math.min(255, g + amount) << 8) |
          Math.min(255, b + amount);
};

// ✅ ПРАВИЛЬНЫЕ УГЛЫ ДЛЯ 6 НАПРАВЛЕНИЙ ГЕКСАГОНАЛЬНОЙ СЕТКИ
TankSprite.prototype.getAngle = function(direction) {
   // Ствол изначально смотрит вправо (0°)
   // При повороте башни на угол, ствол поворачивается соответственно
   var map = {
       'right': 0,                        // 0° - вправо
       'up-right': -Math.PI / 3,          // -60° - вверх-вправо
       'up-left': -Math.PI * 2 / 3,       // -120° - вверх-влево
       'left': Math.PI,                   // 180° - влево
       'down-left': Math.PI * 2 / 3,      // 120° - вниз-влево
       'down-right': Math.PI / 3          // 60° - вниз-вправо
   };
   return map[direction] || 0;
};

// ============================================
// АНИМАЦИЯ ДВИЖЕНИЯ
// ============================================
TankSprite.prototype.animateMove = function(fromQ, fromR, toQ, toR, duration, onComplete) {
   if (this.isAnimating) return;
   
   var direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
   console.log('🎯 animateMove - направление:', direction);
   
   this.unit.direction = direction;
   this.currentDirection = direction;
   
   // ✅ СРАЗУ ПОВОРАЧИВАЕМ БАШНЮ
   this.updateBarrel();
   
   this.isAnimating = true;
   this.animationProgress = 0;
   this.fromPos = this.hexGrid.hexToPixel(fromQ, fromR);
   this.toPos = this.hexGrid.hexToPixel(toQ, toR);
   this.animDuration = duration || 3000;
   this.animStartTime = Date.now();
   this.onComplete = onComplete || null;
   
   this.container.setPosition(this.fromPos.x, this.fromPos.y);
   this.playMoveSound();
};

// ============================================
// UPDATE - НЕ СБРАСЫВАЕТ РОТАЦИЮ
// ============================================
TankSprite.prototype.update = function() {
   if (!this.isAnimating) return;
   
   var elapsed = Date.now() - this.animStartTime;
   this.animationProgress = Math.min(1, elapsed / this.animDuration);
   
   var t = this.animationProgress;
   var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
   
   var x = this.fromPos.x + (this.toPos.x - this.fromPos.x) * ease;
   var y = this.fromPos.y + (this.toPos.y - this.fromPos.y) * ease;
   
   var bounce = Math.sin(this.animationProgress * Math.PI * 2) * 4;
   var heightOffset = Math.sin(this.animationProgress * Math.PI) * 3;
   
   this.container.setPosition(x, y - heightOffset + bounce * 0.3);
   
   if (this.animationProgress >= 1) {
       this.isAnimating = false;
       this.container.setPosition(this.toPos.x, this.toPos.y);
       this.stopMoveSound();
       
       // ✅ УБЕЖДАЕМСЯ, ЧТО НАПРАВЛЕНИЕ СОХРАНЕНО
       this.updateBarrel();
       
       if (this.onComplete) {
           var callback = this.onComplete;
           this.onComplete = null;
           callback();
       }
   }
};

TankSprite.prototype.playMoveSound = function() {
   if (!this.soundLoaded || !this.moveSound) {
       this.loadMoveSound();
       return;
   }
   try {
       this.moveSound.currentTime = 0;
       this.moveSound.loop = true;
       this.moveSound.play().catch(function(e) {});
   } catch (e) {}
};

TankSprite.prototype.stopMoveSound = function() {
   if (this.moveSound) {
       try {
           this.moveSound.pause();
           this.moveSound.currentTime = 0;
           this.moveSound.loop = false;
       } catch (e) {}
   }
};

TankSprite.prototype.destroy = function() {
   this.stopMoveSound();
   if (this.moveSound) {
       this.moveSound = null;
   }
   if (this.container) {
       this.container.destroy();
       this.container = null;
   }
   this.hpText = null;
   this.hpBar = null;
   this.hpBarBg = null;
   this.turretGroup = null;
   this.barrel = null;
};

if (typeof window !== 'undefined') {
   window.TankSprite = TankSprite;
}
