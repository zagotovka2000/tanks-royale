// client/animations/AnimationEngine.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

class AnimationEngine {
   constructor(scene) {
       this.scene = scene;
       this.activeAnimations = new Map();
       this.animationQueue = new Map();
       this.isProcessingQueue = new Map();
       this.defaultDuration = 1500;
       this.debugMode = false;
   }

   /**
    * Создать анимацию движения
    */
   moveTo(id, target, fromX, fromY, toX, toY, options = {}, onComplete = null) {
       const config = {
           duration: options.duration || this.defaultDuration,
           ease: options.ease || 'Quadratic.InOut',
           delay: options.delay || 0,
           onStart: options.onStart || null,
           onUpdate: options.onUpdate || null,
           onComplete: onComplete,
           jumpHeight: options.jumpHeight || 0,
           useJump: options.useJump || false
       };

       if (this.activeAnimations.has(id)) {
           this.addToQueue(id, {
               type: 'move',
               target, fromX, fromY, toX, toY,
               config, onComplete
           });
           return this;
       }

       this.executeMove(id, target, fromX, fromY, toX, toY, config);
       return this;
   }

   executeMove(id, target, fromX, fromY, toX, toY, config) {
       target.x = fromX;
       target.y = fromY;

       let startTime = Date.now();
       let progress = 0;

       const tween = this.scene.tweens.add({
           targets: target,
           x: toX,
           y: toY,
           duration: config.duration,
           ease: config.ease,
           delay: config.delay,
           onStart: () => {
               if (config.onStart) config.onStart();
               if (this.debugMode) console.log(`🎬 Движение начато: ${id}`);
               startTime = Date.now();
           },
           onUpdate: () => {
               if (config.onUpdate) config.onUpdate();
               
               // Эффект прыжка
               if (config.useJump && config.jumpHeight > 0) {
                   progress = (Date.now() - startTime) / config.duration;
                   if (progress > 1) progress = 1;
                   const jump = Math.sin(progress * Math.PI) * config.jumpHeight;
                   const baseY = fromY + (toY - fromY) * progress;
                   target.y = baseY - jump;
               }
           },
           onComplete: () => {
               this.activeAnimations.delete(id);
               if (this.debugMode) console.log(`✅ Движение завершено: ${id}`);
               this.processQueue(id);
               if (config.onComplete) config.onComplete();
           }
       });

       this.activeAnimations.set(id, {
           tween: tween,
           type: 'move',
           config: config,
           startTime: startTime
       });
   }

   /**
    * Анимация поворота
    */
   rotateTo(id, target, fromAngle, toAngle, options = {}, onComplete = null) {
       const config = {
           duration: options.duration || 400,
           ease: options.ease || 'Quadratic.Out',
           delay: options.delay || 0,
           onComplete: onComplete
       };

       if (this.activeAnimations.has(id)) {
           this.addToQueue(id, {
               type: 'rotate',
               target, fromAngle, toAngle,
               config, onComplete
           });
           return this;
       }

       this.executeRotate(id, target, fromAngle, toAngle, config);
       return this;
   }

   executeRotate(id, target, fromAngle, toAngle, config) {
       let diff = toAngle - fromAngle;
       while (diff > Math.PI) diff -= Math.PI * 2;
       while (diff < -Math.PI) diff += Math.PI * 2;
       
       if (Math.abs(diff) < 0.01) {
           if (config.onComplete) config.onComplete();
           return;
       }

       target.rotation = fromAngle;
       const targetAngle = fromAngle + diff;

       const tween = this.scene.tweens.add({
           targets: target,
           rotation: targetAngle,
           duration: config.duration,
           ease: config.ease,
           delay: config.delay,
           onStart: () => {
               if (this.debugMode) console.log(`🔄 Поворот начат: ${id}`);
           },
           onComplete: () => {
               this.activeAnimations.delete(id);
               if (this.debugMode) console.log(`✅ Поворот завершен: ${id}`);
               this.processQueue(id);
               if (config.onComplete) config.onComplete();
           }
       });

       this.activeAnimations.set(id, {
           tween: tween,
           type: 'rotate',
           config: config
       });
   }

