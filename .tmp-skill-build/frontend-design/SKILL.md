---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when Codex needs to design or build web pages, landing pages, dashboards, components, HTML/CSS layouts, React or Vue interfaces, posters, or other frontend artifacts, or when an existing UI needs visual refinement, restyling, or polish. Focus on creative direction, strong typography, cohesive motion, and code that avoids generic AI aesthetics.
---

# Frontend Design

## Overview

Create frontend work that feels intentionally designed, not template-generated. Choose a strong aesthetic direction early, then implement working code that is polished, responsive, and aligned with the request or the existing product language.

## Workflow

1. Identify the design brief.
   Determine the interface purpose, audience, content hierarchy, technical stack, and delivery constraints.
   Inspect current patterns first when editing an existing product, and preserve the established design system unless the user explicitly asks for a redesign.

2. Commit to a distinct aesthetic.
   State the direction in one sentence before large edits.
   Push toward a memorable point of view such as brutally minimal, editorial, industrial, playful, luxe, retro-futuristic, organic, brutalist, or art deco.
   Decide what the user should remember most after seeing the interface.

3. Build the structure.
   Implement real, production-grade code in the requested stack.
   Prioritize clear hierarchy, strong spacing, and layouts with intent.
   Use asymmetry, overlap, controlled density, or generous negative space when they support the concept.

4. Polish the visual system.
   Choose expressive display typography with a readable body face.
   Avoid default-feeling font stacks such as Arial, Inter, Roboto, or generic system fonts unless the existing product already uses them.
   Define a small set of CSS variables or theme tokens and commit to a palette with clear contrast and a dominant mood.
   Use a few meaningful animations, especially page-load reveals, hover states, and timing details.
   Build atmosphere with gradients, textures, noise, borders, shadows, patterns, transparency, or custom accents that reinforce the concept.

5. Verify the result.
   Ensure the output is functional, responsive, and accessible enough for the requested use.
   Check desktop and mobile behavior.
   Remove anything that feels generic, timid, or copied from common AI UI patterns.

## Non-Negotiables

- Avoid generic AI aesthetics such as purple-on-white gradients, safe SaaS hero layouts, interchangeable cards, and repeated font choices across generations.
- Match implementation complexity to the vision. Maximalist concepts can justify elaborate code, while minimalist concepts must feel precise and deliberate rather than plain.
- Make unexpected choices only when they still support usability and the product goal.
- When a design system already exists, innovate inside its language instead of fighting it.

## Output Expectations

- Produce code, not just design commentary, unless the user asked otherwise.
- Briefly explain the chosen aesthetic direction when helpful.
- Favor reusable styling primitives and keep the result maintainable.
- Make bold but coherent assumptions when the request is underspecified, then state those assumptions after implementing.
