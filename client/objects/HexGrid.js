// client/objects/HexGrid.js

function HexGrid(scene, hexSize) {
   this.scene = scene;
   this.hexSize = hexSize || 45;
   this.graphics = null;
   this.hexObjects = new Map();
   this.gridOffsetX = 0;
   this.gridOffsetY = 0;
   this.debugMarkers = [];
   this.hexContainer = null;
   this.currentHighlightKey = null;
}

HexGrid.prototype.init = function() {
   var width = this.scene.cameras.main.width;
   var height = this.scene.cameras.main.height;
   
   this.gridOffsetX = width / 2;
   this.gridOffsetY = height / 2;
   
   console.log('📐 HexGrid.init() - Размеры:', width, 'x', height);
   console.log('📐 Смещение сетки:', this.gridOffsetX, this.gridOffsetY);
   
   this.hexContainer = this.scene.add.container(0, 0);
   this.hexContainer.setDepth(0);
   
   return this;
};

HexGrid.prototype.hexToPixel = function(q, r) {
   var hexSize = this.hexSize || 45;
   
   var x = (q + r / 2) * hexSize * 1.8;
   var y = r * hexSize * 1.6;
   
   var offsetX = this.gridOffsetX || 0;
   var offsetY = this.gridOffsetY || 0;
   
   return { 
       x: x + offsetX, 
       y: y + offsetY 
   };
};

HexGrid.prototype.pixelToHex = function(px, py) {
   var camera = this.scene.cameras.main;
   
   // ✅ ИСПОЛЬЗУЕМ ВСТРОЕННЫЙ МЕТОД PHASER
   // getWorldPoint учитывает zoom, scrollX, scrollY и все трансформации
   var worldPoint = camera.getWorldPoint(px, py);
   var worldX = worldPoint.x;
   var worldY = worldPoint.y;
   
   // Координаты относительно центра сетки (без смещения)
   var gridX = worldX - this.gridOffsetX;
   var gridY = worldY - this.gridOffsetY;
   
   // Обратное преобразование в координаты гекса
   var hexSize = this.hexSize || 45;
   var r = gridY / (hexSize * 1.6);
   var q = gridX / (hexSize * 1.8) - r / 2;
   
   var roundQ = Math.round(q);
   var roundR = Math.round(r);
   
   // Проверяем существование гекса
   var cells = this.scene.gameState ? this.scene.gameState.cells : [];
   if (!cells || cells.length === 0) {
       return null;
   }
   
   // Ищем точное совпадение
   for (var i = 0; i < cells.length; i++) {
       var cell = cells[i];
       if (cell.q === roundQ && cell.r === roundR) {
           return cell;
       }
   }
   
   // Если точного нет - ищем ближайший
   var best = null;
   var bestDist = Infinity;
   
   for (var i = 0; i < cells.length; i++) {
       var cell = cells[i];
       var pos = this.hexToPixel(cell.q, cell.r);
       var dx = worldX - pos.x;
       var dy = worldY - pos.y;
       var dist = dx * dx + dy * dy;
       
       if (dist < bestDist) {
           bestDist = dist;
           best = cell;
       }
   }
   
   return best;
};

HexGrid.prototype.getHexPoints = function(cx, cy, size) {
   var points = [];
   for (var i = 0; i < 6; i++) {
       var angle = Math.PI / 180 * (60 * i - 30);
       points.push({
           x: cx + size * Math.cos(angle),
           y: cy + size * Math.sin(angle)
       });
   }
   return points;
};

