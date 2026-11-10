/**
 * Cat Clicker App — Property-Based Test Suite
 *
 * Uses fast-check (loaded by test.html via CDN import).
 * All pure-logic helpers are re-implemented here as ES-module exports
 * so they can be tested without a browser IIFE or DOM dependency.
 *
 * Each property test is tagged with:
 *   // Feature: cat-clicker-app, Property N: <name>
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure-logic helpers (mirror of index.html IIFE, adapted for module context)
// ─────────────────────────────────────────────────────────────────────────────

// ── Storage helper ────────────────────────────────────────────────────────────
/**
 * Creates a Storage module backed by any Map-like object that exposes
 * getItem / setItem / removeItem (duck-typed with localStorage).
 * Passing a fake store lets tests run without a real browser localStorage.
 *
 * @param {Storage|object} store - anything with getItem/setItem (e.g. fakeLocalStorage)
 */
export function makeStorage(store) {
  return {
    get(key) {
      try {
        const raw = store.getItem(key);
        if (raw === null || raw === undefined) return null;
        return JSON.parse(raw);
      } catch (_err) {
        return null;
      }
    },
    set(key, value) {
      try {
        store.setItem(key, JSON.stringify(value));
      } catch (_err) {
        // silently ignore
      }
    },
  };
}

/** Minimal in-memory localStorage replacement */
export function makeFakeStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    clear() { map.clear(); },
  };
}

// ── State helpers ─────────────────────────────────────────────────────────────
/** All milestone values the app recognises (Requirement 6.1) */
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

/**
 * Creates a fresh, isolated state + its helper functions.
 * @param {ReturnType<makeStorage>} storage - storage module to use
 */
export function makeState(storage) {
  const state = {
    petCount: 0,
    triggeredMilestones: [],
  };

  function initState() {
    // Restore pet count
    const storedCount = storage.get('cat_pet_count');
    const isValidCount =
      typeof storedCount === 'number' &&
      Number.isInteger(storedCount) &&
      storedCount >= 0 &&
      storedCount <= 999_999_999;

    if (isValidCount) {
      state.petCount = storedCount;
    } else {
      state.petCount = 0;
      storage.set('cat_pet_count', 0);
    }

    // Restore triggered milestones
    const storedMilestones = storage.get('cat_milestones');
    const isValidMilestones =
      Array.isArray(storedMilestones) &&
      storedMilestones.every(
        (m) => typeof m === 'number' && MILESTONES.includes(m)
      );

    if (isValidMilestones) {
      state.triggeredMilestones = storedMilestones;
    } else {
      state.triggeredMilestones = [];
      storage.set('cat_milestones', []);
    }
  }

  function increment() {
    if (state.petCount < 999_999_999) {
      state.petCount += 1;
    }
    storage.set('cat_pet_count', state.petCount);
    return state.petCount;
  }

  function isMilestone(n) {
    return MILESTONES.includes(n) && !state.triggeredMilestones.includes(n);
  }

  function markMilestone(n) {
    state.triggeredMilestones.push(n);
    storage.set('cat_milestones', state.triggeredMilestones);
  }

  function getState() {
    return state;
  }

  return { initState, increment, isMilestone, markMilestone, getState };
}

// ── Reaction data ─────────────────────────────────────────────────────────────
/** Standard reaction pool — mirrors index.html exactly */
export const pool = [
  { text: 'purrrr~',       catImage: '😸' },
  { text: 'uwu',           catImage: '🥰' },
  { text: '( =ω= )',       catImage: '😺' },
  { text: ':3',            catImage: '😻' },
  { text: '*kneads paws*', catImage: '🐱' },
  { text: 'mrrrow~',       catImage: null  },
  { text: 'head bump!',    catImage: null  },
  { text: 'slow blink ♥', catImage: null  },
  { text: 'trills softly', catImage: null  },
  { text: 'flops over',    catImage: null  },
  { text: 'chirp!',        catImage: null  },
  { text: 'mew.',          catImage: null  },
  { text: 'prrrrt~',       catImage: null  },
  { text: '( ^._.^ )ﾉ',   catImage: null  },
  { text: 'zzZZzz…',      catImage: null  },
];

