---

## Creality K1 Max Network Reconnaissance Report

**Target:** 192.168.9.252 (Creality K1 Max, firmware 1.0.0)
**Scan date:** 2026-06-26
**Method:** nmap full TCP scan (all 65535 ports) + bash /dev/tcp scan + HTTP probing via ubuntu01

---

### TCP PORT SCAN RESULTS

| Port | State | Service | Server Banner | Evidence |
|------|-------|---------|---------------|----------|
| **80/tcp** | OPEN | HTTP (Creality Web UI) | `httpd/1.25.11.6` | FACT: nmap confirmed, HTTP headers collected |
| **8080/tcp** | INTERMITTENT | MJPG-Streamer | `MJPG-Streamer/0.2` | FACT: Was OPEN early in scan (responded with full HTML + snapshots), went CLOSED during nmap full scan. 5 consecutive /dev/tcp probes all returned CLOSED afterward. Likely camera process restarts or is toggled by print state. |
| **9999/tcp** | OPEN | WebSocket (JSON-RPC) | `httpd/1.25.11.6` | FACT: nmap confirmed, WebSocket 101 upgrade handshake verified |

**All other 65,532 TCP ports: CLOSED** (nmap full -p- scan, plus /dev/tcp sweep of 1-65535 in segments).

**SSH (22/tcp): CONFIRMED CLOSED** -- no SSH access to the printer itself.

### UDP SCAN RESULTS

UDP scan requires root on ubuntu01 (sudo unavailable). Manual nc -u probes to ports 53, 1883, 5353, 1900 all returned exit code 0 but no data -- **INCONCLUSIVE** (UDP probes cannot distinguish open from filtered without root/raw sockets). SSDP M-SEARCH to port 1900 returned no response.

---

### PORT 80 -- Creality HTTP Server (httpd/1.25.11.6)

**Authentication: NONE on any endpoint**

#### Discovered Endpoints

| Path | Method | Status | Content-Type | Description |
|------|--------|--------|-------------|-------------|
| `/` | GET | 200 | text/html | Creality Vue.js SPA (single-page app) |
| `/index.html` | GET | 200 | text/html | Same as `/` |
| `/info` | GET | 200 | application/json | Device info: `{"mac":"FCEE2807AC75","model":"K1 Max","version":"1.0.0"}` |
| `/upload` | POST (multipart) | 200 | application/json | **File upload -- accepts arbitrary gcode files, returns `{"code":200,"message":"OK"}`** |
| `/upload` | GET/HEAD/DELETE | 404/501 | - | Only POST with multipart file accepted |
| `/downloads/` | GET | 200 | text/html | Directory listing (autoindex) |
| `/downloads/defData/` | GET | 200 | text/html | Default data files |
| `/downloads/original/` | GET | 200 | text/html | Print images |
| `/downloads/humbnail/` | GET | 200 | text/html | Thumbnails (misspelled) |
| `/downloads/video/` | GET | 200 | (streaming) | Timelapse videos (hangs/streams, exit code 18) |
| `/mylogo.png` | GET | 200 | image/png | Creality logo |
| `/favicon.ico` | GET | 200 | - | Favicon |
| `/static/js/app.b05d1c1a.js` | GET | 200 | application/javascript | Vue.js app bundle (163KB) |
| `/static/js/chunk-vendors.24d5716e.js` | GET | 200 | - | Vue.js vendor bundle |
| `/static/js/chunk-2d0db81a.f53abaff.js` | GET | 200 | - | Lazy-loaded chunk (iconfont loader) |

**Not found (404):** `/api`, `/admin`, `/config`, `/settings`, `/system`, `/status`, `/version`, `/printer`, `/debug`, `/cgi-bin`, `/firmware`, `/update`, `/ota`, `/network`, `/wifi`, `/logs`, `/robots.txt`, `/.env`, `/server-status`, `/server-info`, `/home`, `/upload/` (trailing slash), `/static`, `/logs`, `/tmp`, `/etc`, `/proc`, `/dev`, `/root`, `/home`, `/usr`, `/var`

**Path traversal:** `/../../../etc/passwd` returns 404 (not vulnerable to basic traversal). URL-encoded `%2e%2e` returns 400 Bad Request.

