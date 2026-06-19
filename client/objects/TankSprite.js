// client/objects/TankSprite.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

function TankSprite(scene, unit, hexGrid) {
   this.scene = scene;
   this.unit = unit;
   this.hexGrid = hexGrid;
   this.container = null;
   this.hpText = null;
   this.hpBar = null;
   this.hpBarBg = null;
   
   // Очередь движений
   this.moveQueue = [];
   this.isAnimating = false;
   this.animationTimeout = null;
   
   this.fromPos = null;
   this.toPos = null;
   this.animStartTime = 0;
   this.animDuration = 2000;
   this.size = 30;
   this.color = null;
   this.lighterColor = null;
   this.onComplete = null;
   
   this.barrel = null;
   this.currentDirection = unit.direction || 'right';
   this.turretGroup = null;
   
   // Звуки
   this.sounds = {
       move: null,
       shoot: null,
       hit: null,
       rotate: null
   };
   this.soundsLoaded = {
       move: false,
       shoot: false,
       hit: false,
       rotate: false
   };
   
   // Для анимации отдачи
   this.recoilOffset = 0;
   this.isRecoiling = false;
   this.recoilStartTime = 0;
   this.recoilDuration = 200;
   this.maxRecoil = -8;
   
   // Для анимации поворота башни
   this.isRotating = false;
   this.rotationTween = null;
   this.rotationCallback = null;
   this.rotationStartTime = 0;
   this.rotationDuration = 0;
   this.rotationStartAngle = 0;
   this.rotationTargetAngle = 0;
   this.rotationDiff = 0;
   this.rotationDirection = null;
   
   // ✅ ОЧЕРЕДЬ ПОВОРОТОВ
   this.rotationQueue = [];
   this.isProcessingRotation = false;
   this.processTimeout = null; // ✅ ТАЙМЕР ДЛЯ КОНТРОЛЯ
}

// ============================================
// ЗАГРУЗКА ЗВУКОВ
// ============================================
TankSprite.prototype.loadSounds = function() {
   var self = this;
   var basePath = '/assets/sounds/';
   
   this.loadSound('move', basePath + 'move.mp3', function() {
       self.soundsLoaded.move = true;
   });
   
   this.loadSound('shoot', basePath + 'shoot.mp3', function() {
       self.soundsLoaded.shoot = true;
   });
   
   this.loadSound('hit', basePath + 'hit_target.mp3', function() {
       self.soundsLoaded.hit = true;
   });
   
   this.loadSound('rotate', basePath + 'miss.mp3', function() {
       self.soundsLoaded.rotate = true;
   });
};

TankSprite.prototype.loadSound = function(name, path, callback) {
   var self = this;
   try {
       var audio = new Audio();
       audio.volume = 0.5;
       
       audio.addEventListener('canplaythrough', function() {
           callback();
       });
       
       audio.addEventListener('error', function(e) {
           console.warn('⚠️ Ошибка загрузки звука:', path, e);
           self.createSyntheticSound(name);
       });
       
       audio.src = path;
       audio.load();
       this.sounds[name] = audio;
   } catch (e) {
       console.warn('⚠️ Ошибка создания звука:', name, e);
       this.createSyntheticSound(name);
   }
};

// ============================================
// СИНТЕТИЧЕСКИЕ ЗВУКИ
// ============================================
TankSprite.prototype.createSyntheticSound = function(name) {
   try {
       var audioContext = new (window.AudioContext || window.webkitAudioContext)();
       var sampleRate = audioContext.sampleRate;
       var duration = 0.2;
       var buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
       var data = buffer.getChannelData(0);
       
       if (name === 'move') {
           for (var i = 0; i < data.length; i++) {
               var t = i / sampleRate;
               data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.3;
           }
       } else if (name === 'shoot') {
           for (var i = 0; i < data.length; i++) {
               var t = i / sampleRate;
               data[i] = Math.sin(t * 2000) * Math.exp(-t * 8) * 0.5;
           }
       } else if (name === 'hit') {
           for (var i = 0; i < data.length; i++) {
               var t = i / sampleRate;
               data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.4;
           }
       } else if (name === 'rotate') {
           for (var i = 0; i < data.length; i++) {
               var t = i / sampleRate;
               data[i] = Math.sin(t * 800 + Math.sin(t * 300) * 0.5) * Math.exp(-t * 5) * 0.4;
           }
       }
       
       this.sounds[name] = {
           play: function() {
               try {
                   var source = audioContext.createBufferSource();
                   source.buffer = buffer;
                   var gain = audioContext.createGain();
                   gain.gain.value = 0.5;
                   source.connect(gain);
                   gain.connect(audioContext.destination);
                   source.start();
                   this._source = source;
               } catch (e) {}
           }.bind(this),
           pause: function() {
               if (this._source) {
                   try { this._source.stop(); } catch (e) {}
               }
           }.bind(this),
           volume: 0.5,
           _source: null
       };
       this.soundsLoaded[name] = true;
       console.log('✅ Синтетический звук создан:', name);
   } catch (e) {
       console.warn('⚠️ Не удалось создать звук:', name);
   }
};

