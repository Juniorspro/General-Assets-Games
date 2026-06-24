# 3D Development Standards

## R3F Philosophy

Prefer **declarative R3F components** over **imperative Three.js** code.

### Good (Declarative)

```tsx
<mesh position={[0, 0, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="orange" />
</mesh>
```

### Avoid (Imperative)

```tsx
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 'orange' })
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)
```

## Client Components

Always use `'use client'` directive for Canvas components in Next.js:

```tsx
'use client'

import { Canvas } from '@react-three/fiber'

export default function Scene() {
  return <Canvas>{/* ... */}</Canvas>
}
```

## Asset Loading

### useGLTF Pattern

```tsx
import { useGLTF } from '@react-three/drei'

function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src)
  return <primitive object={scene} />
}

// Preload outside component
useGLTF.preload('/models/model.glb')
```

### Suspense Boundaries

Always wrap async 3D assets in Suspense:

```tsx
import { Suspense } from 'react'

<Suspense fallback={<Loader />}>
  <Model src="/models/model.glb" />
</Suspense>
```

### Custom Loader

```tsx
function Loader() {
  return (
    <Html center>
      <div className="text-white">Loading...</div>
    </Html>
  )
}
```

## Performance Optimization

### Use drei Helpers

**Preload** - Preload all assets:
```tsx
import { Preload } from '@react-three/drei'

<Canvas>
  {/* scene content */}
  <Preload all />
</Canvas>
```

**BakeShadows** - For static scenes:
```tsx
import { BakeShadows } from '@react-three/drei'

<Canvas>
  {/* scene content */}
  <BakeShadows />
</Canvas>
```

**AdaptiveEvents** - Reduce event overhead:
```tsx
import { AdaptiveEvents } from '@react-three/drei'

<Canvas>
  <AdaptiveEvents />
  {/* scene content */}
</Canvas>
```

### useFrame Best Practices

Use sparingly - prefer declarative animations:

```tsx
// ❌ Avoid for simple animations
useFrame(() => {
  meshRef.current.rotation.y += 0.01
})

// ✅ Use Theatre.js or drei helpers instead
import { editable as e } from '@theatre/r3f'

<e.mesh theatreKey="Box">
  <boxGeometry />
</e.mesh>
```

### Lighting Performance

Avoid too many dynamic lights:

```tsx
// ❌ Expensive
<pointLight position={[0, 10, 0]} />
<pointLight position={[10, 0, 0]} />
<pointLight position={[-10, 0, 0]} />
<pointLight position={[0, 0, 10]} />

// ✅ Better
<ambientLight intensity={0.5} />
<directionalLight position={[10, 10, 5]} intensity={1} />
```

For complex lighting, suggest baked lighting or light maps.

## Canvas Container Patterns

### Responsive Sizing

```tsx
<div style={{ width: '100vw', height: '100vh' }}>
  <Canvas>
    {/* scene */}
  </Canvas>
</div>
```

Or with Tailwind:
```tsx
<div className="w-full h-screen">
  <Canvas>
    {/* scene */}
  </Canvas>
</div>
```

### Z-Index Layering

Canvas often needs z-index management relative to DOM:

```tsx
{/* Background canvas */}
<div className="fixed inset-0 -z-10">
  <Canvas>
    <StarField />
  </Canvas>
</div>

{/* Foreground DOM */}
<main className="relative z-10">
  <h1>Content in front</h1>
</main>
```

## Common Patterns

### Camera Setup

```tsx
<Canvas camera={{ position: [0, 10, 50], fov: 45 }}>
  {/* scene */}
</Canvas>
```

### Background Color

```tsx
<Canvas>
  <color attach="background" args={['#101010']} />
  {/* scene */}
</Canvas>
```

### OrbitControls

```tsx
import { OrbitControls } from '@react-three/drei'

<Canvas>
  <OrbitControls makeDefault />
  {/* scene */}
</Canvas>
```

## Theatre.js Integration

### Setup

```tsx
import { editable as e, SheetProvider } from '@theatre/r3f'
import { getProject } from '@theatre/core'

const project = getProject('My Project')
const sheet = project.sheet('Scene')

<SheetProvider sheet={sheet}>
  <Canvas>
    <e.mesh theatreKey="Box" position={[0, 0, 0]}>
      <boxGeometry />
      <meshStandardMaterial />
    </e.mesh>
  </Canvas>
</SheetProvider>
```

### Studio Mode

```tsx
import studio from '@theatre/studio'

if (process.env.NODE_ENV === 'development') {
  studio.initialize()
}
```

## Splat (Gaussian Splatting) Pattern

For .ply files:

```tsx
import { Splat } from '@react-three/drei'

<Suspense fallback={<Loader />}>
  <Splat
    src="/models/scene.ply"
    scale={0.01}
  />
</Suspense>
```

## Performance Troubleshooting

When 3D performance suffers:

1. **Check polygon count** - Use low-poly models or LOD
2. **Reduce dynamic lights** - Max 2-3 lights, prefer ambient + directional
3. **Bake shadows** - Use `<BakeShadows />` for static scenes
4. **Use instancing** - For repeated objects
5. **Consider alternatives** - Sometimes CSS/2D is better than 3D

### Example: Too Many Lights Warning

```tsx
// ❌ This will tank performance
{lights.map(light => (
  <pointLight key={light.id} position={light.pos} />
))}

// ✅ Suggest baked lighting instead
<ambientLight intensity={0.5} />
<directionalLight position={[10, 10, 5]} castShadow />
<BakeShadows />
```
