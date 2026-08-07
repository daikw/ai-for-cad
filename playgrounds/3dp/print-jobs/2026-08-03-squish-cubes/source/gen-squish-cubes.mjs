#!/usr/bin/env node
// Build a Bambu-project 3MF containing four 30x30x15 squish cubes with
// per-object infill overrides and embossed labels on top.
// Mirrors the production-extension structure Bambu Studio itself writes
// (main model with component objects referencing 3D/Objects/*.model).
// Usage: node gen-squish-cubes.mjs <outdir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const outDir = process.argv[2];
if (!outDir) { console.error("usage: gen-squish-cubes.mjs <outdir>"); process.exit(64); }

const FONT = {
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  4: ["#..#.", "#..#.", "#..#.", "#####", "...#.", "...#.", "...#."],
  5: ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
  0: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
};

const CUBES = [
  { label: "GY15", pattern: "gyroid", density: "15%" },
  { label: "GY40", pattern: "gyroid", density: "40%" },
  { label: "GR15", pattern: "grid", density: "15%" },
  { label: "GR40", pattern: "grid", density: "40%" },
];

const SIZE = 30, HEIGHT = 15, PX = 1.1, TEXT_H = 0.8;

function cuboid(vs, ts, x0, y0, z0, x1, y1, z1) {
  const base = vs.length;
  vs.push([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
          [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  for (const f of [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
                   [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
                   [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]) {
    ts.push(f.map((i) => base + i));
  }
}

function cubeMesh(label) {
  const vs = [], ts = [];
  cuboid(vs, ts, 0, 0, 0, SIZE, SIZE, HEIGHT);
  const chars = label.split("");
  const textW = chars.length * 6 * PX - PX;
  const x0 = (SIZE - textW) / 2;
  const y0 = (SIZE - 7 * PX) / 2;
  chars.forEach((c, ci) => {
    const glyph = FONT[c];
    if (!glyph) throw new Error(`no glyph: ${c}`);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== "#") continue;
        const x = x0 + ci * 6 * PX + col * PX;
        const y = y0 + (6 - row) * PX;
        cuboid(vs, ts, x, y, HEIGHT, x + PX, y + PX, HEIGHT + TEXT_H);
      }
    }
  });
  return { vs, ts };
}

const uuid = (a, b) =>
  `${String(a).padStart(8, "0")}-${String(b).padStart(4, "0")}-4000-8000-000000000000`;

const NS =
  'unit="millimeter" xml:lang="en-US" ' +
  'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ' +
  'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" ' +
  'requiredextensions="p" ' +
  'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021"';

// sub-model files: object ids 1..4 (mesh holders)
const objectFiles = CUBES.map((c, i) => {
  const { vs, ts } = cubeMesh(c.label);
  const vXml = vs.map((v) => `     <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join("\n");
  const tXml = ts.map((t) => `     <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<model ${NS}>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <resources>
  <object id="1" p:UUID="${uuid(10 + i, 0)}" type="model">
   <mesh>
    <vertices>
${vXml}
    </vertices>
    <triangles>
${tXml}
    </triangles>
   </mesh>
  </object>
 </resources>
 <build/>
</model>
`;
});

// main model: component objects ids 11..14 referencing the sub files
const mainObjects = CUBES.map((c, i) => `  <object id="${i + 11}" p:UUID="${uuid(i + 1, 1)}" type="model">
   <components>
    <component p:path="/3D/Objects/object_${i + 1}.model" objectid="1" p:UUID="${uuid(i + 1, 2)}" transform="1 0 0 0 1 0 0 0 1 0 0 0" />
   </components>
  </object>`).join("\n");

const POS = [[130, 115], [175, 115], [130, 160], [175, 160]];
const items = CUBES.map((c, i) =>
  `  <item objectid="${i + 11}" p:UUID="${uuid(i + 1, 3)}" transform="1 0 0 0 1 0 0 0 1 ${POS[i][0]} ${POS[i][1]} 0" printable="1" />`
).join("\n");

const mainModel = `<?xml version="1.0" encoding="UTF-8"?>
<model ${NS}>
 <metadata name="Application">BambuStudio-02.07.01.62</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 <metadata name="Title">squish cubes</metadata>
 <resources>
${mainObjects}
 </resources>
 <build p:UUID="${uuid(9, 9)}">
${items}
 </build>
</model>
`;

const modelRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${CUBES.map((c, i) => ` <Relationship Target="/3D/Objects/object_${i + 1}.model" Id="rel-${i + 1}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>`).join("\n")}
</Relationships>
`;

const objectsCfg = CUBES.map((c, i) => `  <object id="${i + 11}">
    <metadata key="name" value="${c.label}"/>
    <metadata key="extruder" value="1"/>
    <metadata key="sparse_infill_density" value="${c.density}"/>
    <metadata key="sparse_infill_pattern" value="${c.pattern}"/>
  </object>`).join("\n");
const instancesCfg = CUBES.map((c, i) => `    <model_instance>
      <metadata key="object_id" value="${i + 11}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${100 + i}"/>
    </model_instance>`).join("\n");
const assembleCfg = CUBES.map((c, i) =>
  `   <assemble_item object_id="${i + 11}" instance_id="0" transform="1 0 0 0 1 0 0 0 1 ${POS[i][0]} ${POS[i][1]} 0" offset="0 0 0" />`
).join("\n");

const settings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
${objectsCfg}
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    <metadata key="filament_maps" value="1"/>
${instancesCfg}
  </plate>
  <assemble>
${assembleCfg}
  </assemble>
</config>
`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

const stage = path.join(outDir, "stage");
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(path.join(stage, "3D", "Objects"), { recursive: true });
fs.mkdirSync(path.join(stage, "3D", "_rels"), { recursive: true });
fs.mkdirSync(path.join(stage, "_rels"), { recursive: true });
fs.mkdirSync(path.join(stage, "Metadata"), { recursive: true });
fs.writeFileSync(path.join(stage, "[Content_Types].xml"), contentTypes);
fs.writeFileSync(path.join(stage, "_rels", ".rels"), rels);
fs.writeFileSync(path.join(stage, "3D", "3dmodel.model"), mainModel);
fs.writeFileSync(path.join(stage, "3D", "_rels", "3dmodel.model.rels"), modelRels);
objectFiles.forEach((xml, i) =>
  fs.writeFileSync(path.join(stage, "3D", "Objects", `object_${i + 1}.model`), xml),
);
fs.writeFileSync(path.join(stage, "Metadata", "model_settings.config"), settings);

const out = path.join(outDir, "squish-cubes.3mf");
fs.rmSync(out, { force: true });
execFileSync("zip", ["-r", "-X", out, "[Content_Types].xml", "_rels", "3D", "Metadata"], { cwd: stage });
console.log(`wrote ${out}`);
