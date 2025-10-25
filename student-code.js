// STUDENT TASK: Fill the Hough space with greyscale values (0..255).
// You only edit fillHough(hough, points, width, height, helpers)
// - hough: numeric 2D array [rows][cols]; set hough[r][c] to a brightness 0..255
//          (0 = black, 255 = white). Brighter means more points support that line.
// - points: array of { x, y } in centered pixel coords (origin at canvas center; +x right, +y down)
// - width, height: size of the point canvas (in pixels)
// - helpers: { thetaForCol(c), rhoForRow(r), rhoMax, cols, rows }
// Idea: For each pixel (r,c) in Hough space, compute the corresponding line parameters
//       theta = helpers.thetaForCol(c) and rho = helpers.rhoForRow(r). Count how many
//       points lie near that line (|x cosθ + y sinθ - rho| < epsilon) and map that count
//       to a brightness value.

function fillHough(hough, points, width, height, helpers) {
  const { thetaForCol, rhoForRow, cols, rows } = helpers;

  // Distance tolerance in pixels for a point to "vote" for a line bin.
  const epsilon = 2; // pixels

  // Scaling from vote count -> brightness. Adjust the scale to taste.
  // Example: 1 close point -> ~64, 2 -> ~128, 3+ -> saturates at 255.
  const countToBrightness = (count) => Math.min(255, count * 64);

  for (let r = 0; r < rows; r++) {
    const rho = rhoForRow(r);
    for (let c = 0; c < cols; c++) {
      const theta = thetaForCol(c);
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      let votes = 0;
      for (let i = 0; i < points.length; i++) {
        const { x, y } = points[i];
        const d = x * ct + y * st - rho;
        if (Math.abs(d) <= epsilon) votes++;
      }

      hough[r][c] = countToBrightness(votes);
    }
  }
}