#### CORS Configuration (FACT)
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: OPTIONS, HEAD, GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type
```
Wildcard CORS on all endpoints -- any web page can make cross-origin requests.

#### Downloadable Files (no auth)

From `/downloads/defData/`:
- `Auto_Em.gcode` (34.0K) -- auto-leveling gcode
- `auto_laser_test.gcode` (897B) -- laser test
- `Auto_pressure_advance_multi.gcode` (112.5K)
- `Auto_pressure_advance_testpadvance.gcode` (7.0K)
- `error_code_map.json` (3.5K) -- error code to class mapping (firmware internals)
- `material_database.json` (181.9K) -- complete material/filament database with all print parameters
- `SourceHanSansCN-Normal.otf` (10.0M) -- Chinese font
- Various PNG icons

From `/downloads/original/`:
- `current_print_image.png` (34.1K) -- current print preview image

---

### PORT 8080 -- MJPG-Streamer/0.2 (INTERMITTENT)

**Authentication: NONE**
**State: Intermittent** -- was responsive during initial scans, became unreachable mid-assessment.

When operational, the following endpoints were confirmed:

| Path | Status | Description |
|------|--------|-------------|
| `/` (index.html) | 200 | MJPG-Streamer demo page with navigation |
| `/static.html` | 200 | Static snapshot page |
| `/stream.html` | 200 | Stream page |
| `/java.html` | 200 | Java applet page |
| `/?action=snapshot` | 200 | Single JPEG frame (`Content-type: image/jpeg`) |
| `/?action=stream` | 200 | Continuous MJPEG stream (`Content-Type: multipart/x-mixed-replace;boundary=boundarydonotcross`) |
| `/?action=command` | 400 | Command interface exists but requires parameters |
| `/javascript.html` | 000 | Connection reset |
| `/control.htm` | 000 | Connection reset |

Headers when responsive:
```
Server: MJPG-Streamer/0.2
Access-Control-Allow-Origin: *
Cache-Control: no-store, no-cache, must-revalidate
```

---

### PORT 9999 -- WebSocket JSON-RPC (httpd/1.25.11.6)

**Authentication: NONE**
**Protocol:** WebSocket (HTTP upgrade at `/`)

The WebSocket upgrade handshake was confirmed:
```
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Server: httpd/1.25.11.6
Upgrade: websocket
```

Immediately after connection, the server pushes a full printer state JSON blob and then streams real-time updates every ~1 second.

#### Initial State Dump Fields (FACT -- captured from live WebSocket)

Complete printer telemetry is exposed without authentication:
- **Print status:** `printProgress`, `printLeftTime`, `printJobTime`, `printFileName`, `printStartTime`, `layer`, `TotalLayer`, `dProgress`
- **Temperatures:** `nozzleTemp` ("221.03"), `bedTemp0` ("49.79"), `targetNozzleTemp` (220), `targetBedTemp0` (50), `boxTemp` (34), `maxNozzleTemp` (300), `maxBedTemp` (100), `maxBoxTemp` (60)
- **Motion:** `curPosition` ("X:157.19 Y:157.72 Z:1.08"), `realTimeSpeed` ("250.0"), `realTimeFlow` ("16.04"), `curFeedratePct` (100), `curFlowratePct` (100)
- **Fan/Light:** `lightSw` (1), `fan` (1), `aiSw` (1), `auxiliaryFanPct` (80), `modelFanPct` (100), `caseFanPct` (0)
- **Printer identity:** `hostname` ("K1Max-AC75"), `model` ("K1 Max"), `modelVersion` ("printer hw ver:;printer sw ver:;DWIN hw ver:CR4CU220812S11;DWIN sw ver:1.3.5.19;")
- **AI detection:** `aiDetection` (1), `aiFirstFloor` (1), `aiPausePrint` (0)
- **Device state:** `deviceState` (1), `state` (1), `connect` (1), `tfCard` (1)
- **Error info:** `err.errcode` (206), `err.key` (503)
- **Advanced:** `pressureAdvance` ("0.044"), `smoothTime` ("0.040"), `accelerationLimits` (10000), `velocityLimits` (800), `cornerVelocityLimits` (20)
- **Video:** `video` (1), `videoElapse` (1), `videoElapseFrame` (15), `videoElapseInterval` (1), `webrtcSupport` (0)
- **Material:** `materialDetect` (1), `materialDetector1` (0), `materialStatus` (0), `feedState` (0)
- **Other:** `powerLoss` (1), `upgradeStatus` (0), `enableSelfTest` (1), `withSelfTest` (100), `autohome` ("X:1 Y:1 Z:1"), `connectionCount`, `cfsConnect` (0)

#### Discovered WebSocket RPC Commands (from Vue.js app analysis)

**Read operations (get):**
- `reqPrinter` -- full printer state
- `reqGcodeFile` -- list gcode files
- `reqPrintObjects` -- print objects
- `retGcodeFileInfo` -- gcode file info

**Write operations (set):**
- `opGcodeFile` -- start/manage print job
- `lightSw` -- toggle LED light
- `fanSw` / `fan` -- fan control
- `aiSw` -- AI detection toggle
- `gSw` -- unknown switch
- `nozzleTempControl` -- set nozzle temperature
- `bedTempControl` -- set bed temperature
- `printSpeed` / `jichuSpeed` -- speed control
- `startPrint` -- start printing
- pause/stop/resume (from prior findings)

---

### SUMMARY OF FINDINGS

**3 TCP ports confirmed open** (80, 8080 intermittent, 9999). All other 65,532 TCP ports closed. UDP inconclusive (no root access for raw socket scan).

All three services share the same embedded HTTP server (`httpd/1.25.11.6`) with **zero authentication** on every endpoint. The wildcard CORS (`Access-Control-Allow-Origin: *`) on all services means any website on the internet could interact with these endpoints if the browser can reach the printer's IP (e.g., via DNS rebinding or same-network access).
