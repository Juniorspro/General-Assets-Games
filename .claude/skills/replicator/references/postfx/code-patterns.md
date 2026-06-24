# PostFX Code Patterns

Use these as starting structures, not as mandatory frameworks.

## WebGL scene plus composer

Use when:

- the base scene is already correct
- post is a short chain on top of a standard WebGL render path

Typical shape:

```js
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(bloomPass);
composer.addPass(outputPass);
```

Good for:

- `scene-polish`
- short bloom or grading chains
- low-risk WebGL landing paths

## WebGPU scene render plus explicit fullscreen pass

Use when:

- you want a small number of explicit full-screen stages
- the pass graph is easier to reason about than a larger framework abstraction

Typical shape:

```js
renderSceneToTarget();
runFullscreenCompositePass(sceneTarget.texture);
presentFinalTexture();
```

Good for:

- WebGPU-first prototypes
- selective screen-space polish
- cases where pass ownership must stay obvious

## Ping-pong history

Use when:

- the effect depends on temporal persistence
- one pass reads the previous frame and writes the new history state

Typical shape:

```js
updateHistory(previousHistory.texture, nextHistory);
swapHistoryTargets();
compositeHistoryToScreen();
```

Good for:

- `feedback-post`
- trails and smear
- recursive distortion or accumulation

## Rule

Choose the smallest code pattern that still makes pass ownership and data flow obvious.
