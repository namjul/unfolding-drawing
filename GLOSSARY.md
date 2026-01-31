# Glossary

## Living Systems Development Terminology

This glossary defines key terms used in the AGENTS.md protocol and Living Systems Commit Convention. Terms are ordered so that foundational concepts appear before terms that depend on them.

---

## Foundational Concepts

### Observable
Something that can be directly perceived or measured.

**Operational definition:** Multiple observers can verify independently.

**Examples:**
- ✅ Observable: "Button click rate dropped 40%"
- ✅ Observable: "5/7 users mentioned X in interviews"
- ❌ Not observable: "Users feel frustrated" (inference from observables)

---

### Operational Definition
A definition that specifies observable criteria for membership.

**Format:** "By [term] I mean [criteria]. This counts: [examples]. This doesn't count: [counterexamples]."

**Purpose:** Prevent vague abstractions and term drift.

**Example:**
> "By 'strong center' I mean: attracts >60% of user interactions, removal causes >30% drop in task completion, users spontaneously reference it in feedback. This counts: the undo button. This doesn't count: a decorative header image."

---

### Measurable Indicator
A quantifiable signal that tracks whether an intervention succeeded.

**Required specificity:**
- What exactly to measure
- How to measure it
- What value indicates success
- What value indicates failure

**Examples:**
- ✅ "Stroke latency <16ms measured via frame time analytics"
- ✅ "Color usage >30% measured via stroke metadata analysis"
- ❌ "Better performance" (too vague)

---

### Falsifiable
A claim that can be proven wrong through observation.

**Operational definition:** You can specify what observation would contradict it.

**Contact test:** Ask "What would make this false?" If there's no answer, claim is not falsifiable (possibly mythology).

**Examples:**
- ✅ Falsifiable: "Color usage will exceed 30% of strokes"
- ❌ Not falsifiable: "This will improve user experience"

---

### Contact Test
A reality-contact mechanism that specifies how to verify or falsify a claim.

**Required forms (at least one):**
1. **Falsifiable example:** "This would show the claim is wrong: [scenario]"
2. **Counterexample:** "This case doesn't fit: [case]"
3. **Measurable indicator:** "We could measure [X] to test this"
4. **Minimal experiment:** "The smallest test: [action]"
5. **Real-world constraint:** "This must account for [limitation]"

**If none exist:** Not a testable hypothesis, possibly mythology.

---

### Mythology
Coherent explanation without operational meaning, falsifiability, or evidence.

**Operational definition:** Claims that feel insightful but cannot be wrong—no observation could falsify them.

**Contact test:** Ask "What would make this false?" If there's no answer, it's mythology.

**Examples:**
- ❌ "This creates flow and synergy"
- ✅ "This reduces action-to-feedback time from 200ms to 50ms"

### Pattern vs Principle vs Rule

**Principle:** Non-negotiable constraint that enables (e.g., "claims require falsifiability")

**Pattern:** Observed regularity that guides (e.g., "EAI loop structure")

**Rule:** Pattern treated as mandatory regardless of context (anti-pattern)

**Anti-pattern:** Treating patterns as rules via authority rather than evidence.

**Contact test:** Can you name valid exceptions? If "no because it's the rule," you've ossified a pattern.

---

### Authority in Protocol Governance

**Hierarchy of authority (highest to lowest):**
1. Evidence (contact test results, measured outcomes)
2. Principles (generative constraints)
3. Patterns (observed regularities, evolvable)
4. Personal authority (never trumps evidence)

**Red flag:** "Because I said so" or "That's the protocol" ending discussion without evidence.

**See:** AGENTS.md Disagreement Resolution Protocol for process.

---

### Protocol Evolution

**All protocols in this family are living documents.**

**Evolution process:**
1. Observe pattern doesn't fit
2. Specify contact test for proposed change
3. Try in limited scope
4. Evaluate evidence
5. Update if supported

