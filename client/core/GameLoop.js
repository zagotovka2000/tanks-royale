// client/core/GameLoop.js

class GameLoop {
   constructor() {
       this.callbacks = [];
       this.isRunning = false;
       this.rafId = null;
       this.lastTime = 0;
       this.fps = 0;
       this.frameCount = 0;
       this.fpsTimer = 0;
   }
   
   // Добавить функцию в цикл
   add(callback) {
       if (typeof callback !== 'function') {
           console.warn('⚠️ GameLoop.add: callback должен быть функцией');
           return;
       }
       this.callbacks.push(callback);
       return this;
   }
   
   // Удалить функцию из цикла
   remove(callback) {
       const index = this.callbacks.indexOf(callback);
       if (index !== -1) {
           this.callbacks.splice(index, 1);
       }
       return this;
   }
   
   // Запустить цикл
   start() {
       if (this.isRunning) return;
       this.isRunning = true;
       this.lastTime = performance.now();
       this.loop(this.lastTime);
       console.log('🔄 Игровой цикл запущен');
       return this;
   }
   
   // Остановить цикл
   stop() {
       this.isRunning = false;
       if (this.rafId) {
           cancelAnimationFrame(this.rafId);
           this.rafId = null;
       }
       console.log('🔄 Игровой цикл остановлен');
       return this;
   }
   
   // Основной цикл
   loop(timestamp) {
       if (!this.isRunning) return;
       
       this.rafId = requestAnimationFrame((time) => this.loop(time));
       
       const delta = timestamp - this.lastTime;
       this.lastTime = timestamp;
       
       // Обновляем FPS
       this.frameCount++;
       this.fpsTimer += delta;
       if (this.fpsTimer >= 1000) {
           this.fps = this.frameCount;
           this.frameCount = 0;
           this.fpsTimer = 0;
       }
       
       // Вызываем все колбэки
       for (const callback of this.callbacks) {
           try {
               callback(delta, timestamp);
           } catch (error) {
               console.error('❌ Ошибка в игровом цикле:', error);
           }
       }
   }
   
   // Получить текущий FPS
   getFPS() {
       return this.fps;
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.GameLoop = GameLoop;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { GameLoop };
}
