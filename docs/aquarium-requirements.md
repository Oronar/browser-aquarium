# Digital Aquarium — Requirements

Status: Draft, derived from stakeholder interview
Date: 2026-07-23

## 1. Vision

A small, persistent collection of named fish that runs continuously on a dedicated monitor. Checking in is a daily ritual — feed, glance at condition, occasionally interact — not a game to win or a system to optimize. Neglect is visible and reversible, never punitive.

## 2. Actors

- **Owner** — the single user (Oro). No multi-user, no accounts, no network identity.

## 3. Functional Requirements

### 3.1 Fish Lifecycle
- **FR-1.** The system shall allow the Owner to add a fish by choosing species, name, and traits manually.
- **FR-2.** The system shall allow the Owner to add a fish via random generation (species/traits rolled, then named by the Owner).
- **FR-3.** Each fish shall be a persistent entity with a unique identity: name, species, personality trait(s), and birth date.
- **FR-4.** The system shall allow the Owner to rename a fish at any time after creation.
- **FR-5.** The system shall allow the Owner to place a fish into **stasis** (inactive, hidden from the tank, data retained) instead of deleting it.
- **FR-6.** The system shall allow the Owner to revive a fish from stasis at any time, restoring it to the active tank with its saved data intact.
- **FR-7.** The system shall not provide a permanent-delete path as a primary action — stasis is the only removal mechanism. (Hard delete may exist as a buried/advanced option, not a core flow.)
- **FR-8.** The system shall not implement fish death or any fail state tied to neglect.

### 3.2 Personality & Individuality
- **FR-9.** Each fish shall be assigned one or more personality traits at creation that influence its movement/behavior (e.g. skittish, lazy, bold).
- **FR-10.** Personality traits shall be fixed for the fish's lifetime and shall not change based on care or neglect.

### 3.3 Stats
- **FR-11.** Each fish shall track exactly two stats: **hunger** and **happiness**. No additional stat axes (health, bond, etc.) in scope.
- **FR-12.** Hunger shall decay gradually over real elapsed time, including time while the app was not running (see FR-19).
- **FR-13.** Happiness shall be derived at least in part from current hunger.
- **FR-14.** Stat decay shall have a visible floor — reduced stats change appearance/behavior (sluggish, duller coloring) but never reach a "failed" or terminal state.
- **FR-15.** Effects of neglect shall be fully reversible once care resumes (no permanent penalty from a period of low stats).

### 3.4 Feeding & Interaction
- **FR-16.** The system shall provide one global "feed" action that raises hunger for all active fish simultaneously (not per-fish targeted feeding).
- **FR-17.** The Owner shall be able to select an individual fish (e.g. by clicking/tapping it) to view its details.
- **FR-18.** The fish detail view shall display, at minimum: name (editable), species, age (derived from birth date), personality, and current hunger/happiness.

### 3.5 Persistence & Runtime
- **FR-19.** The system shall persist all fish data locally and restore full state on restart, including catching up stat decay for elapsed real time while the app was closed.
- **FR-20.** The system is expected to run continuously on a dedicated monitor; the Owner will observe condition changes passively over time rather than opening the app deliberately each day.
- **FR-21.** The system shall allow the Owner to export the full tank state (all fish, active and in stasis) to a JSON file on demand.
- **FR-21a.** The system shall allow the Owner to import a previously exported JSON file, restoring tank state from it.
- **FR-21b.** No cloud sync is required. Export/import is a manual, local, on-demand action — not automatic backup.

### 3.6 Population & Species
- **FR-22.** The system shall support a small active population, nominally 3-6 fish, where individual fish remain visually and behaviorally distinguishable from one another.
- **FR-23.** The system shall ship with a curated preset species list; the Owner has no specific species requirements for v1.
- **FR-24.** Species flagged as "schooling" shall exhibit visible grouping/interaction behavior with same-species tankmates. Non-schooling species shall behave independently of other fish.

## 4. Non-Functional Requirements

- **NFR-1 (Performance).** The system shall run smoothly on low-spec hardware — no measurable input lag, no sustained high CPU/fan activity, suitable for leaving on indefinitely.
- **NFR-2 (Runtime).** The system shall run fullscreen on a single monitor as a standalone local application/file, with no network dependency at any point (add/feed/view/rename/stasis all work fully offline).
- **NFR-3 (Visual style).** Fish and tank shall use a minimalist/stylized visual treatment (flat shapes, deliberate color) rather than naturalistic/detailed rendering.
- **NFR-4 (Data integrity).** Fish data shall not be lost across normal restarts, sleep/wake, or extended periods with the app closed.
- **NFR-5 (Tone).** The system shall not introduce competitive, punitive, or optimization-driven mechanics at any point — this is a toy for enjoyment, not a challenge to win.

## 5. Explicitly Out of Scope

- Breeding/genetics
- Currency, shop, or purchasable decorations
- Achievements/collection meta-game
- Death or any permanent-loss fail state
- Multiplayer, accounts, or cloud sync
- Per-fish targeted feeding
- Additional stat axes beyond hunger/happiness
- Personality drift/change over time
- Hard delete as a primary flow
- Automatic/cloud backup (export/import is manual and local — see FR-21)

## 6. Open Items for Design Phase

These weren't nailed down in requirements and are fine to leave for design:
- Exact list of preset species and their schooling flags
- Exact personality trait roster and their behavioral effects
- Exact decay rates/timing for hunger and happiness
- Visual treatment details (palette, shape language) within the "minimalist/stylized" direction
