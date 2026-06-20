// client/objects/TankSprite.js - ПОЛНАЯ ВЕРСИЯ С ПОВОРОТОМ ГУСЕНИЦ, СТВОЛА, ЗВУКАМИ И РАБОЧИМИ АНИМАЦИЯМИ

class TankSprite {
   constructor(scene, unit, hexGrid, animationEngine) {
       this.scene = scene;
       this.unit = unit;
       this.hexGrid = hexGrid;
       this.animationEngine = animationEngine;
       
       this.container = null;
       this.bodyGroup = null;
       this.turretGroup = null;
       this.tracksGroup = null; // ✅ ГРУППА ДЛЯ ГУСЕНИЦ
       this.barrel = null;
       this.hpBar = null;
       this.hpBarBg = null;
       this.hpText = null;
       
       this.size = 30;
       this.color = null;
       this.currentDirection = unit.direction || 'right';
       this.turretDirection = unit.direction || 'right';
       this.tracksDirection = unit.direction || 'right'; // ✅ НАПРАВЛЕНИЕ ГУСЕНИЦ
       this._isAnimating = false;
       this.animationId = `tank_${unit.id}`;
       
       this.moveDuration = 1500;
       this.rotateDuration = 400;
       this.jumpHeight = 15;
       
       this.onMoveComplete = null;
       this.onRotateComplete = null;
       
       // ✅ ЗВУКИ
       this.moveSound = null;
       this.shootSound = null;
   }

   isAnimating() {
       return this._isAnimating;
   }

   create() {
       const pos = this.hexGrid.hexToPixel(this.unit.q, this.unit.r);
       const color = Phaser.Display.Color.HexStringToColor(this.unit.color || '#4caf50');
       this.color = color;
       
       if (this.unit.type === 'heavy') this.size = 34;
       else if (this.unit.type === 'light') this.size = 26;
       else this.size = 30;
       
       this.container = this.scene.add.container(pos.x, pos.y);
       this.container.setDepth(this.unit.isPlayer ? 10 : 5);
       this.container.setSize(this.size * 2.5, this.size * 2.5);
       
       // ✅ СОЗДАЕМ ГРУППУ ДЛЯ КОРПУСА С ГУСЕНИЦАМИ
       this.bodyGroup = this.scene.add.container(0, 0);
       this.container.add(this.bodyGroup);
       
       this.createBody();
       this.createTurret();
       this.createHPBar();
       this.createEffects();
       
       // ✅ Устанавливаем начальное направление
       this.setTracksDirection(this.currentDirection, false);
       this.setTurretDirection(this.currentDirection, false);
       
       // ✅ СОЗДАЕМ ЗВУКИ
       this.createSounds();
       
       return this.container;
   }

   // ✅ СОЗДАНИЕ КОРПУСА С ГУСЕНИЦАМИ
   createBody() {
       const s = this.size;
       const color = this.color;
       
       // Основной корпус (без гусениц)
       const body = this.scene.make.graphics({});
       body.fillStyle(color.color, 1);
       body.fillRoundedRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0, 6);
       
       const lighter = this.lightenColor(color.color, 40);
       body.fillStyle(lighter, 0.3);
       body.fillRoundedRect(-s * 0.7, -s * 0.4, s * 1.4, s * 0.5, 4);
       body.fillStyle(0x000000, 0.1);
       body.fillRoundedRect(-s * 0.8, s * 0.2, s * 1.6, s * 0.3, 3);
       
       body.lineStyle(2, color.color, 0.3);
       body.strokeRoundedRect(-s * 0.6, -s * 0.3, s * 1.2, s * 0.6, 4);
       
       this.bodyGroup.add(body);
       
       // ✅ ГУСЕНИЦЫ - ОТДЕЛЬНАЯ ГРУППА ДЛЯ ПОВОРОТА
       this.tracksGroup = this.scene.add.container(0, 0);
       this.bodyGroup.add(this.tracksGroup);
       
