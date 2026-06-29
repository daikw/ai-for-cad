---

## Creality K1 Max Web UI JavaScript Source Code Security Analysis

### 1. FILES ANALYZED

- `app.b05d1c1a.js` (167 KB) -- Vue.js 3 SPA with Pinia state management
- `chunk-vendors.24d5716e.js` (3 MB) -- Third-party libraries (Vue, Element Plus, ECharts, VueUse)
- No other JS files loaded. No CSS files referenced in index.html.

---

### 2. HARDCODED SECRETS / CREDENTIALS

**FACT**: No hardcoded API keys, tokens, passwords, or secrets found in either JS bundle. No default credentials embedded. No Creality Cloud API tokens or URLs present in the local firmware JS.

**FACT**: No cookie/session/localStorage/sessionStorage usage found -- the app has zero session management.

---

### 3. COMPLETE WEBSOCKET API SPECIFICATION

**FACT**: WebSocket connects to `ws://<printer_ip>:9999` with zero authentication. The protocol uses two message types:

#### Message Format
```
ModeCode: "message"  -- data messages (method/params JSON-RPC style)
ModeCode: "heart_beat" -- keepalive (sent every 5 seconds, 1-second timeout, 5-second reconnect)
```

#### GET methods (read state):
| params key | Description |
|---|---|
| `reqGcodeFile: 1` | List all gcode files on printer |
| `reqHistory: 1` | List print history |
| `ReqPrinterPara: 1` | Request full printer parameters (Klipper config) |
| `reqPrintObjects: 1` | Request print object data (for exclude-object feature) |
| `reqProbedMatrix: 1` | Request bed mesh probed point matrix |

#### SET methods (write/control):
| params key | Value | Description |
|---|---|---|
| `opGcodeFile` | `"printprt:<path>/<file>"` | **Start a print job** |
| `opGcodeFile` | `"deleteprt:<path>/<file>"` | **Delete a gcode file** |
| `opGcodeFile` | `"renameprt:<old>:<new>"` | **Rename a gcode file** |
| `pause` | `0` or `1` | Pause/resume print |
| `stop` | `0` or `1` | Stop print |
| `lightSw` | numeric | Toggle LED light |
| `fan` | numeric | Set model fan speed |
| `fanAuxiliary` | numeric | Set auxiliary fan speed |
| `fanCase` | numeric | Set case fan speed |
| `gcodeCmd` | `"M106 P0 S<val>"` etc. | **Arbitrary G-code command injection** |
| `autohome` | `"X"`, `"Y"`, `"Z"`, `"X Y"`, `"X Y Z"` | Home axes |
| `setPosition` | `"X<val> F3000"` etc. | Move print head to position |
| `setZOffset` | `"+<val>"` or `"-<val>"` | Adjust Z offset |
| `savePara` | `1` | Save current parameters to EEPROM |
| `nozzleTempControl` | numeric | **Set nozzle temperature** |
| `bedTempControl` | `{num: <zone>, val: <temp>}` | **Set bed temperature (per zone)** |
| `setFeedratePct` | numeric | Set feed rate percentage |
| `restartKlipper` | `1` | **Restart Klipper service** |
| `restartFirmware` | `1` | **Restart firmware** |
| `cleanErr` | `1` | Clear error state |
| `excludeObjects` | `[<name>]` | Exclude object from print |
| `deleteHistory` | array of IDs | Delete print history entries |
| `repoPlrStatus` | `0` or `1` | Resume/cancel power-loss recovery |
| `rmProbedMatrix` | `1` | Delete bed mesh calibration data |

#### State pushed from printer (in "message" payloads):
`printState`, `printProgress`, `printFileName`, `nozzleTemp`, `bedTemp0`, `curPosition`, `layer`, `totalLayer`, `err` (with `errcode` and `key`), `materialStatus`, `repoPlrStatus`, `lightSw`, `objects` (excluded objects SVG), `excluded_objects`, `materialDetect`, `videoElapse`, `nozzleMoveSnapshot`, `videoElapseFrame`, `videoElapseInterval`, `model`, `ip`

---

### 4. HIDDEN HTTP ENDPOINTS

