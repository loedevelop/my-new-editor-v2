// src/App.js (請用這段程式碼覆蓋所有內容)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import './App.css'; // 載入空的 CSS 檔案以避免衝突

const App = () => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const fileInputRef = useRef(null);
  const centerPanelRef = useRef(null);
  
  // --- 狀態管理 ---
  const [categories, setCategories] = useState([
    { id: 'default', name: '預設素材', images: [] }
  ]);
  const [activeCategoryId, setActiveCategoryId] = useState('default');
  const [lastDeleted, setLastDeleted] = useState(null);
  
  // 右側面板寬度設定：初始值和最小寬度都調高到 350px，強制確保三欄佈局
  const [rightPanelWidth, setRightPanelWidth] = useState(350); 
  
  const isResizing = useRef(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetIndex: null });

  // --- 尺寸管理 ---
  const defaultPresets = {
    custom: { name: '自訂尺寸', w: 800, h: 600 },
    ig_post: { name: 'IG 貼文 (1:1)', w: 1080, h: 1080 },
    ig_story: { name: 'IG 限動 (9:16)', w: 1080, h: 1920 },
    fb_post: { name: 'FB 貼文', w: 1200, h: 630 },
    yt_thumb: { name: 'YouTube 縮圖', w: 1280, h: 720 },
    a4: { name: 'A4 文件', w: 595, h: 842 }
  };

  const [customPresets, setCustomPresets] = useState({});

  const [canvasSettings, setCanvasSettings] = useState({
    mode: 'fixed',
    width: 1080,
    height: 1080,
    preset: 'ig_post'
  });

  const [zoomLevel, setZoomLevel] = useState(1);

  // --- 樣式設定 (已包含所有修正) ---
  const styles = {
    container: { display: 'flex', height: '100vh', fontFamily: 'Arial', userSelect: isResizing.current ? 'none' : 'auto', cursor: isResizing.current ? 'col-resize' : 'default' },
    
    // 左側面板
    leftPanel: { width: '280px', borderRight: '2px solid #333', padding: '10px', background: '#f0f0f0', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 },
    
    // 中間畫布區塊
    centerPanel: { 
      flex: 1, 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#e0e0e0', 
      position: 'relative', 
      overflow: canvasSettings.mode === 'fill' ? 'hidden' : 'auto',
      padding: canvasSettings.mode === 'fill' ? '0' : '50px'
    },

    // 畫布邊框樣式
    canvasStyle: {
      border: canvasSettings.mode === 'fill' ? 'none' : '1px solid #999',
      boxShadow: canvasSettings.mode === 'fill' ? 'none' : '0 0 10px rgba(0,0,0,0.2)'
    },

    zoomControls: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'white', padding: '5px 15px', borderRadius: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', display: 'flex', gap: '10px', alignItems: 'center', zIndex: 100 },
    zoomBtn: { border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', padding: '0 5px', fontWeight: 'bold', color: '#555' },
    zoomLabel: { fontSize: '14px', fontWeight: 'bold', minWidth: '50px', textAlign: 'center', color: '#333' },

    // ‼️ 修正：移除 maxWidth 並提升 minWidth 到 350px，確保三欄佈局
    rightPanel: { width: `${rightPanelWidth}px`, borderLeft: '1px solid #ccc', padding: '10px', background: '#fff', overflowY: 'auto', position: 'relative', minWidth: '350px' },
    
    button: { display: 'block', width: '100%', padding: '8px', marginBottom: '5px', cursor: 'pointer', backgroundColor: '#eee', border: '1px solid #ccc', borderRadius: '4px' },
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
    
    // ‼️ 修正：優化寬度計算，確保三欄在 minWidth: 350px 下能正確顯示 (33.33% 減去 gap 的總和)
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

  // --- 初始化與讀取 (useEffect) ---
  useEffect(() => {
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      height: 1080, width: 1080, backgroundColor: '#ffffff', preserveObjectStacking: true,
    });
    fabricRef.current = initCanvas;

    const savedCanvas = localStorage.getItem('myCanvasState');
    if (savedCanvas) initCanvas.loadFromJSON(savedCanvas, () => initCanvas.renderAll());

    const savedLibrary = localStorage.getItem('myAssetLibrary');
    const oldImages = localStorage.getItem('myUploadedImages');
    if (savedLibrary) setCategories(JSON.parse(savedLibrary));
    else if (oldImages) setCategories([{ id: 'default', name: '預設素材', images: JSON.parse(oldImages) }]);

    const savedPresets = localStorage.getItem('mySizePresets');
    if (savedPresets) {
      setCustomPresets(JSON.parse(savedPresets));
    }

    return () => initCanvas.dispose();
  }, []);

  // --- 畫布尺寸邏輯 (useEffect) ---
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
    
    let resizeObserver;
    // 只有在 Fill 模式下持續監聽視窗變化
    if (canvasSettings.mode === 'fill' && centerPanelRef.current) {
      resizeObserver = new ResizeObserver(() => updateDimensions());
      resizeObserver.observe(centerPanelRef.current);
    }
    return () => { if (resizeObserver) resizeObserver.disconnect(); };
  }, [canvasSettings, zoomLevel]);

  // --- 控制函式 ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 3)); 
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.1)); 
  const handleZoomReset = () => setZoomLevel(1); 

  const downloadImage = () => {
    if (!fabricRef.current) return;
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
    setCanvasSettings(prev => ({
      ...prev,
      width: prev.height,
      height: prev.width,
      preset: 'custom'
    }));
  };

  const handleSavePreset = () => {
    const name = prompt('請輸入此尺寸的名稱 (例如: 蝦皮封面):');
    if (!name) return;
    const newKey = `custom_${Date.now()}`;
    const newPreset = { name: name, w: canvasSettings.width, h: canvasSettings.height };
    const newPresets = { ...customPresets, [newKey]: newPreset };
    setCustomPresets(newPresets);
    safeSave('mySizePresets', newPresets);
    setCanvasSettings(prev => ({ ...prev, preset: newKey }));
    alert(`已儲存「${name}」！`);
  };

  const handleDeletePreset = () => {
    if (!customPresets[canvasSettings.preset]) return;
    if (window.confirm(`確定要刪除「${allPresets[canvasSettings.preset].name}」嗎？`)) {
      const newPresets = { ...customPresets };
      delete newPresets[canvasSettings.preset];
      setCustomPresets(newPresets);
      safeSave('mySizePresets', newPresets);
      setCanvasSettings(prev => ({ ...prev, preset: 'custom' }));
    }
  };

  // --- 素材庫相關 ---
  const handleContextMenu = (e, index) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetIndex: index }); };
  useEffect(() => { const closeMenu = () => setContextMenu(prev => ({ ...prev, visible: false })); document.addEventListener('click', closeMenu); return () => document.removeEventListener('click', closeMenu); }, []);
  const handleDeleteFromMenu = () => { if (contextMenu.targetIndex === null) return; deleteImageFromCategory(contextMenu.targetIndex); };
  
  // 匯出備份
  const handleExportBackup = () => { 
    if (!fabricRef.current) return; 
    const backupData = { timestamp: new Date().toISOString(), canvas: fabricRef.current.toJSON(), library: categories }; 
    const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = `canvas-backup.json`; 
    link.click(); 
    URL.revokeObjectURL(url); 
  };
  
  const handleImportBackupTrigger = () => fileInputRef.current.click();
  
  // 匯入備份
  const handleImportFileChange = (e) => { 
    const file = e.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = (event) => { 
      try { 
        const data = JSON.parse(event.target.result); 
        if (!data.library || !data.canvas) return alert('格式錯誤'); 
        if (window.confirm('確定還原？')) { 
          setCategories(data.library); 
          safeSave('myAssetLibrary', data.library); 
          fabricRef.current.loadFromJSON(data.canvas, () => { 
            fabricRef.current.renderAll(); 
            safeSave('myCanvasState', data.canvas); 
          }); 
          setActiveCategoryId(data.library[0]?.id || 'default'); 
          setLastDeleted(null); 
        } 
      } catch (err) { 
        console.error(err); 
      } 
    }; 
    reader.readAsText(file); 
    e.target.value = ''; 
  };
  
  const saveProject = () => { if (fabricRef.current) { safeSave('myCanvasState', fabricRef.current.toJSON()); safeSave('myAssetLibrary', categories); alert('已儲存'); }};
  const clearCanvas = () => { if (window.confirm('清空？')) { fabricRef.current.clear(); fabricRef.current.setBackgroundColor('#ffffff', fabricRef.current.renderAll.bind(fabricRef.current)); }};
  
  // 新增分類 (包含自動選取邏輯)
  const addCategory = () => { 
    const n = prompt('分類名:'); 
    if (n) { 
      const newId = Date.now().toString();
      const c = [...categories, {id: newId, name:n, images:[]}]; 
      setCategories(c); 
      safeSave('myAssetLibrary', c); 
      setActiveCategoryId(newId); // <--- 自動選取新的分類
    }
  };
  
  const deleteCategory = () => { if(categories.length<=1) return alert('保留一個'); if(window.confirm('刪除？')) { const c = categories.filter(x=>x.id!==activeCategoryId); setCategories(c); setActiveCategoryId(c[0].id); safeSave('myAssetLibrary', c); }};
  const deleteImageFromCategory = (idx) => { const c = categories.map(cat => cat.id===activeCategoryId ? {...cat, images:cat.images.filter((_,i)=>i!==idx)} : cat); const currentCat = categories.find(x=>x.id===activeCategoryId); if(currentCat) { setLastDeleted({categoryId:activeCategoryId, image:currentCat.images[idx], index:idx}); } setCategories(c); safeSave('myAssetLibrary', c); };
  const undoDelete = () => { if(!lastDeleted) return; const c = categories.map(cat => cat.id===lastDeleted.categoryId ? {...cat, images:[...cat.images.slice(0,lastDeleted.index), lastDeleted.image, ...cat.images.slice(lastDeleted.index)]} : cat); setCategories(c); safeSave('myAssetLibrary', c); setLastDeleted(null); };
  
  const handleImageUpload = (e) => { 
    const files = Array.from(e.target.files); 
    if (!files.length) return; 
    Promise.all(files.map(f => new Promise(r => { 
      const rd = new FileReader(); 
      rd.onload=ev=>r(ev.target.result); 
      rd.readAsDataURL(f); 
    }))).then(imgs => { 
      const c = categories.map(cat => cat.id===activeCategoryId ? {...cat, images:[...imgs, ...cat.images]} : cat); 
      setCategories(c); 
      safeSave('myAssetLibrary', c); 
    }); 
  };
  
  const getActive = () => fabricRef.current.getActiveObject();
  const bringForward = () => { const o = getActive(); if(o) fabricRef.current.bringForward(o); };
  const sendBackwards = () => { const o = getActive(); if(o) fabricRef.current.sendBackwards(o); };
  const flipHorizontal = () => { const o = getActive(); if(o) { o.set('flipX', !o.flipX); fabricRef.current.requestRenderAll(); }};
  const deleteObject = () => { const o = getActive(); if(o) { fabricRef.current.remove(o); fabricRef.current.discardActiveObject(); fabricRef.current.requestRenderAll(); }};
  const setBackground = () => { fabric.Image.fromURL('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80', (img) => { fabricRef.current.setBackgroundImage(img, fabricRef.current.renderAll.bind(fabricRef.current), { scaleX: fabricRef.current.width/img.width, scaleY: fabricRef.current.height/img.height }); }, { crossOrigin: 'anonymous' }); };
  
  // 右側面板拖曳調整大小
  const resize = useCallback((e) => { if (isResizing.current) { const w = window.innerWidth - e.clientX; if (w > 150 && w < 600) setRightPanelWidth(w); } }, []);
  const stopResizing = useCallback(() => { isResizing.current = false; document.removeEventListener('mousemove', resize); document.removeEventListener('mouseup', stopResizing); }, [resize]); 
  const startResizing = useCallback(() => { isResizing.current = true; document.addEventListener('mousemove', resize); document.addEventListener('mouseup', stopResizing); }, [resize, stopResizing]);
  
  // 拖曳處理
  const handleDragStart = (e, url) => { e.dataTransfer.setData('imageUrl', url); e.dataTransfer.effectAllowed = 'copy'; };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    const imageUrl = e.dataTransfer.getData('imageUrl'); 
    if (!imageUrl) return; 
    const canvasContainer = fabricRef.current.wrapperEl.getBoundingClientRect(); 
    const x = (e.clientX - canvasContainer.left) / zoomLevel; 
    const y = (e.clientY - canvasContainer.top) / zoomLevel; 
    
    fabric.Image.fromURL(imageUrl, (img) => { 
      const scale = 150 / img.width; 
      img.set({ left: x, top: y, scaleX: scale, scaleY: scale, originX: 'center', originY: 'center' }); 
      fabricRef.current.add(img); 
      fabricRef.current.setActiveObject(img); 
    }, { crossOrigin: 'anonymous' }); 
  };
  
  const activeCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

  return (
    <div style={styles.container}>
      <input type="file" accept=".json" style={styles.hiddenInput} ref={fileInputRef} onChange={handleImportFileChange} />
      {contextMenu.visible && <div style={{ ...styles.contextMenu, top: contextMenu.y, left: contextMenu.x }}><div style={styles.contextMenuItem} onClick={handleDeleteFromMenu}>🗑️ 刪除此素材</div></div>}

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
              {customPresets[canvasSettings.preset] && (
                <button style={styles.deletePresetBtn} onClick={handleDeletePreset} title="刪除此設定">🗑️</button>
              )}
            </div>

            <div style={styles.inputGroup}>
              <input style={styles.input} type="number" value={canvasSettings.width} onChange={(e) => handleDimensionChange('width', e.target.value)} placeholder="寬" />
              <button style={styles.swapBtn} onClick={handleSwapDimensions} title="交換長寬">↔️</button>
              <input style={styles.input} type="number" value={canvasSettings.height} onChange={(e) => handleDimensionChange('height', e.target.value)} placeholder="高" />
            </div>

            <div style={styles.savePresetGroup}>
               <button style={styles.smallBtn} onClick={handleSavePreset}>💾 儲存目前尺寸</button>
            </div>
          </>
        )}
        
        {canvasSettings.mode === 'fill' && (
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', padding: '5px', background: '#e8e8e8', borderRadius: '4px' }}>
            ℹ️ 畫布將自動填滿視窗。若要指定尺寸，請切換回 Fixed 模式。
          </div>
        )}

        <div style={{...styles.firstHeader, marginTop: '15px'}}>基本操作</div>
        <button style={styles.button} onClick={bringForward}>圖層上移</button>
        <button style={styles.button} onClick={sendBackwards}>圖層下移</button>
        <button style={styles.button} onClick={flipHorizontal}>水平翻轉</button>
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

      {/* 畫布區域 */}
      <div ref={centerPanelRef} style={styles.centerPanel} onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={(e) => e.preventDefault()}>
        <canvas ref={canvasRef} style={styles.canvasStyle} />
        {canvasSettings.mode === 'fixed' && (
          <div style={styles.zoomControls}>
            <button style={styles.zoomBtn} onClick={handleZoomOut} title="縮小">➖</button>
            <span style={styles.zoomLabel}>{Math.round(zoomLevel * 100)}%</span>
            <button style={styles.zoomBtn} onClick={handleZoomIn} title="放大">➕</button>
            <button style={{...styles.zoomBtn, fontSize: '14px', marginLeft: '5px'}} onClick={handleZoomReset} title="重置">↺</button>
          </div>
        )}
      </div>

      {/* 右側面板 */}
      <div style={styles.rightPanel}>
        <div style={styles.resizer} onMouseDown={startResizing} />
        <div style={styles.firstHeader}>素材庫分類</div>
        <div style={styles.categoryControl}>
          <select style={styles.select} value={activeCategoryId} onChange={(e) => setActiveCategoryId(e.target.value)}>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.images.length})</option>)}
          </select>
          <button style={styles.iconBtn} onClick={addCategory}>➕</button>
          <button style={{...styles.iconBtn, color: 'red'}} onClick={deleteCategory}>🗑️</button>
          {/* 這是還原刪除按鈕 */}
          {lastDeleted && <button style={styles.undoBtn} onClick={undoDelete}>↩️</button>} 
        </div>
        <label style={styles.primaryBtn}>+ 上傳至「{activeCategory.name}」<input type="file" multiple accept="image/*" style={styles.hiddenInput} onChange={handleImageUpload} /></label>
        <div style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>{activeCategory.images.length === 0 ? '無圖片' : '右鍵可刪除：'}</div>
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