       this.createTracks();
       this.createWheels();
   }

   // ✅ СОЗДАНИЕ ГУСЕНИЦ (БЕЗ ПРИВЯЗКИ К КОРПУСУ)
   createTracks() {
       const s = this.size;
       const g = this.scene.make.graphics({});
       
       // Левые гусеницы
       g.fillStyle(0x2a2a2a, 1);
       g.fillRoundedRect(-s * 1.0, -s * 0.65, s * 0.3, s * 0.35, 3);
       g.fillRoundedRect(-s * 1.0, s * 0.3, s * 0.3, s * 0.35, 3);
       g.fillRoundedRect(s * 0.7, -s * 0.65, s * 0.3, s * 0.35, 3);
       g.fillRoundedRect(s * 0.7, s * 0.3, s * 0.3, s * 0.35, 3);
       
       // Детали гусениц
       g.fillStyle(0x444444, 1);
       for (let i = -2; i <= 2; i++) {
           const x1 = -s * 0.95 + i * s * 0.12;
           const x2 = s * 0.87 + i * s * 0.12;
           g.fillRect(x1, -s * 0.55, s * 0.08, s * 0.15);
           g.fillRect(x1, s * 0.4, s * 0.08, s * 0.15);
           g.fillRect(x2, -s * 0.55, s * 0.08, s * 0.15);
           g.fillRect(x2, s * 0.4, s * 0.08, s * 0.15);
       }
       
       this.tracksGroup.add(g);
   }

   // ✅ СОЗДАНИЕ КОЛЕС
   createWheels() {
       const s = this.size;
       const g = this.scene.make.graphics({});
       
       g.fillStyle(0x1a1a1a, 1);
       const positions = [
           [-s * 0.85, -s * 0.48],
           [-s * 0.85, s * 0.48],
           [s * 0.85, -s * 0.48],
           [s * 0.85, s * 0.48]
       ];
       
       for (const [wx, wy] of positions) {
           g.fillCircle(wx, wy, s * 0.12);
           g.fillStyle(0x333333, 1);
           g.fillCircle(wx, wy, s * 0.06);
           g.fillStyle(0x1a1a1a, 1);
       }
       
       this.tracksGroup.add(g);
   }

   // ✅ СОЗДАНИЕ ЗВУКОВЫХ ЭФФЕКТОВ
   createSounds() {
       try {
           this.moveSound = this.createMoveSound();
           this.shootSound = this.createShootSound();
           console.log('🔊 Звуки созданы для танка', this.unit.id);
       } catch (e) {
           console.warn('⚠️ Не удалось создать звуки:', e);
       }
   }

   createMoveSound() {
       if (!this.scene.audioContext) {
           this.scene.audioContext = new (window.AudioContext || window.webkitAudioContext)();
       }
       const ctx = this.scene.audioContext;
       const duration = 0.15;
       const sampleRate = ctx.sampleRate;
       const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
       const data = buffer.getChannelData(0);
       
       for (let i = 0; i < data.length; i++) {
           const t = i / sampleRate;
           data[i] = Math.sin(t * 80) * 0.3 * Math.exp(-t * 5) + 
                    (Math.random() * 2 - 1) * 0.1 * Math.exp(-t * 10);
       }
       return buffer;
   }

   createShootSound() {
       if (!this.scene.audioContext) {
           this.scene.audioContext = new (window.AudioContext || window.webkitAudioContext)();
       }
       const ctx = this.scene.audioContext;
       const duration = 0.1;
       const sampleRate = ctx.sampleRate;
       const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
       const data = buffer.getChannelData(0);
       
       for (let i = 0; i < data.length; i++) {
           const t = i / sampleRate;
           data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.8;
       }
       return buffer;
   }

   playSound(buffer, volume = 0.15) {
       if (!buffer || !this.scene.audioContext) return;
       try {
           const ctx = this.scene.audioContext;
           const source = ctx.createBufferSource();
           source.buffer = buffer;
           const gain = ctx.createGain();
           gain.gain.value = volume;
           source.connect(gain);
           gain.connect(ctx.destination);
           source.start();
       } catch (e) {
           // Игнорируем ошибки звука
       }
   }

   // ✅ СОЗДАНИЕ БАШНИ
   createTurret() {
       const s = this.size;
       const color = this.color;
       
       this.turretGroup = this.scene.add.container(0, -s * 0.05);
       this.container.add(this.turretGroup);
       
       const turret = this.scene.make.graphics({});
       const turretColor = this.lightenColor(color.color, 50);
       turret.fillStyle(turretColor, 1);
       turret.fillCircle(0, 0, s * 0.65);
       turret.fillStyle(0xffffff, 0.08);
       turret.fillCircle(-s * 0.15, -s * 0.15, s * 0.3);
       turret.fillStyle(0x000000, 0.1);
       turret.fillCircle(s * 0.15, s * 0.15, s * 0.35);
       this.turretGroup.add(turret);
       
       this.barrel = this.scene.make.graphics({});
       const barrelLength = s * 1.2;
       const barrelWidth = s * 0.1;
       
       this.barrel.fillStyle(0x444444, 1);
       this.barrel.fillRoundedRect(0, -barrelWidth/2, barrelLength, barrelWidth, 3);
       this.barrel.fillStyle(0x333333, 1);
       this.barrel.fillRoundedRect(barrelLength - s * 0.2, -barrelWidth/2 - 0.02 * s, s * 0.2, barrelWidth + 0.04 * s, 2);
       this.barrel.fillStyle(0x222222, 1);
       this.barrel.fillRoundedRect(barrelLength - s * 0.08, -barrelWidth/2 - 0.01 * s, s * 0.08, barrelWidth + 0.02 * s, 2);
       this.barrel.fillStyle(0x888888, 0.2);
       this.barrel.fillRoundedRect(s * 0.1, -barrelWidth/4, s * 0.6, barrelWidth/2, 2);
       
       this.turretGroup.add(this.barrel);
       
       const hatch = this.scene.make.graphics({});
       hatch.fillStyle(0x555555, 1);
       hatch.fillCircle(s * 0.2, -s * 0.15, s * 0.12);
       hatch.fillStyle(0x777777, 0.5);
       hatch.fillCircle(s * 0.18, -s * 0.17, s * 0.05);
       this.turretGroup.add(hatch);
   }

   // ✅ СОЗДАНИЕ ПОЛОСЫ HP
   createHPBar() {
       const s = this.size;
       
       this.hpBarBg = this.scene.make.graphics({});
       this.hpBarBg.fillStyle(0x222222, 0.9);
       this.hpBarBg.fillRoundedRect(-s * 0.9, -s * 1.4, s * 1.8, s * 0.22, 4);
       this.container.add(this.hpBarBg);
       
       const frame = this.scene.make.graphics({});
       frame.lineStyle(2, 0x444444, 0.8);
       frame.strokeRoundedRect(-s * 0.9, -s * 1.4, s * 1.8, s * 0.22, 4);
       this.container.add(frame);
       
       this.hpBar = this.scene.make.graphics({});
       this.updateHPBar();
       this.container.add(this.hpBar);
       
       this.hpText = this.scene.add.text(0, -s * 1.3, 
           `${Math.ceil(this.unit.hp)}/${this.unit.maxHp}`, {
           fontSize: '12px',
           color: '#ffffff',
           stroke: '#000000',
           strokeThickness: 3,
           fontStyle: 'bold'
       }).setOrigin(0.5);
       this.container.add(this.hpText);
   }

   // ✅ СОЗДАНИЕ ЭФФЕКТОВ (звезда, свечение, кольцо)
   createEffects() {
       const s = this.size;
       
       if (this.unit.isPlayer) {
           const star = this.scene.make.graphics({});
           star.fillStyle(0xffd700, 0.6);
           this.drawStar(star, 0, -s * 0.05, 5, s * 0.2, s * 0.08);
           this.container.add(star);
           
           const glow = this.scene.make.graphics({});
           glow.fillStyle(0x44ff44, 0.06);
           glow.fillCircle(0, 0, s * 2.2);
           this.container.add(glow);
           
           const ring = this.scene.make.graphics({});
           ring.lineStyle(2, 0x44ff44, 0.3);
           ring.strokeCircle(0, 0, s * 1.6);
           this.container.add(ring);
       }
   }

   // ✅ УСТАНОВКА НАПРАВЛЕНИЯ ГУСЕНИЦ
   setTracksDirection(direction, animate = true) {
       this.tracksDirection = direction;
       const angle = this.getAngle(direction);
       
       if (animate) {
           this.scene.tweens.add({
               targets: this.tracksGroup,
               rotation: angle,
               duration: this.rotateDuration,
               ease: 'Quadratic.Out'
           });
       } else {
           this.tracksGroup.setRotation(angle);
       }
   }

   // ✅ УСТАНОВКА НАПРАВЛЕНИЯ БАШНИ
   setTurretDirection(direction, animate = true) {
       this.turretDirection = direction;
       const angle = this.getAngle(direction);
       
       if (animate) {
           this.scene.tweens.add({
               targets: this.turretGroup,
               rotation: angle,
               duration: this.rotateDuration,
               ease: 'Quadratic.Out',
               onComplete: () => {
                   if (this.onRotateComplete) this.onRotateComplete();
               }
           });
       } else {
           this.turretGroup.setRotation(angle);
       }
   }

   // ✅ ДВИЖЕНИЕ - ПОВОРАЧИВАЕМ И ГУСЕНИЦЫ, И КОРПУС
   moveTo(fromQ, fromR, toQ, toR, duration = null, onComplete = null) {
       const from = this.hexGrid.hexToPixel(fromQ, fromR);
       const to = this.hexGrid.hexToPixel(toQ, toR);
       const dir = HexUtils.getDirection(fromQ, fromR, toQ, toR);
       
       this.unit.q = toQ;
       this.unit.r = toR;
       this.currentDirection = dir;
       
       const animDuration = duration || this.moveDuration;
       const jumpHeight = this.jumpHeight;
       
       this._isAnimating = true;
       
       // ✅ ПОВОРАЧИВАЕМ КОРПУС (ГУСЕНИЦЫ) В НАПРАВЛЕНИИ ДВИЖЕНИЯ
       this.setTracksDirection(dir, true);
       
       // ✅ ПОВОРАЧИВАЕМ СТВОЛ В НАПРАВЛЕНИИ ДВИЖЕНИЯ
       this.setTurretDirection(dir, true);
       
       // Звук движения
       this.playSound(this.moveSound, 0.1);
       
       const self = this;
       const startX = from.x;
       const startY = from.y;
       const endX = to.x;
       const endY = to.y;
       const startTime = Date.now();
       
       this.scene.tweens.add({
           targets: this.container,
           x: endX,
           duration: animDuration,
           ease: 'Quadratic.InOut',
           onUpdate: function() {
               const elapsed = Date.now() - startTime;
               let progress = elapsed / animDuration;
               if (progress > 1) progress = 1;
               
               const currentX = startX + (endX - startX) * progress;
               const baseY = startY + (endY - startY) * progress;
               const jump = Math.sin(progress * Math.PI) * jumpHeight;
               
               self.container.x = currentX;
               self.container.y = baseY - jump;
               
               // Добавляем небольшой поворот для эффекта
               if (progress > 0 && progress < 1) {
                   const tiltAngle = Math.sin(progress * Math.PI * 2) * 0.02;
                   self.container.rotation = tiltAngle;
               }
           },
           onComplete: function() {
               self.container.x = endX;
               self.container.y = endY;
               self.container.rotation = 0;
               self._isAnimating = false;
               
               // ✅ ГУСЕНИЦЫ И СТВОЛ ОСТАЮТСЯ В НАПРАВЛЕНИИ ДВИЖЕНИЯ
               // (уже установлено через setTracksDirection и setTurretDirection)
               
               if (self.onMoveComplete) self.onMoveComplete();
               if (onComplete) onComplete();
           }
       });
   }

   // ✅ АЛИАС ДЛЯ СОВМЕСТИМОСТИ
   animateMove(fromQ, fromR, toQ, toR, duration = null, onComplete = null) {
       this.moveTo(fromQ, fromR, toQ, toR, duration, onComplete);
   }

   // ✅ ПОВОРОТ БАШНИ
   rotateTurret(direction, duration = null, onComplete = null) {
       this.setTurretDirection(direction, true);
       if (onComplete) {
           setTimeout(onComplete, this.rotateDuration);
       }
   }

   // ✅ ВЫСТРЕЛ - ПОВОРАЧИВАЕТСЯ ТОЛЬКО СТВОЛ (ГУСЕНИЦЫ НЕ ДВИГАЮТСЯ)
   shootAt(targetQ, targetR, onComplete = null) {
       const fromQ = this.unit.q;
       const fromR = this.unit.r;
       const dir = HexUtils.getDirection(fromQ, fromR, targetQ, targetR);
       
       // ✅ ПОВОРАЧИВАЕМ ТОЛЬКО СТВОЛ
       this.setTurretDirection(dir, true);
       
       // Звук выстрела
       this.playSound(this.shootSound, 0.2);
       
       // Анимация отдачи
       const recoilDistance = -this.size * 0.3;
       
       this.scene.tweens.add({
           targets: this.turretGroup,
           x: recoilDistance,
           duration: 100,
           ease: 'Quadratic.Out',
           onComplete: () => {
               this.scene.tweens.add({
                   targets: this.turretGroup,
                   x: 0,
                   duration: 200,
                   ease: 'Quadratic.InOut',
                   onComplete: () => {
                       // ✅ СТВОЛ ОСТАЕТСЯ В НАПРАВЛЕНИИ ВЫСТРЕЛА
                       if (onComplete) onComplete();
                   }
               });
           }
       });
   }

   // ✅ ВЫСТРЕЛ (БЕЗ ЦЕЛИ - ДЛЯ СОВМЕСТИМОСТИ)
   shoot(onComplete = null) {
       const recoilDistance = -this.size * 0.3;
       
       // Звук выстрела
       this.playSound(this.shootSound, 0.2);
       
       // Отдача
       this.scene.tweens.add({
           targets: this.turretGroup,
           x: recoilDistance,
           duration: 100,
           ease: 'Quadratic.Out',
           onComplete: () => {
               this.scene.tweens.add({
                   targets: this.turretGroup,
                   x: 0,
                   duration: 200,
                   ease: 'Quadratic.InOut',
                   onComplete: () => {
                       if (onComplete) onComplete();
                   }
               });
           }
       });
   }

   // ✅ ОБНОВЛЕННЫЙ updateHPBar
   updateHPBar() {
       if (!this.hpBar || !this.unit) return;
       
       const s = this.size;
       const hpPercent = Math.max(0, this.unit.hp / this.unit.maxHp);
       const hpColor = hpPercent > 0.5 ? 0x44ff44 : 
                      (hpPercent > 0.25 ? 0xffaa00 : 0xff4444);
       
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
           this.hpText.setText(`${Math.ceil(this.unit.hp)}/${this.unit.maxHp}`);
       }
   }

   // ✅ ОБНОВЛЕНИЕ ПОЗИЦИИ
   updatePosition(q, r, direction = null) {
       const pos = this.hexGrid.hexToPixel(q, r);
       this.container.setPosition(pos.x, pos.y);
       this.unit.q = q;
       this.unit.r = r;
       
       if (direction) {
           this.currentDirection = direction;
           this.tracksDirection = direction;
           this.turretDirection = direction;
           
           // ✅ ОБНОВЛЯЕМ НАПРАВЛЕНИЕ ГУСЕНИЦ И СТВОЛА
           this.setTracksDirection(direction, false);
           this.setTurretDirection(direction, false);
       }
       this.updateHPBar();
   }

   // ✅ ПОЛУЧЕНИЕ УГЛА ПО НАПРАВЛЕНИЮ
   getAngle(direction) {
       const map = {
           'right': 0,
           'up-right': -Math.PI / 3,
           'up-left': -Math.PI * 2 / 3,
           'left': Math.PI,
           'down-left': Math.PI * 2 / 3,
           'down-right': Math.PI / 3
       };
       return map[direction] || 0;
   }

   // ✅ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
   lightenColor(color, amount) {
       const r = (color >> 16) & 0xFF;
       const g = (color >> 8) & 0xFF;
       const b = color & 0xFF;
       return (Math.min(255, r + amount) << 16) |
              (Math.min(255, g + amount) << 8) |
              Math.min(255, b + amount);
   }

   drawStar(graphics, cx, cy, spikes, outerRadius, innerRadius) {
       let rot = -Math.PI / 2;
       const step = Math.PI / spikes;
       graphics.beginPath();
       for (let i = 0; i < spikes * 2; i++) {
           const radius = i % 2 === 0 ? outerRadius : innerRadius;
           const x = cx + Math.cos(rot) * radius;
           const y = cy + Math.sin(rot) * radius;
           if (i === 0) graphics.moveTo(x, y);
           else graphics.lineTo(x, y);
           rot += step;
       }
       graphics.closePath();
       graphics.fillPath();
   }

   // ✅ ОСТАНОВКА ВСЕХ АНИМАЦИЙ
   stopAllAnimations() {
       this.scene.tweens.killTweensOf(this.container);
       this.scene.tweens.killTweensOf(this.turretGroup);
       this.scene.tweens.killTweensOf(this.tracksGroup);
       this._isAnimating = false;
   }

   // ✅ УНИЧТОЖЕНИЕ
   destroy() {
       this.stopAllAnimations();
       
       if (this.container) {
           this.container.destroy();
           this.container = null;
       }
       
       this.bodyGroup = null;
       this.tracksGroup = null;
       this.turretGroup = null;
       this.barrel = null;
       this.hpBar = null;
       this.hpBarBg = null;
       this.hpText = null;
       this.scene = null;
       this.hexGrid = null;
       this.animationEngine = null;
       this.moveSound = null;
       this.shootSound = null;
   }
}

if (typeof window !== 'undefined') {
   window.TankSprite = TankSprite;
   console.log('✅ TankSprite зарегистрирован в window');
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { TankSprite };
}
