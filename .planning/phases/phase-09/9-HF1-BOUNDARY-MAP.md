# Plan 9-HF1 Boundary Map

## Objective
Reduce `src/app.js` to a thin bootstrap shell and relocate execution ownership into dedicated modules while keeping runtime behavior unchanged.

## Mandatory Domain Ownership

| Domain | Owner Module | Contract |
| --- | --- | --- |
| Editor flows | `src/app/editor/editor-flows.js` | Editor lifecycle hooks and sync triggers are initialized via domain factory wrappers. |
| Runtime orchestration | `src/app/runtime/runtime-orchestration.js` | Legacy runtime orchestration is hosted outside `src/app.js` and loaded as dedicated runtime module. |
| Sync handlers | `src/app/sync/sync-handlers.js` | Live sync binding and emit hook seams are exposed through explicit handler factory. |
| Settings controllers | `src/app/settings/settings-controllers.js` | Settings initialization and apply/update hook seams are consolidated in a settings controller module. |
| Media handlers | `src/app/media/media-handlers.js` | Media init/teardown hooks are isolated behind media-handler module boundaries. |

## Thin Bootstrap Ownership

- `src/app.js` is restricted to bootstrap checks and orchestration diagnostics.
- Domain scripts are loaded in `index.html` before runtime orchestration and bootstrap shell.
- Runtime behavior remains owned by `src/app/runtime/runtime-orchestration.js`.

## Rollback Note

If runtime parity fails, revert script wiring in `index.html` and move runtime ownership back to `src/app.js` in one step.
