// You are given a 2d int array hough.
// Fill it with the hough transform of the given points.
// points is an array of {x,y} objects
// width and height are the dimensions of the point canvas

function fillHough(hough, points, width, height) {
    const rows = hough.length;
    const cols = hough[0].length;

    const rhoMax = Math.hypot(width, height) / 2;
    if (rhoMax <= 0) return;

    // Choose quantization to roughly match the display resolution
    const theta_res = Math.PI / (cols - 1);
    const rho_res = (2 * rhoMax) / (rows - 1);

    for (let p = 0; p < points.length; p++) {
        const {x, y} = points[p];

        for (let c = 0; c < cols; c++) {
            const theta = c * theta_res;

            // Compute rho = x cosθ + y sinθ
            const rho = x * Math.cos(theta) + y * Math.sin(theta);

            // Convert rho to pixel index
            const r = Math.round((rho + rhoMax) / rho_res);

            // Check bounds and accumulate
            if (r >= 0 && r < rows) {
                hough[r][c] = Math.min(hough[r][c] + 20, 255);
            }
        }
    }
}
