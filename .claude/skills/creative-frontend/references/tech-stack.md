# Tech Stack Reference

## Core Stack

**Framework:** Next.js 16 (App Router)
**Styling:** Tailwind CSS v4 (inline @theme syntax)
**Language:** TypeScript
**React Version:** 19

## 3D Graphics

**Core Libraries:**
- Three.js
- @react-three/fiber (R3F)
- @react-three/drei

**Animation:**
- Theatre.js (@theatre/core, @theatre/studio, @theatre/r3f)
- Framer Motion (for 2D)

## UI Components

- Shadcn UI
- Lucide icons
- Radix UI primitives (via Shadcn)

## Tailwind CSS v4 Patterns

### Inline @theme Configuration

```css
@import "tailwindcss";

@theme inline {
  --color-background: #000000;
  --color-foreground: #ffffff;
  --color-muted: #888888;
  --color-accent: #ffffff;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Custom animations */
  --animate-fade-in: fade-in 0.6s ease-out forwards;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

### Custom Properties Access

Use custom properties directly in components:
```tsx
<div style={{ fontFamily: 'var(--font-serif)' }} />
```

## R3F Best Practices

### Canvas Setup

```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Preload } from '@react-three/drei'
import { Suspense } from 'react'

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 10, 50], fov: 45 }}>
      <color attach="background" args={['#101010']} />
      <ambientLight intensity={0.5} />

      <Suspense fallback={<Loader />}>
        <Model />
      </Suspense>

      <OrbitControls makeDefault />
      <Preload all />
    </Canvas>
  )
}
```

### Model Loading

```tsx
import { useGLTF } from '@react-three/drei'

function Model() {
  const { scene } = useGLTF('/models/model.glb')
  return <primitive object={scene} scale={0.01} />
}

// Preload outside component
useGLTF.preload('/models/model.glb')
```

### Performance Optimization

- Use `Preload` from drei
- Use `BakeShadows` for static shadows
- Use `AdaptiveEvents` for better performance
- Avoid excessive `useFrame` calls
- Prefer declarative R3F over imperative Three.js

## Theatre.js Integration

```tsx
import { editable as e } from '@theatre/r3f'
import { SheetProvider } from '@theatre/r3f'

<SheetProvider sheet={sheet}>
  <e.mesh theatreKey="Box">
    <boxGeometry />
    <meshStandardMaterial />
  </e.mesh>
</SheetProvider>
```

## Next.js App Router Patterns

### Layout Pattern

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Title',
  description: 'Description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <Navigation />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
```

### Dynamic Routes

```tsx
// app/work/[slug]/page.tsx
export default function WorkPage({
  params,
}: {
  params: { slug: string }
}) {
  return <div>{params.slug}</div>
}
```

## Framer Motion Patterns

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  Content
</motion.div>
```

## Common Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

For Vite projects:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```
