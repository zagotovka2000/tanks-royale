// client/controllers/CameraController.js - СТАРЫЙ СИНТАКСИС

function CameraController(scene) {
   this.scene = scene;
   this.camera = scene.cameras.main;
   this.zoom = 1;
   this.minZoom = 0.5;
   this.maxZoom = 2.0;
   this.zoomStep = 0.1;
   this.isDragging = false;
   this.dragStartX = 0;
   this.dragStartY = 0;
   this.cameraStartX = 0;
   this.cameraStartY = 0;
   this.zoomContainer = null;
}

CameraController.prototype.init = function() {
   console.log('📷 CameraController инициализирован');
   var self = this;
   
   // Колесико мыши - зум
   this.scene.input.on('wheel', function(pointer, gameObjects, deltaX, deltaY, deltaZ) {
       var zoomFactor = 0.1;
       if (deltaY > 0) {
           self.setZoom(self.zoom - zoomFactor);
       } else {
           self.setZoom(self.zoom + zoomFactor);
       }
   });
   
   // Перетаскивание
   this.scene.input.on('pointerdown', function(pointer) {
       if (pointer.leftButtonDown()) {
           self.isDragging = true;
           self.dragStartX = pointer.x;
           self.dragStartY = pointer.y;
           self.cameraStartX = self.camera.scrollX;
           self.cameraStartY = self.camera.scrollY;
       }
   });
   
   this.scene.input.on('pointermove', function(pointer) {
       if (self.isDragging && pointer.leftButtonDown()) {
           var dx = pointer.x - self.dragStartX;
           var dy = pointer.y - self.dragStartY;
           self.camera.scrollX = self.cameraStartX - dx / self.zoom;
           self.camera.scrollY = self.cameraStartY - dy / self.zoom;
       }
   });
   
   this.scene.input.on('pointerup', function() {
       self.isDragging = false;
   });
   
   // Клавиши
   if (this.scene.input.keyboard) {
       this.scene.input.keyboard.on('keydown', function(event) {
           switch(event.key) {
               case '+':
               case '=':
                   self.zoomIn();
                   break;
               case '-':
               case '_':
                   self.zoomOut();
                   break;
               case 'r':
               case 'R':
                   self.reset();
                   break;
           }
       });
   }
   
   // Кнопки зума в UI
   this.addZoomButtons();
   
   return this;
};

CameraController.prototype.setZoom = function(value) {
   this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
   this.camera.setZoom(this.zoom);
   this.updateUI();
};

CameraController.prototype.zoomIn = function() {
   this.setZoom(this.zoom + this.zoomStep);
};

CameraController.prototype.zoomOut = function() {
   this.setZoom(this.zoom - this.zoomStep);
};

CameraController.prototype.reset = function() {
   this.setZoom(1);
   this.camera.scrollX = 0;
   this.camera.scrollY = 0;
};

CameraController.prototype.updateUI = function() {
   var zoomText = document.getElementById('zoomValue');
   if (zoomText) {
       zoomText.textContent = (this.zoom * 100).toFixed(0) + '%';
   }
};

CameraController.prototype.addZoomButtons = function() {
   var self = this;
   
   var zoomContainer = document.createElement('div');
   zoomContainer.id = 'zoom-controls';
   zoomContainer.style.cssText = 
       'position: fixed; bottom: 100px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 1000;';
   document.body.appendChild(zoomContainer);
   
   var zoomInBtn = document.createElement('button');
   zoomInBtn.textContent = '+';
   zoomInBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px);';
   zoomInBtn.onclick = function() { self.zoomIn(); };
   zoomContainer.appendChild(zoomInBtn);
   
   var zoomOutBtn = document.createElement('button');
   zoomOutBtn.textContent = '−';
   zoomOutBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: white; font-size: 28px; cursor: pointer; backdrop-filter: blur(5px);';
   zoomOutBtn.onclick = function() { self.zoomOut(); };
   zoomContainer.appendChild(zoomOutBtn);
   
   var resetBtn = document.createElement('button');
   resetBtn.textContent = '⟲';
   resetBtn.style.cssText = 
       'width: 50px; height: 50px; border-radius: 25px; border: none; background: rgba(0,0,0,0.7); color: #ff9800; font-size: 24px; cursor: pointer; backdrop-filter: blur(5px); margin-top: 5px;';
   resetBtn.onclick = function() { self.reset(); };
   zoomContainer.appendChild(resetBtn);
   
   this.zoomContainer = zoomContainer;
};

CameraController.prototype.destroy = function() {
   this.scene.input.off('wheel');
   this.scene.input.off('pointerdown');
   this.scene.input.off('pointermove');
   this.scene.input.off('pointerup');
   if (this.scene.input.keyboard) {
       this.scene.input.keyboard.off('keydown');
   }
   if (this.zoomContainer) {
       this.zoomContainer.remove();
       this.zoomContainer = null;
   }
   this.scene = null;
   this.camera = null;
};

// Экспорт
if (typeof window !== 'undefined') {
   window.CameraController = CameraController;
}