// ============================================
// ВОСПРОИЗВЕДЕНИЕ ЗВУКОВ
// ============================================
TankSprite.prototype.playSound = function(name, volume) {
   var sound = this.sounds[name];
   if (!sound || !this.soundsLoaded[name]) {
       this.loadSounds();
       return;
   }
   
   try {
       var vol = volume || 0.5;
       if (sound.volume !== undefined) {
           sound.volume = vol;
       }
       sound.currentTime = 0;
       var promise = sound.play();
       if (promise !== undefined) {
           promise.catch(function(e) {
               console.warn('⚠️ Ошибка воспроизведения звука:', name, e);
           });
       }
   } catch (e) {
       console.warn('⚠️ Ошибка воспроизведения:', name, e);
   }
};

// ============================================
// ЗВУК ДВИЖЕНИЯ
// ============================================
TankSprite.prototype.playMoveSound = function() {
   var volume = this.unit.isPlayer ? 0.5 : 0.25;
   this.playSound('move', volume);
};

TankSprite.prototype.stopMoveSound = function() {
   var sound = this.sounds.move;
   if (sound) {
       try {
           sound.pause();
           sound.currentTime = 0;
       } catch (e) {}
   }
};

// ============================================
// АНИМАЦИЯ ОТДАЧИ
// ============================================
TankSprite.prototype.playRecoil = function() {
   if (this.isRecoiling) return;
   
   this.isRecoiling = true;
   this.recoilStartTime = Date.now();
   this.recoilOffset = 0;
   this.playSound('shoot', 0.5);
};

TankSprite.prototype.updateRecoil = function() {
   if (!this.isRecoiling) return;
   
   var elapsed = Date.now() - this.recoilStartTime;
   var progress = Math.min(1, elapsed / this.recoilDuration);
   
   if (progress < 0.5) {
       var t = progress / 0.5;
       this.recoilOffset = this.maxRecoil * t;
   } else {
       var t = (progress - 0.5) / 0.5;
       this.recoilOffset = this.maxRecoil * (1 - t);
   }
   
   if (this.turretGroup) {
       this.turretGroup.x = this.recoilOffset;
   }
   
   if (progress >= 1) {
       this.isRecoiling = false;
       this.recoilOffset = 0;
       if (this.turretGroup) {
           this.turretGroup.x = 0;
       }
   }
};

// ============================================
// ✅ ПОВОРОТ БАШНИ С ОЧЕРЕДЬЮ (ИСПРАВЛЕННЫЙ)
// ============================================
TankSprite.prototype.rotateTurret = function(direction, duration, onComplete) {
    console.log('🔄 rotateTurret вызван для', this.unit.id, 'направление:', direction);
    
    if (!this.turretGroup) {
        console.warn('⚠️ turretGroup не найден');
        if (onComplete) onComplete();
        return;
    }
    
    var targetAngle = this.getAngle(direction);
    var currentAngle = this.turretGroup.rotation;
    
    // Нормализуем углы
    var diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    // Если угол уже совпадает
    if (Math.abs(diff) < 0.01) {
        console.log('✅ Угол уже совпадает');
        this.currentDirection = direction;
        if (this.unit) {
            this.unit.direction = direction;
        }
        if (onComplete) onComplete();
        return;
    }
    
    // ✅ ДОБАВЛЯЕМ В ОЧЕРЕДЬ
    this.rotationQueue.push({
        direction: direction,
        targetAngle: targetAngle,
        currentAngle: currentAngle,
        diff: diff,
        duration: duration || 300,
        onComplete: onComplete || null
    });
    
    // Если очередь не обрабатывается - запускаем
    if (!this.isProcessingRotation) {
        this.processRotationQueue();
    }
};

