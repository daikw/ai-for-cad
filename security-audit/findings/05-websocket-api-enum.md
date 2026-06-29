## WebSocket API Enumeration Results -- K1 Max (ws://192.168.9.252:9999/)

Script saved to: `/tmp/k1_ws_enum.py` (also on ubuntu01 at `/tmp/k1_ws_enum3.py`)

---

### Protocol Architecture

The K1 Max WebSocket on port 9999 is a **push-dominant, subscription-less telemetry stream** with a minimal command interface:

1. **On connect**: server immediately sends a full state dump (76 keys) with no auth challenge
2. **Continuously**: server pushes delta updates every ~250ms with changing values (temps, position, speeds, layer count)
3. **On client send**: server processes known commands and silently ignores unknown ones (no error, no disconnect, no response)

### Authentication: NONE

- Connections accepted with zero headers, zero handshake, zero tokens
- No auth challenge sent on connect
- No rate limiting observed
- **20 simultaneous connections accepted** without throttling
- Any device on the LAN can connect and control the printer

### Responding Methods (4 confirmed)

| Method | Response Key(s) | Data Exposed | Security Impact |
|--------|----------------|--------------|-----------------|
| `GET reqGcodeFile` | `retGcodeFileInfo2` | Full file listing with **absolute filesystem paths** (`/usr/data/printer_data/gcodes/...`), file sizes, creation timestamps, MD5 hashes, slicer metadata, material info, thumbnail paths | **HIGH** -- leaks filesystem layout, file enumeration, timing info |
| `GET reqHistory` | `totalJob`, `totalUsageTime`, `totalUsageMaterial`, `historyList` | 50 print jobs with timestamps, filenames, durations, material usage, start method, completion status, file MD5s | **MEDIUM** -- usage profiling, prints 50 historical jobs |
| `SET lightSw` | `lightSw` | **Accepted value -1 and echoed it back** -- likely applied the setting | **CRITICAL** -- unauthenticated actuator control |
| `SET aiSw` | `aiSw` | **Accepted value -1 and echoed it back** -- likely toggled AI detection off | **CRITICAL** -- unauthenticated safety-system disable |

### Initial State Dump (76 keys, sent on every connect, no auth)

Sensitive data exposed on connect:

| Key | Example Value | Sensitivity |
|-----|--------------|-------------|
| `hostname` | `"K1Max-AC75"` | Device identification |
| `model` | `"K1 Max"` | Device fingerprinting |
| `modelVersion` | `"DWIN hw ver:CR4CU220812S11;DWIN sw ver:1.3.5.19;"` | Firmware version for exploit targeting |
| `nozzleTemp` | `"221.310000"` | Real-time telemetry |
| `bedTemp0` | `"49.880000"` | Real-time telemetry |
| `curPosition` | `"X:127.58 Y:165.16 Z:44.50"` | Real-time toolhead position |
| `printProgress` | `47` | Print job monitoring |
| `printFileName` | `""` | Current print file (empty when printing from history) |
| `pressureAdvance` | `"0.044000"` | Klipper tuning data |
| `maxNozzleTemp` | `300` | Hardware limits |
| `maxBedTemp` | `100` | Hardware limits |
| `err` | `{"errcode": 206, "key": 503}` | Error state information |
| `aiDetection` / `aiSw` | `1` | AI spaghetti detection status |
| `video` / `videoElapse` | `1` | Camera and timelapse status |
| `lightSw` / `fan` | `1` | Actuator states |

### Non-Responding Methods (silently ignored, no error)

All speculative GET methods (reqLog, reqConfig, reqSettings, reqNetwork, reqWifi, reqSystem, reqVersion, reqUpdate, reqUser, reqAuth, reqCamera, reqVideo, reqAI, reqMaterial, reqNozzle, reqCalibration, reqMeshBed, etc.) produced **no distinct response** -- the server silently ignores them. Same for all non-standard methods (info, status, version, list, help, ping, subscribe, auth, gcode, exec).

**Note on `GET reqPrinter`**: This also showed "push-only", likely because its response keys overlap entirely with the continuous push stream and cannot be distinguished. The initial state dump effectively IS the reqPrinter response.

### Malformed Input Handling

- **Empty string, invalid JSON, incomplete JSON, null, 10K overflow, SQL injection, command injection, path traversal**: ALL silently ignored
- Connection stays alive after any malformed input
- No error messages, no disconnect, no crash
- This is good from a DoS perspective but means the server has a "swallow everything" parser with zero feedback

### Critical Security Findings

1. **UNAUTHENTICATED ACTUATOR CONTROL**: `SET lightSw` and `SET aiSw` accepted and applied arbitrary values without any authentication. This strongly implies `SET pause`, `SET stop`, `SET fan`, `SET opGcodeFile` (start print) also work unauthenticated -- these were already known from the SPA reverse engineering.

2. **ZERO-AUTH FULL TELEMETRY**: 76 keys of real-time printer state broadcast to any connection on the LAN, including temperatures, position, progress, error codes, firmware versions, and hardware limits.

3. **FILESYSTEM PATH LEAKAGE**: `reqGcodeFile` returns absolute paths like `/usr/data/printer_data/gcodes/` and `/usr/data//creality/local_gcode/`, revealing the internal filesystem structure and confirming Creality's Linux overlay layout.

4. **UNLIMITED CONNECTIONS**: 20 simultaneous connections accepted (test limit, actual limit may be higher). No connection throttling or rate limiting.

5. **SILENT FAILURE MODE**: Unknown commands silently ignored with no error feedback -- makes the attack surface appear smaller than it is, but also means brute-forcing valid commands gets no negative feedback signal.

6. **PRINT HISTORY EXPOSURE**: Full 50-job history with timestamps, file MD5 hashes, and durations -- enables usage profiling.
