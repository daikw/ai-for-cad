---

## HTTP Server Enumeration Report -- Creality K1 Max (192.168.9.252:80)

**Server:** `httpd/1.25.11.6` (custom Creality httpd, not nginx/Apache)
**Firmware:** K1 Max v1.0.0
**Frontend:** Vue.js 3 SPA with Pinia, Element Plus, webpack
**Open Ports Confirmed:** 80 (HTTP), 9999 (WebSocket). Port 8080 (camera) is currently CLOSED.

---

### 1. DISCOVERED ENDPOINTS

| Path | Method | Status | Content-Type | Size | Auth | Description |
|---|---|---|---|---|---|---|
| `/` | GET | 200 | text/html | 737 | NONE | Vue.js SPA shell (index.html) |
| `/index.html` | GET | 200 | text/html | 737 | NONE | Same as `/` |
| `/info` | GET | 200 | application/json | 70 | NONE | Device info: MAC `FCEE2807AC75`, model `K1 Max`, version `1.0.0` |
| `/upload` | POST | 200 | application/json | 36 | NONE | File upload (multipart, JSON, form-urlencoded all accepted). Returns `{"code":200,"message":"OK"}` |
| `/upload/<name>` | POST | 200 | application/json | 36 | NONE | Named file upload variant (used by SPA as `/upload/<filename>`) |
| `/downloads/` | GET | 200 | text/html | 854 | NONE | Directory listing of stored files |
| `/downloads/defData/` | GET | 200 | text/html | ~2KB | NONE | Default data: gcode files, error_code_map.json, material_database.json, fonts, icons |
| `/downloads/humbnail/` | GET | 200 | text/html | ~200 | NONE | Thumbnail directory (currently empty) |
| `/downloads/original/` | GET | 200 | text/html | ~300 | NONE | Contains `current_print_image.png` (34KB, last modified during print) |
| `/downloads/video/` | GET | 200 | text/html | 4096 | NONE | Video/timelapse directory (currently empty) |
| `/service` | GET | 200 | application/json | 98 | NONE | Server config: `{"base_url":"","error_page":"","home_page":"index.html","index_of":"/downloads/"}` |
| `/ping` | GET | 200 | text/plain | 4 | NONE | Health check, returns `pong` |
| `/get` | GET | 200 | application/json | ~187 | NONE | **httpbin-style echo**: reflects args, headers, origin, URL back to caller |
| `/data` | GET | 200 | application/octet-stream | 10 | NONE | Returns literal `0123456789` (test/debug endpoint) |
| `/favicon.ico` | GET | 200 | image/x-icon | 2401 | NONE | Creality icon |
| `/mylogo.png` | GET | 200 | image/png | 5695-6006 | NONE | Creality logo |
| `/static/js/app.b05d1c1a.js` | GET | 200 | application/javascript | 167KB | NONE | Main application JS |
| `/static/js/chunk-vendors.24d5716e.js` | GET | 200 | application/javascript | 3MB | NONE | Vendor bundle |
| `/static/js/chunk-2d0db81a.f53abaff.js` | GET | 200 | application/javascript | 431 | NONE | Font loader (loads Alibaba iconfont CDN) |
| `/static/js/app.b05d1c1a.js.map` | GET | 200 | - | 380KB | NONE | **SOURCE MAP** -- full Vue source code |
| `/static/js/chunk-vendors.24d5716e.js.map` | GET | 200 | - | 11.6MB | NONE | **SOURCE MAP** -- full vendor source code |
| `/static/js/chunk-2d0db81a.f53abaff.js.map` | GET | 200 | - | 1.2KB | NONE | Source map for font loader |
| `/downloads/defData/error_code_map.json` | GET | 200 | application/json | 3.5KB | NONE | Error code to fault code mapping |
| `/downloads/defData/material_database.json` | GET | 200 | application/json | 182KB | NONE | Complete material/filament database with Klipper profiles |
| `/downloads/defData/*.gcode` | GET | 200 | - | Various | NONE | Calibration gcode files (auto-leveling, pressure advance, laser test) |

