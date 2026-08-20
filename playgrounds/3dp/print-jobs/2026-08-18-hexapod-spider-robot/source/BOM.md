# Hexapod Spider Robot BOM

Source: https://makerworld.com/en/models/1973965-hexapod-spider-robot-with-servo-arduino#profileId-2122819  
Assembly video: https://www.youtube.com/watch?v=ciE2Z_92T7s

The model is under MakerWorld's Standard Digital File License. Keep the files and printed parts for personal/internal use; do not redistribute or sell them.

## Printed parts

H2D Pro, right 0.4 mm nozzle, Textured PEI Plate, 0.20 mm layers, 3 walls, 10% grid infill, normal automatic support, automatic brim. The brim setting produced no brim geometry on these plates.

| Plate | Parts | PLA | Estimate |
|---|---|---:|---:|
| 1 | Leg_A × 6 | Orange 173.07 g | 5 h 17 m 21 s |
| 2 | Leg_B × 6 | Orange 235.36 g | 6 h 24 m 23 s |
| 3 | Leg_C_1 × 6 + Leg_C_2 × 6 | Orange 282.03 g | 8 h 49 m 13 s |
| 4 | Body × 1 | White 195.28 g | 4 h 36 m 27 s |
| 5 | Upper_Body × 1 | White 118.76 g | 2 h 26 m 5 s |
| 6 | Shaft × 18 + Washer × 18 | White 30.32 g | 1 h 23 m 43 s |
| 7 | Controller Upper × 1 | White 50.41 g | 1 h 7 m 12 s |
| 8 | Controller Body × 1 | White 115.56 g | 2 h 44 m 18 s |

Total: 1,200.79 g PLA and 32 h 48 m 42 s of estimated printing time. The split fits the live AMS inventory observed before printing: orange PLA Basic in AMS 0 slot 1 and white PLA Basic in AMS 0 slot 0.

## Hexapod robot hardware

- Arduino Mega × 1
- XL4016 voltage regulator × 1
- NRF24L01 PA + LNA module × 1
- NRF24L01 power adapter × 1
- 3S 2200 mAh LiPo battery × 1
- MG996R 180-degree servo × 18
- KCD1 rocker switch × 1
- 695 bearing × 18
- Servo extension / jumper cables, quantity and length not specified by the designer
- M3 × 6 mm bolts × 90
- M3 × 10 mm bolts × 90

## RC controller hardware

- NRF24L01 PA + LNA module × 1
- NRF24L01 power adapter × 1
- Arduino Uno × 1
- Dual 18650 battery holder × 1
- 18650 Li-ion battery × 2
- 5 mm toggle switch × 3
- 10 kΩ potentiometer × 2
- Joystick module × 2
- Jumper cables, quantity and length not specified by the designer
- M3 × 6 mm bolts × 18

Combined fastener totals are M3 × 6 mm × 108 and M3 × 10 mm × 90. If buying 20-piece packs, that is six packs of M3 × 6 mm and five packs of M3 × 10 mm.

## Also needed before power-up

These are not quantified in the published BOM:

- The designer's PCB/Gerber or an equivalent reviewed power-and-signal wiring implementation
- A proper 3S balance charger and LiPo-safe handling/storage equipment
- A charger suitable for the chosen 18650 cells; use a matched pair appropriate for the holder
- Wire, connectors, solder, and heat-shrink tubing required by the assembly

The designer marks the software as still under development and points to the assembly video's description for the current source code, Gerber files, and schematics. The 18-servo power path has not been electrically reviewed here; do not connect the battery until the regulator, wiring, connector, and expected current have been checked as a system.
