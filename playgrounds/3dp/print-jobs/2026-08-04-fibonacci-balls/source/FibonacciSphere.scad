// Brent Peterson 2024
// License: CC-Attribution-Noncommercial-NoDerivatives
//
// Credit @meetamit (observablehq.com/@meetamit/fibonacci-lattices)
// and Dr Martin Roberts

/* [Sphere Parameters] */
// Diameter of sphere (mm)
sphereDiameter = 40;
// Thickness of sphere (mm)
sphereThickness = 2;
// Resolution of sphere model (facet count)
sphereResolution = 192;

/* [Cutout Parameters] */
// Number of cutouts
cutoutCount = 320;
// Diameter of cutouts (mm)
cutoutDiameter = 3;
// Number of sides for cutouts
cutoutSides = 6; // [3:1:16]
// Angle of the initial cutout pattern (deg)
cutoutAngle = 0; // [-180:1:180]

/* [Algorithm Parameters] */
// Select the irrational constant to use for phi
phiConstant = 0; // [0:goldenRatio, 1:sqrt(2), 2:sqrt(3), 3:ln(2)]
// Enable compensation that spaces cutouts more evenly at the poles
epsilonEnabled = true;

// Initialize some values
n = cutoutCount;
radius = sphereDiameter/2;

// Initialize algorithm constants
phi = [(1+sqrt(5))/2, sqrt(2), sqrt(3), ln(2)][phiConstant];
epsilon = 3/2;

// Use boolean difference to create the model
difference() {
    // Create base sphere geometry
    sphere(radius, $fn=sphereResolution);

    // Create shell by removing second sphere offset by thickness
    sphere(radius-sphereThickness, $fn=sphereResolution);

    // Generate cutouts using Fibonacci lattice and map to sphere surface
    for (i = [0:n-1]) {
        // Calculate coordinate position on the surface of the sphere
        longitude = 360*i/phi;
        latitude = epsilonEnabled ? acos(1-2*(i+epsilon)/(n+3)) : acos(1-2*i/(n-1));

        // Rotate cutout to coordinate position on the sphere
        rotate([0, latitude, longitude])
            // Extrude cutout up to the surface of the sphere
            linear_extrude(radius)
                // Rotate cutout pattern by initial angle
                rotate(cutoutAngle)
                    // Create cutout pattern using circle and facet count
                    circle(d=cutoutDiameter, $fn=cutoutSides);
    }
}
