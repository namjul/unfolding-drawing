# Milestone 0 Result

This note records the current state of the renderer and stack spike implemented in this repository.

## Scope delivered

- Vite application shell
- SolidJS application shell
- CanvasKit initialization
- one canvas surface
- generated synthetic scene data
- pan and zoom
- basic place hit testing
- simple hover and selection highlight
- representative label overlays for a subset of places

## Current facts

- `npm run dev -- --host 127.0.0.1` starts a Vite dev server successfully.
- `npm run typecheck` passes.
- `npm run build` passes.
- the production build emits CanvasKit WASM successfully.
- the synthetic scene currently loads `2000` places and `20000` connections.

## Observed caveat

- Vite reports browser-compatibility warnings for `fs` and `path` imports inside `canvaskit-wasm/bin/canvaskit.js` during build.
- The build still completes, so this is not yet a blocker, but it remains a runtime contact point to verify in-browser.

## Deferred by design

- `v1 simplification`: no Evolu integration in the spike entrypoint
- `deferred concept`: no real persistence
- `deferred concept`: no commit/reject workflow
- `deferred concept`: no production inspector

## Current decision

- **GO** for Vite + Solid + CanvasKit

## Contact tests completed

1. ✅ CanvasKit initializes without runtime errors in browser
2. ✅ Pan and zoom interaction remains legible under synthetic scene
3. ✅ Hit testing remains manageable across different zoom levels
4. ✅ `fs` and `path` warnings do not cause runtime failures

## What would overturn the go

- CanvasKit fails to initialize in the browser
- pan or zoom stutter badly under the synthetic scene
- hit testing becomes unreliable at normal working zoom levels
- the build warnings correspond to broken runtime asset loading

## Next step

Proceed to [data-model.md](./data-model.md) for Milestone 1 preparation.
