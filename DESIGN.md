# Design System

## Visual Theme

A modern creative laboratory with dimensional product specimens. The storefront combines the warmth and tactile depth of the original AnyKit Lab Vercel concept with cleaner ecommerce alignment. Orange is the active material, charcoal provides structure, neutral white keeps products legible, and deep green appears only as a grounding counterpoint.

## Color Palette

- Ink: `#191917`
- Orange: `#F0642F`
- Orange dark: `#C9471D`
- Neutral background: `#F7F6F2`
- White surface: `#FFFDF8`
- Muted text: `#625F58`
- Structural line: `#D8D2C7`
- Deep green: `#24463B`

## Typography

- Display: DM Sans, 500–700, compact but never tighter than `-0.04em`
- Body: Manrope, 400–700
- Accent serif: Georgia italic, reserved for one or two expressive words
- Hero display maximum: 96px
- Body copy: 16–18px with 1.6–1.75 line height

## Layout

- Desktop content width: 1180–1240px
- Fluid outer gutter: `clamp(20px, 5vw, 72px)`
- Section rhythm: 72–128px
- Hero: asymmetric two-column composition with a dimensional product stage
- Product shelf: editorial stagger on desktop, single-column cards on small screens
- Operational/admin screens retain predictable grids and tables

## Components

- Header: slim announcement bar, sticky navigation, visible account/cart actions
- Buttons: rectangular 10–12px radius, minimum 44px height, decisive ink/orange states
- Product art: layered covers with perspective, shallow shadows, and shared visual identity
- Cards: borders or bounded shadows, not both; maximum 16px radius
- Forms: visible labels, strong focus rings, inline help and prototype warnings
- Status: text plus color, never color alone

## Motion

- Signature moment: hero product stack assembles in depth on first load and responds subtly to pointer movement
- Scroll: selected sections use clip/reveal choreography; product cards stagger as a list
- Hover: product covers lift and rotate by a few degrees, buttons respond within 150ms
- Navigation: native-feeling route crossfade where supported
- Reduced motion: remove parallax, 3D rotation, and scroll transforms while retaining immediate content visibility

## Responsive Behavior

- At 920px: collapse hero into one column, preserve the product stage below the copy
- At 680px: compact header, horizontal category menu/drawer, single-column product shelf
- Avoid horizontal overflow at 375px
- Disable pointer-dependent depth on touch/coarse-pointer devices
