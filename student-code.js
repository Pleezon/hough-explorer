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
    const rho_axis_pixels = hough.length;
    const theta_axis_pixels = hough[0].length;

    /*
    compute the maximum distance a line that originates from a given point can have to the origin.
    Hint: width and height are the dimensions of the point canvas.
    */
    const rhoMax = 0 /* <-- REPLACE WITH YOUR CODE: Math.? */;

    if (rhoMax <= 0) return;

    /* compute the theta-resolution: "How much theta values does one pixel of hough space descibe?"
    */
    const theta_res = Math.PI / theta_axis_pixels;

    const rho_res = (2 * rhoMax) / (rho_axis_pixels -1);

    // Hmmmm... Now for every point, we want to show all lines that might go through that point
    for (let p = 0; p < 0 /* <-- REPLACE WITH YOUR CODE */; p++) {
        const {x, y} = points[p];

        for (let c = 0; c < 0 /* <-- REPLACE WITH YOUR CODE */; c++) {
            const theta = c * theta_res;

            /*
            Given a line's angle and a point (x,y) it passes through,
            compute its distance to origin:
            rho = x cosθ + y sinθ
            */
            const rho = 0 /* <-- REPLACE WITH YOUR CODE */; 

            // Convert rho to pixel index
            const r = Math.round((rho + rhoMax) / rho_res);

            // Check bounds and accumulate
            if (r >= 0 && r < rho_axis_pixels) {
                hough[r][c]++;
            }
        }
    }
}