**FACT**: HTTP endpoints discovered from JS source:

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/upload/<filename>` | POST (multipart) | None | Upload gcode files |
| `/downloads/original/current_print_image.png` | GET | None | Current print preview image |
| `/downloads/humbnail/<filename>` | GET | None | Gcode thumbnail images (note: "humbnail" typo in source) |
| `/downloads/defData/<filename>` | GET | None | Default/fallback gcode thumbnails |
| `<ip>:8080/?action=stream` | GET | None | MJPEG camera stream |

**FACT**: The `/downloads/` directory has three known subdirectories: `original/`, `humbnail/`, `defData/`. The typo "humbnail" (missing 't') is in the production source code.

---

### 5. CRITICAL SECURITY RISKS

#### RISK-01: Arbitrary G-code Command Injection (CRITICAL)
**FACT**: The `gcodeCmd` WebSocket parameter accepts arbitrary G-code strings. The JS only uses it for fan control (`M106 P0/P1/P2`), but the parameter itself passes any string to Klipper.
**RISK**: An attacker on the LAN can send arbitrary G-code commands including:
- `M104 S300` (set nozzle to 300C -- fire hazard)
- `M140 S120` (set bed to 120C -- fire/damage)
- `G28` followed by `G1 X0 Y0 Z0 F9999` (crash head into bed)
- `M112` (emergency stop)
- Custom macros defined in Klipper config

#### RISK-02: Zero Authentication on All Interfaces (CRITICAL)
**FACT**: No authentication tokens, cookies, sessions, or login flows exist anywhere in the codebase. Every WebSocket command and HTTP endpoint is fully open.
**RISK**: Any device on the same network segment can control the printer, upload files, start/stop prints, change temperatures, and move axes.

#### RISK-03: Unauthenticated File Upload with No Validation (HIGH)
**FACT**: The upload handler (`POST /upload/<filename>`) only checks the file extension client-side (`"gcode" !== a.toLowerCase()`). The server-side validation is unknown but the client sends the filename directly in the URL path.
**RISK**: Path traversal via crafted filenames (e.g., `../../../etc/something`). The client does no sanitization of the filename beyond extension check.

#### RISK-04: dangerouslyUseHTMLString XSS in Error Display (MEDIUM)
**FACT**: The error display uses Element Plus's `dangerouslyUseHTMLString: true` to render error messages:
```javascript
u = `<div class="codeMessage">
  <p>${o(t)}：${c[t]([r], e)}</p>
  <button class="reboot">${p}</button>
</div>`;
```
The error code `t` and key `r` come from WebSocket data (`a.err.errcode`, `a.err.key`). The error code is used as an index into a lookup table `c[t]`, and `r` is interpolated into the error string via `e[0]`.
**RISK**: If an attacker can inject a crafted WebSocket message with a malicious `err.key` value containing HTML/JS, it would be rendered via `dangerouslyUseHTMLString`. Since WebSocket has no auth, any LAN attacker could potentially trigger this if the printer relays crafted error data. Severity is medium because the error key goes through a translation function, but the template string interpolation `${c[t]([r], e)}` passes `r` as `e[0]` which is concatenated directly into strings like `""+e[0]` in several error handlers (codes 2220, 2221, 2222, 2223, 2229, 2231, etc.).

#### RISK-05: Unauthenticated Printer Restart/Klipper Restart (HIGH)
**FACT**: `restartKlipper: 1` and `restartFirmware: 1` commands are available via unauthenticated WebSocket. The error dialog's "reboot" button handler sends `restartFirmware: 1`.
**RISK**: Denial of service -- any LAN device can continuously restart the printer firmware or Klipper service.

#### RISK-06: Unauthenticated Axis Movement and Temperature Control (HIGH)
**FACT**: `setPosition`, `autohome`, `nozzleTempControl`, `bedTempControl` accept arbitrary numeric values with no server-side bounds checking evident from client code.
**RISK**: Physical damage -- an attacker could set dangerous temperatures or crash the print head.

#### RISK-07: Unencrypted MJPEG Camera Stream (MEDIUM)
**FACT**: Camera stream at `<ip>:8080/?action=stream` is HTTP with no auth. The JS constructs the URL as `http://${e.$ip}:8080/?action=stream`.
**RISK**: Surveillance -- anyone on the LAN can watch the camera feed.

#### RISK-08: File Operations Without Path Sanitization (MEDIUM)
**FACT**: File operations (`deleteprt`, `printprt`, `renameprt`) construct paths by concatenating user-selected values: `"deleteprt:" + t + "/" + e` where `t` is path and `e` is filename from the file list. These come from WebSocket state data.
**RISK**: If an attacker injects crafted filenames via upload (e.g., containing `../`), subsequent operations might traverse directories on the underlying Linux filesystem.

---

### 6. KLIPPER CONFIGURATION EXPOSURE

**FACT**: The `configStore` Pinia store exposes the full Klipper configuration via `ReqPrinterPara`:
- `stepper_x`, `stepper_y`, `stepper_z` -- stepper motor configuration
- `tmc2209_stepper_x`, `tmc2209_stepper_y`, `tmc2209_stepper_z`, `tmc2209_extruder` -- TMC2209 driver config (includes current limits, stealthchop thresholds)
- `extruder` -- extruder config
- `heater_bed` -- heated bed config
- `heater_fan_hotend_fan` -- hotend fan config
- `bed_mesh` -- bed mesh calibration data
- `printer` -- printer kinematics/limits

