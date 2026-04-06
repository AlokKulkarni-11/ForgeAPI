# ForgeAPI Style Preferences

Last updated: April 2, 2026

This file captures the style direction preferred for this project so future design and frontend work stays consistent.

## 1. Overall Product Feel

The project should feel:

- futuristic
- premium
- slightly cinematic
- technical but polished
- bold rather than generic

The visual tone is not plain SaaS. It should feel like an AI control room for backend generation.

## 2. Aesthetic Direction

Preferred direction:

- dark UI base
- neon blue / violet tunnel or grid backgrounds
- soft magenta accent glow used sparingly
- glassmorphism for navigation and important surfaces
- visible depth through blur, glow, and layered gradients

Avoid:

- flat white layouts
- generic dashboard templates
- random colorful gradients with no system
- overly playful startup visuals
- washed-out gray interfaces

## 3. Background Style

Backgrounds should feel intentional and immersive.

Preferred:

- animated tunnel/grid backgrounds on public-facing pages
- deep navy/near-black base
- layered radial and linear overlays for readability
- subtle motion that supports the layout instead of distracting from it

Avoid:

- plain solid backgrounds when the page is a hero/auth/public page
- noisy particle spam
- overly bright neon that kills contrast

## 4. Navbar Style

Preferred navbar characteristics:

- glassmorphism
- soft blur
- rounded container instead of a hard rectangular top bar
- premium shadow, but not heavy muddy shadow
- larger, balanced ForgeAPI wordmark

Brand text rules:

- the ForgeAPI logo text should feel balanced and clean
- avoid awkward baseline issues, especially around the lowercase `g`
- do not oversize the wordmark to the point where letterforms feel cramped

## 5. Typography Preferences

Typography should feel strong and deliberate.

Preferred:

- bold hero headlines
- clean, readable supporting copy
- balanced line height
- tight-but-not-cramped tracking in prominent branding

Avoid:

- awkward oversized text with clipped descenders
- weak hero copy that feels generic
- overly decorative fonts unless clearly justified

## 6. Component Style

Preferred component behavior:

- cards with purpose
- reveal interactions where they add clarity
- hover, focus, and tap states that feel polished
- rounded corners with a premium feel
- borders that glow or tint subtly on interaction

Preferred surfaces:

- dark translucent cards
- glass panels for auth and nav
- strong but tasteful borders
- neon edge emphasis used carefully

Avoid:

- static dead cards when a section should feel interactive
- harsh boxy panels with no depth
- random component styles that do not match the neon/glass system

## 7. Interaction Patterns

Preferred:

- reveal cards for feature storytelling
- subtle hover lift / glow / border enhancement
- tap-friendly behavior on mobile
- visible active states
- motion that clarifies structure

Avoid:

- motion for the sake of motion
- hidden interactions that only work on hover
- fragile visual alignments like connector lines bleeding through icons

## 8. Pipeline / System Visualization Preferences

Pipeline visuals should look engineered, not sloppy.

Rules:

- connector lines should begin and end exactly at node centers
- lines should not visually bleed through icons or circles
- inactive states should feel quieter, not transparent enough to break composition
- system strips should feel precise and technical

## 9. Auth Page Preferences

Login and register pages should:

- share the same visual language as the landing page
- use the animated neon background system
- include a clear back button
- use glass-like cards instead of flat default forms
- feel premium and on-brand, not like a fallback template

## 10. Landing Page Preferences

Landing page should include:

- strong hero statement
- premium animated background
- polished pipeline visualization
- interactive feature storytelling
- visually consistent sections from top to bottom

Preferred hero copy style:

- short
- punchy
- product-defining
- clean enough to sit well in large type

## 11. Color Preferences

Preferred palette:

- deep navy / near-black
- electric blue
- violet-blue
- controlled magenta highlights
- cool white for important text

Avoid:

- muddy gray overload
- warm orange/yellow dominant themes
- random rainbow accents

## 12. Design Quality Bar

Before considering a UI change done, check:

- does it feel premium?
- does it look intentional?
- does it match the neon/glass ForgeAPI identity?
- is the spacing visually balanced?
- is the typography clean?
- is the interaction understandable on desktop and mobile?

If the answer is no, refine it instead of shipping the first draft.

## 13. Implementation Preferences for Future Work

When extending the frontend:

- preserve the existing public-page visual language
- prefer reusable background and surface components
- keep interactions accessible with hover plus click/focus support
- maintain TypeScript-first frontend files
- avoid introducing plain generic sections that break the current brand identity

## 14. Short Summary

The style you prefer for ForgeAPI is:

**dark, neon, glassy, futuristic, premium, interactive, and precise.**

It should feel like an AI-powered backend forge, not a generic admin panel.
