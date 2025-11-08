// You are given a 2d int array hough.
// Fill it with the hough transform of the given points.
// points is an array of {x,y} objects
// width and height are the dimensions of the point canvas
//

// Hint:
// theta (θ) describes the rotation of a line (0 to pi)
// rho describes the distance from line to origin

function fillHough(hough, points, width, height) {
    // dimensions of the hough space
    const rows = hough.length;
    const cols = hough[0].length;

    /*
    compute the maximum distance a line that originates from a given point can have to the origin.
    Hint: width and height are the dimensions of the point canvas.
    */
    const rhoMax = 0; //???

    if (rhoMax <= 0) return;

    /* compute the theta-resolution: "How much theta values does one pixel of hough space descibe?"
    Hint: the hough space has (cols) pixels on the theta axis.
    */
    const theta_res = 0; // ???

    const rho_res = (2 * rhoMax) / (rows -1);

    for (let p = 0; p < points.length; p++) {
        const {x, y} = points[p];

        for (let c = 0; c < cols; c++) {
            const theta = c * theta_res;

            /*
            Given a line's angle and a point (x,y) it passes through,
            compute its distance to origin:
            rho = x cosθ + y sinθ
            */

            const rho = 0; //???

            // Convert rho to pixel index
            const r = Math.round((rho + rhoMax) / rho_res);

            // Check bounds and accumulate
            if (r >= 0 && r < rows) {
                hough[r][c]++;
            }
        }
    }
}
