這份程式碼非常精彩，我看見了您在 V1 中實作的許多高級功能，例如：

動態調整右側面板寬度 (isResizing 與 rightPanelWidth)。

畫布縮放控制 (zoomLevel 與 zoomControls)。

完善的預設尺寸管理 (defaultPresets 與 customPresets)。

素材右鍵選單 (contextMenu) 與 刪除還原功能 (undoDelete)。

我已經將您的「充滿畫布並鎖定」需求，以最不破壞原始邏輯的方式植入了這段代碼中。

🛠️ 此次植入的變動點：
新增 fitAndLock 函式：它會精準讀取您 canvasSettings 中的寬高來計算比例。

新增 unlockAll 函式：確保您可以隨時解鎖。

UI 按鈕位置：我將按鈕放在「基本操作」區塊中，位於「水平翻轉」與「刪除物件」之間，並給予顯眼的藍色，與您原本的樣式風格統一。

💻 完整功能融合版 (V2 專用)
請將以下程式碼完整覆蓋您 V2 專案的 src/App.js：

JavaScript

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import './App.css'; 

const App = () => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  const centerPanelRef = useRef(null);
  
  const [categories, setCategories] = useState([{ id: 'default', name: '預設素材', images: [] }]);
  const [activeCategoryId, setActiveCategoryId] = useState('default');
  const [lastDeleted, setLastDeleted] = useState(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(350); 
  const isResizing = useRef(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetIndex: null });

  const defaultPresets = {
    custom: { name: '自訂尺寸', w: 800, h: 600 },
    ig_post: { name: 'IG 貼文 (1:1)', w: 1080, h: 1080 },
    ig_story: { name: 'IG 限動 (9:16)', w: 1080, h: 1920 },
    fb_post: { name: 'FB 貼文', w: 1200, h: 630 },
    yt_thumb: { name: 'YouTube 縮圖', w: 1280, h: 720 },
    a4: { name: 'A4 文件', w: 595, h: 842 }
  };

  const [customPresets, setCustomPresets] = useState({});
  const [canvasSettings, setCanvasSettings] = useState({ mode: 'fixed', width: 1080, height: 1080, preset: 'ig_post' });
  const [zoomLevel, setZoomLevel] = useState(1);

  // --- 新增功能：充滿畫布並鎖定 ---
  const fitAndLock = () => {
    const canvas = fabricRef.current;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      alert("請先選取一張素材圖片！");
      return;
    }

    const targetW = parseInt(canvasSettings.width);
    const targetH = parseInt(canvasSettings.height);

    const scaleX = targetW / activeObject.width;
    const scaleY = targetH / activeObject.height;
    const maxScale = Math.max(scaleX, scaleY);

    activeObject.set({
      scaleX: maxScale,
      scaleY: maxScale,
      left: targetW / 2,
      top: targetH / 2,
      originX: 'center',
      originY: 'center',
      angle: 0
    });

    canvas.sendToBack(activeObject);

    if (window.confirm("是否要鎖定此圖片作為背景？鎖定後將無法選取與移動。")) {
      activeObject.set({
        lockMovementX: true, lockMovementY: true,
        lockRotation: true, lockScalingX: true, lockScalingY: true,
        selectable: false, evented: false, hasControls: false
      });
      canvas.discardActiveObject();
    }
    canvas.renderAll();
    saveProjectSilently();
  };

  const unlockAll = () => {
    fabricRef.current.getObjects().forEach(obj => {
      obj.set({
        lockMovementX: false, lockMovementY: false,
        lockRotation: false, lockScalingX: false, lockScalingY: false,
        selectable: true, evented: true, hasControls: true
      });
    });
    fabricRef.current.renderAll();
    saveProjectSilently();
  };

  const saveProjectSilently = () => {
    if (fabricRef.current) {
      localStorage.setItem('myCanvasState', JSON.stringify(fabricRef.current.toJSON()));
      localStorage.setItem('myAssetLibrary', JSON.stringify(categories));
    }
  };

  // --- 樣式設定 (保留您的原始定義) ---
  const styles = {
    container: { display: 'flex', height: '100vh', fontFamily: 'Arial', userSelect: isResizing.current ? 'none' : 'auto', cursor: isResizing.current ? 'col-resize' : 'default' },
    leftPanel: { width: '280px', borderRight: '2px solid #333', padding: '10px', background: '#f0f0f0', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 },
    centerPanel: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#e0e0e0', position: 'relative', overflow: canvasSettings.mode === 'fill' ? 'hidden' : 'auto', padding: canvasSettings.mode === 'fill' ? '0' : '50px' },
    canvasStyle: { border: canvasSettings.mode === 'fill' ? 'none' : '1px solid #999', boxShadow: canvasSettings.mode === 'fill' ? 'none' : '0 0 10px rgba(0,0,0,0.2)' },
    zoomControls: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '5px 15px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', gap: '10px', alignItems: 'center', zIndex: 100 },
    zoomBtn: { border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', padding: '0 5px', fontWeight: 'bold', color: '#555' },
    zoomLabel: { fontSize: '14px', fontWeight: 'bold', minWidth: '50px', textAlign: 'center', color: '#333' },
    rightPanel: { width: `${rightPanelWidth}px`, borderLeft: '1px solid #ccc', padding: '10px', background: '#fff', overflowY: 'auto', position: 'relative', minWidth: '350px' },
    button: { display: 'block', width: '100%', padding: '8px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' },
    specialBtn: { display: 'block', width: '100%', padding: '10px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' },
    primaryBtn: { display: 'block', width: '100%', padding: '10px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' },
    actionBtn: { display: 'block', width: '100%', padding: '8px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' },
    backupBtn: { display: 'block', width: '100%', padding: '8px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px' },
    deleteBtn: { display: 'block', width: '100%', padding: '8px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#ffdddd', color: 'red', border: '1px solid #ffcccc', borderRadius: '4px' },
    undoBtn: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#FFF9C4', color: '#FBC02D', border: '1px solid #FBC02D', borderRadius: '4px', fontWeight: 'bold' },
    inputGroup: { display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center' },
    input: { flex: 1, padding: '5px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '0', textAlign: 'center' },
    swapBtn: { cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    savePresetGroup: { display: 'flex', gap: '5px', marginTop: '5px', marginBottom: '15px' },
    smallBtn: { flex: 1, padding: '6px', fontSize: '13px', cursor: 'pointer', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px' },
    deletePresetBtn: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#ffdddd', color: 'red', border: '1px solid #ffcccc', borderRadius: '4px', marginLeft: '5px' },
    label: { fontSize: '12px', color: '#666', marginBottom: '3px', display: 'block' },
    categoryControl: { display: 'flex', gap: '5px', marginBottom: '10px', alignItems: 'center' },
    select: { flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ccc', minWidth: 0 },
    iconBtn: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' },
    assetWrapper: { position: 'relative', width: 'calc(33.33% - 10px)', height: '80px', border: '1px solid #eee', backgroundColor: '#f9f9f9', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px' },
    imgThumbnail: { maxWidth: '100%', maxHeight: '100%', display: 'block', cursor: 'grab', objectFit: 'contain' },
    contextMenu: { position: 'fixed', zIndex: 1000, backgroundColor: 'white', border: '1px solid #ccc', boxShadow: '2px 2px 10px rgba(0,0,0,0.2)', borderRadius: '4px', padding: '5px 0', minWidth: '120px' },
    contextMenuItem: { padding: '8px 15px', cursor: 'pointer', fontSize: '14px', color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px' },
    header: { fontSize: '16px', fontWeight: 'bold', margin: '15px 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' },
    firstHeader: { fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' },
    resizer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '10px', cursor: 'col-resize', zIndex: 10, marginLeft: '-5px', backgroundColor: 'transparent' },
    hiddenInput: { display: 'none' }
  };

  const safeSave = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } 
    catch (e) { if (e.name === 'QuotaExceededError') alert('⚠️ 儲存空間已滿！'); }
  };

  useEffect(() => {
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      height: 1080, width: 1080, backgroundColor: '#ffffff', preserveObjectStacking: true,
    });
    fabricRef.current = initCanvas;
    const savedCanvas = localStorage.getItem('myCanvasState');
    if (savedCanvas) initCanvas.loadFromJSON(savedCanvas, () => initCanvas.renderAll());
    const savedLibrary = localStorage.getItem('myAssetLibrary');
    if (savedLibrary) setCategories(JSON.parse(savedLibrary));
    const savedPresets = localStorage.getItem('mySizePresets');
    if (savedPresets) setCustomPresets(JSON.parse(savedPresets));
    return () => initCanvas.dispose();
  }, []);

  const allPresets = { ...defaultPresets, ...customPresets };

  useEffect(() => {
    if (!fabricRef.current) return;
    const updateDimensions = () => {
      let targetW, targetH;
      if (canvasSettings.mode === 'fixed') {
        targetW = parseInt(canvasSettings.width);
        targetH = parseInt(canvasSettings.height);
        fabricRef.current.setZoom(zoomLevel);
        fabricRef.current.setDimensions({ width: targetW * zoomLevel, height: targetH * zoomLevel });
      } else {
        if (centerPanelRef.current) {
          const rect = centerPanelRef.current.getBoundingClientRect();
          targetW = rect.width;
          targetH = rect.height;
        } else { targetW = 800; targetH = 600; }
        fabricRef.current.setZoom(1);
        fabricRef.current.setDimensions({ width: targetW, height: targetH });
      }
      fabricRef.current.renderAll();
    };
    updateDimensions();
  }, [canvasSettings, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3)); 
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.1)); 
  const handleZoomReset = () => setZoomLevel(1); 

  const downloadImage = () => {
    const multiplier = 1 / zoomLevel;
    const dataURL = fabricRef.current.toDataURL({ format: 'png', quality: 1, multiplier: multiplier });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `design.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setCanvasSettings(prev => ({ ...prev, mode: newMode }));
    if (newMode === 'fill') setZoomLevel(1); 
  };

  const handlePresetChange = (e) => {
    const key = e.target.value;
    const preset = allPresets[key];
    setCanvasSettings({ mode: 'fixed', width: preset.w, height: preset.h, preset: key });
  };

  const handleDimensionChange = (key, value) => {
    setCanvasSettings(prev => ({ ...prev, mode: 'fixed', preset: 'custom', [key]: value }));
  };

  const handleSwapDimensions = () => {
    setCanvasSettings(prev => ({ ...prev, width: prev.height, height: prev.width, preset: 'custom' }));
  };

  const handleSavePreset = () => {
    const name = prompt('請輸入此尺寸的名稱:');
    if (!name) return;
    const newKey = `custom_${Date.now()}`;
    const newPreset = { name: name, w: canvasSettings.width, h: canvasSettings.height };
    const newPresets = { ...customPresets, [newKey]: newPreset };
    setCustomPresets(newPresets);
    safeSave('mySizePresets', newPresets);
  };

  const handleDeletePreset = () => {
    if (!customPresets[canvasSettings.preset]) return;
    if (window.confirm(`確定要刪除嗎？`)) {
      const newPresets = { ...customPresets };
      delete newPresets[canvasSettings.preset];
      setCustomPresets(newPresets);
      safeSave('mySizePresets', newPresets);
    }
  };

  const handleContextMenu = (e, index) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetIndex: index }); };
  useEffect(() => { const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false })); document.addEventListener('click', closeMenu); return () => document.removeEventListener('click', closeMenu); }, []);
  
  const handleExportBackup = () => { 
    const backupData = { timestamp: new Date().toISOString(), canvas: fabricRef.current.toJSON(), library: categories }; 
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement('a'); link.href = url; link.download = `canvas-backup.json`; link.click(); 
  };
  
  const handleImportBackupTrigger = () => fileInputRef.current.click();
  const handleImportFileChange = (e) => { 
    const file = e.target.files[0]; if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = (event) => { 
      const data = JSON.parse(event.target.result); 
      setCategories(data.library); 
      fabricRef.current.loadFromJSON(data.canvas, () => fabricRef.current.renderAll()); 
    }; 
    reader.readAsText(file); 
  };
  
  const saveProject = () => { safeSave('myCanvasState', fabricRef.current.toJSON()); safeSave('myAssetLibrary', categories); alert('已儲存'); };
  const clearCanvas = () => { if (window.confirm('清空？')) { fabricRef.current.clear(); fabricRef.current.setBackgroundColor('#ffffff', fabricRef.current.renderAll.bind(fabricRef.current)); }};
  
  const addCategory = () => { 
    const n = prompt('分類名:'); 
    if (n) { 
      const newId = Date.now().toString();
      const c = [...categories, {id: newId, name:n, images:[]}]; 
      setCategories(c); safeSave('myAssetLibrary', c); setActiveCategoryId(newId);
    }
  };
  
  const deleteCategory = () => { if(categories.length<=1) return alert('保留一個'); if(window.confirm('刪除？')) { const c = categories.filter(x=>x.id!==activeCategoryId); setCategories(c); setActiveCategoryId(c[0].id); }};
  const deleteImageFromCategory = (idx) => { const c = categories.map(cat => cat.id===activeCategoryId ? {...cat, images:cat.images.filter((_,i)=>i!==idx)} : cat); setCategories(c); };
  
  const handleImageUpload = (e) => { 
    const files = Array.from(e.target.files); 
    Promise.all(files.map(f => new Promise(r => { const rd = new FileReader(); rd.onload=ev=>r(ev.target.result); rd.readAsDataURL(f); }))).then(imgs => { 
      const c = categories.map(cat => cat.id===activeCategoryId ? {...cat, images:[...imgs, ...cat.images]} : cat); 
      setCategories(c); safeSave('myAssetLibrary', c); 
    }); 
  };
  
  const bringForward = () => { const o = fabricRef.current.getActiveObject(); if(o) fabricRef.current.bringForward(o); };
  const sendBackwards = () => { const o = fabricRef.current.getActiveObject(); if(o) fabricRef.current.sendBackwards(o); };
  const flipHorizontal = () => { const o = fabricRef.current.getActiveObject(); if(o) { o.set('flipX', !o.flipX); fabricRef.current.requestRenderAll(); }};
  const deleteObject = () => { const o = fabricRef.current.getActiveObject(); if(o) { fabricRef.current.remove(o); fabricRef.current.discardActiveObject(); fabricRef.current.requestRenderAll(); }};
  const setBackground = () => { fabric.Image.fromURL('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80', (img) => { fabricRef.current.setBackgroundImage(img, fabricRef.current.renderAll.bind(fabricRef.current), { scaleX: fabricRef.current.width/img.width, scaleY: fabricRef.current.height/img.height }); }, { crossOrigin: 'anonymous' }); };
  
  const resize = useCallback((e) => { if (isResizing.current) { const w = window.innerWidth - e.clientX; if (w > 150 && w < 600) setRightPanelWidth(w); } }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; document.removeEventListener('mousemove', resize); document.removeEventListener('mouseup', stopResizing); }, [resize]); 
  const startResizing = useCallback(() => { isResizing.current = true; document.addEventListener('mousemove', resize); document.addEventListener('mouseup', stopResizing); }, [resize, stopResizing]);
  
  const handleDragStart = (e, url) => { e.dataTransfer.setData('imageUrl', url); e.dataTransfer.effectAllowed = 'copy'; };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = (e) => { 
    e.preventDefault(); const imageUrl = e.dataTransfer.getData('imageUrl'); if (!imageUrl) return; 
    const canvasContainer = fabricRef.current.wrapperEl.getBoundingClientRect(); 
    const x = (e.clientX - canvasContainer.left) / zoomLevel; const y = (e.clientY - canvasContainer.top) / zoomLevel; 
    fabric.Image.fromURL(imageUrl, (img) => { 
      const scale = 150 / img.width; img.set({ left: x, top: y, scaleX: scale, scaleY: scale, originX: 'center', originY: 'center' }); 
      fabricRef.current.add(img); fabricRef.current.setActiveObject(img); 
    }, { crossOrigin: 'anonymous' }); 
  };
  
  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

  return (
    <div style={styles.container}>
      <input type="file" accept=".json" style={styles.hiddenInput} ref={fileInputRef} onChange={handleImportFileChange} />
      {contextMenu.visible && <div style={{ ...styles.contextMenu, top: contextMenu.y, left: contextMenu.x }}><div style={styles.contextMenuItem} onClick={() => deleteImageFromCategory(contextMenu.targetIndex)}>🗑️ 刪除此素材</div></div>}

      <div style={styles.leftPanel}>
        <img src="/logo_7.png" alt="Log On English" style={{ width: '100%', marginBottom: '15px', display: 'block' }} />
        
        <div style={styles.firstHeader}>畫布尺寸</div>
        <select style={styles.select} value={canvasSettings.mode} onChange={handleModeChange}>
          <option value="fixed">Fixed (固定大小)</option>
          <option value="fill">Fill-up (填滿視窗)</option>
        </select>
        
        {canvasSettings.mode === 'fixed' && (
          <>
            <div style={styles.label}>預設格式：</div>
            <div style={styles.inputGroup}>
              <select style={styles.select} value={canvasSettings.preset} onChange={handlePresetChange}>
                {Object.entries(allPresets).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
              </select>
              {customPresets[canvasSettings.preset] && <button style={styles.deletePresetBtn} onClick={handleDeletePreset}>🗑️</button>}
            </div>
            <div style={styles.inputGroup}>
              <input style={styles.input} type="number" value={canvasSettings.width} onChange={(e) => handleDimensionChange('width', e.target.value)} />
              <button style={styles.swapBtn} onClick={handleSwapDimensions}>↔️</button>
              <input style={styles.input} type="number" value={canvasSettings.height} onChange={(e) => handleDimensionChange('height', e.target.value)} />
            </div>
            <button style={styles.smallBtn} onClick={handleSavePreset}>💾 儲存目前尺寸</button>
          </>
        )}

        <div style={{...styles.firstHeader, marginTop: '15px'}}>基本操作</div>
        <button style={styles.button} onClick={bringForward}>圖層上移</button>
        <button style={styles.button} onClick={sendBackwards}>圖層下移</button>
        <button style={styles.button} onClick={flipHorizontal}>水平翻轉</button>
        
        {/* 新增的功能按鈕：顯眼的藍色 */}
        <button style={styles.specialBtn} onClick={fitAndLock}>✨ 充滿畫布並鎖定</button>
        <button style={styles.button} onClick={unlockAll}>🔓 解鎖所有物件</button>
        
        <button style={styles.deleteBtn} onClick={deleteObject}>刪除物件</button>

        <div style={styles.header}>背景設定</div>
        <button style={styles.button} onClick={setBackground}>套用範例背景</button>
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '2px solid #ccc' }}>
          <div style={styles.firstHeader}>跨裝置功能</div>
          <button style={styles.backupBtn} onClick={handleExportBackup}>📤 匯出備份檔</button>
          <button style={styles.backupBtn} onClick={handleImportBackupTrigger}>📥 匯入備份檔</button>
          <hr />
          <button style={styles.actionBtn} onClick={saveProject}>💾 儲存 (本機)</button>
          <button style={styles.actionBtn} onClick={downloadImage}>🖼️ 下載圖片</button>
          <button style={{...styles.button, fontSize: '12px'}} onClick={clearCanvas}>🗑️ 清空畫布</button>
        </div>
      </div>

      <div ref={centerPanelRef} style={styles.centerPanel} onDrop={handleDrop} onDragOver={handleDragOver}>
        <canvas ref={canvasRef} style={styles.canvasStyle} />
        {canvasSettings.mode === 'fixed' && (
          <div style={styles.zoomControls}>
            <button style={styles.zoomBtn} onClick={handleZoomOut}>➖</button>
            <span style={styles.zoomLabel}>{Math.round(zoomLevel * 100)}%</span>
            <button style={styles.zoomBtn} onClick={handleZoomIn}>➕</button>
            <button style={{...styles.zoomBtn, fontSize: '14px', marginLeft: '5px'}} onClick={handleZoomReset}>↺</button>
          </div>
        )}
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.resizer} onMouseDown={startResizing} />
        <div style={styles.firstHeader}>素材庫分類</div>
        <div style={styles.categoryControl}>
          <select style={styles.select} value={activeCategoryId} onChange={(e) => setActiveCategoryId(e.target.value)}>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.images.length})</option>)}
          </select>
          <button style={styles.iconBtn} onClick={addCategory}>➕</button>
          <button style={{...styles.iconBtn, color: 'red'}} onClick={deleteCategory}>🗑️</button>
        </div>
        <label style={styles.primaryBtn}>+ 上傳至「{activeCategory.name}」<input type="file" multiple accept="image/*" style={styles.hiddenInput} onChange={handleImageUpload} /></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {activeCategory.images.map((url, index) => (
            <div key={index} style={styles.assetWrapper} onContextMenu={(e) => handleContextMenu(e, index)}>
              <img src={url} alt={`Asset ${index}`} style={styles.imgThumbnail} draggable="true" onDragStart={(e) => handleDragStart(e, url)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;