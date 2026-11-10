# Implementation Plan: Cat Clicker App

## Overview

Implement the cat-clicker app as a single self-contained `index.html` file with no build step. The file is structured in three sections — `<head>` (Tailwind CDN + CSS keyframes), `<body>` (semantic HTML markup), and `<script>` (an IIFE containing all logic as five modules: State, Storage, Reaction, Animation, UI). Property-based tests live in a companion `test.js` file using fast-check.

## Tasks

- [x] 1. Set up the HTML skeleton and CSS keyframes
  - Create `index.html` with `<!DOCTYPE html>`, `<html lang="en">`, `<head>`, and `<body>` sections
  - Add the Tailwind CSS CDN `<script>` tag inside `<head>`
  - Add a `<style>` block inside `<head>` with the five required CSS `@keyframes` rules: `petting` (wobble/scale pulse, ≤400 ms), `float-up` (translateY ≥40 px + opacity 1→0, 1000 ms), `flash` (full-page opacity flash, 800–1500 ms), `sparkle` (star particles, 800–1500 ms), and `confetti` (coloured squares fall, 800–1500 ms)
  - Write semantic `<body>` markup: a centred container, the cat element (`tabindex="0"`, `aria-label="Pet the cat"`), an instructional label element, and a counter display element
  - Apply Tailwind utility classes so the layout centres the cat and counter both vertically and horizontally within the viewport at all widths 320 px–1920 px
  - Set the cat element's minimum font size to 48 px and ensure a contrast ratio ≥4.5:1 on both light and dark backgrounds
  - Add a visible focus indicator (minimum 2 px outline) to the cat element for keyboard navigation
  - _Requirements: 1.1, 1.2, 4.1, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.3_

- [x] 2. Implement the Storage module
  - Open a `<script>` IIFE inside `index.html`
  - Implement `Storage.get(key)`: reads from `localStorage`, parses JSON, returns value or `null` on any error
  - Implement `Storage.set(key, value)`: serialises to JSON, writes to `localStorage`, silently ignores `SecurityError` and `QuotaExceededError`
  - Keys used: `cat_pet_count` (number) and `cat_milestones` (number[])
  - [x] 2.1 Implement Storage.get and Storage.set
    - Write both methods inside the IIFE
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.2 Write property test for Storage round-trip (Property 3)
    - **Property 3: localStorage round-trip preserves pet count**
    - **Validates: Requirements 5.1, 5.2**
    - Use `fc.integer({ min: 0, max: 999_999_999 })` in `test.js`
    - Tag: `// Feature: cat-clicker-app, Property 3: localStorage round-trip preserves pet count`

- [x] 3. Implement the State module
  - Declare the internal `state` object: `{ petCount: 0, triggeredMilestones: [] }`
  - Implement `initState()`: reads from Storage, validates `cat_pet_count` (must be integer in [0, 999999999]; otherwise reset to 0 and overwrite), validates `cat_milestones` (must be array of valid milestone integers; otherwise reset to [] and overwrite), then populates `state`
  - Implement `increment()`: increments `petCount` (clamped at 999,999,999), persists via Storage, returns new value
  - Implement `isMilestone(n)`: returns `true` if `n` is in `MILESTONES` and not in `triggeredMilestones`
  - Implement `markMilestone(n)`: pushes `n` to `triggeredMilestones` and persists it via Storage
  - Define `MILESTONES = [10, 25, 50, 100, 250, 500, 1000]` as a `const`

  - [x] 3.1 Implement initState, increment, isMilestone, markMilestone
    - _Requirements: 2.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.4_

  - [ ]* 3.2 Write property test for counter increment (Property 1)
    - **Property 1: Counter increment is exactly +1**
    - **Validates: Requirements 2.1, 4.2, 5.2**
    - Use `fc.integer({ min: 0, max: 999_999_998 })` in `test.js`
    - Tag: `// Feature: cat-clicker-app, Property 1: Counter increment is exactly +1`

  - [ ]* 3.3 Write property test for invalid storage reset (Property 4)
    - **Property 4: Invalid storage values reset to 0**
    - **Validates: Requirements 5.4**
    - Use `fc.oneof(fc.string(), fc.float(), fc.integer({ max: -1 }), fc.constant(null))` in `test.js`
    - Tag: `// Feature: cat-clicker-app, Property 4: Invalid storage values reset to 0`

  - [ ]* 3.4 Write property test for milestone fires once (Property 6)
    - **Property 6: Each milestone fires at most once**
    - **Validates: Requirements 6.4**
    - Use `fc.integer({ min: 1, max: 7 })` to pick a milestone index; drive petCount past the milestone value twice
    - Tag: `// Feature: cat-clicker-app, Property 6: Each milestone fires at most once`

- [x] 4. Checkpoint — Ensure Storage and State tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the Reaction module
  - Define `Reaction.pool` with ≥15 distinct `ReactionRecord` objects: `{ text, catImage }` where `catImage` is a string or `null`; at least 5 pool records must have a non-null `catImage`
  - Define `Reaction.milestoneSet` with at least 7 `ReactionRecord` objects (one per milestone); no `text` value may overlap with any `pool` entry
  - Implement `Reaction.select(isMilestone)`: uses `Math.random()` to pick uniformly from `milestoneSet` when `isMilestone` is true, otherwise from `pool`; returns `null` when the relevant array is empty

  - [x] 5.1 Define reaction pool and milestone set, implement select()
    - _Requirements: 2.3, 2.5, 3.3, 3.5, 6.1, 6.2_

  - [ ]* 5.2 Write property test for milestone exclusivity (Property 5)
    - **Property 5: Milestone reactions are exclusive**
    - **Validates: Requirements 6.2**
    - Static assertion: iterate both arrays and assert no `text` overlap
    - Tag: `// Feature: cat-clicker-app, Property 5: Milestone reactions are exclusive`

  - [ ]* 5.3 Write property test for correct pool selection (Property 7)
    - **Property 7: Reaction selection is from the correct pool**
    - **Validates: Requirements 2.3, 6.2**
    - Use `fc.integer({ min: 0, max: 999_999_999 })` to generate arbitrary petCount; check that `Reaction.select(isMilestone)` returns from the expected pool
    - Tag: `// Feature: cat-clicker-app, Property 7: Reaction selection is from the correct pool`

  - [ ]* 5.4 Write property test for empty pool safety (Property 9)
    - **Property 9: Empty pool is safe**
    - **Validates: Requirements 2.5**
    - Set `pool = []`, call `increment()`, assert no floating span is created and no error is thrown
    - Tag: `// Feature: cat-clicker-app, Property 9: Empty pool is safe`