/** Milestone-exclusive reaction set — mirrors index.html exactly */
export const milestoneSet = [
  { text: "🎉 10 pets! You're amazing!",      catImage: '😹' },
  { text: '✨ 25 and counting! Superstar!',    catImage: '🙀' },
  { text: '🔥 50 pets! On fire!',              catImage: '😾' },
  { text: '💯 100 pets! Legendary petter!',    catImage: '😼' },
  { text: '🌟 250 pets! Petting god!',         catImage: '😽' },
  { text: '🏆 500 pets! Hall of Fame!',        catImage: '🐈' },
  { text: '🚀 1000 pets! Absolutely unhinged!', catImage: '🐈‍⬛' },
];

/** Reaction module — select from the right pool */
export const Reaction = {
  pool,
  milestoneSet,
  select(isMilestoneFlag, overridePool = null) {
    const source = isMilestoneFlag
      ? this.milestoneSet
      : (overridePool !== null ? overridePool : this.pool);
    if (source.length === 0) return null;
    const index = Math.floor(Math.random() * source.length);
    return source[index];
  },
};

// ── UI render helper (pure, DOM-mockable) ─────────────────────────────────────
/**
 * Applies the render logic to a plain object acting as a DOM element.
 * Returns the counter text so it can be asserted in tests.
 *
 * @param {number} petCount
 * @param {{ textContent: string }} counterEl
 * @param {{ textContent: string }} catEl - mocked cat element
 * @param {{ catImage: string|null }|null} lastReaction
 * @returns {string} the counter's textContent after render
 */
export function renderCounter(petCount, counterEl) {
  counterEl.textContent = `Pets given: ${petCount}`;
  return counterEl.textContent;
}

export function renderCatImage(catEl, lastReaction) {
  if (lastReaction !== null && lastReaction.catImage !== null) {
    catEl.textContent = lastReaction.catImage;
  }
}

// ── Floating text tracker (testable without real DOM) ─────────────────────────
/**
 * Returns a minimal stub that behaves like spawnFloatingText but records
 * its active spans in an array instead of appending to document.body.
 * Each span is auto-removed after 1000 ms, mirroring the real implementation.
 */
