// Interactive Hough Transform Explorer
// Minimal vanilla JS implementation with an editable transform function.

(function() {
  const pointsCanvas = document.getElementById('pointsCanvas');
  const pointsCtx = pointsCanvas.getContext('2d');
  const houghCanvas = document.getElementById('houghCanvas');
  const houghCtx = houghCanvas.getContext('2d');

  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');


  const codeEditorEl = document.getElementById('codeEditor');
  let editor; // Monaco instance

  function initMonaco(initialValue = '') {
    // Load Monaco via AMD loader configured in index.html
    window.require(['vs/editor/editor.main'], function () {
      editor = monaco.editor.create(codeEditorEl, {
        value: initialValue,
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        wordWrap: 'on',
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        renderWhitespace: 'selection',
      });

      // Provide better IntelliSense for the student API via JSDoc types
      const dts = `
        /**
         * @typedef {{x:number,y:number}} Point
         *
         * Student should define both functions below:
         *
         * linesThroughPoint(x, y, theta_res, rho_res): returns an array of {theta:number, rho:number}
         *   - theta in [0, π]
         *   - rho in pixels (centered coordinate system)
         *
         * fillHough(hough, points, width, height): fills greyscale values 0..255
         *   - hough: number[rows][cols]
         *   - points: Point[] in centered pixels
         *   - width, height: point canvas size in pixels
         */
        function linesThroughPoint(x, y, theta_res, rho_res) {}
        function fillHough(hough, points, width, height) {}
      `;
      try {
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
        monaco.languages.typescript.javascriptDefaults.addExtraLib(dts, 'ts:filename/fillHough.d.ts');
      } catch (e) { /* ignore if monaco TS not ready */ }

      // Debounced auto-run on edits
      let t;
      editor.onDidChangeModelContent(() => {
        clearTimeout(t);
        t = setTimeout(() => {
          try { recompute(); } catch (e) { /* ignore */ }
        }, 400);
      });
    
      // Trigger an initial compute once the editor is ready
      try { recompute(); } catch (e) { /* ignore */ }
    });
  }
  function getEditorValue() { return editor ? editor.getValue() : ''; }
  function setEditorValue(text) { if (editor) editor.setValue(text); }

  const resetCodeBtn = document.getElementById('resetCodeBtn');
  const codeStatus = document.getElementById('codeStatus');

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
      // Recompute as point coordinate scaling depends on W/H
      recompute();
    }
    if (houghChanged && !pointsChanged) {
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
      if (!editor) initMonaco(text); else setEditorValue(text);
      if (!initialTriggered) { initialTriggered = true; recompute(); }
    } catch (e) {
      console.error('Failed to load student-code.js', e);
      const fallback = '// Failed to load student-code.js.';
      if (!editor) initMonaco(fallback); else setEditorValue(fallback);
      if (!initialTriggered) { initialTriggered = true; recompute(); }
    }
  }
  loadDefaultStudentCode();

  // Drawing utilities
  function drawPoints() {
    pointsCtx.clearRect(0, 0, W, H);
    pointsCtx.fillStyle = '#111827';
    pointsCtx.fillRect(0,0,W,H);

    const cX = W / 2;
    const cY = H / 2;

    // Grid centered at (0,0) in the canvas center
    pointsCtx.strokeStyle = '#1f2937';
    pointsCtx.lineWidth = 1;
    const gridStep = 20;

    // Vertical lines
    for (let dx = 0; cX + dx <= W; dx += gridStep) {
      const x = Math.round(cX + dx) + 0.5;
      pointsCtx.beginPath();
      pointsCtx.moveTo(x, 0);
      pointsCtx.lineTo(x, H);
      pointsCtx.stroke();
      if (dx === 0) continue;
      const xl = Math.round(cX - dx) + 0.5;
      pointsCtx.beginPath();
      pointsCtx.moveTo(xl, 0);
      pointsCtx.lineTo(xl, H);
      pointsCtx.stroke();
    }

    // Horizontal lines
    for (let dy = 0; cY + dy <= H; dy += gridStep) {
      const y = Math.round(cY + dy) + 0.5;
      pointsCtx.beginPath();
      pointsCtx.moveTo(0, y);
      pointsCtx.lineTo(W, y);
      pointsCtx.stroke();
      if (dy === 0) continue;
      const yu = Math.round(cY - dy) + 0.5;
      pointsCtx.beginPath();
      pointsCtx.moveTo(0, yu);
      pointsCtx.lineTo(W, yu);
      pointsCtx.stroke();
    }

    // Axes (centered)
    pointsCtx.strokeStyle = '#f97316';
    pointsCtx.lineWidth = 1.5;
    pointsCtx.beginPath();
    pointsCtx.moveTo(0, Math.round(cY) + 0.5);
    pointsCtx.lineTo(W, Math.round(cY) + 0.5);
    pointsCtx.moveTo(Math.round(cX) + 0.5, 0);
    pointsCtx.lineTo(Math.round(cX) + 0.5, H);
    pointsCtx.stroke();

    // Axis ticks and labels (pixels from center)
    pointsCtx.fillStyle = '#d1d5db';
    pointsCtx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    pointsCtx.textAlign = 'center';
    pointsCtx.textBaseline = 'top';

    const maxSpan = Math.max(W, H);
    const targetTicks = 8;
    const rawStep = maxSpan / targetTicks;
    const nice = niceStep(rawStep);

    // X-axis ticks (y = cY)
    for (let xPix = cX; xPix <= W; xPix += nice) {
      drawTickX(xPix, cY);
      if (xPix !== cX) drawTickX(2*cX - xPix, cY);
    }
    // Y-axis ticks (x = cX)
    for (let yPix = cY; yPix <= H; yPix += nice) {
      drawTickY(cX, yPix);
      if (yPix !== cY) drawTickY(cX, 2*cY - yPix);
    }

    // Axis labels
    pointsCtx.fillStyle = '#f3f4f6';
    // x label
    pointsCtx.fillText('x', W - 70, cY + 6);
    // y label (rotated)
    pointsCtx.save();
    pointsCtx.translate(cX + 12, 12);
    pointsCtx.rotate(-Math.PI / 2);
    pointsCtx.fillText('y', 0, 0);
    pointsCtx.restore();

    // Points (convert from normalized-centered to pixel)
    const size = 4; // fixed point size
    pointsCtx.fillStyle = '#e11d48';
    for (const p of points) {
      const px = p.x * W + cX;
      const py = p.y * H + cY;
      pointsCtx.fillRect(px - size/2, py - size/2, size, size);
    }
  }

  function drawTickX(xPix, yAxisPix) {
    const cX = W/2, cY = H/2;
    const val = Math.round(xPix - cX);
    pointsCtx.strokeStyle = '#334155';
    pointsCtx.beginPath();
    pointsCtx.moveTo(Math.round(xPix)+0.5, yAxisPix - 4);
    pointsCtx.lineTo(Math.round(xPix)+0.5, yAxisPix + 4);
    pointsCtx.stroke();
    if (Math.abs(val) > 0) {
      pointsCtx.fillStyle = '#9ca3af';
      pointsCtx.fillText(String(val), xPix, yAxisPix + 6);
    }
  }

  function drawTickY(xAxisPix, yPix) {
    const cX = W/2, cY = H/2;
    const val = Math.round(yPix - cY);
    pointsCtx.strokeStyle = '#334155';
    pointsCtx.beginPath();
    pointsCtx.moveTo(xAxisPix - 4, Math.round(yPix)+0.5);
    pointsCtx.lineTo(xAxisPix + 4, Math.round(yPix)+0.5);
    pointsCtx.stroke();
    if (Math.abs(val) > 0) {
      pointsCtx.fillStyle = '#9ca3af';
      pointsCtx.textAlign = 'left';
      pointsCtx.textBaseline = 'middle';
      pointsCtx.fillText(String(val), xAxisPix + 6, yPix);
      pointsCtx.textAlign = 'center';
      pointsCtx.textBaseline = 'top';
    }
  }

  function niceStep(step) {
    const pow10 = Math.pow(10, Math.floor(Math.log10(step)));
    const base = step / pow10;
    let niceBase;
    if (base < 1.5) niceBase = 1;
    else if (base < 3) niceBase = 2;
    else if (base < 7) niceBase = 5;
    else niceBase = 10;
    return niceBase * pow10;
  }

  function pushHistory() {
    history.push(points.map(p => ({...p})));
    if (history.length > 200) history.shift();
  }

  function setPoints(newPoints) {
    points = newPoints;
    drawPoints();
    recompute();
  }

  // Convert mouse event to canvas coordinates
  function getCanvasPos(evt, canvas) {
    const rect = canvas.getBoundingClientRect();
    const px = (evt.clientX - rect.left) * (canvas.width / rect.width);
    const py = (evt.clientY - rect.top) * (canvas.height / rect.height);
    // Return normalized centered coordinates in [-0.5, 0.5] range
    const x = (px - canvas.width / 2) / canvas.width;
    const y = (py - canvas.height / 2) / canvas.height;
    return {x, y};
  }

  function maybeSnap(p) {
    // Snap to grid disabled permanently
    return p;
  }

  // Interaction
  let drawing = false;
  pointsCanvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    pushHistory();
    const p = maybeSnap(getCanvasPos(e, pointsCanvas));
    points.push(p);
    drawPoints();
    recompute();
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
      recompute();
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

  // Recompute Hough using current student code that fills a greyscale grid (0..255)
  function recompute() {
    // Dimensions of the Hough canvas define the accumulator resolution
    const cols = Math.max(1, houghCanvas.width|0);
    const rows = Math.max(1, houghCanvas.height|0);

    // Prepare numeric 2D array [rows][cols], initialized to 0 (black)
    const hough = new Array(rows);
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols);
      for (let c = 0; c < cols; c++) row[c] = 0;
      hough[r] = row;
    }

    const rhoMax = Math.hypot(W, H) / 2;

    // Build callable student function
    const code = getEditorValue();
    let fill;
    try {
      fill = new Function('hough','points','width','height', code + '\nreturn (typeof fillHough==="function"? fillHough : undefined);')();
    } catch (e) {
      setStatus(codeStatus, 'Syntax error: ' + e.message, false);
      return;
    }
    if (typeof fill !== 'function') {
      setStatus(codeStatus, 'No fillHough(hough,points,width,height) function found', false);
      return;
    }

    try {
      // Convert normalized-centered coords to centered pixel coords for student function
      const studentPoints = points.map(p => ({ x: p.x * W, y: p.y * H }));
      fill(hough, studentPoints, W, H);
      // normalize to 0..255
      let max = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = hough[r][c];
          if (v > max){
              max = v
          }
        }
      }
      for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
              norm = hough[r][c] / max
            hough[r][c] =  Math.pow(norm, 0.5) * 255;
          }
      }
      // Render greyscale grid to Hough canvas
      const img = houghCtx.createImageData(cols, rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let v = hough[r][c];
          // Coerce to finite number in 0..255
          if (typeof v !== 'number' || !isFinite(v)) v = 0;
          if (v < 0) v = 0; else if (v > 255) v = 255;
          const val = v & 0xFF;
          const idx = (r * cols + c) * 4;
          img.data[idx] = val;
          img.data[idx+1] = val;
          img.data[idx+2] = val;
          img.data[idx+3] = 255;
        }
      }
      // Draw with pixel-perfect scaling
      const tmp = document.createElement('canvas');
      tmp.width = cols; tmp.height = rows;
      const tctx = tmp.getContext('2d');
      tctx.putImageData(img, 0, 0);
      houghCtx.clearRect(0, 0, houghCanvas.width, houghCanvas.height);
      houghCtx.imageSmoothingEnabled = false;
      houghCtx.drawImage(tmp, 0, 0, houghCanvas.width, houghCanvas.height);

      // Overlay Hough axes and labels
      drawHoughOverlay(cols, rows, rhoMax);

      setStatus(codeStatus, 'Ran OK', true);
    } catch (e) {
      console.error(e);
      setStatus(codeStatus, 'Runtime error: ' + e.message, false);
    }
  }

  function drawHoughOverlay(cols, rows, rhoMax) {
    const ctx = houghCtx;
    const Wc = houghCanvas.width;
    const Hc = houghCanvas.height;

    ctx.save();
    // Semi-transparent overlay so underlying image remains visible
    ctx.globalAlpha = 1.0;

    // Outline
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, Wc - 1, Hc - 1);

    // Axes styles
    const axisColor = '#f97316';
    const tickColor = '#334155';
    const labelColor = '#e5e7eb';

    ctx.fillStyle = labelColor;
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Theta ticks along X (0..π)
    const thetaTicks = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI];
    // Draw baseline (x-axis) at bottom edge
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    ctx.moveTo(0, Hc - 0.5);
    ctx.lineTo(Wc, Hc - 0.5);
    ctx.stroke();

    ctx.strokeStyle = tickColor;
    for (const t of thetaTicks) {
      const x = (cols <= 1) ? 0.5 * Wc : (t / Math.PI) * (Wc - 1) + 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, Hc - 8);
      ctx.lineTo(Math.round(x) + 0.5, Hc - 0.5);
      ctx.stroke();
      const text = (t === 0) ? '0' : (t === Math.PI/2 ? 'π/2' : (t === Math.PI ? 'π' : 'π/4'.repeat(t === Math.PI/4 ? 1 : 0) || '3π/4'));
      // Compute label safely
      let lbl;
      if (t === 0) lbl = '0';
      else if (t === Math.PI/4) lbl = 'π/4';
      else if (t === Math.PI/2) lbl = 'π/2';
      else if (t === 3*Math.PI/4) lbl = '3π/4';
      else lbl = 'π';
      ctx.fillStyle = labelColor;
      ctx.fillText(lbl, x, Hc - 18);
    }
    // Theta axis title
    ctx.fillStyle = labelColor;
    ctx.fillText('theta (rad)', Wc - 60, Hc - 32);

    // Rho ticks along Y (top = -rhoMax, bottom = +rhoMax)
    // Draw vertical axis line at left edge
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, Hc);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const rhoTicks = [-rhoMax, -rhoMax/2, 0, rhoMax/2, rhoMax];
    ctx.strokeStyle = tickColor;
    for (const r of rhoTicks) {
      const y = (rows <= 1) ? 0.5 * Hc : ((r + rhoMax) / (2 * rhoMax)) * (Hc - 1) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0.5, Math.round(y) + 0.5);
      ctx.lineTo(8, Math.round(y) + 0.5);
      ctx.stroke();
      const val = Math.round(r);
      ctx.fillStyle = labelColor;
      ctx.fillText(String(val), 10, y);
    }

    // Rho axis title (rotated)
    ctx.save();
    ctx.translate(20, 16);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = labelColor;
    ctx.fillText('rho', 0, 0);
    ctx.restore();

    ctx.restore();
  }


  resetCodeBtn.addEventListener('click', async () => {
    await loadDefaultStudentCode();
    setStatus(codeStatus, 'Code reset', true);
    recompute();
  });

  // Initial sizing and draw
  resizeCanvases();
  drawPoints();
  // Seed with a few points for demo (normalized center-origin coordinates)

  drawPoints();
})();