HexGrid.prototype.drawStar = function(graphics, cx, cy, spikes, outerRadius, innerRadius) {
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

HexGrid.prototype.drawHexWithEffect = function(g, cx, cy, size, color, isBase) {
   var points = this.getHexPoints(cx, cy, size);
   
   g.fillStyle(color, 1);
   g.beginPath();
   for (var i = 0; i < points.length; i++) {
       if (i === 0) g.moveTo(points[i].x, points[i].y);
       else g.lineTo(points[i].x, points[i].y);
   }
   g.closePath();
   g.fillPath();
   
   g.lineStyle(2, 0x88ccff, 0.8);
   g.beginPath();
   for (var i = 0; i < points.length; i++) {
       if (i === 0) g.moveTo(points[i].x, points[i].y);
       else g.lineTo(points[i].x, points[i].y);
   }
   g.closePath();
   g.strokePath();
   
   g.lineStyle(1, 0x000000, 0.15);
   var innerPoints = points.map(function(p) {
       return { x: p.x * 0.92, y: p.y * 0.92 };
   });
   g.beginPath();
   for (var i = 0; i < innerPoints.length; i++) {
       if (i === 0) g.moveTo(innerPoints[i].x, innerPoints[i].y);
       else g.lineTo(innerPoints[i].x, innerPoints[i].y);
   }
   g.closePath();
   g.strokePath();
   
   if (isBase) {
       g.fillStyle(0xffd700, 0.2);
       g.fillCircle(cx, cy, size * 1.2);
       g.fillStyle(0xffd700, 0.95);
       this.drawStar(g, cx, cy, 5, 14, 7);
       g.fillStyle(0xffffff, 0.4);
       g.fillCircle(cx - 3, cy - 4, 3);
   }
};

HexGrid.prototype.drawMap = function(cells) {
   if (!cells || cells.length === 0) {
       console.warn('⚠️ Нет клеток для отрисовки');
       return;
   }
   
   var width = this.scene.cameras.main.width;
   var height = this.scene.cameras.main.height;
   this.gridOffsetX = width / 2;
   this.gridOffsetY = height / 2;
   
   if (this.hexContainer) {
       this.hexContainer.destroy();
   }
   this.hexContainer = this.scene.add.container(0, 0);
   this.hexContainer.setDepth(0);
   
   this.hexObjects.clear();
   this.currentHighlightKey = null;
   
   var colors = {
       plains: 0x4a8c3f,
       base: 0xc9a03d
   };
   
   var drawn = 0;
   
   for (var i = 0; i < cells.length; i++) {
       var cell = cells[i];
       var pos = this.hexToPixel(cell.q, cell.r);
       var color = cell.terrain === 'base' ? colors.base : colors.plains;
       var isBase = cell.terrain === 'base';
       
       var g = this.scene.add.graphics();
       this.drawHexWithEffect(g, 0, 0, this.hexSize, color, isBase);
       g.setPosition(pos.x, pos.y);
       g.setDepth(0);
       
       this.hexContainer.add(g);
       this.hexObjects.set(cell.q + ',' + cell.r, g);
       drawn++;
   }
   
   this.addCenterMarker();
};

HexGrid.prototype.addCenterMarker = function() {
   for (var i = 0; i < this.debugMarkers.length; i++) {
       var marker = this.debugMarkers[i];
       if (marker && marker.destroy) marker.destroy();
   }
   this.debugMarkers = [];
   
   var pos = this.hexToPixel(0, 0);
   
   var circle = this.scene.add.circle(pos.x, pos.y, 20, 0xff0000);
   circle.setDepth(100);
   circle.setStrokeStyle(3, 0xffffff);
   this.debugMarkers.push(circle);
   
   var text = this.scene.add.text(pos.x, pos.y - 30, 'ЦЕНТР КАРТЫ', {
       fontSize: '14px',
       color: '#ffffff',
       backgroundColor: '#000000',
       padding: { x: 6, y: 3 },
       fontStyle: 'bold'
   });
   text.setOrigin(0.5);
   text.setDepth(100);
   this.debugMarkers.push(text);
   
   var line1 = this.scene.add.line(
       pos.x - 15, pos.y,
       pos.x + 15, pos.y,
       0xffffff
   );
   line1.setDepth(100);
   line1.setStrokeStyle(2, 0xffffff);
   this.debugMarkers.push(line1);
   
   var line2 = this.scene.add.line(
       pos.x, pos.y - 15,
       pos.x, pos.y + 15,
       0xffffff
   );
   line2.setDepth(100);
   line2.setStrokeStyle(2, 0xffffff);
   this.debugMarkers.push(line2);
};

HexGrid.prototype.highlightHex = function(q, r, color) {
   var key = q + ',' + r;
   var highlightKey = 'highlight_' + key;
   
   if (this.currentHighlightKey === highlightKey) {
       this.clearHighlight();
       this.currentHighlightKey = null;
       return null;
   }
   
   this.clearHighlight();
   
   var pos = this.hexToPixel(q, r);
   
   var g = this.scene.add.graphics();
   var points = this.getHexPoints(0, 0, this.hexSize + 3);
   
   g.fillStyle(color || 0xffeb3b, 0.3);
   g.beginPath();
   for (var i = 0; i < points.length; i++) {
       if (i === 0) g.moveTo(points[i].x, points[i].y);
       else g.lineTo(points[i].x, points[i].y);
   }
   g.closePath();
   g.fillPath();
   
   g.lineStyle(4, color || 0xffeb3b, 1);
   g.beginPath();
   for (var i = 0; i < points.length; i++) {
       if (i === 0) g.moveTo(points[i].x, points[i].y);
       else g.lineTo(points[i].x, points[i].y);
   }
   g.closePath();
   g.strokePath();
   
   g.fillStyle(color || 0xffeb3b, 0.1);
   g.fillCircle(0, 0, this.hexSize * 1.5);
   
   g.setPosition(pos.x, pos.y);
   g.setDepth(2);
   
   if (this.hexContainer) {
       this.hexContainer.add(g);
   }
   
   this.hexObjects.set(highlightKey, g);
   this.currentHighlightKey = highlightKey;
   
   return g;
};

HexGrid.prototype.clearHighlight = function() {
   var toRemove = [];
   for (var key of this.hexObjects.keys()) {
       if (key.startsWith('highlight_')) {
           var obj = this.hexObjects.get(key);
           if (obj && obj.destroy) obj.destroy();
           toRemove.push(key);
       }
   }
   for (var i = 0; i < toRemove.length; i++) {
       this.hexObjects.delete(toRemove[i]);
   }
   this.currentHighlightKey = null;
};

HexGrid.prototype.highlightMoveArea = function(q, r, validNeighbors) {
   this.clearHighlight();
   this.highlightHex(q, r, 0x44ff44);
   for (var i = 0; i < validNeighbors.length; i++) {
       var n = validNeighbors[i];
       this.highlightHex(n.q, n.r, 0x44ff44);
   }
};

HexGrid.prototype.clearMoveHighlight = function() {
   this.clearHighlight();
};

HexGrid.prototype.destroy = function() {
   for (var key of this.hexObjects.keys()) {
       var obj = this.hexObjects.get(key);
       if (obj && obj.destroy) obj.destroy();
   }
   this.hexObjects.clear();
   
   for (var i = 0; i < this.debugMarkers.length; i++) {
       var marker = this.debugMarkers[i];
       if (marker && marker.destroy) marker.destroy();
   }
   this.debugMarkers = [];
   
   if (this.hexContainer) {
       this.hexContainer.destroy();
       this.hexContainer = null;
   }
   
   if (this.graphics) {
       this.graphics.destroy();
       this.graphics = null;
   }
};

// Экспорт для браузера
if (typeof window !== 'undefined') {
   window.HexGrid = HexGrid;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
   module.exports = { HexGrid: HexGrid };
}