// ============================================
// ✅ ОБРАБОТКА ОЧЕРЕДИ ПОВОРОТОВ (ИСПРАВЛЕННАЯ)
// ============================================
TankSprite.prototype.processRotationQueue = function() {
    // ✅ ОЧИЩАЕМ ПРЕДЫДУЩИЙ ТАЙМЕР
    if (this.processTimeout) {
        clearTimeout(this.processTimeout);
        this.processTimeout = null;
    }
    
    if (this.rotationQueue.length === 0) {
        this.isProcessingRotation = false;
        console.log('✅ Очередь поворотов пуста');
        return;
    }
    
    this.isProcessingRotation = true;
    var rotationData = this.rotationQueue.shift();
    
    console.log('🔄 Обработка поворота:', rotationData.direction, 'осталось в очереди:', this.rotationQueue.length);
    
    // Если уже поворачиваемся - останавливаем
    if (this.isRotating) {
        this.stopTurretRotation();
    }
    
    this.isRotating = true;
    this.rotationStartTime = Date.now();
    this.rotationDuration = rotationData.duration;
    this.rotationStartAngle = this.turretGroup.rotation;
    this.rotationTargetAngle = rotationData.targetAngle;
    this.rotationDiff = rotationData.diff;
    this.rotationDirection = rotationData.direction;
    this.rotationCallback = rotationData.onComplete;
    
    // Звук поворота
    this.playSound('rotate', 0.2);
    
    console.log('🔄 Запуск анимации поворота, от:', this.rotationStartAngle, 'до:', this.rotationTargetAngle);
};

// ============================================
// ОСТАНОВКА ПОВОРОТА БАШНИ
// ============================================
TankSprite.prototype.stopTurretRotation = function() {
    console.log('⏹️ Остановка поворота башни');
    this.isRotating = false;
    this.rotationCallback = null;
};

// ============================================
// ОБНОВЛЕНИЕ ПОВОРОТА БАШНИ (ИСПРАВЛЕННОЕ)
// ============================================
TankSprite.prototype.updateTurretRotation = function() {
    if (!this.isRotating || !this.turretGroup) return;
    
    var elapsed = Date.now() - this.rotationStartTime;
    var progress = Math.min(1, elapsed / this.rotationDuration);
    
    // Плавное замедление
    var ease = progress < 0.5 ? 
        2 * progress * progress : 
        1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    var currentAngle = this.rotationStartAngle + this.rotationDiff * ease;
    this.turretGroup.setRotation(currentAngle);
    
    if (progress >= 1) {
        // Поворот завершен
        this.turretGroup.setRotation(this.rotationTargetAngle);
        this.isRotating = false;
        this.currentDirection = this.rotationDirection;
        
        if (this.unit) {
            this.unit.direction = this.rotationDirection;
        }
        
        console.log('✅ Поворот башни завершен:', this.rotationDirection, 'угол:', this.rotationTargetAngle);
        
        var callback = this.rotationCallback;
        this.rotationCallback = null;
        
        // ✅ ОБРАБАТЫВАЕМ СЛЕДУЮЩИЙ ПОВОРОТ В ОЧЕРЕДИ
        var self = this;
        this.processTimeout = setTimeout(function() {
            self.processTimeout = null;
            if (callback) {
                callback();
            }
            // Обрабатываем следующий поворот в очереди
            self.processRotationQueue();
        }, 50);
    }
};

// ============================================
// МГНОВЕННЫЙ ПОВОРОТ БАШНИ
// ============================================
TankSprite.prototype.setTurretDirection = function(direction) {
    if (!this.turretGroup) return;
    
    // Очищаем очередь поворотов
    this.rotationQueue = [];
    this.isProcessingRotation = false;
    this.stopTurretRotation();
    
    if (this.processTimeout) {
        clearTimeout(this.processTimeout);
        this.processTimeout = null;
    }
    
    var angle = this.getAngle(direction);
    this.turretGroup.setRotation(angle);
    this.currentDirection = direction;
    
    if (this.unit) {
        this.unit.direction = direction;
    }
};

// ============================================
// АНИМАЦИЯ ДВИЖЕНИЯ
// ============================================
TankSprite.prototype.queueMove = function(fromQ, fromR, toQ, toR, duration, onComplete) {
   this.moveQueue.push({
       fromQ: fromQ,
       fromR: fromR,
       toQ: toQ,
       toR: toR,
       duration: duration || 2000,
       onComplete: onComplete || null
   });
   
   if (!this.isAnimating) {
       this.processQueue();
   }
};