**Anti-pattern:** Only original authors can update protocol (kills learning from new observations).

**Contact test for healthy protocol:** Gets updated quarterly by contributors at all levels.

---

## Epistemic Discipline Terms

### Fact
Observed, documented, or measured phenomenon.

**Operational requirement:** Must be verifiable by others.

**Examples:**
- ✅ "Average session duration is 12 minutes"
- ✅ "Code contains 340 lines in module X"
- ❌ "The system feels sluggish" (this is subjective experience, needs measurement)

---

### Evidence
Observed data, documented behavior, or measured outcomes.

**Not:** Assumptions, inferences, or intuitions.

**Examples:**
- ✅ "Session logs show 89% of users disable feature X"
- ✅ "5/7 interview subjects mentioned wanting Y"
- ❌ "Users probably want Z" (this is speculation)

---

### Assumption
A belief stipulated for analysis that may or may not be true.

**Operational requirement:** Always label explicitly and separate from facts.

**Format:** "Assumption: Users prefer X over Y" (not "Users prefer X")

**Contact test required:** How will we verify this assumption?

---

### Inference
Conclusion derived from facts plus assumptions.

**Operational requirement:** Show your work—make the derivation explicit.

**Format:** "Given [facts] and [assumptions], we infer [conclusion]"

**Example:** "Given that 89% disable the grid (fact) and users said they prefer emergent structure (evidence), we infer the grid weakens rather than strengthens the drawing center."

---

### Speculation
Hypothetical possibility not yet tested.

**Operational requirement:** Always label as speculation, never present as fact or inference.

**Example:** "Speculation: Users might want constraint-based tools despite low current usage."

---

### Revision
Required update when new evidence contradicts previous assumptions or claims.

**Mandatory elements:**
1. State what changed (new evidence)
2. State what no longer holds (falsified assumption)
3. State the new belief (updated understanding)
4. Explain the update (why this matters)

**Anti-pattern:** Ego-preserving narratives ("I was right in spirit").

---

### Term Drift
Gradual change in word meaning over a conversation, causing confusion.

**Operational definition:** When the same word means different things at different points.

**Prevention:** Define terms operationally at first use and flag any definition changes as explicit revisions.

**Example:**
- Message 1: "Center" = visual focal point
- Message 5: "Center" = organizing principle
- Problem: Same word, different meanings, leads to confusion

---

## Core GSNV Concepts

### Field
The relational context in which centers exist and interact; includes spatial, temporal, and interaction dimensions.

**Operational definition:** The background conditions that make certain centers possible and shape how they relate.

**Contact test:** Does changing field X alter what kinds of actions users produce? If not, it's inert structure rather than active field.

**Example:** The temporal field of "drawing session" versus "cross-session continuity" enables different centers to form.

---

### Evaluative Gradient
A directional tension in the field that guides resolution toward coherence without external selection pressure.

**Operational definition:** A difference potential that makes certain resolutions more stable than others.

**Not:** Fitness landscapes (external environments), optimization targets, or goal states.

**Contact test:** An evaluative gradient exists when removing the tension causes structure to dissolve or lose coherence.

---

### Co-Variance
The mutual dependence of system elements where changes to one element necessarily propagate to related elements.

**Operational definition:** When changing X requires updating Y and Z to maintain coherence, X-Y-Z are co-variant.

**Contact test:** If you can change X without touching Y despite them being conceptually related, coupling has been lost.

**Example:** In a drawing system, if you change stroke persistence format but don't update the undo mechanism, you've broken co-variance.

---

### Complex Potential States
The field of possible forms that could arise from current tensions and gradients, not yet resolved into actualized structure.

**Operational definition:** Latent configurations that become accessible when evaluative gradients shift.

