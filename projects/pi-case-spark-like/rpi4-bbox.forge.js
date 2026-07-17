// Exploration: report the raw coordinate frame of the downloaded Pi 4B STEP
// (source: github.com/multigamesystem/MGS-CAD-Files, community model).
// Run with: forgecad run rpi4-bbox.forge.js --backend occt
const pi = importStep("./reference/rpi4b.step").as("rpi4b");
return [pi];
