# Glossary

## Background

Core assumptions about the application:
1. It is a drawing tool. 
2. It is intended for people who are not artists (who perhaps even think of themselves as people who cannot draw), are not familiar drawing software tools but would draw if they felt it was accessible to them.
3. It is built around Christopher Alexander’s ideas around unfolding wholeness. In this approach a drawing grows from a basic seed (like a single dot on a piece of paper). The drawing “grows” through a sequence of transformations.
4. Each transformation is a small (even minimal) change that enhances what already exists in the drawing. Good transformations build upon what already exists in the drawing and, when done well, feels like a natural evolution.
5. The sequence of transformation also implies that the drawing has a timeline. It should be possible, for example, to present not just the resulting static image but an animation that shows how it grew and evolved from a seed. 
6. The drawing experience should feel playful and easy to use, almost like a game. In fact, after we establish the foundations of drawing in this tool we will explore the possibility of transforming it into a collaborative multi-player game in which  participants take turns making transformations to the drawing.
7. One of the things that make the drawing experience accessible is an always-present guide that explicitly presents users with the relevant possibilities available to them an any given time. This is different from most existing software tools which typically provide a user with a lot of tools and a lot of options. This can be intimidating and confusions for non-professional users who have to learn the tool and the mental models that were build into it.  
8. The drawing process was conceived for (but may nto be limited to) creating mandala-like drawings. Mandalas usually have one very obvious center around which shapes are added using symmetries and repetitions. The drawing created by this application are not limited to just one center, but they will also be built using symmetries and repetition. 

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

## Application Specific Terms

### Canvas	
The canvas is an infinite vector graphics drawing area.

### Drawing Pane	
Within the Canvas there is a finite drawing pane. This is the space in which the drawing happens. The drawing pane has a shape (and a size) both of which can be modified.

### True North	
The Drawing Pane  has a north-like orientation (vertically up when looking at the drawing pane right side up).

### Drawing Object	
A drawing is made up a of drawing objects and the relationships between them. 

### Parent Drawing Object	
A drawing object is always related to a parent drawing object. 
The Drawing Pane itself is the “root” Drawing Object. 
The first drawing object created by a user will therefore be related to the Drawing Pane or to another drawing object.
The Drawing Pane is therefore a kind of “root drawing object” that contains everything else.

### Guide Drawing Object	
Some drawing objects are created as guides around which other drawing objects are created and arranged. 
Guide drawing objects need to be visible while drawing but are not visible in the resulting drawing.  
Guide drawing objects need to visually distinct from other drawing objects. 

### Orientation Axis	
Every drawing object has an orientation axis.

### Orientation	
The orientation of a Drawing Object is determined by the angle between its Orientation Axis and the Orientation Axis of its Parent Drawing Object. 

### Place	
A place is a fundamental Drawing Object  which signifies a location within the Drawing Pane. A place functions as a reference point to which other drawing objects can be anchored. A place is a Guide Drawing Object and should be appear as such. 

### Line Segment	
A line segment is a Drawing Object that has two ends.

### Line Segment End	
A line Segment end is a drawing object that is always related both to both a Line Segment and to a Place. 
It can never exist on its own. 
The position of the line segment end in the drawing is taken from the place to which it is related.
However the line segment end and the place itself are distinct drawing objects. 
There are different operations that can be done to a line segment end and to a place, therefore it is important to distinguish between them.

### Scaffolding
Scaffolding drawing objects are drawing objects that serve as reference for other drawing objects. 
They are visible while making the drawing but not visible in the drawing itself. 
All drawing objects can serve as scaffolding, however some drawing objects are scaffolding only. 
For example a place is just scaffolding. A line can be either scaffolding or visible. 
They can be used for placing other drawing objects (Which can also be both skeleton or visible drawing objects)
They can be used for setting relative places, eg: places that occur where two lines cross.
They can be used for setting relative dimensions.

### Circular Field
A circular field is a scaffolding drawing object. 
The circle is always related to a place.
The center of the circle is at the position of its parent place. 
A radius defines the size of the field and generated a circular scaffolding (the circumference). 

### Axis
An axis is a scaffolding drawing object.
It is child of a place drawing object (a single place can have numerous axis children drawing objects).
It appears as a straight dashed line that extends to the edges of the canvas. 
It has an orientation axis that is relative to the orientation of its parent place (when the parent place orientation changes so does the orientation of the axis).
An axis can be unidirectional or bidirectional.