TankSprite.prototype.processQueue = function() {
   if (this.moveQueue.length === 0 || this.isAnimating) {
       return;
   }
   
   var move = this.moveQueue.shift();
   this._executeAnimation(
       move.fromQ, move.fromR, move.toQ, move.toR, move.duration,
       function() {
           this.processQueue();
           if (move.onComplete) {
               move.onComplete();
           }
       }.bind(this)
   );
};

TankSprite.prototype.animateMove = function(fromQ, fromR, toQ, toR, duration, onComplete) {
   if (fromQ === toQ && fromR === toR) {
       if (onComplete) onComplete();
       return;
   }
   this.queueMove(fromQ, fromR, toQ, toR, duration, onComplete);
};

TankSprite.prototype._executeAnimation = function(fromQ, fromR, toQ, toR, duration, onComplete) {
   if (this.isAnimating) return;
   
   var direction = HexUtils.getDirection(fromQ, fromR, toQ, toR);
   this.unit.direction = direction;
   this.currentDirection = direction;
   this.setTurretDirection(direction);
   
   this.isAnimating = true;
   this.animationProgress = 0;
   this.fromPos = this.hexGrid.hexToPixel(fromQ, fromR);
   this.toPos = this.hexGrid.hexToPixel(toQ, toR);
   this.animDuration = duration || 2000;
   this.animStartTime = Date.now();
   this.onComplete = onComplete || null;
   
   this.playMoveSound();
   
   if (this.animationTimeout) {
       clearTimeout(this.animationTimeout);
   }
   this.animationTimeout = setTimeout(function() {
       if (this.isAnimating) {
           console.warn('⚠️ ТАЙМАУТ АНИМАЦИИ для', this.unit.id);
           this.isAnimating = false;
           this.container.setPosition(this.toPos.x, this.toPos.y);
           this.stopMoveSound();
           if (this.onComplete) {
               var callback = this.onComplete;
               this.onComplete = null;
               callback();
           }
       }
   }.bind(this), duration + 1000);
   
   this.container.setPosition(this.fromPos.x, this.fromPos.y);
};

// ============================================
// ОБНОВЛЕНИЕ
// ============================================
TankSprite.prototype.update = function() {
   // Обновляем отдачу
   this.updateRecoil();
   
   // Обновляем поворот башни
   this.updateTurretRotation();
   
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
       
       if (this.animationTimeout) {
           clearTimeout(this.animationTimeout);
           this.animationTimeout = null;
       }
       
       if (this.unit) {
           this.updateBarrel();
       }
       
       if (this.onComplete) {
           var callback = this.onComplete;
           this.onComplete = null;
           callback();
       }
   }
};