**RISK**: Full hardware configuration disclosure including motor currents, temperature limits, kinematics parameters. Could be used to craft attacks that exceed hardware limits.

---

### 7. DEBUG ARTIFACTS

**FACT**: Production JS contains 20+ `console.log()` statements with Chinese debug messages:
- `console.log("排除对象数据监听到了阿", ...)` -- "Exclude object data listener triggered"
- `console.log("什么国际化612", ...)` -- "What internationalization 612"
- `console.log("什么状态66666", ...)` -- "What status 66666"
- `console.log("数据更新啦", 6666)` -- "Data updated, 6666"
- `console.log("心跳间隔时间是多少: ", ...)` -- "What is the heartbeat interval"

**INFERENCE**: Debug logging was not stripped from the production build, suggesting limited build pipeline maturity. No sensitive data leaks in these logs, but they indicate development shortcuts.

---

### 8. TIMELAPSE/AI CAMERA SETTINGS

**FACT**: The `prepareStore` manages settings pushed from the printer:
- `materialDetect` -- filament runout detection status
- `videoElapse` -- timelapse recording toggle
- `nozzleMoveSnapshot` -- nozzle-move-triggered snapshot
- `videoElapseFrame` -- timelapse frame parameter
- `videoElapseInterval` -- timelapse interval parameter

**INFERENCE**: These are read from WebSocket state updates (the array `["materialDetect","videoElapse","nozzleMoveSnapshot","videoElapseFrame","videoElapseInterval"]` filters incoming data). No explicit SET commands for these were found in the JS, suggesting they may be configured through a different interface or the settings are read-only from the web UI.

---

### 9. ERROR CODE MAP (Klipper Error Codes)

**FACT**: 30+ Klipper error codes are mapped (23, 200, 201, 208, 500, 2218-2247+). The error handling system:
1. Receives `{err: {errcode: N, key: "..."}}` via WebSocket
2. Looks up error code in map to get message template
3. Interpolates `key` value into message
4. Renders with `dangerouslyUseHTMLString: true`
5. Attaches click handler on "reboot" button that sends `restartFirmware: 1` or `restartKlipper: 1` + `restartFirmware: 1`

Certain error codes (1, 2, 3, 4, 5, 6, 8, 200) trigger a firmware restart prompt; others trigger a "clean error" prompt.

---

### 10. NETWORK/PORT/URL SUMMARY

**FACT**: Services referenced in JS source:
- Port 80: HTTP web server (nginx/lighttpd serving Vue SPA + REST endpoints)
- Port 8080: MJPEG camera stream (`?action=stream` -- likely mjpg-streamer)
- Port 9999: WebSocket control channel (custom Creality JSON-RPC)

**FACT**: No references to Creality Cloud URLs, external API endpoints, or phone-home services found in the local web UI JS. Cloud connectivity, if present, runs through a separate daemon not exposed via this interface.

**FACT**: No references to SSH, Telnet, or shell access in the JS source.

---

### 11. VENDOR BUNDLE ANALYSIS

**FACT**: The vendor bundle (3 MB) contains standard libraries: Vue 3, Element Plus UI, ECharts (for bed mesh visualization), VueUse (utility compositions including `useWebSocket`, `useWakeLock`). No hardcoded secrets, no eval() usage, no custom security-relevant code. The VueUse `useWebSocket` is available but the app uses its own custom WebSocket class (`la extends WebSocket`).

---

### SUMMARY OF FINDINGS BY SEVERITY

| ID | Severity | Type | Finding |
|---|---|---|---|
| RISK-01 | CRITICAL | Arbitrary Code Exec | `gcodeCmd` param accepts any G-code string, no auth |
| RISK-02 | CRITICAL | Auth Bypass | Zero authentication on all interfaces |
| RISK-03 | HIGH | File Upload | Unauthenticated upload, client-side-only extension check |
| RISK-05 | HIGH | DoS | Unauthenticated firmware/Klipper restart |
| RISK-06 | HIGH | Physical Safety | Unauthenticated temp control and axis movement |
| RISK-04 | MEDIUM | XSS | `dangerouslyUseHTMLString` with WebSocket-sourced error data |
| RISK-07 | MEDIUM | Privacy | Unencrypted, unauthenticated camera stream |
| RISK-08 | MEDIUM | Path Traversal | Unsanitized file paths in delete/rename/print operations |
| FACT | INFO | Config Disclosure | Full Klipper hardware config readable without auth |
| FACT | INFO | Debug Leak | Console.log debug statements left in production build |
| FACT | INFO | No Encryption | All traffic (HTTP/WS/MJPEG) is plaintext |
