// client/animations/ParticleSystem.js
// Система частиц для взрывов, дыма, искр

class ParticleSystem {
   constructor(scene) {
       this.scene = scene;
       this.particles = [];
       this.pools = {
           explosion: [],
           smoke: [],
           spark: [],
           trail: []
       };
       this.maxPools = 100;
       this.debugMode = false;
       
       // Конфигурация
       this.config = {
           explosion: {
               count: 25,
               speed: 300,
               sizeRange: [2, 8],
               lifetime: 600,
               colors: [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffffff]
           },
           smoke: {
               count: 8,
               speed: 50,
               sizeRange: [10, 20],
               lifetime: 2000,
               colors: [0x888888, 0x999999, 0x666666]
           },
           spark: {
               count: 15,
               speed: 200,
               sizeRange: [1, 3],
               lifetime: 300,
               colors: [0xffff00, 0xffaa00]
           },
           trail: {
               count: 3,
               speed: 0,
               sizeRange: [2, 5],
               lifetime: 200,
               colors: [0xff8800, 0xff6600]
           }
       };
   }

   /**
    * Создать взрыв
    */
   explosion(x, y, options = {}) {
       const config = { ...this.config.explosion, ...options };
       const particles = [];
       
       for (let i = 0; i < config.count; i++) {
           const angle = Math.random() * Math.PI * 2;
           const speed = 100 + Math.random() * config.speed;
           const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
           const color = config.colors[Math.floor(Math.random() * config.colors.length)];
           
           const particle = this.createParticle(x, y, {
               size: size,
               color: color,
               alpha: 0.8 + Math.random() * 0.2,
               depth: 15
           });
           
           const targetX = x + Math.cos(angle) * speed * 0.3;
           const targetY = y + Math.sin(angle) * speed * 0.3;
           
           this.animateParticle(particle, {
               x: targetX,
               y: targetY,
               alpha: 0,
               scale: 0.1,
               duration: config.lifetime * (0.5 + Math.random() * 0.5),
               ease: 'Power2',
               onComplete: () => {
                   this.destroyParticle(particle);
               }
           });
           
           particles.push(particle);
       }
       
       // Ударная волна
       this.shockwave(x, y);
       
       // Дым
       this.smoke(x, y, options.smokeCount || 6);
       
       // Искры
       this.sparks(x, y, options.sparkCount || 10);
       
       if (this.debugMode) {
           console.log(`💥 Взрыв в (${Math.round(x)}, ${Math.round(y)}), частиц: ${config.count}`);
       }
       
       return particles;
   }

   /**
    * Создать дым
    */
   smoke(x, y, count = 8, options = {}) {
       const config = { ...this.config.smoke, ...options };
       const particles = [];
       
       for (let i = 0; i < count; i++) {
           const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
           const color = config.colors[Math.floor(Math.random() * config.colors.length)];
           
           const particle = this.createParticle(
               x + (Math.random() - 0.5) * 40,
               y + (Math.random() - 0.5) * 40,
               {
                   size: size,
                   color: color,
                   alpha: 0.2 + Math.random() * 0.3,
                   depth: 12
               }
           );
           
           const targetX = particle.x + (Math.random() - 0.5) * 80;
           const targetY = particle.y - 30 - Math.random() * 50;
           
           this.animateParticle(particle, {
               x: targetX,
               y: targetY,
               scale: 3 + Math.random() * 2,
               alpha: 0,
               duration: config.lifetime * (0.7 + Math.random() * 0.6),
               ease: 'Power1',
               onComplete: () => {
                   this.destroyParticle(particle);
               }
           });
           
           particles.push(particle);
       }
       
       return particles;
   }