### Unidirectional Axis
A Unidirectional axis extends from a place in one direction only.

### Bidirectional Axis
A bidirectional axis extends from a place in both directions.

### Handle
Handles are visual queues to assist the user in understanding where in the drawing they can interact in order to make a desired change. 
They should appear when a drawing object and a transformation have been selected and should let the user know “where to grip” the selected drawing objects in order to make the desired transformation. 
Handles should be clearly distinct in order to attract the attention of the user (default: a small full green square). 
Handles should disappear when a transformation is completed (kept or discarded).

### Repeater
Repeaters are a family of scaffolding objects that repeat descendant drawing objects. 
Each repeater drawing object provides a different way of generating repetition.
When a drawing object is added to a repeater, it and the additional (repeated) drawing objects that are created are called echoes.

### Echo Drawing Object
An echo drawing object is a drawing object generated by a repeater.
All the echo drawing objects are related to each other.
Any echo drawing object can be selected and transformed (like any other drawing object).
When an echo drawing object is modified, all its echoes are modified in the same way.

### Echo Group
A set of related drawing object echoes within a repeater.

### Circular Repeater
A circular repeater is a scaffolding drawing object generates a number of unidirectional axes that emanate from its center. 
Places added to the repeater in relation to any of its axis are repeated on its axes.

### Alternating Repetition
In a repeater an alternating repetition pattern can be applied to a drawing object.
Different drawing objects within the same repeater can have different repetition patterns.
An alternating pattern is dictates on which nodes a drawing object should exist and on which nodes it should not exist. 
The alternating pattern is expressed as: number of continuous nodes to show and number of continuous nodes to skip.
Example 1 - a basic alternating pattern is: show 1, hide 1; eg: in a 16 node circular repeater this would cause a drawing object to appear on every other nodes - 8 in total.
Example 2 - a pattern of show2, hide2; eg: in a 16 node circular repeater this would cause a drawing object to appear on 4 pairs (also a total of 8 instances) of axes with 4 pairs of axes with no drawing object.
Example 3 - a pattern of show3, hide1; eg: in a 16 node circular repeater this would cause a drawing object to appear 4 times on 3 continuous axes with one empty axis between each set of 3. 
When a alternating repetition pattern is created a user can decide on which axis in the repeater it should begin.
This would make it possible, for example, to create different repetitions on odd and even axes.  

## Orhpaned Echo
An echo drawing object can be removed from its repeater and continue to exist as an independent drawing object, when this happens it becomes an orphan. 
An orphaned echo drawing object does not change when any of its formerly related drawing objects are csuggesthanged. 

### Circular Repeater
A cicrular repeater generates  

## Drawing Guide
In most drawing tools a user faces many tools and choices that can be overwhelming and complicated to use (unless you are a trained professional). 
In this application there they are constantly guided. 
The drawing guide always makes clear to a user where they are and what they can do next (which depends on where they are).
As a result, the user experience is simplified because at any given time the user only has access to relevant tools.
The drawing guide ias based on a core drawing process that repeats itself.

### Fundamental Drawing Process

The drawing is created by repeatedly following the fundamental drawing process. 
The drawing guide should constantly reflect to the user where they are in the fundamental drawing process.

#### Observe
Look at the drawing, notice where you attention goes, until you get a sense of what you want to do next.

#### Select 
Select the drawing object you wish to act on.
If the drawing is new, the only drawing object that is available is the canvas itself.
In complex drawings that have a deep hierarchy of related drawing objects, the selection process may take numerous selection operations, for example:
- You select a drawing object, but in a complex drawing it may not be the drawing object you intended to select.
- so you then select another drawing object that is likely related to the first object you select. This can be a drawing object to which it is related (traveling up the drawing object hierarch) or a drawing object that is related to it (traveling further down the drawing object hierarch).

#### Transform
There are basic transformations:
1. Delete: remove the selected drawing object from the drawing.
2. Move: Change the position of the selected drawing object.
3. Add: add another drawing object related to the selected drawing object.
4. Change: modify a special property of the selected drawing object.

#### Complete Transformation
There are two ways to complete a transformation:
1. Commit: indicate that the transformation is complete and should become a part of the drawing.
2. Reject: indicate htat the transformation is not desirable and should be discarded and not become a part of the drawing.

