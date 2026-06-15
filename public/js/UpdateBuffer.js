// Буферизация обновлений для оптимизации рендеринга
class UpdateBuffer {
   constructor(renderer, delayMs = 50) {
       this.renderer = renderer;
       this.delayMs = delayMs;
       this.pendingUpdate = null;
       this.timeout = null;
       this.isAnimating = false;
   }
   
   scheduleUpdate(state, updateType = 'full') {
       if (!state) return;
       
       this.pendingUpdate = {
           state: state,
           type: updateType,
           timestamp: Date.now()
       };
       
       if (!this.timeout) {
           this.timeout = setTimeout(() => this.flush(), this.delayMs);
       }
   }
   
   flush() {
       if (!this.pendingUpdate) {
           this.timeout = null;
           return;
       }
       
       const { state, type } = this.pendingUpdate;
       
       try {
           if (type === 'full' || type === 'map') {
               this.renderer.drawMap(state);
           }
           
           if (type === 'full' || type === 'tanks') {
               this.renderer.updateTanks(state);
           }
           
           // Обновляем только изменившиеся элементы
           if (type === 'partial') {
               this.renderer.updateChangedTanks(state);
           }
       } catch (err) {
           console.error('UpdateBuffer flush error:', err);
       }
       
       this.pendingUpdate = null;
       this.timeout = null;
   }
   
   // Немедленное обновление (для важных событий)
   immediate(state, updateType = 'full') {
       if (this.timeout) {
           clearTimeout(this.timeout);
           this.timeout = null;
       }
       
       this.pendingUpdate = null;
       
       if (updateType === 'full' || updateType === 'map') {
           this.renderer.drawMap(state);
       }
       
       if (updateType === 'full' || updateType === 'tanks') {
           this.renderer.updateTanks(state);
       }
   }
   
   clear() {
       if (this.timeout) {
           clearTimeout(this.timeout);
           this.timeout = null;
       }
       this.pendingUpdate = null;
   }
}

if (typeof window !== 'undefined') {
   window.UpdateBuffer = UpdateBuffer;
}
