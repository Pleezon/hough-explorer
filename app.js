// Interactive Hough Transform Explorer
// Minimal vanilla JS implementation with an editable transform function.

(function() {
  const pointsCanvas = document.getElementById('pointsCanvas');
  const pointsCtx = pointsCanvas.getContext('2d');
  const houghCanvas = document.getElementById('houghCanvas');
  const houghCtx = houghCanvas.getContext('2d');

  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const recomputeBtn = document.getElementById('recomputeBtn');
  const snapInput = document.getElementById('snap');


  const codeEditor = document.getElementById('codeEditor');
  const runCodeBtn = document.getElementById('runCodeBtn');
  const resetCodeBtn = document.getElementById('resetCodeBtn');
  const codeStatus = document.getElementById('codeStatus');
  const cvStatus = document.getElementById('cv-status');

  let W = pointsCanvas.width;
  let H = pointsCanvas.height;

  // State
  let points = []; // array of {x,y}
  const history = []; // for undo

  function setStatus(el, text, ok=true) {
    el.textContent = text;
    el.style.background = ok ? '#16a34a' : '#b91c1c';
    el.style.color = '#fff';
  }

  // OpenCV ready handling (rely on global onOpenCvReady hook)
  let cvReady = false;
  const cvReadyQueue = [];
  function waitForCV(callback) {
    if (cvReady) return callback();
    cvReadyQueue.push(callback);
  }
  // Hook into existing global onOpenCvReady if provided, otherwise define it
  (function(){
    const previous = window.onOpenCvReady;
    window.onOpenCvReady = function() {
      if (cvReady) return; // run once
      try { if (typeof previous === 'function') previous.apply(this, arguments); } catch (e) { console.error(e); }
      cvReady = true;
      setStatus(cvStatus, 'OpenCV.js ready', true);
      // flush queued callbacks
      const q = cvReadyQueue.splice(0, cvReadyQueue.length);
      for (const cb of q) {
        try { cb(); } catch (e) { console.error('waitForCV callback error:', e); }
      }
    };
    // Ensure OpenCV.js invokes our handler when WASM is ready
    window.Module = window.Module || {};
    if (typeof window.Module.onRuntimeInitialized !== 'function') {
      window.Module.onRuntimeInitialized = function() { window.onOpenCvReady(); };
    }
    // In case OpenCV was initialized before this script executed
    if (typeof window.cv !== 'undefined' && window.cv && window.cv.Mat) {
      // emulate callback to flush queue
      window.onOpenCvReady();
    }
  })();

  // initial trigger guard
  let initialTriggered = false;

  // Resize canvases to fit their parent containers and redraw
  function resizeCanvases() {
    // Points canvas sizing
    const pWrap = pointsCanvas.parentElement;
    const pW = Math.floor(pWrap.clientWidth || 0);
    const pH = Math.floor(pWrap.clientHeight || 0);
    let pointsChanged = false;
    if (pW > 0 && pH > 0 && (pointsCanvas.width !== pW || pointsCanvas.height !== pH)) {
      pointsCanvas.width = pW;
      pointsCanvas.height = pH;
      W = pW;
      H = pH;
      pointsChanged = true;
    }

    // Hough canvas sizing
    const hWrap = houghCanvas.parentElement;
    const hW = Math.floor(hWrap.clientWidth || 0);
    const hH = Math.floor(hWrap.clientHeight || 0);
    let houghChanged = false;
    if (hW > 0 && hH > 0 && (houghCanvas.width !== hW || houghCanvas.height !== hH)) {
      houghCanvas.width = hW;
      houghCanvas.height = hH;
      houghChanged = true;
    }

    if (pointsChanged) {
      drawPoints();
    }
    if (houghChanged) {
      // Re-render the Hough image at the new size
      recompute();
    }
  }

  // Respond to window resizes
  window.addEventListener('resize', resizeCanvases);

  // Load default student code from external file
  async function loadDefaultStudentCode() {
    try {
      const resp = await fetch('student-code.js', { cache: 'no-store' });
      const text = await resp.text();
      codeEditor.value = text;
      if (cvReady && !initialTriggered) { initialTriggered = true; recompute(); }
    } catch (e) {
      console.error('Failed to load student-code.js', e);
      codeEditor.value = '// Failed to load student-code.js. Define function transformToMat(points,width,height,options,cv) and return cv.Mat.';
      if (cvReady && !initialTriggered) { initialTriggered = true; recompute(); }
    }
  }
  loadDefaultStudentCode();

  // Helpers (kept for potential future use)
  const helpers = {
    normalizeAndRender: (accum, rhoSteps, thetaSteps) => {
      let max = 0;
      for (let i = 0; i < accum.length; i++) if (accum[i] > max) max = accum[i];
      const img = pointsCtx.createImageData(thetaSteps, rhoSteps);
      for (let r = 0; r < rhoSteps; r++) {
        for (let t = 0; t < thetaSteps; t++) {
          const v = max > 0 ? accum[r * thetaSteps + t] / max : 0;
          const c = Math.round(v * 255);
          const idx = (r * thetaSteps + t) * 4;
          img.data[idx] = c;
          img.data[idx + 1] = c;
          img.data[idx + 2] = c;
          img.data[idx + 3] = 255;
        }
      }
      // fit image to hough canvas with scaling
      const tmp = document.createElement('canvas');
      tmp.width = thetaSteps; tmp.height = rhoSteps;
      const tctx = tmp.getContext('2d');
      tctx.putImageData(img, 0, 0);
      houghCtx.clearRect(0, 0, houghCanvas.width, houghCanvas.height);
      houghCtx.imageSmoothingEnabled = false;
      houghCtx.drawImage(tmp, 0, 0, houghCanvas.width, houghCanvas.height);
      return img;
    }
  };

  // Drawing utilities
  function drawPoints() {
    pointsCtx.clearRect(0, 0, W, H);
    pointsCtx.fillStyle = '#111827';
    pointsCtx.fillRect(0,0,W,H);

    // Grid
    pointsCtx.strokeStyle = '#1f2937';
    pointsCtx.lineWidth = 1;
    const gridStep = 20;
    for (let x = 0; x <= W; x += gridStep) {
      pointsCtx.beginPath();
      pointsCtx.moveTo(x + 0.5, 0);
      pointsCtx.lineTo(x + 0.5, H);
      pointsCtx.stroke();
    }
    for (let y = 0; y <= H; y += gridStep) {
      pointsCtx.beginPath();
      pointsCtx.moveTo(0, y + 0.5);
      pointsCtx.lineTo(W, y + 0.5);
      pointsCtx.stroke();
    }

    // Axes
    pointsCtx.strokeStyle = '#f97316';
    pointsCtx.lineWidth = 1.5;
    pointsCtx.beginPath();
    pointsCtx.moveTo(0, H/2 + 0.5);
    pointsCtx.lineTo(W, H/2 + 0.5);
    pointsCtx.moveTo(W/2 + 0.5, 0);
    pointsCtx.lineTo(W/2 + 0.5, H);
    pointsCtx.stroke();

    // Points
    const size = 4; // fixed point size
    pointsCtx.fillStyle = '#e11d48';
    for (const p of points) {
      pointsCtx.fillRect(p.x - size/2, p.y - size/2, size, size);
    }
  }

  function pushHistory() {
    history.push(points.map(p => ({...p})));
    if (history.length > 200) history.shift();
  }

  function setPoints(newPoints) {
    points = newPoints;
    drawPoints();
  }

  // Convert mouse event to canvas coordinates
  function getCanvasPos(evt, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((evt.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((evt.clientY - rect.top) * (canvas.height / rect.height));
    return {x, y};
  }

  function maybeSnap(p) {
    if (!snapInput.checked) return p;
    const grid = 20;
    return {
      x: Math.round(p.x / grid) * grid,
      y: Math.round(p.y / grid) * grid,
    };
  }

  // Interaction
  let drawing = false;
  pointsCanvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    pushHistory();
    const p = maybeSnap(getCanvasPos(e, pointsCanvas));
    points.push(p);
    drawPoints();
  });
  window.addEventListener('pointerup', () => drawing = false);
  pointsCanvas.addEventListener('pointerleave', () => drawing = false);
  pointsCanvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = maybeSnap(getCanvasPos(e, pointsCanvas));
    const last = points[points.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) {
      points.push(p);
      drawPoints();
    }
  });

  undoBtn.addEventListener('click', () => {
    if (history.length > 0) {
      const prev = history.pop();
      setPoints(prev);
    }
  });
  clearBtn.addEventListener('click', () => {
    pushHistory();
    setPoints([]);
  });

  // Recompute hough using current student code that returns cv.Mat
  function recompute() {
    waitForCV(() => {
      // Auto-set resolution to match the output canvas (accurate per-pixel)
      const thetaSteps = Math.max(1, houghCanvas.width|0);
      const rhoSteps = Math.max(1, houghCanvas.height|0);
      const code = codeEditor.value;
      let fn;
      try {
        // sandbox-ish: only expose specific params
        fn = new Function('points','width','height','options','cv', code + '\nreturn transformToMat(points,width,height,options,cv);');
      } catch (e) {
        setStatus(codeStatus, 'Syntax error: ' + e.message, false);
        return;
      }
      try {
        const mat = fn(points.slice(), W, H, {thetaSteps, rhoSteps}, cv);
        if (!(mat && typeof mat === 'object' && mat.constructor && mat.constructor.name === 'Mat')) {
          throw new Error('transformToMat must return a cv.Mat');
        }
        // Render to right canvas (avoid cv.imshow resizing our canvas): draw to temp then scale
        const off = document.createElement('canvas');
        cv.imshow(off, mat);
        houghCtx.clearRect(0, 0, houghCanvas.width, houghCanvas.height);
        houghCtx.imageSmoothingEnabled = false;
        houghCtx.drawImage(off, 0, 0, houghCanvas.width, houghCanvas.height);
        // Clean up
        try { mat.delete && mat.delete(); } catch (_) {}
        setStatus(codeStatus, 'Ran OK', true);
      } catch (e) {
        console.error(e);
        setStatus(codeStatus, 'Runtime error: ' + e.message, false);
      }
    });
  }

  recomputeBtn.addEventListener('click', recompute);
  snapInput.addEventListener('change', drawPoints);

  runCodeBtn.addEventListener('click', recompute);
  resetCodeBtn.addEventListener('click', async () => {
    await loadDefaultStudentCode();
    setStatus(codeStatus, 'Code reset', true);
    recompute();
  });

  // Initial sizing and draw
  resizeCanvases();
  drawPoints();
  // Seed with a few points for demo
  points = [{x: 100, y: 100},{x: 300, y: 280},{x: 220, y: 180}];
  drawPoints();

  // Recompute once OpenCV is ready (or soon after)
  waitForCV(() => recompute());
})();