**Not:** Pre-existing options waiting to be selected (that's the Darwinian malware).

**Contact test:** A potential state becomes actual when it stabilizes interaction patterns that previously couldn't exist.

---

### Trophic Lift
How background conditions enable foreground events; the supporting infrastructure that makes phenomena possible.

**Operational definition:** The chain of enabling gradients from basic conditions to actualized forms.

**Example:** A drawing gesture requires: thermodynamics → life → evolution → nervous systems → culture → software → this particular interface.

**Contact test:** Removing any link in the trophic chain prevents the phenomenon from occurring.

---

### Up-Hierarchy
A relational structure where wholes integrate parts and parts participate in wholes, with neither ontologically privileged.

**Operational definition:** Organization where constraint flows both "up" (parts enable wholes) and "down" (wholes stabilize parts).

**Not:** Substance hierarchy (smaller = more fundamental) or emergent hierarchy (higher = derivative).

**Contact test:** If you can fully explain the whole by describing parts without remainder, it's not an up-hierarchy.

---

### Global State Natural View (GSNV)
An epistemic framework that treats reality as co-variant fields resolving tensions, rather than discrete agents optimizing in external environments.

**Core commitment:** Relations precede entities; wholes and parts mutually constitute each other.

**Purpose:** Resist cognitive malware that narrows evaluative fields and forces mechanical explanations.

---

## Christopher Alexander Concepts

### Center
A focal point of organization that attracts attention, organizes surrounding elements, and gains strength through interaction.

**Operational definition:**
- Attracts attention (measurable: dwell time, repeated interaction)
- Organizes surrounding elements (testable: removal weakens neighbors)
- Gains strength through use (observable: usage patterns over time)

**Contact test:** If removing X causes no degradation in surrounding coherence or usage patterns, X is not functioning as a center.

**Examples in software:**
- Strong centers: undo button, save function, primary workspace
- Weak/failed centers: unused menu items, ignored tooltips

---

### Coherence
The quality of fitting together without contradiction; mutual support among parts creating a stable whole.

**Operational definition:** When elements reinforce rather than compete with each other.

**Contact test:** Does simplifying by removal increase or decrease system stability? Coherent systems become more stable with appropriate simplification.

**Measurable indicators:**
- Reduced cognitive load
- Faster time-to-competence
- Fewer user errors
- Clearer conceptual models

---

### Wholeness
The integrated quality where parts mutually reinforce rather than compete; a configuration's degree of internal coherence.

**Operational definition:** When removing any part degrades the function of other parts.

**Contact test:** Does the system have emergent properties that can't be predicted from isolated part descriptions?

**Not:** Completeness (having all features) or complexity (having many parts).

---

### Living Structure
Organization that supports new, unplanned uses and adapts without breaking.

**Operational definition:** Structure where users can discover novel possibilities through interaction.

**Contact test:** Did users discover uses you didn't anticipate? If yes, the structure has life.

**Measurable indicators:**
- Users create workflows not in documentation
- Feature composition yields unexpected value
- System surprises its creators

---

### Dead Structure
Organization that blocks adaptation, serves no current function, or exists only as historical residue.

**Operational definition:** Structure that cannot be modified without full replacement and provides no value in current use.

**Contact tests:**
- No usage in interaction logs
- Documented user confusion or abandonment  
- Blocks planned evolution paths
- Removal requires no compensating changes elsewhere

**Example:** A grid overlay that 89% of users disable immediately is dead structure.

---

### Gesture
Time-based user action that operates on fields to create or transform centers.

**Operational definition:** A complete interaction unit with beginning, middle, and end.

**Required qualities:**
- **Legible:** Users can predict outcomes before completion
- **Reversible:** Undo preserves context, not just state
- **Context-sensitive:** Same gesture produces different results in different fields

**Contact test:** If a gesture feels identical regardless of context, it's operating mechanically rather than relationally.

---

### Pattern
An observed regularity in successful structures, not a rule to apply mechanically.

**Operational definition:** A recurring solution to a recurring problem in a given context.

**Critical distinction:** Patterns are *descriptions* of what works, not *prescriptions* for what to build.

**Contact test:** Can you name valid exceptions to this pattern? If not, you're treating it as a rule rather than an observation.

---

### Unfolding
Incremental, context-sensitive evolution where each step enables the next without requiring upfront specification.

**Operational definition:** Development process where form emerges through iterative response to context.

**Not:** Assembly (combining pre-designed parts) or execution (following a plan).

**Contact test:** Did the final form surprise you? If it exactly matched your initial vision, it was assembly, not unfolding.

**Observable characteristics:**
- Small, reversible steps
- Each step reveals new possibilities
- Understanding follows action
- Form emerges rather than being imposed

---

## Interaction & System Quality Terms

### Feedback Loop
A cycle where action produces information that informs the next action.

**Operational definition:** When user action generates observable response that guides continued action.

**Quality measures:**
- **Latency:** Time from action to feedback (lower = better, <16ms ideal)
- **Legibility:** Clarity of cause-effect relationship
- **Completeness:** Does feedback contain sufficient information to guide next step?

**Contact test:** Does removing the feedback cause users to make more errors or take longer to accomplish tasks?

**Broken feedback loop symptoms:**
- Users repeat failed actions
- Long pauses between actions (uncertainty)
- Frequent undo/redo cycles (trial and error)

---

### Legibility
The quality of making cause-effect relationships visible and predictable.

**Operational definition:** Users can predict outcomes before acting.

**Contact tests:**
- Can new users explain what will happen before clicking?
- Do users make predictable errors or random ones?
- Does hover state accurately preview action outcome?

**Measurable:** Time-to-competence, error rate in first sessions.

---

### Reversibility
The ability to undo actions while preserving context, not just state.

**Operational definition:** Undo restores the situation, not just the data.

**Good reversibility:**
- Undo in drawing restores: stroke, color, tool state, viewport
- User can continue from where they were

**Poor reversibility:**
- Undo removes stroke but loses: what tool was active, zoom level, scroll position
- User must reconstruct context manually

**Contact test:** After undo, can users continue immediately without reorientation?

---

### Mode-Switching
Transition between different interaction contexts that requires mental reorientation.

**Operational definition:** When the same input has different meanings in different states.

**Cost:** Cognitive load of tracking which mode is active.

**Contact test:** Do users make errors immediately after mode switches? Do they avoid features that require mode changes?

**Example:** Switching from "draw mode" to "color select mode" to "draw mode" breaks flow.

---

### Exploratory Capacity
The system's ability to support unplanned, user-discovered interactions and workflows.

**Operational definition:** The range of novel uses users can discover through experimentation.

**Contact test:** Did users create workflows not documented or anticipated? If yes, exploratory capacity is present.

**Trade-off:** Precision often reduces exploratory capacity; optimization for known uses can prevent discovery of unknown ones.

**Measurable indicators:**
- Number of unexpected feature combinations
- User-created workflows not in docs
- Frequency of "I didn't know you could do that"

---

## Anti-Pattern Terms

### Inert Structure
Organization that exists but does not participate in active relationships; it neither strengthens nor weakens centers.

**Operational definition:** Structure whose removal would require no compensating changes.

**Contact test:** If removing X requires updating nothing else, X is inert.

**Example:** Commented-out code, unused configuration options, dead documentation.

---

### Premature Abstraction
Creating generality before concrete cases validate the need.

**Operational definition:** Abstraction that doesn't yet have three real use cases.

**Contact test:** Can you point to three concrete cases this abstraction serves? If not, it's premature.

**Heuristic:** Build it three times before abstracting.

---

### Complexity Debt
Accumulated abstractions, dependencies, or indirections that increase maintenance burden without proportional value.

**Operational definition:** Code/structure that is harder to understand than the problem it solves.

**Contact test:** Can a new contributor understand this without explanation? If not, debt is accumulating.

**Measurable:**
- Lines of code per feature
- Number of dependencies
- Time-to-competence for new contributors

---

## Process & Change Terms

### Intervention
A deliberate change to system structure, not just content.

**Operational definition:** Modification that affects how centers relate, not just what data they contain.

**Examples:**
- Intervention: Changing how undo tracks state
- Not intervention: Fixing a typo in UI text

---

### Incremental Change
Small, reversible modifications that allow learning before commitment.

**Operational definition:** Changes small enough to evaluate quickly and reverse cheaply.

**Benefit:** Reduces risk, enables experimentation, supports unfolding.

**Contact test:** Can you revert this change in <1 hour? If not, it's not incremental.

---

### Co-Variant Change
A change where modifying one element requires updating related elements to maintain coherence.

**Operational definition:** When changing X in isolation would break semantic relationships with Y and Z.

**Contact test:** If you change module X without updating semantically related module Y, does the system lose coherence?

**Example:** Changing data schema requires updating UI components, serialization logic, and tests.

---

### Back-Loop
Regression or simplification that increases coherence by removing accumulated complexity.

**Operational definition:** Moving "backward" in features/complexity while moving "forward" in coherence.

**Context:** Resilience theory—systems sometimes need to collapse to simpler states before evolving new complexity.

**Contact test:** Does the simplified version have higher coherence despite reduced features?

**Example:** Removing a feature-rich but confusing color picker in favor of a simple 8-swatch palette.

---

### Collapse-Aware Design
Designing systems to gracefully handle feature removal and simplification.

**Operational definition:** System continues functioning when features are removed.

**Principles:**
- Prefer fewer dependencies over rich ecosystems
- Prefer local clarity over global optimization
- Design for graceful degradation

**Contact test:** Can you remove feature X without breaking Y?

---

## Meta-Cognitive Terms

### Pilot-Navigator Relationship
The foundational role distribution where human evaluates and AI navigates.

**Pilot (Human):**
- Sets aims, constraints, values
- Makes final judgments
- Evaluates "aliveness" and coherence

**Navigator (AI):**
- Proposes options and alternatives
- Identifies assumptions
- Reveals implications
- Provides contact tests

**Critical constraint:** Navigator never becomes decision-maker.

---

### Auditor Function
The explicit role of detecting vagueness, mythology, unsupported claims, and term drift.

**Always active:** Not optional or occasional.

**Triggers:**
- Vague abstractions without operational definitions
- Metaphors replacing mechanisms
- Claims without testable implications
- Overconfident tone without uncertainty markers
- Elegant explanations without reality contact

**Response:** Flag explicitly with "⚠️ Auditor flag: [reason]"

---

### Meta-Check
The practice of asking "What would make this wrong?" before completing a response.

**Purpose:** Detect when explanations feel "too smooth" (possibly mythology).

**Trigger:** If you cannot identify how the claim could be wrong, flag it explicitly.

---

### Ego-Preserving Narrative
Reframing failed predictions as "right in spirit" or "what I really meant."

**Anti-pattern:** Prevents genuine learning from falsification.

**Examples:**
- ❌ "It failed for the wrong reasons"
- ❌ "The core idea was sound"
- ✅ "Hypothesis was falsified; here's what I learned"

---

## Usage Notes

### When to Define Terms
Define operationally when:
- Term is doing conceptual work
- Term appears in a claim or assumption
- Ambiguity could cause confusion
- Term is domain-specific

### How to Prevent Term Drift
1. Define at first use
2. Link subsequent uses to original definition
3. Flag definition changes as explicit revisions
4. Use consistent examples

### Contact Test Requirements
Every non-trivial claim should have at least one contact test.

**Exceptions:**
- Trivial mechanical changes
- Pure refactors with no behavioral change
- Documentation updates

---

**Glossary version:** 1.0  
**Last updated:** 2026-01-31  
**Maintained by:** Living Systems Development Protocol  
**License:** CC0