- [x] 6. Implement the Animation module
  - Implement `playPettingAnimation(el)`: removes the petting CSS class, forces a reflow, re-adds it; total animation duration ≤400 ms
  - Implement `spawnFloatingText(text, anchorEl)`: creates a `<span>`, positions it horizontally centred on `anchorEl` and at or above its top edge, appends to `<body>`, auto-removes after 1000 ms using `setTimeout`; each call is independent
  - Implement `playBurstAnimation(type)` where `type ∈ { 'confetti', 'sparkle', 'flash' }`: injects an overlay element, applies the matching CSS animation class, removes the element after 800–1500 ms

  - [x] 6.1 Implement playPettingAnimation, spawnFloatingText, playBurstAnimation
    - _Requirements: 2.2, 2.4, 3.1, 3.2, 3.4, 6.3_

  - [ ]* 6.2 Write property test for independent floating texts (Property 8)
    - **Property 8: Floating texts are independent**
    - **Validates: Requirements 3.4**
    - Use `fc.integer({ min: 2, max: 20 })` to generate `n` rapid pet events; assert exactly `n` float `<span>` elements are active simultaneously
    - Tag: `// Feature: cat-clicker-app, Property 8: Floating texts are independent`

- [x] 7. Implement the UI module and wire everything together
  - Implement `UI.init()`: queries all required DOM references (cat element, counter display, instructional label), calls `initState()`, wires event listeners (`click` on cat → `UI.handlePet`; `keydown` Enter/Space on cat → `UI.handlePet`), calls `UI.render()`
  - Implement `UI.render()`: updates the counter display text to `"Pets given: <petCount>"`, updates the cat element's displayed character when the last reaction carried a non-null `catImage`, shows/hides the instructional label (visible until the first pet in the current session)
  - Implement `UI.handlePet(e)`: calls `increment()`, retrieves the reaction via `Reaction.select(isMilestone)`, calls `playPettingAnimation`, conditionally calls `spawnFloatingText`, conditionally calls `playBurstAnimation` for milestones, calls `markMilestone` when applicable, calls `UI.render()`
  - Call `UI.init()` at the bottom of the IIFE via `DOMContentLoaded` or directly after the IIFE is defined

  - [x] 7.1 Implement UI.init, UI.render, UI.handlePet
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.5, 4.1, 4.2, 4.3, 4.4, 6.3, 6.4, 8.2_

  - [ ]* 7.2 Write property test for counter display format (Property 2)
    - **Property 2: Counter display format matches state**
    - **Validates: Requirements 4.1, 4.3**
    - Use `fc.integer({ min: 0, max: 999_999_999 })` to generate arbitrary `petCount`; assert rendered text matches `"Pets given: <n>"` exactly
    - Tag: `// Feature: cat-clicker-app, Property 2: Counter display format matches state`

  - [ ]* 7.3 Write property test for cat image update (Property 10)
    - **Property 10: Cat image updates on reactions with a catImage**
    - **Validates: Requirements 3.5**
    - Use `fc.string({ minLength: 1 })` for `catImage` values; assert cat element updates on non-null and stays unchanged on null
    - Tag: `// Feature: cat-clicker-app, Property 10: Cat image updates on reactions with a catImage`

- [-] 8. Checkpoint — Full integration check
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Write the companion test harness
  - Create `test.js` as a module-compatible file that imports the pure logic helpers extracted from the IIFE (or accepts them as parameters)
  - Configure fast-check (via CDN import or npm in a companion test harness)
  - Implement all 10 property tests (P1–P10) as described in the design's Testing Strategy section, each running a minimum of 100 iterations
  - Add a `test.html` runner file that loads fast-check from CDN and executes `test.js`, printing pass/fail results to the console

  - [~] 9.1 Create test.js with all 10 property-based tests
    - _Requirements: all correctness properties from design.md_

  - [ ]* 9.2 Write unit tests for boundary values and edge cases
    - Test `increment()` at boundaries 0, 999,999,998, 999,999,999 (clamp), -1, 1e10
    - Test `initState()` with invalid localStorage values (string, float, negative int, null, out-of-range)
    - Test `Reaction.select()` with an empty pool returns `null`
    - Test counter label format `"Pets given: 0"` on initial load
    - _Requirements: 2.5, 4.3, 5.3, 5.4_

- [~] 10. Final checkpoint — Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The entire app ships as `index.html`; the only external reference is the Tailwind CSS CDN `<script>`
- The IIFE wrapper prevents any module from leaking onto `window`
- Pure logic helpers (State, Storage, Reaction) must be extractable for the test harness — keep them free of direct DOM dependencies
- `test.js` and `test.html` are companion files for property-based testing and do not ship with the app
- Each property test references the design's Correctness Properties section for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
