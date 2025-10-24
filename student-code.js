// Default student-editable CV code
// Implement transformToMat that returns a cv.Mat visualizing Hough accumulator for lines.
// Signature: function transformToMat(points, width, height, options, cv) -> cv.Mat
// - points: array of {x, y}
// - width, height: size of the left canvas
// - options: { thetaSteps, rhoSteps } — automatically set to match the output canvas size (no sliders)
// - cv: OpenCV.js namespace
// Return: cv.Mat (rows=rhoSteps, cols=thetaSteps), either CV_8UC1 (grayscale) or CV_8UC3 (BGR)

function transformToMat(points, width, height, options, cv) {
  const { thetaSteps, rhoSteps } = options;
  const diag = Math.hypot(width, height);
  const rhoMax = diag;
  const thetaStep = Math.PI / thetaSteps; // 0..π

  // Accumulator (Float32)
  const accum = new Float32Array(rhoSteps * thetaSteps);
  for (let p = 0; p < points.length; p++) {
    const { x, y } = points[p];
    for (let ti = 0; ti < thetaSteps; ti++) {
      const theta = ti * thetaStep;
      const rho = x * Math.cos(theta) + y * Math.sin(theta);
      const r = Math.round(((rho + rhoMax) / (2 * rhoMax)) * (rhoSteps - 1));
      if (r >= 0 && r < rhoSteps) {
        accum[r * thetaSteps + ti] += 1;
      }
    }
  }

  // Normalize to 0..255
  let max = 0;
  for (let i = 0; i < accum.length; i++) if (accum[i] > max) max = accum[i];
  const mat = new cv.Mat(rhoSteps, thetaSteps, cv.CV_8UC1);
  if (max === 0) {
    mat.setTo(new cv.Scalar(0));
    return mat;
  }
  const data = mat.data;
  for (let r = 0; r < rhoSteps; r++) {
    for (let t = 0; t < thetaSteps; t++) {
      const v = accum[r * thetaSteps + t] / max;
      data[r * thetaSteps + t] = Math.round(v * 255);
    }
  }
  return mat;
}
