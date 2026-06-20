// client/objects/HexGrid.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ

class HexGrid {
   constructor(scene, hexSize) {
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

   init() {
       const width = this.scene.cameras.main.width;
       const height = this.scene.cameras.main.height;
       
       this.gridOffsetX = width / 2;
       this.gridOffsetY = height / 2;
       
       console.log('📐 HexGrid.init() - Размеры:', width, 'x', height);
       console.log('📐 Смещение сетки:', this.gridOffsetX, this.gridOffsetY);
       
       this.hexContainer = this.scene.add.container(0, 0);
       this.hexContainer.setDepth(0);
       
       return this;
   }

   hexToPixel(q, r) {
       const hexSize = this.hexSize || 45;
       
       const x = (q + r / 2) * hexSize * 1.8;
       const y = r * hexSize * 1.6;
       
       const offsetX = this.gridOffsetX || 0;
       const offsetY = this.gridOffsetY || 0;
       
       return { 
           x: x + offsetX, 
           y: y + offsetY 
       };
   }

   // ✅ ИСПРАВЛЕННЫЙ pixelToHex С УЧЕТОМ ЗУМА
   pixelToHex(px, py) {
       const camera = this.scene.cameras.main;
       const zoom = camera.zoom;
       
       // Мировые координаты с учетом зума
       const worldX = (px - camera.width / 2) / zoom + camera.scrollX + camera.width / 2;
       const worldY = (py - camera.height / 2) / zoom + camera.scrollY + camera.height / 2;
       
       const gridX = worldX - this.gridOffsetX;
       const gridY = worldY - this.gridOffsetY;
       
       const hexSize = this.hexSize || 45;
       const r = gridY / (hexSize * 1.6);
       const q = (gridX / (hexSize * 1.8)) - r / 2;
       
       // Поиск ближайшей валидной клетки
       const candidates = [];
       const offsets = [
           [0, 0], [1, 0], [-1, 0], 
           [0, 1], [0, -1], [1, -1], [-1, 1]
       ];
       
       const cells = this.scene.gameState ? this.scene.gameState.cells : [];
       
       for (const offset of offsets) {
           const testQ = Math.round(q) + offset[0];
           const testR = Math.round(r) + offset[1];
           
           const cellExists = cells.some(c => c.q === testQ && c.r === testR);
           
           if (cellExists) {
               const pos = this.hexToPixel(testQ, testR);
               const dx = worldX - pos.x;
               const dy = worldY - pos.y;
               candidates.push({ q: testQ, r: testR, dist: dx * dx + dy * dy });
           }
       }
       
       if (candidates.length === 0) {
           return { q: Math.round(q), r: Math.round(r) };
       }
       
       candidates.sort((a, b) => a.dist - b.dist);
       
       return { q: candidates[0].q, r: candidates[0].r };
   }

   getHexPoints(cx, cy, size) {
       const points = [];
       for (let i = 0; i < 6; i++) {
           const angle = Math.PI / 180 * (60 * i - 30);
           points.push({
               x: cx + size * Math.cos(angle),
               y: cy + size * Math.sin(angle)
           });
       }
       return points;
   }

   drawStar(graphics, cx, cy, spikes, outerRadius, innerRadius) {
       let rot = -Math.PI / 2;
       const step = Math.PI / spikes;
       graphics.beginPath();
       for (let i = 0; i < spikes * 2; i++) {
           const radius = i % 2 === 0 ? outerRadius : innerRadius;
           const x = cx + Math.cos(rot) * radius;
           const y = cy + Math.sin(rot) * radius;
           if (i === 0) graphics.moveTo(x, y);
           else graphics.lineTo(x, y);
           rot += step;
       }
       graphics.closePath();
       graphics.fillPath();
   }

   drawHexWithEffect(g, cx, cy, size, color, isBase) {
       const points = this.getHexPoints(cx, cy, size);
       
       g.fillStyle(color, 1);
       g.beginPath();
       for (let i = 0; i < points.length; i++) {
           if (i === 0) g.moveTo(points[i].x, points[i].y);
           else g.lineTo(points[i].x, points[i].y);
       }
       g.closePath();
       g.fillPath();
       
       g.lineStyle(2, 0x88ccff, 0.8);
       g.beginPath();
       for (let i = 0; i < points.length; i++) {
           if (i === 0) g.moveTo(points[i].x, points[i].y);
           else g.lineTo(points[i].x, points[i].y);
       }
       g.closePath();
       g.strokePath();
       
       g.lineStyle(1, 0x000000, 0.15);
       const innerPoints = points.map(p => ({
           x: p.x * 0.92, 
           y: p.y * 0.92
       }));
       g.beginPath();
       for (let i = 0; i < innerPoints.length; i++) {
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
   }

   drawMap(cells) {
       if (!cells || cells.length === 0) {
           console.warn('⚠️ Нет клеток для отрисовки');
           return;
       }
       
       const width = this.scene.cameras.main.width;
       const height = this.scene.cameras.main.height;
       this.gridOffsetX = width / 2;
       this.gridOffsetY = height / 2;
       
       if (this.hexContainer) {
           this.hexContainer.destroy();
       }
       this.hexContainer = this.scene.add.container(0, 0);
       this.hexContainer.setDepth(0);
       
       this.hexObjects.clear();
       this.currentHighlightKey = null;
       
       const colors = {
           plains: 0x4a8c3f,
           base: 0xc9a03d
       };
       
       for (const cell of cells) {
           const pos = this.hexToPixel(cell.q, cell.r);
           const color = cell.terrain === 'base' ? colors.base : colors.plains;
           const isBase = cell.terrain === 'base';
           
           const g = this.scene.add.graphics();
           this.drawHexWithEffect(g, 0, 0, this.hexSize, color, isBase);
           g.setPosition(pos.x, pos.y);
           g.setDepth(0);
           
           this.hexContainer.add(g);
           this.hexObjects.set(cell.q + ',' + cell.r, g);
       }
       
       this.addCenterMarker();
   }

   addCenterMarker() {
       for (const marker of this.debugMarkers) {
           if (marker && marker.destroy) marker.destroy();
       }
       this.debugMarkers = [];
       
       const pos = this.hexToPixel(0, 0);
       
       const circle = this.scene.add.circle(pos.x, pos.y, 20, 0xff0000);
       circle.setDepth(100);
       circle.setStrokeStyle(3, 0xffffff);
       this.debugMarkers.push(circle);
       
       const text = this.scene.add.text(pos.x, pos.y - 30, 'ЦЕНТР КАРТЫ', {
           fontSize: '14px',
           color: '#ffffff',
           backgroundColor: '#000000',
           padding: { x: 6, y: 3 },
           fontStyle: 'bold'
       });
       text.setOrigin(0.5);
       text.setDepth(100);
       this.debugMarkers.push(text);
   }

   highlightHex(q, r, color) {
       const key = q + ',' + r;
       const highlightKey = 'highlight_' + key;
       
       if (this.currentHighlightKey === highlightKey) {
           this.clearHighlight();
           this.currentHighlightKey = null;
           return null;
       }
       
       const pos = this.hexToPixel(q, r);
       
       const g = this.scene.add.graphics();
       const points = this.getHexPoints(0, 0, this.hexSize + 3);
       
       g.fillStyle(color || 0xffeb3b, 0.3);
       g.beginPath();
       for (let i = 0; i < points.length; i++) {
           if (i === 0) g.moveTo(points[i].x, points[i].y);
           else g.lineTo(points[i].x, points[i].y);
       }
       g.closePath();
       g.fillPath();
       
       g.lineStyle(4, color || 0xffeb3b, 1);
       g.beginPath();
       for (let i = 0; i < points.length; i++) {
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
   }

   clearHighlight() {
       const toRemove = [];
       for (const key of this.hexObjects.keys()) {
           if (key.startsWith('highlight_')) {
               const obj = this.hexObjects.get(key);
               if (obj && obj.destroy) {
                   obj.destroy();
               }
               toRemove.push(key);
           }
       }
       for (const key of toRemove) {
           this.hexObjects.delete(key);
       }
       this.currentHighlightKey = null;
   }

   highlightMoveArea(q, r, validNeighbors) {
       this.clearHighlight();
       
       // Подсвечиваем центр
       this.highlightHex(q, r, 0xffdd44);
       
       // Подсвечиваем соседей
       if (validNeighbors && validNeighbors.length > 0) {
           for (const n of validNeighbors) {
               this.highlightHex(n.q, n.r, 0x44ff44);
           }
       }
   }

   clearMoveHighlight() {
       this.clearHighlight();
   }

   destroy() {
       for (const [key, obj] of this.hexObjects) {
           if (obj && obj.destroy) obj.destroy();
       }
       this.hexObjects.clear();
       
       for (const marker of this.debugMarkers) {
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
   }
}

// Экспорт
if (typeof window !== 'undefined') {
   window.HexGrid = HexGrid;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = { HexGrid };
}
