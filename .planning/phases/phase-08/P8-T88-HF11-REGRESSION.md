# P8-T88 HF11 Regression Matrix

Status: PASS
Date: 2026-04-01

## Coverage

1. Room animation definitions are CRUD-driven in Settings (`create`, `select/edit`, `delete`) and immediately reflected in Dashboard trigger dropdown.
2. Room definition asset mapping enforces typed references:
   - `coded`: coded renderer keys only
   - `gif`: `/resources/*.gif`
   - `mp4`: `/resources/*.mp4`
3. Room runtime stays definition-driven:
   - start/edit/stop works for default and newly created definitions
   - GIF and MP4 room assets render clipped per room target
4. First-start defaults bootstrap:
   - empty local storage forces defaults autoload and apply during startup
   - no silent skip once startup guard marked fresh-device fallback required
5. Reset flow parity:
   - `Load and apply defaults` remains available as explicit user-triggered reset for later sessions

## Notes

- Existing outside/inside apply flows remain unchanged.
- No new server endpoint dependency introduced for HF11.
