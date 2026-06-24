---
name: creative-frontend
description: Build warm, optimistic, and distinctive frontend experiences with Next.js, React 19, Tailwind CSS v4, Framer Motion, and React Three Fiber. Use when creating creative frontend prototypes, portfolio sites, experimental web projects, or 3D web experiences that prioritize visual character over generic aesthetics. Includes design philosophy (warmth + "a little weird", imperfection over perfection), tech stack patterns, visual identity guidelines, R3F/Three.js standards, and starter templates.
---

# Creative Frontend

Build distinctive frontend experiences that feel warm, optimistic, and a little weird. This skill provides patterns, templates, and guidelines for creating creative web projects with Next.js 16, React 19, Tailwind CSS v4, and React Three Fiber.

## When to Use This Skill

Use this skill when building:
- Creative frontend experiments and prototypes
- Portfolio websites with character and personality
- Projects requiring 3D (Three.js/R3F) integration
- Experiences that should feel warm and playful rather than sterile
- Next.js projects with Tailwind v4, Shadcn UI, or Framer Motion
- Theatre.js animation experiments

## Design Philosophy

**Core aesthetic:** Warmth + optimism with "a little weird"

**Key principles:**
- Value imperfection over sterile perfection
- Include "one color that feels wrong" for character
- Use painterly backgrounds with visible grain/texture
- Prefer asymmetry and bold layouts over symmetry
- Typography with funk (serif + sans combinations)
- Light mode with off-white backgrounds (not pure white)

**Anti-patterns to avoid:**
- Pure white backgrounds
- Generic sans-serif only
- Perfect symmetry everywhere
- Sterile, clinical aesthetics
- Cookie-cutter layouts
- Overly complex animations

## Quick Start Patterns

### Starting a New Next.js Project

Copy the boilerplate from `assets/nextjs-template/`:

```bash
cp -r assets/nextjs-template/* ./my-project/
cd my-project
npm install
npm run dev
```

This template includes:
- Next.js 16 with App Router
- Tailwind CSS v4 with inline @theme configuration
- Warm color palette with off-white background
- Serif (Playfair Display) + Sans (Inter) typography
- Custom animations (fade-in, fade-in-up)
- Proper selection styling

### Adding 3D (React Three Fiber)

1. Install R3F dependencies:
```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

2. Use the Scene template from `assets/r3f-template/Scene.tsx`

3. Add to your page:
```tsx
import Scene from '@/components/Scene'

export default function Page() {
  return <Scene />
}
```

## Tech Stack

**Core:** Next.js 16 (App Router), Tailwind CSS v4, TypeScript, React 19

**3D:** Three.js, @react-three/fiber, @react-three/drei

**UI:** Shadcn UI, Lucide icons, Framer Motion

**Animation:** Theatre.js, Framer Motion

For detailed patterns and best practices, see:
- `references/tech-stack.md` - Framework patterns, configuration examples
- `references/visual-identity.md` - Design guidelines, color philosophy, typography
- `references/3d-standards.md` - R3F best practices, performance optimization

## Visual Identity Essentials

### Color Approach

Include "one color that feels wrong" to add character:

```css
@theme inline {
  --color-background: #f9f8f6;  /* off-white, not pure white */
  --color-foreground: #1a1a1a;
  --color-muted: #888888;
  --color-accent: #ff6b35;      /* the "wrong" color - hot orange */
}
```

Examples of "wrong" colors:
- Lime green in purple/blue palette
- Hot pink in earth tones
- Orange in cool grays

### Typography Pattern

Always combine serif + sans:

```css
--font-serif: 'Playfair Display', Georgia, serif;
--font-sans: 'Inter', -apple-system, sans-serif;
```

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 1.2;
}
```

### Texture & Grain

Add subtle overlays for organic feel:

```tsx
<div className="absolute inset-0 opacity-[0.10] mix-blend-overlay
  [background-image:radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.55)_0,transparent_32%)]"
/>
```

For more patterns, see `references/visual-identity.md`.

## 3D Development (R3F)

### Core Principles

1. **Always use `'use client'`** for Canvas components in Next.js
2. **Prefer declarative R3F** over imperative Three.js
3. **Wrap assets in Suspense** boundaries
4. **Use drei helpers** for performance (Preload, BakeShadows, AdaptiveEvents)
5. **Avoid excessive `useFrame`** - prefer Theatre.js or declarative animations

### Basic R3F Pattern

```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Preload } from '@react-three/drei'
import { Suspense } from 'react'

export default function Scene() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />

        <Suspense fallback={<Loader />}>
          <Model />
        </Suspense>

        <OrbitControls makeDefault />
        <Preload all />
      </Canvas>
    </div>
  )
}
```

### Performance Warning

If a 3D approach might tank performance (e.g., too many dynamic lights, high polygon count), **suggest alternatives**:
- Baked lighting instead of dynamic lights
- Low-poly models or LOD
- CSS/2D alternatives for simpler effects

For complete 3D standards, see `references/3d-standards.md`.

## Autonomy Guidelines

**Proactively perform** without asking:
- Refactoring for better patterns
- Styling improvements (better Tailwind usage)
- Adding types for type safety
- Improving accessibility
- Small visual refinements

**Ask first** for:
- Major architectural changes
- Adding new dependencies
- Changing core design direction
- Performance tradeoffs with significant impact

## Common Commands

### Next.js Projects
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

### Vite Projects (for Theatre.js experiments)
```bash
npm run dev      # Start Vite dev server
npm run build    # tsc + vite build
npm run preview  # Preview production build
```

## Resources

### references/
- `tech-stack.md` - Detailed patterns for Next.js, Tailwind v4, R3F, Framer Motion
- `visual-identity.md` - Complete design guidelines, color philosophy, animation patterns
- `3d-standards.md` - R3F best practices, performance optimization, Theatre.js integration

### assets/
- `nextjs-template/` - Complete Next.js starter with Tailwind v4 configuration
- `r3f-template/` - React Three Fiber scene boilerplate

Use these resources as starting points. Customize colors, fonts, and patterns to match each project's unique character while maintaining the core philosophy of warmth and intentional imperfection.
