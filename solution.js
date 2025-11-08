function fillHough(hough, points, width, height) {
    const rows = hough.length;
    const cols = hough[0].length;

    const rhoMax = Math.hypot(width, height) / 2;
    if (rhoMax <= 0) return;
    const theta_res = Math.PI / (cols);
    const rho_res = (2 * rhoMax) / (rows - 1);

    for (let p = 0; p < points.length; p++) {
        const {x, y} = points[p];

        for (let c = 0; c < cols; c++) {
            const theta = c * theta_res;
            const rho = x * Math.cos(theta) + y * Math.sin(theta);
            const r = Math.round((rho + rhoMax) / rho_res);
            if (r >= 0 && r < rows) {
                hough[r][c]++;
            }
        }
    }
}