   /**
    * Комплексная анимация (движение + поворот одновременно)
    */
   moveAndRotate(id, target, fromX, fromY, toX, toY, fromAngle, toAngle, options = {}, onComplete = null) {
       const config = {
           duration: options.duration || this.defaultDuration,
           ease: options.ease || 'Quadratic.InOut',
           delay: options.delay || 0,
           onComplete: onComplete,
           jumpHeight: options.jumpHeight || 15,
           useJump: options.useJump || false
       };

       if (this.activeAnimations.has(id)) {
           this.addToQueue(id, {
               type: 'moveAndRotate',
               target, fromX, fromY, toX, toY, fromAngle, toAngle,
               config, onComplete
           });
           return this;
       }

       this.executeMoveAndRotate(id, target, fromX, fromY, toX, toY, fromAngle, toAngle, config);
       return this;
   }

   executeMoveAndRotate(id, target, fromX, fromY, toX, toY, fromAngle, toAngle, config) {
       target.x = fromX;
       target.y = fromY;
       target.rotation = fromAngle;

       let diff = toAngle - fromAngle;
       while (diff > Math.PI) diff -= Math.PI * 2;
       while (diff < -Math.PI) diff += Math.PI * 2;
       const targetAngle = fromAngle + diff;

       let startTime = Date.now();
       let progress = 0;

       const tween = this.scene.tweens.add({
           targets: target,
           x: toX,
           y: toY,
           rotation: targetAngle,
           duration: config.duration,
           ease: config.ease,
           delay: config.delay,
           onStart: () => {
               if (this.debugMode) console.log(`🎬 Комплексная анимация: ${id}`);
               startTime = Date.now();
           },
           onUpdate: () => {
               if (config.useJump && config.jumpHeight > 0) {
                   progress = (Date.now() - startTime) / config.duration;
                   if (progress > 1) progress = 1;
                   const jump = Math.sin(progress * Math.PI) * config.jumpHeight;
                   const baseY = fromY + (toY - fromY) * progress;
                   target.y = baseY - jump;
               }
           },
           onComplete: () => {
               this.activeAnimations.delete(id);
               if (this.debugMode) console.log(`✅ Комплексная анимация завершена: ${id}`);
               this.processQueue(id);
               if (config.onComplete) config.onComplete();
           }
       });

       this.activeAnimations.set(id, {
           tween: tween,
           type: 'moveAndRotate',
           config: config,
           startTime: startTime
       });
   }

   /**
    * Анимация масштабирования
    */
   scaleTo(id, target, fromScale, toScale, options = {}, onComplete = null) {
       const config = {
           duration: options.duration || 300,
           ease: options.ease || 'Quadratic.Out',
           delay: options.delay || 0,
           onComplete: onComplete
       };

       if (this.activeAnimations.has(id)) {
           this.addToQueue(id, {
               type: 'scale',
               target, fromScale, toScale,
               config, onComplete
           });
           return this;
       }

       this.executeScale(id, target, fromScale, toScale, config);
       return this;
   }

   executeScale(id, target, fromScale, toScale, config) {
       target.scaleX = fromScale;
       target.scaleY = fromScale;

       const tween = this.scene.tweens.add({
           targets: target,
           scaleX: toScale,
           scaleY: toScale,
           duration: config.duration,
           ease: config.ease,
           delay: config.delay,
           onComplete: () => {
               this.activeAnimations.delete(id);
               this.processQueue(id);
               if (config.onComplete) config.onComplete();
           }
       });

       this.activeAnimations.set(id, {
           tween: tween,
           type: 'scale',
           config: config
       });
   }

   /**
    * Управление очередью
    */
   addToQueue(id, animationData) {
       if (!this.animationQueue.has(id)) {
           this.animationQueue.set(id, []);
       }
       this.animationQueue.get(id).push(animationData);
       if (this.debugMode) console.log(`📦 Добавлено в очередь [${id}], размер: ${this.animationQueue.get(id).length}`);
   }