**All 404 paths tested (no response):** /api/*, /server/*, /printer/*, /access/*, /machine/*, /debug/*, /admin, /login, /auth, /token, /status, /health, /metrics, /ws, /socket.io, /console, /terminal, /shell, /cgi-bin, /.env, /.git, /wp-admin, /robots.txt, /version, /update, /firmware, /ota, /reboot, /reset, /network, /wifi, /log, /logs, and ~80 more common paths.

---

### 2. HTTP METHOD TESTING

**OPTIONS on all endpoints** returns:
```
Access-Control-Allow-Methods: OPTIONS, HEAD, GET, POST, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Origin: *
```

| Endpoint | GET | POST | PUT | DELETE | PATCH | HEAD |
|---|---|---|---|---|---|---|
| `/info` | 200 | 501 | 501 | 501 | - | **404** (bug) |
| `/upload` | 404 | 200 | 501 | 501 | - | 404 |
| `/downloads/` | 200 | 501 | 501 | 501 | - | 200 |
| `/service` | 200 | 501 | 501 | 501 | - | **404** (bug) |
| `/ping` | 200 | 501 | 501 | 501 | - | **404** (bug) |
| `/get` | 200 | - | - | - | - | **404** (bug) |
| `/data` | 200 | 501 | - | - | - | **404** (bug) |

**Bug:** HEAD returns 404 for all CGI/dynamic endpoints (`/info`, `/service`, `/ping`, `/get`, `/data`) but 200 for static files. The httpd treats HEAD differently from GET for dynamic handlers.

---

### 3. AUTHENTICATION

**Zero authentication on any endpoint.** Tested:
- No `Authorization` header required
- No session cookies issued (no `Set-Cookie` on any response)
- `Authorization: Bearer test` and `Basic admin:admin` headers are silently ignored
- No CSRF tokens
- No API key mechanism

---

### 4. SECURITY HEADERS

**Missing (on ALL responses):**
- `Content-Security-Policy` -- absent
- `X-Frame-Options` -- absent (clickjacking possible)
- `X-Content-Type-Options` -- absent (MIME sniffing)
- `Strict-Transport-Security` -- absent (HTTP only, no TLS)
- `X-XSS-Protection` -- absent
- `Referrer-Policy` -- absent
- `Permissions-Policy` -- absent

**Present:**
- `Access-Control-Allow-Origin: *` -- on every response (wildcard CORS)
- `Server: httpd/1.25.11.6` -- version disclosure

---

### 5. CORS ANALYSIS (CRITICAL)

The CORS implementation is dangerously permissive:
- **Regular requests:** `Access-Control-Allow-Origin: *` on ALL responses
- **Preflight (OPTIONS):** Reflects the `Origin` header value verbatim into `Access-Control-Allow-Origin`
  - Tested: `Origin: https://attacker.evil.example.com` was reflected as `Access-Control-Allow-Origin: https://attacker.evil.example.com`
- **Reflected headers:** `Access-Control-Request-Headers` values are echoed back in `Access-Control-Allow-Headers`
- **Impact:** Any website can make cross-origin requests to the printer, enabling CSRF-like attacks from any malicious webpage visited while on the same LAN

---

### 6. `/upload` ENDPOINT ANALYSIS

**Accepts:**
- Any file extension: `.gcode`, `.txt`, `.sh`, `.py`, `.bin` all return `{"code":200,"message":"OK"}`
- Any content type: multipart/form-data, application/json, application/x-www-form-urlencoded
- Empty POST body also succeeds
- Null byte in filename (`test%00.gcode`): accepted (200)

**Path traversal:**
- `filename=../test_traversal.gcode`: returns 200 (accepted, but unclear if path is sanitized server-side)
- `filename=../../etc/passwd`: returns 500 (server error -- may indicate partial traversal before crash)
- `filename=../../etc/test_traversal`: returns 500 (server error)
- URL path traversal (`/upload/../../tmp/evil.sh`): returns 501 (the URL routing rejects it)

**Size limits:**
- 1MB file: accepted
- Long filename (500 chars): returns 500 (server error -- potential buffer overflow)

**File type validation:** NONE. All extensions accepted. No content validation.

**Uploaded files** do not appear in `/downloads/` subdirectories -- they land on the internal filesystem (likely `/usr/data/printer_data/gcodes/`), accessible only via the WebSocket `reqGcodeFile` command.

---

### 7. `/downloads/` DIRECTORY CONTENTS

| Subdirectory | Contents |
|---|---|
| `defData/` | 16 files: calibration gcode (Auto_Em, pressure_advance, laser_offset, etc.), `error_code_map.json`, `material_database.json`, UI icons (file_icon.png, folder_icon.png, etc.), `SourceHanSansCN-Normal.otf` (10MB font) |
| `humbnail/` | Empty (typo in "thumbnail") |
| `original/` | `current_print_image.png` (34KB, updated during printing) |
| `video/` | Empty (Content-Length: 4096 but no files listed) |

Directory traversal via `/downloads/../` returns the SPA root (normalized by the web server). URL-encoded traversal (`%2e%2e`) returns 400 Bad Request (blocked).

---

### 8. SOURCE MAP DISCLOSURE (HIGH)

Three `.map` files are served containing the **complete Vue.js application source code**:
- 87 source files exposed via `app.b05d1c1a.js.map` (380KB)
- Full vendor dependencies via `chunk-vendors.24d5716e.js.map` (11.6MB)

Disclosed source reveals:
- Complete WebSocket JSON-RPC protocol (all method names and params)
- Internal development IP addresses: `172.21.10.97`, `172.23.209.132`, `172.23.215.49`, `172.23.210.126`, `172.23.210.79`, `172.23.215.135`, `172.23.215.110`, `172.23.213.55`, `172.23.214.156`, `172.23.209.247`
- Developer name: "Hunter"
- Application architecture details (Pinia stores, router config, etc.)
- Klipper stepper configuration structure (TMC2209 drivers for X/Y/Z/extruder)
- Alibaba iconfont CDN key: `3796490_jdngdlh1p3`

---

### 9. `/get` ECHO ENDPOINT (MEDIUM)

httpbin-style reflection endpoint that echoes:
- Query parameters (including sensitive values)
- All request headers (including cookies, auth tokens)
- Client origin IP
- Full request URL

This can be abused for:
- Information gathering (what headers proxies add)
- SSRF response validation
- Debugging aid for attackers

---

### 10. WebSocket JSON-RPC COMMANDS (from source map)

Complete command list extracted from the SPA source. All commands go via `ws://<ip>:9999` with no authentication.

**GET (read) commands:**
- `{method:"get",params:{reqPrinter:1}}` -- printer status
- `{method:"get",params:{reqGcodeFile:1}}` -- file list
- `{method:"get",params:{reqHistory:1}}` -- print history
- `{method:"get",params:{ReqPrinterPara:1}}` -- printer parameters (position, temp)
- `{method:"get",params:{reqPrintObjects:1}}` -- current print objects
- `{method:"get",params:{reqProbedMatrix:1}}` -- bed mesh probing data

**SET (write/control) commands:**
- **Print control:** `pause:0/1`, `stop:0/1`, `opGcodeFile:"printprt:..."`, `opGcodeFile:"deleteprt:..."`, `opGcodeFile:"renameprt:..."`
- **Motion:** `autohome:"X"/"Y"/"Z"/"X Y"/"X Y Z"`, `setPosition:"X<dist> F3000"`, `setZOffset:"+/-<val>"`
- **Temperature:** `nozzleTempControl:<val>`, `bedTempControl:{num:<idx>,val:<val>}`
- **Fan/Light:** `fan:<val>`, `fanCase:<val>`, `fanAuxiliary:<val>`, `lightSw:<val>`
- **Raw G-code injection:** `gcodeCmd:"M106 P0 S<val>"` (arbitrary G-code execution)
- **System:** `restartFirmware:1`, `restartKlipper:1`, `cleanErr:1`, `savePara:1`
- **Speed:** `setFeedratePct:<val>`
- **Bed mesh:** `rmProbedMatrix:1`
- **Object exclusion:** `excludeObjects:[<name>]`
- **Print recovery:** `repoPlrStatus:0/1`
- **History:** `deleteHistory:[<ids>]`

---

### 11. RISK ASSESSMENT SUMMARY

| Finding | Severity | Description |
|---|---|---|
| Zero authentication on all HTTP endpoints | CRITICAL | Any LAN device can upload files, read device info, access all stored files |
| Zero authentication on WebSocket (port 9999) | CRITICAL | Any LAN device can control printer: start/stop prints, move axes, change temperatures, send raw G-code, restart firmware |
| Raw G-code injection via `gcodeCmd` | CRITICAL | Arbitrary G-code execution without auth. Can heat nozzle to dangerous temps, crash axes into bed, damage hardware |
| Wildcard CORS with origin reflection | HIGH | Any malicious website visited while on the LAN can silently interact with the printer (upload files, read info) via cross-origin requests |
| Unrestricted file upload (no type/size validation) | HIGH | Arbitrary file types (.sh, .py, .bin) accepted. No content validation. Path traversal in filename causes 500 (may or may not write outside intended directory) |
| Source map disclosure | HIGH | Complete application source code served publicly, exposing internal IPs, protocol details, and developer info |
| No security headers | MEDIUM | Missing CSP, X-Frame-Options, HSTS, X-Content-Type-Options. Enables clickjacking, MIME sniffing, and framing attacks |
| `/get` httpbin echo endpoint | MEDIUM | Reflects all headers and query params. Useful for reconnaissance |
| Server version disclosure | LOW | `Server: httpd/1.25.11.6` in all responses |
| HEAD/GET status code mismatch | LOW | HEAD returns 404 on dynamic endpoints that return 200 on GET. Implementation bug in httpd |
| `/data` debug endpoint | LOW | Returns `0123456789` -- appears to be a test/debug artifact left in production |
| `/service` config disclosure | LOW | Reveals server configuration (home page, directory listing path) |
| Internal IP addresses in source map | LOW | 10 internal development IPs disclosed via source map |
