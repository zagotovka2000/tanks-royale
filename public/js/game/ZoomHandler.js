export class ZoomHandler {
   constructor(canvas) {
       this.canvas = canvas;
       this.currentZoom = 1;
       this.minZoom = 0.5;
       this.maxZoom = 2.5;
       this.initialDistance = 0;
       this.initialZoom = 1;
       
       this.initEvents();
   }
   
   initEvents() {
       this.canvas.addEventListener('wheel', (e) => {
           e.preventDefault();
           const delta = e.deltaY > 0 ? -0.05 : 0.05;
           this.currentZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.currentZoom + delta));
           this.updateZoom();
       });
       
       this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
       this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
   }
   
   onTouchStart(e) {
       if (e.touches.length === 2) {
           e.preventDefault();
           this.initialDistance = this.getTouchDistance(e);
           this.initialZoom = this.currentZoom;
       }
   }
   
   onTouchMove(e) {
       if (e.touches.length === 2) {
           e.preventDefault();
           const newDistance = this.getTouchDistance(e);
           const scale = newDistance / this.initialDistance;
           this.currentZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.initialZoom * scale));
           this.updateZoom();
       }
   }
   
   getTouchDistance(e) {
       const dx = e.touches[0].clientX - e.touches[1].clientX;
       const dy = e.touches[0].clientY - e.touches[1].clientY;
       return Math.sqrt(dx * dx + dy * dy);
   }
   
   updateZoom() {
       this.canvas.style.transform = `scale(${this.currentZoom})`;
   }
   
   zoomIn() {
       this.currentZoom = Math.min(this.maxZoom, this.currentZoom + 0.1);
       this.updateZoom();
   }
   
   zoomOut() {
       this.currentZoom = Math.max(this.minZoom, this.currentZoom - 0.1);
       this.updateZoom();
   }
   
   resetZoom() {
       this.currentZoom = 1;
       this.updateZoom();
   }
}