   processQueue(id) {
       if (!this.animationQueue.has(id)) {
           this.animationQueue.delete(id);
           this.isProcessingQueue.delete(id);
           return;
       }
       
       const queue = this.animationQueue.get(id);
       if (queue.length === 0) {
           this.animationQueue.delete(id);
           this.isProcessingQueue.delete(id);
           return;
       }

       if (this.isProcessingQueue.get(id)) return;
       
       const nextAnim = queue.shift();
       this.isProcessingQueue.set(id, true);
       
       if (this.debugMode) console.log(`🔄 Обработка очереди [${id}], осталось: ${queue.length}`);

       const self = this;
       const wrappedComplete = () => {
           this.isProcessingQueue.delete(id);
           if (queue.length > 0) {
               setTimeout(() => {
                   this.processQueue(id);
               }, 50);
           } else {
               this.animationQueue.delete(id);
           }
       };

       switch(nextAnim.type) {
           case 'move':
               this.executeMove(id, nextAnim.target, nextAnim.fromX, nextAnim.fromY, 
                               nextAnim.toX, nextAnim.toY, nextAnim.config);
               const origComplete = nextAnim.config.onComplete;
               nextAnim.config.onComplete = () => {
                   if (origComplete) origComplete();
                   wrappedComplete();
               };
               break;
           case 'rotate':
               this.executeRotate(id, nextAnim.target, nextAnim.fromAngle, 
                                  nextAnim.toAngle, nextAnim.config);
               const origRotComplete = nextAnim.config.onComplete;
               nextAnim.config.onComplete = () => {
                   if (origRotComplete) origRotComplete();
                   wrappedComplete();
               };
               break;
           case 'scale':
               this.executeScale(id, nextAnim.target, nextAnim.fromScale,
                                nextAnim.toScale, nextAnim.config);
               const origScaleComplete = nextAnim.config.onComplete;
               nextAnim.config.onComplete = () => {
                   if (origScaleComplete) origScaleComplete();
                   wrappedComplete();
               };
               break;
           case 'moveAndRotate':
               this.executeMoveAndRotate(id, nextAnim.target, nextAnim.fromX, nextAnim.fromY,
                                        nextAnim.toX, nextAnim.toY, nextAnim.fromAngle,
                                        nextAnim.toAngle, nextAnim.config);
               const origMRComplete = nextAnim.config.onComplete;
               nextAnim.config.onComplete = () => {
                   if (origMRComplete) origMRComplete();
                   wrappedComplete();
               };
               break;
           default:
               this.isProcessingQueue.delete(id);
               this.processQueue(id);
       }
   }

   /**
    * Остановить анимацию
    */
   stop(id) {
       if (this.activeAnimations.has(id)) {
           const anim = this.activeAnimations.get(id);
           if (anim.tween) {
               anim.tween.stop();
           }
           this.activeAnimations.delete(id);
       }
       
       if (this.animationQueue.has(id)) {
           this.animationQueue.delete(id);
       }
       this.isProcessingQueue.delete(id);
       
       if (this.debugMode) console.log(`⏹️ Анимация остановлена: ${id}`);
   }

   /**
    * Получить статус анимации
    */
   isAnimating(id) {
       return this.activeAnimations.has(id);
   }

   /**
    * Очистить все анимации
    */
   clearAll() {
       for (const [id, anim] of this.activeAnimations) {
           if (anim.tween) {
               anim.tween.stop();
           }
       }
       this.activeAnimations.clear();
       this.animationQueue.clear();
       this.isProcessingQueue.clear();
       if (this.debugMode) console.log('🧹 Все анимации очищены');
   }

   /**
    * Включить/выключить отладку
    */
   setDebug(enabled) {
       this.debugMode = enabled;
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.AnimationEngine = AnimationEngine;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { AnimationEngine };
}
