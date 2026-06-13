export class InputHandler {
   constructor(canvas, onTargetSelect) {
       this.canvas = canvas;
       this.onTargetSelect = onTargetSelect;
       this.initEvents();
   }
   
   initEvents() {
       this.canvas.addEventListener('click', (e) => this.handleClick(e));
       this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
   }
   
   getCanvasCoords(e) {
       const rect = this.canvas.getBoundingClientRect();
       const scaleX = this.canvas.width / rect.width;
       const scaleY = this.canvas.height / rect.height;
       
       let clientX, clientY;
       if (e.touches) {
           clientX = e.touches[0].clientX - rect.left;
           clientY = e.touches[0].clientY - rect.top;
       } else {
           clientX = e.clientX - rect.left;
           clientY = e.clientY - rect.top;
       }
       
       return {
           x: clientX * scaleX,
           y: clientY * scaleY
       };
   }
   handleDirection(dir) {
      const myTank = gameState.myTank;
      let targetQ = myTank.q;
      let targetR = myTank.r;
      
      switch(dir) {
          case 'up': targetR--; break;
          case 'up-right': targetQ++; targetR--; break;
          case 'right': targetQ++; break;
          case 'down-right': targetQ++; targetR++; break;
          case 'down': targetR++; break;
          case 'down-left': targetQ--; targetR++; break;
          case 'left': targetQ--; break;
      }
      
      socket.emit('move', { q: targetQ, r: targetR });
  }
   handleClick(e) {
       const { x, y } = this.getCanvasCoords(e);
       this.checkTarget(x, y);
   }
   
   handleTouch(e) {
       if (e.touches.length === 1) {
           e.preventDefault();
           const { x, y } = this.getCanvasCoords(e);
           this.checkTarget(x, y);
       }
   }
   
   checkTarget(x, y) {
       // Этот метод будет переопределен из main.js
       if (this.onTargetSelect) {
           // Координаты нужно будет проверить с gameState
           this.lastClick = { x, y };
       }
   }
}