// ============================================
// СОЗДАНИЕ ТАНКА
// ============================================
TankSprite.prototype.create = function() {
   var pos = this.hexGrid.hexToPixel(this.unit.q, this.unit.r);
   
   this.loadSounds();
   
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
   
   // Тень
   var shadow = this.scene.make.graphics({});
   shadow.fillStyle(0x000000, 0.35);
   shadow.fillEllipse(0, s * 0.6, s * 1.6, s * 0.5);
   this.container.add(shadow);
   
   // Корпус
   var body = this.scene.make.graphics({});
   body.fillStyle(color.color, 1);
   body.fillRoundedRect(-s * 0.9, -s * 0.5, s * 1.8, s * 1.0, 6);
   var lighterColor = this.lightenColor(color.color, 30);
   body.fillStyle(lighterColor, 0.3);
   body.fillRoundedRect(-s * 0.7, -s * 0.4, s * 1.4, s * 0.5, 4);
   body.fillStyle(0x000000, 0.1);
   body.fillRoundedRect(-s * 0.8, s * 0.2, s * 1.6, s * 0.3, 3);
   this.container.add(body);
   
   // Гусеницы
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
   
   // Колеса
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
   
   // Башня + ствол
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
   
   // Ствол
   var barrel = this.scene.make.graphics({});
   var barrelLength = s * 1.2;
   var barrelWidth = s * 0.1;
   barrel.fillStyle(0x444444, 1);
   barrel.fillRoundedRect(0, -barrelWidth/2, barrelLength, barrelWidth, 3);
   barrel.fillStyle(0x333333, 1);
   barrel.fillRoundedRect(barrelLength - s * 0.2, -barrelWidth/2 - 0.02 * s, s * 0.2, barrelWidth + 0.04 * s, 2);
   barrel.fillStyle(0x222222, 1);
   barrel.fillRoundedRect(barrelLength - s * 0.08, -barrelWidth/2 - 0.01 * s, s * 0.08, barrelWidth + 0.02 * s, 2);
   barrel.fillStyle(0x888888, 0.2);
   barrel.fillRoundedRect(s * 0.1, -barrelWidth/4, s * 0.6, barrelWidth/2, 2);
   this.barrel = barrel;
   this.turretGroup.add(barrel);
   
   // Люк
   var hatch = this.scene.make.graphics({});
   hatch.fillStyle(0x555555, 1);
   hatch.fillCircle(s * 0.2, -s * 0.15, s * 0.12);
   hatch.fillStyle(0x777777, 0.5);
   hatch.fillCircle(s * 0.18, -s * 0.17, s * 0.05);
   this.turretGroup.add(hatch);
   
   // Броня
   var armor = this.scene.make.graphics({});
   armor.lineStyle(2, color.color, 0.3);
   armor.strokeRoundedRect(-s * 0.6, -s * 0.3, s * 1.2, s * 0.6, 4);
   this.container.add(armor);
   
   // Звезда для игрока
   if (this.unit.isPlayer) {
       var star = this.scene.make.graphics({});
       star.fillStyle(0xffd700, 0.6);
       this.drawStar(star, 0, -s * 0.05, 5, s * 0.2, s * 0.08);
       this.container.add(star);
   }
   
   // Свечение
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
   
   // HP бар
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
   this.hpBar.fillRoundedRect(-s * 0.88, -s * 1.38, s * 1.76 * hpPercent, s * 0.18, 3);
   this.container.add(this.hpBar);
   
   this.hpText = this.scene.add.text(0, -s * 1.3, Math.ceil(this.unit.hp) + '/' + this.unit.maxHp, {
       fontSize: '12px',
       color: '#ffffff',
       stroke: '#000000',
       strokeThickness: 3,
       fontStyle: 'bold'
   }).setOrigin(0.5);
   this.container.add(this.hpText);
   
   this.updateBarrel();
   
   return this.container;
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
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

TankSprite.prototype.updateBarrel = function() {
   if (!this.turretGroup) return;
   if (this.isRotating) return;
   var direction = this.unit.direction || 'right';
   var angle = this.getAngle(direction);
   this.turretGroup.setRotation(angle);
   this.currentDirection = direction;
};

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

TankSprite.prototype.updateHPBar = function() {
   if (!this.hpBar || !this.hpBarBg) return;
   var s = this.size || 30;
   var hpPercent = Math.max(0, this.unit.hp / this.unit.maxHp);
   var hpColor = hpPercent > 0.5 ? 0x44ff44 : (hpPercent > 0.25 ? 0xffaa00 : 0xff4444);
   this.hpBar.clear();
   this.hpBar.fillStyle(hpColor, 1);
   this.hpBar.fillRoundedRect(-s * 0.88, -s * 1.38, s * 1.76 * hpPercent, s * 0.18, 3);
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

TankSprite.prototype.getAngle = function(direction) {
   var map = {
       'right': 0,
       'up-right': -Math.PI / 3,
       'up-left': -Math.PI * 2 / 3,
       'left': Math.PI,
       'down-left': Math.PI * 2 / 3,
       'down-right': Math.PI / 3
   };
   return map[direction] || 0;
};

TankSprite.prototype.destroy = function() {
   this.moveQueue = [];
   this.isAnimating = false;
   this.isRecoiling = false;
   this.isRotating = false;
   
   // Очищаем очередь поворотов
   this.rotationQueue = [];
   this.isProcessingRotation = false;
   
   if (this.processTimeout) {
       clearTimeout(this.processTimeout);
       this.processTimeout = null;
   }
   
   if (this.rotationTween) {
       this.scene.tweens.remove(this.rotationTween);
       this.rotationTween = null;
   }
   
   if (this.animationTimeout) {
       clearTimeout(this.animationTimeout);
       this.animationTimeout = null;
   }
   
   this.stopMoveSound();
   this.sounds = {};
   this.soundsLoaded = {};
   
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

// Экспорт
if (typeof window !== 'undefined') {
   window.TankSprite = TankSprite;
}