   /**
    * Создать искры
    */
   sparks(x, y, count = 15, options = {}) {
       const config = { ...this.config.spark, ...options };
       const particles = [];
       
       for (let i = 0; i < count; i++) {
           const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI;
           const speed = 50 + Math.random() * config.speed;
           const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
           const color = config.colors[Math.floor(Math.random() * config.colors.length)];
           
           const particle = this.createParticle(x, y, {
               size: size,
               color: color,
               alpha: 0.8,
               depth: 16
           });
           
           const targetX = x + Math.cos(angle) * speed * 0.2;
           const targetY = y + Math.sin(angle) * speed * 0.2 - 20;
           
           this.animateParticle(particle, {
               x: targetX,
               y: targetY,
               alpha: 0,
               scale: 0.5,
               duration: config.lifetime * (0.5 + Math.random() * 0.5),
               ease: 'Power2',
               onComplete: () => {
                   this.destroyParticle(particle);
               }
           });
           
           particles.push(particle);
       }
       
       return particles;
   }

   /**
    * Создать след
    */
   trail(x, y, options = {}) {
       const config = { ...this.config.trail, ...options };
       const particles = [];
       
       for (let i = 0; i < config.count; i++) {
           const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
           const color = config.colors[Math.floor(Math.random() * config.colors.length)];
           
           const particle = this.createParticle(
               x + (Math.random() - 0.5) * 10,
               y + (Math.random() - 0.5) * 10,
               {
                   size: size,
                   color: color,
                   alpha: 0.3 + Math.random() * 0.3,
                   depth: 17
               }
           );
           
           this.animateParticle(particle, {
               alpha: 0,
               scale: 2,
               duration: config.lifetime,
               ease: 'Power1',
               onComplete: () => {
                   this.destroyParticle(particle);
               }
           });
           
           particles.push(particle);
       }
       
       return particles;
   }

   /**
    * Создать ударную волну
    */
   shockwave(x, y, radius = 30, duration = 400) {
       const wave = this.scene.add.circle(x, y, 10, 0xffffff, 0.3);
       wave.setDepth(13);
       wave.setStrokeStyle(3, 0xffffff);
       
       this.scene.tweens.add({
           targets: wave,
           scaleX: radius / 10,
           scaleY: radius / 10,
           alpha: 0,
           duration: duration,
           ease: 'Power2',
           onComplete: () => {
               wave.destroy();
           }
       });
       
       return wave;
   }

   /**
    * Создать частицу
    */
   createParticle(x, y, options = {}) {
       const size = options.size || 4;
       const color = options.color || 0xffffff;
       const alpha = options.alpha || 1;
       const depth = options.depth || 10;
       
       const particle = this.scene.add.circle(x, y, size, color, alpha);
       particle.setDepth(depth);
       
       this.particles.push(particle);
       return particle;
   }

   /**
    * Анимировать частицу
    */
   animateParticle(particle, options = {}) {
       const tweenConfig = {
           targets: particle,
           duration: options.duration || 500,
           ease: options.ease || 'Linear',
           onComplete: () => {
               if (options.onComplete) options.onComplete();
           }
       };
       
       if (options.x !== undefined) tweenConfig.x = options.x;
       if (options.y !== undefined) tweenConfig.y = options.y;
       if (options.alpha !== undefined) tweenConfig.alpha = options.alpha;
       if (options.scale !== undefined) {
           tweenConfig.scaleX = options.scale;
           tweenConfig.scaleY = options.scale;
       }
       if (options.rotation !== undefined) tweenConfig.rotation = options.rotation;
       
       this.scene.tweens.add(tweenConfig);
   }

   /**
    * Уничтожить частицу
    */
   destroyParticle(particle) {
       if (particle && particle.destroy) {
           particle.destroy();
       }
       const index = this.particles.indexOf(particle);
       if (index !== -1) {
           this.particles.splice(index, 1);
       }
   }

   /**
    * Очистить все частицы
    */
   clearAll() {
       for (const particle of this.particles) {
           if (particle && particle.destroy) {
               particle.destroy();
           }
       }
       this.particles = [];
       if (this.debugMode) console.log('🧹 Все частицы очищены');
   }

   /**
    * Включить/выключить отладку
    */
   setDebug(enabled) {
       this.debugMode = enabled;
   }

   /**
    * Получить количество активных частиц
    */
   getParticleCount() {
       return this.particles.length;
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.ParticleSystem = ParticleSystem;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { ParticleSystem };
}
