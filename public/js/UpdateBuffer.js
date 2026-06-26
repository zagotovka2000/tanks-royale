class UpdateBuffer {
   constructor(renderer, delayMs = 50) {
       this.renderer = renderer;
       this.delayMs = delayMs;
       this.pendingUpdate = null;
       this.timeout = null;
       this.isProcessing = false;
       this.updateQueue = [];
       this.lastUpdateTime = 0;
       this.minUpdateInterval = 33; // ~30 FPS
   }
   
   scheduleUpdate(state, updateType = 'full') {
       if (!state) return;
       
       this.pendingUpdate = {
           state: this.cloneState(state),
           type: updateType,
           timestamp: Date.now()
       };
       
       if (!this.timeout) {
           this.timeout = setTimeout(() => this.flush(), this.delayMs);
       }
   }
   
   cloneState(state) {
       // Быстрое клонирование только необходимых данных
       return {
           cells: state.cells ? [...state.cells] : null,
           myTank: state.myTank ? { ...state.myTank } : null,
           allies: state.allies ? state.allies.map(a => ({ ...a })) : null,
           enemies: state.enemies ? state.enemies.map(e => ({ ...e })) : null,
           walls: state.walls ? [...state.walls] : null,
           bases: state.bases ? [...state.bases] : null,
           smokeEffects: state.smokeEffects ? [...state.smokeEffects] : null
       };
   }
   
   async flush() {
       if (!this.pendingUpdate || this.isProcessing) {
           this.timeout = null;
           return;
       }
       
       const now = Date.now();
       if (now - this.lastUpdateTime < this.minUpdateInterval) {
           // Откладываем обновление
           this.timeout = setTimeout(() => this.flush(), this.minUpdateInterval);
           return;
       }
       
       this.isProcessing = true;
       const { state, type } = this.pendingUpdate;
       
       try {
           this.lastUpdateTime = now;
           
           if (type === 'full' || type === 'map') {
               this.renderer.drawMap(state);
           }
           
           if (type === 'full' || type === 'tanks') {
               this.renderer.updateTanks(state);
           }
           
           if (type === 'partial') {
               this.renderer.updateTanks(state);
           }
       } catch (err) {
           console.error('UpdateBuffer flush error:', err);
       }
       
       this.pendingUpdate = null;
       this.timeout = null;
       this.isProcessing = false;
   }
   
   immediate(state, updateType = 'full') {
       if (this.timeout) {
           clearTimeout(this.timeout);
           this.timeout = null;
       }
       
       this.pendingUpdate = null;
       this.lastUpdateTime = Date.now();
       
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
       this.updateQueue = [];
   }
}

window.UpdateBuffer = UpdateBuffer;
