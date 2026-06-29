## MJPEG Camera Service Analysis -- Creality K1 Max (192.168.9.252:8080)

### 1. Service Status

**Port 8080 is CLOSED.** The MJPEG camera streaming service is not currently running, despite the printer being active (currently printing at 28% progress). The WebSocket state reports `"video": 1` and `"aiSw": 1`, indicating the camera feature is *enabled* in firmware settings, but the underlying streaming daemon (mjpg-streamer or equivalent) is not listening on port 8080.

No alternative camera ports were found open in scans of 8080-8090, 554 (RTSP), 8554-8555, 1935 (RTMP), 3000-3001, 4000-4001, 4443, 5000-5001, 9090.

### 2. Expected Camera Architecture (from JS source analysis)

The Creality Vue.js SPA (`app.b05d1c1a.js`, 167KB, built 2025-11-06) reveals:

- **Stream URL**: `http://${printer_ip}:8080/?action=stream` -- standard mjpg-streamer output_http plugin URL pattern
- **Component**: `CameraShow` (Vue component, `comp-CameraShow`) renders an `<img>` tag with the stream URL as `src` (MJPEG-over-HTTP, consumed as a motion JPEG stream in an img element)
- **Fallback**: If stream is unreachable, shows "Please check [IP] Does the printer camera device work properly" message
- **WebRTC**: `"webrtcSupport": 0` in printer state -- WebRTC streaming is not supported/enabled on this firmware version
- **No audio capture**: No audio-related endpoints, parameters, or references found in the JS source

### 3. Camera-Related Printer State (from WebSocket query)

| Field | Value | Meaning |
|---|---|---|
| `aiSw` | 1 | AI spaghetti detection enabled |
| `aiDetection` | 1 | AI detection active |
| `aiFirstFloor` | 1 | AI monitoring on first layer |
| `aiPausePrint` | 0 | Auto-pause on AI detection: disabled |
| `video` | 1 | Camera enabled |
| `video1` | 0 | Secondary camera: not present |
| `videoElapse` | 1 | Timelapse recording enabled |
| `videoElapseFrame` | 15 | Timelapse frame rate: 15 |
| `videoElapseInterval` | 1 | Timelapse interval: 1 (seconds) |
| `nozzleMoveSnapshot` | 0 | Nozzle-move snapshot: disabled |
| `webrtcSupport` | 0 | WebRTC: not supported |

### 4. Endpoint Enumeration (when service is running)

Based on the JS source and standard mjpg-streamer conventions, the expected endpoints are:

| Endpoint | Protocol | Purpose | Auth |
|---|---|---|---|
| `?action=stream` | HTTP (multipart/x-mixed-replace) | Live MJPEG stream | **None** |
| `?action=snapshot` | HTTP (image/jpeg) | Single JPEG frame | **None** |
| `?action=command` | HTTP | Control commands (if input plugin loaded) | **None** |
| `?action=status` | HTTP/JSON | Status info | **None** |
| `?action=version` | HTTP | mjpg-streamer version | **None** |
| `?action=list` | HTTP/JSON | List available controls | **None** |
| `?action=input` | HTTP | Input plugin controls | **None** |

The SPA constructs the URL with zero authentication parameters -- no tokens, cookies, or headers.

### 5. Server Identification

All HTTP responses from the printer use:
- **Server**: `httpd/1.25.11.6` (Creality's custom lightweight HTTP daemon, not mjpg-streamer's built-in server)
- **CORS**: `Access-Control-Allow-Origin: *` (wildcard, allows any origin)
- The camera service on :8080 would likely use mjpg-streamer's own HTTP server (typically reports `MJPG-Streamer/0.2` or similar), separate from the main httpd on :80

### 6. PTZ / Remote Camera Control

**No PTZ capability detected.** The JS source contains no pan/tilt/zoom controls, no `?action=command&dest=0&plugin=0&id=...` style UVC control URLs, and no resolution/exposure/gain adjustment UI. The K1 Max uses a fixed USB camera (typically a wide-angle board camera pointed at the print bed).

Camera settings controllable via WebSocket JSON-RPC:
- `aiSw` -- toggle AI spaghetti detection on/off (`set` method)
- `videoElapse` -- toggle timelapse recording
- `videoElapseFrame` -- timelapse frame rate
- `videoElapseInterval` -- timelapse capture interval
- `nozzleMoveSnapshot` -- snapshot on nozzle move

These are all **unauthenticated** via the WebSocket interface.

### 7. Known Vulnerabilities (mjpg-streamer)

mjpg-streamer is an open-source project with no formal CVE assignments in NIST NVD. However, known security issues include:

- **No authentication by design**: mjpg-streamer's output_http plugin has no built-in auth mechanism. Any network-reachable client can view the stream.
- **Directory traversal (historical)**: Older versions had path traversal in the `www` directory serving component. The `--www` flag serves static files and improper sanitization allowed reading files outside the www root.
- **Command injection via input controls**: If the `input_uvc` plugin is loaded with `--controls` enabled, `?action=command` can change camera parameters (brightness, contrast, etc.) without auth.
- **DoS via connection exhaustion**: No connection limits; flooding with stream requests can exhaust the camera service.

### 8. Security Findings Summary

**FINDING 1 -- CRITICAL: Unauthenticated Live Video Feed**
- When the camera service is running on :8080, the live MJPEG stream and snapshots are accessible to any device on the LAN without authentication
- Any LAN client can surveil the print area in real-time
- The stream URL is trivially discoverable (hardcoded in the SPA JS)

**FINDING 2 -- HIGH: Unauthenticated Camera Configuration via WebSocket**
- Camera features (AI detection, timelapse, snapshot) can be toggled by any LAN client via `ws://192.168.9.252:9999/` JSON-RPC
- An attacker could disable AI spaghetti detection (`aiSw: 0`) to prevent automated print failure detection, or enable timelapse to fill storage

**FINDING 3 -- MEDIUM: Wildcard CORS on All HTTP Endpoints**
- `Access-Control-Allow-Origin: *` on port 80 means any website visited by a user on the same LAN could make cross-origin requests to the printer API (CSRF-like attacks from malicious web pages)
- Combined with the camera, a malicious webpage could potentially grab snapshots if :8080 also uses wildcard CORS (standard mjpg-streamer behavior)

**FINDING 4 -- LOW: Camera Service Not Running Despite Being Enabled**
- `video: 1` in printer state but port 8080 closed suggests the camera daemon crashed or failed to start
- This could indicate a hardware issue (USB camera disconnected), a software bug, or that the service only starts during active prints on some firmware versions
- The error state `errcode: 206, key: 503` may be related

**FINDING 5 -- INFO: No Audio Capture**
- No microphone or audio streaming capability detected -- the privacy exposure is limited to video only

**FINDING 6 -- INFO: No WebRTC Support**
- `webrtcSupport: 0` confirms this firmware version does not support WebRTC streaming, limiting the attack surface to HTTP MJPEG only (no STUN/TURN/ICE exposure)
