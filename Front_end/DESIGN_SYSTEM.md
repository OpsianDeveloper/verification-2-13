# Opsian ID Verification - Design System

A comprehensive design guide for recreating the frontend UI.

---

## Typography

### Font Family
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700&display=swap" rel="stylesheet">
```

```css
font-family: 'Poppins', sans-serif;
```

### Font Weights Used
- `100` - Thin (decorative)
- `300` - Light
- `400` - Regular (body text)
- `500` - Medium (labels)
- `600` - Semibold (headings)
- `700` - Bold (emphasis)

---

## Color Palette (HSL Format)

### Core Colors
```css
:root {
  /* Backgrounds */
  --background: 250 100% 97%;
  --foreground: 250 10% 10%;
  
  /* Primary - Steel Blue */
  --primary: 210 50% 60%;
  --primary-foreground: 0 0% 100%;
  
  /* Secondary - Vibrant Blue */
  --secondary: 217 91% 60%;
  --secondary-foreground: 0 0% 100%;
  
  /* Muted */
  --muted: 250 10% 95%;
  --muted-foreground: 250 5% 40%;
  
  /* Accent (same as primary) */
  --accent: 210 50% 60%;
  --accent-foreground: 0 0% 100%;
  
  /* Semantic Colors */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  
  /* Borders & Inputs */
  --border: 250 20% 90%;
  --input: 250 20% 90%;
  --ring: 210 50% 60%;
  
  /* Cards & Popovers */
  --card: 0 0% 100%;
  --card-foreground: 250 10% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 250 95% 10%;
  
  /* Border Radius */
  --radius: 0.5rem;
}
```

### Usage in Tailwind
```js
// tailwind.config.ts
colors: {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  // ... etc
}
```

---

## Background

### Full Page Background
```css
body {
  background: linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), 
              url('/background.jpg') no-repeat center center fixed;
  background-size: cover;
  min-height: 100vh;
}
```

> **Note:** The dark overlay (`rgba(0, 0, 0, 0.1)`) ensures text readability over the background image.

---

## Glassmorphism

### Base Glass Effect
```css
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Interactive Glass (Hover)
```css
.glass-hover {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.glass-hover:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
}
```

### Glass Button
```css
.glass-button {
  background: rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  color: white !important;
  transition: all 0.2s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 
              0 4px 6px -2px rgba(0, 0, 0, 0.2);
}
```

### Glass Dropdown (High Contrast)
```css
.glass-dropdown {
  background: rgba(30, 41, 59, 0.95) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
```

---

## Gradients

### Primary Gradient
```css
.gradient-bg {
  background: linear-gradient(135deg, hsl(210, 50%, 60%) 0%, hsl(217, 91%, 60%) 100%);
}

.gradient-button {
  background: linear-gradient(135deg, hsl(210, 50%, 60%) 0%, hsl(217, 91%, 60%) 100%);
}
```

### Text Glow
```css
.text-glow {
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}
```

---

## Component Patterns

### Glass Card
```html
<div class="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
  <!-- Content -->
</div>
```

### Stats Card with Animation
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ scale: 1.03, y: -4 }}
  className="glass rounded-2xl p-6 border border-white/10"
>
  <h3 className="text-white/60 text-sm font-medium uppercase tracking-wide">
    {title}
  </h3>
  <div className="text-4xl font-bold text-white">
    {value}
  </div>
</motion.div>
```

### Text on Glass
```css
/* High visibility */
color: white;

/* Medium visibility */
color: rgba(255, 255, 255, 0.8);  /* or text-white/80 */

/* Low visibility (labels) */
color: rgba(255, 255, 255, 0.6);  /* or text-white/60 */
```

---

## Button Variants

### Default Button
```css
background: hsl(var(--primary));
color: hsl(var(--primary-foreground));
transition: all 0.3s ease;

&:hover {
  background: hsl(var(--primary) / 0.8);
  box-shadow: 0 10px 25px -5px hsl(var(--primary) / 0.3);
  transform: scale(1.05);
}
```

### Outline Button
```css
border: 1px solid hsl(var(--input));
background: hsl(var(--background));

&:hover {
  background: hsl(var(--accent) / 0.1);
  border-color: hsl(var(--primary) / 0.5);
}
```

### Glass Button Variant
```css
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
color: white;

&:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 25px -5px rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}
```

---

## Shadows

### Standard Shadows
```css
/* Subtle */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

/* Medium */
box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);

/* Glass dropdown */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);

/* Primary glow */
box-shadow: 0 10px 25px -5px hsl(210 50% 60% / 0.3);
```

---

## Border Radius

```css
--radius: 0.5rem;  /* 8px */

/* Tailwind classes */
rounded-sm: calc(0.5rem - 4px)  /* 4px */
rounded-md: calc(0.5rem - 2px)  /* 6px */
rounded-lg: 0.5rem              /* 8px */
rounded-xl: 0.75rem             /* 12px */
rounded-2xl: 1rem               /* 16px */
rounded-full: 9999px
```

---

## Animation Library

Using **Framer Motion** for animations.

### Common Patterns
```jsx
// Fade in from bottom
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// Hover lift effect
whileHover={{ scale: 1.03, y: -4 }}

// Staggered list items
transition={{ delay: index * 0.1 }}

// Standard timing
transition={{ duration: 0.2 }}
```

---

## Badge Variants

### Status Badges
```jsx
// Verified (Green)
className="bg-green-500/20 text-green-300 border-green-500/50"

// Failed (Red)
className="bg-red-500/20 text-red-300 border-red-500/50"

// Pending (Yellow)
className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50"

// Info (Blue)
className="bg-blue-500/20 text-blue-300 border-blue-500/50"
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Animation | Framer Motion |
| UI Components | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| i18n | react-i18next |

---

## Key Dependencies

```json
{
  "framer-motion": "^12.x",
  "lucide-react": "^0.462.x",
  "class-variance-authority": "^0.7.x",
  "tailwind-merge": "^2.x",
  "tailwindcss-animate": "^1.x"
}
```

---

## File Structure

```
src/
├── index.css          # CSS variables, glass utilities
├── components/
│   └── ui/            # shadcn components (button, card, badge, etc.)
├── lib/
│   └── utils.ts       # cn() helper for class merging
└── ...

tailwind.config.ts     # Extended theme with CSS variable references
```
