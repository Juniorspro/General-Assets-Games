# Visual Identity Reference

## Core Aesthetic

**Primary:** Warmth + optimism with "a little weird"

**Philosophy:** Value imperfection over sterile perfection. Avoid generic AI aesthetics.

## Design Elements

### Backgrounds
- **Painterly backgrounds** with visible grain and natural textures
- **Off-white backgrounds** for light mode (never pure white)
- **Gradient overlays** for depth and atmosphere

Example gradient pattern:
```tsx
const gradientFor = (seed: number) => {
  const a = (seed * 29) % 360
  const b = (seed * 53) % 360
  const c = (seed * 97) % 360
  return {
    backgroundImage: [
      `radial-gradient(1200px 600px at 20% 10%, hsla(${a}, 90%, 60%, 0.32), transparent 55%)`,
      `radial-gradient(900px 600px at 90% 30%, hsla(${b}, 90%, 55%, 0.24), transparent 55%)`,
      `radial-gradient(700px 500px at 55% 105%, hsla(${c}, 90%, 58%, 0.22), transparent 60%)`,
      `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.00))`,
    ].join(", "),
  }
}
```

### Visual Texture

Add subtle overlays for organic feel:
```tsx
<div className="absolute inset-0 opacity-[0.10] mix-blend-overlay [background-image:radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.55)_0,transparent_32%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.35)_0,transparent_45%)]" />
```

### Typography

**Type with funk** - avoid generic system fonts

Good font pairings:
- Playfair Display (serif) + Inter (sans)
- Georgia (serif) + system sans
- Serif for headlines, sans for body

```css
--font-serif: 'Playfair Display', Georgia, serif;
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Headings use serif:
```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 1.2;
}
```

## Color Philosophy

### "One Color That Feels Wrong"

Include one unexpected color to add character and prevent blandness.

**Examples:**
- Lime green in a purple/blue palette
- Hot pink in earth tones
- Orange in cool grays

### Color Variables

```css
--color-background: #000000;  /* or off-white like #f9f8f6 */
--color-foreground: #ffffff;  /* or near-black like #1a1a1a */
--color-muted: #888888;
--color-accent: #ffffff;      /* your "wrong" color */
```

## Layout Patterns

### Boldness & Asymmetry

Avoid centered, symmetrical layouts. Embrace:
- Asymmetric grids
- Large scale contrast (big headlines, small body)
- Unexpected spacing

```tsx
<div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
  {/* Asymmetric 3-column layout */}
</div>
```

### Playfulness & Nostalgia

- Fun mascots and illustrations
- Retro-inspired UI elements
- Analog references (film grain, texture overlays)

## Animation Philosophy

### Framer Motion

Keep animations subtle and considered:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
```

Avoid:
- Excessive bouncing
- Over-the-top spring physics
- Animations longer than 0.8s

### Custom CSS Animations

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Component Styling Examples

### Cards with Grain

```tsx
<div className="rounded-xl border border-border/60 bg-muted/25 shadow-sm">
  <div className="absolute inset-0 opacity-[0.10] mix-blend-overlay
    [background-image:radial-gradient(circle_at_25%_30%,rgba(255,255,255,0.55)_0,transparent_32%)]"
  />
  {/* Content */}
</div>
```

### Backdrop Blur for Depth

```tsx
<Badge variant="secondary" className="backdrop-blur-sm">
  {content}
</Badge>
```

### Selection Styling

```css
::selection {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}
```

## Anti-Patterns to Avoid

❌ Pure white backgrounds (#ffffff)
❌ Generic sans-serif only
❌ Perfect symmetry everywhere
❌ Sterile, clinical aesthetics
❌ Overly complex drop shadows
❌ Cookie-cutter layouts
❌ Too much motion

✅ Off-white or colored backgrounds
✅ Serif + sans combinations
✅ Asymmetric, bold layouts
✅ Warmth and character
✅ Subtle shadows and textures
✅ Unique, considered design
✅ Subtle, meaningful animation