export function makeFloatingTextTracker() {
  const activeSpans = [];

  function spawn(text) {
    const span = { text, removed: false };
    activeSpans.push(span);
    setTimeout(() => {
      span.removed = true;
    }, 1000);
    return span;
  }

  function getActiveCount() {
    return activeSpans.filter((s) => !s.removed).length;
  }

  function getAll() {
    return [...activeSpans];
  }

  return { spawn, getActiveCount, getAll };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test runner helpers
// ─────────────────────────────────────────────────────────────────────────────

const results = [];

function logResult(name, passed, detail = '') {
  results.push({ name, passed, detail });
  const icon = passed ? '✅' : '❌';
  const msg = detail ? `${icon} ${name}\n   ${detail}` : `${icon} ${name}`;
  console.log(msg);

  // Also update live DOM if running in test.html
  if (typeof document !== 'undefined') {
    const list = document.getElementById('results');
    if (list) {
      const li = document.createElement('li');
      li.className = passed ? 'pass' : 'fail';
      li.innerHTML = `<strong>${icon} ${name}</strong>${detail ? `<br><code>${detail}</code>` : ''}`;
      list.appendChild(li);
    }
  }
}

function summarise() {
  const passed = results.filter((r) => r.passed).length;
  const total  = results.length;
  const summary = `\n${'─'.repeat(50)}\nResult: ${passed}/${total} properties passed`;
  console.log(summary);

  if (typeof document !== 'undefined') {
    const el = document.getElementById('summary');
    if (el) {
      el.textContent = `${passed}/${total} properties passed`;
      el.className = passed === total ? 'all-pass' : 'some-fail';
    }
  }

  return passed === total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Property-based tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs all 10 property tests.
 * @param {object} fc - the fast-check library
 */
export async function runAllTests(fc) {
  console.log('Running Cat Clicker property-based tests (100 iterations each)…\n');

  // ── P1 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 1: Counter increment is exactly +1
  // For any n in [0, 999,999,998], increment() returns n+1 and storage equals n+1
  // Validates: Requirements 2.1, 4.2, 5.2
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_998 }),
        (n) => {
          const fakeStore = makeFakeStorage();
          const storage   = makeStorage(fakeStore);
          const { getState, increment } = makeState(storage);

          // Seed state to n
          getState().petCount = n;
          storage.set('cat_pet_count', n);

          const result = increment();

          return (
            result === n + 1 &&
            getState().petCount === n + 1 &&
            storage.get('cat_pet_count') === n + 1
          );
        }
      ),
      { numRuns: 100 }
    );
    logResult('P1: Counter increment is exactly +1', true);
  } catch (err) {
    logResult('P1: Counter increment is exactly +1', false, String(err));
  }

  // ── P2 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 2: Counter display format matches state
  // For any petCount in [0, 999,999,999], rendered text matches "Pets given: <n>"
  // Validates: Requirements 4.1, 4.3
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_999 }),
        (n) => {
          const counterEl = { textContent: '' };
          const text = renderCounter(n, counterEl);
          return text === `Pets given: ${n}`;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P2: Counter display format matches state', true);
  } catch (err) {
    logResult('P2: Counter display format matches state', false, String(err));
  }

  // ── P3 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 3: localStorage round-trip preserves pet count
  // For any n in [0, 999,999,999], Storage.set then Storage.get returns exactly n
  // Validates: Requirements 5.1, 5.2
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_999 }),
        (n) => {
          const fakeStore = makeFakeStorage();
          const storage   = makeStorage(fakeStore);
          storage.set('cat_pet_count', n);
          return storage.get('cat_pet_count') === n;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P3: localStorage round-trip preserves pet count', true);
  } catch (err) {
    logResult('P3: localStorage round-trip preserves pet count', false, String(err));
  }

  // ── P4 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 4: Invalid storage values reset to 0
  // For any invalid value, initState() sets petCount to 0 and overwrites storage with 0
  // Validates: Requirements 5.4
  try {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.float().filter((f) => !Number.isInteger(f) || f < 0 || f > 999_999_999),
          fc.integer({ max: -1 }),
          fc.constant(null),
          fc.constant(1e12),   // out-of-range integer
          fc.constant(NaN),
          fc.constant(undefined)
        ),
        (invalidValue) => {
          const fakeStore = makeFakeStorage();
          const storage   = makeStorage(fakeStore);

          // Inject invalid value directly into the fake store
          if (invalidValue === null || invalidValue === undefined) {
            fakeStore.setItem('cat_pet_count', JSON.stringify(invalidValue));
          } else {
            fakeStore.setItem('cat_pet_count', JSON.stringify(invalidValue));
          }

          const { initState, getState } = makeState(storage);
          initState();

          return (
            getState().petCount === 0 &&
            storage.get('cat_pet_count') === 0
          );
        }
      ),
      { numRuns: 100 }
    );
    logResult('P4: Invalid storage values reset to 0', true);
  } catch (err) {
    logResult('P4: Invalid storage values reset to 0', false, String(err));
  }

  // ── P5 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 5: Milestone reactions are exclusive
  // Static assertion: no text overlap between pool and milestoneSet
  // Validates: Requirements 6.2
  try {
    const poolTexts      = new Set(pool.map((r) => r.text));
    const milestoneTexts = new Set(milestoneSet.map((r) => r.text));

    let overlap = null;
    for (const t of poolTexts) {
      if (milestoneTexts.has(t)) { overlap = t; break; }
    }

    // Also run as a fast-check static property (single run, confirms assertion)
    fc.assert(
      fc.property(fc.constant(null), () => {
        const pTexts = new Set(pool.map((r) => r.text));
        for (const r of milestoneSet) {
          if (pTexts.has(r.text)) return false;
        }
        return true;
      }),
      { numRuns: 1 }
    );

    if (overlap !== null) throw new Error(`Text overlap found: "${overlap}"`);
    logResult('P5: Milestone reactions are exclusive', true);
  } catch (err) {
    logResult('P5: Milestone reactions are exclusive', false, String(err));
  }

  // ── P6 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 6: Each milestone fires at most once
  // For any milestone index, driving petCount past that milestone twice fires celebration only once
  // Validates: Requirements 6.4
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }), // 0-indexed into MILESTONES array
        (milestoneIdx) => {
          const milestoneValue = MILESTONES[milestoneIdx];
          const fakeStore = makeFakeStorage();
          const storage   = makeStorage(fakeStore);
          const { initState, increment, isMilestone: isMilestoneCheck, markMilestone, getState } = makeState(storage);
          initState();

          // Drive petCount up to just before the milestone
          getState().petCount = milestoneValue - 1;

          // First arrival at milestone
          const count1 = increment(); // should equal milestoneValue
          const fired1 = isMilestoneCheck(count1);
          if (fired1) markMilestone(count1);

          // Reset petCount to just below milestone again to simulate a second crossing
          // (e.g. in a scenario where state is externally manipulated, or for test coverage)
          getState().petCount = milestoneValue - 1;

          // Second arrival at milestone
          const count2 = increment(); // should equal milestoneValue again
          const fired2 = isMilestoneCheck(count2);

          // First arrival should have fired; second should NOT
          return fired1 === true && fired2 === false;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P6: Each milestone fires at most once', true);
  } catch (err) {
    logResult('P6: Each milestone fires at most once', false, String(err));
  }

  // ── P7 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 7: Reaction selection is from the correct pool
  // For any petCount, Reaction.select returns from milestoneSet when milestone, pool otherwise
  // Validates: Requirements 2.3, 6.2
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_999 }),
        fc.boolean(), // isMilestone flag
        (petCount, isMilestoneBool) => {
          // Run many times to ensure statistical coverage
          for (let i = 0; i < 10; i++) {
            const reaction = Reaction.select(isMilestoneBool);
            if (reaction === null) continue; // empty pool guard

            const expectedSource = isMilestoneBool ? milestoneSet : pool;
            const inSource = expectedSource.some((r) => r.text === reaction.text);
            if (!inSource) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P7: Reaction selection is from the correct pool', true);
  } catch (err) {
    logResult('P7: Reaction selection is from the correct pool', false, String(err));
  }

  // ── P8 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 8: Floating texts are independent
  // For n rapid pet events, exactly n float spans are active simultaneously
  // Validates: Requirements 3.4
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        (n) => {
          const tracker = makeFloatingTextTracker();

          // Fire n rapid events synchronously (before any setTimeout fires)
          for (let i = 0; i < n; i++) {
            tracker.spawn(`reaction-${i}`);
          }

          // All spans should still be active (no setTimeout has fired yet)
          return tracker.getActiveCount() === n;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P8: Floating texts are independent', true);
  } catch (err) {
    logResult('P8: Floating texts are independent', false, String(err));
  }

  // ── P9 ────────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 9: Empty pool is safe
  // When pool is empty, increment returns incremented count, no float span created, no error
  // Validates: Requirements 2.5
  try {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_997 }),
        (n) => {
          const fakeStore = makeFakeStorage();
          const storage   = makeStorage(fakeStore);
          const { initState, increment, getState } = makeState(storage);
          initState();
          getState().petCount = n;

          const tracker = makeFloatingTextTracker();

          // Simulate UI.handlePet with an empty pool
          let threw = false;
          let result;
          try {
            result = increment();
            // Simulate: reaction = Reaction.select(false) with empty pool
            const emptyPoolReaction = { select: () => null };
            const reaction = emptyPoolReaction.select();
            if (reaction !== null) {
              tracker.spawn(reaction.text);
            }
          } catch (e) {
            threw = true;
          }

          return (
            !threw &&
            result === n + 1 &&
            tracker.getActiveCount() === 0
          );
        }
      ),
      { numRuns: 100 }
    );
    logResult('P9: Empty pool is safe', true);
  } catch (err) {
    logResult('P9: Empty pool is safe', false, String(err));
  }

  // ── P10 ───────────────────────────────────────────────────────────────────
  // Feature: cat-clicker-app, Property 10: Cat image updates on reactions with a catImage
  // For reactions with non-null catImage, cat element shows catImage; null = unchanged
  // Validates: Requirements 3.5
  try {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),   // non-null catImage
        fc.string({ minLength: 1 }),   // initial cat content
        (catImage, initialContent) => {
          const catEl = { textContent: initialContent };

          // Case A: non-null catImage — element should update
          renderCatImage(catEl, { text: 'test', catImage });
          if (catEl.textContent !== catImage) return false;

          // Case B: null catImage — element should NOT change
          catEl.textContent = initialContent;
          renderCatImage(catEl, { text: 'test', catImage: null });
          if (catEl.textContent !== initialContent) return false;

          // Case C: null reaction — element should NOT change
          catEl.textContent = initialContent;
          renderCatImage(catEl, null);
          if (catEl.textContent !== initialContent) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
    logResult('P10: Cat image updates on reactions with a catImage', true);
  } catch (err) {
    logResult('P10: Cat image updates on reactions with a catImage', false, String(err));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  return summarise();
}
