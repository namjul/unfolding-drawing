# Feature Analysis: Unfolding Drawing App

**Prompt:** List all features implemented in this codebase. Group them into: core features, supporting features, experimental features, dead features. Suggest which features should be removed to simplify the system.

---

## **CORE FEATURES**

These are essential to the drawing system's fundamental purpose:

**Data Model & Persistence:**
- Place hierarchy (parent-child relationships)
- Line segments with endpoints
- Evolu local-first database
- Transformation history/audit trail

**Basic Drawing Operations:**
- Add/move/delete/rotate places
- Add/delete line segments
- Selection system (place, line, drawing pane)
- Hierarchical coordinate system (parent-relative positioning)

**Primary UI:**
- 4-step workflow (Observe → Select → Transform → Execute)
- Drawing canvas with SVG rendering
- DrawingGuide control panel

---

## **SUPPORTING FEATURES**

These enhance core functionality but aren't strictly required:

**Enhanced Geometry:**
- Axes (orientational guides on places)
- Circular fields (circles centered on places)
- Bending circular fields (curved line segments)
- Place-on-axis positioning
- Place-on-circle positioning
- Split line operation (insert place mid-segment)

**UI Enhancements:**
- DrawingDNAPane (inspection/debugging)
- DrawingObjectsList (tree view with rename)
- TransformationsList (history view)
- ViewControls (zoom/pan/reset)
- Relationship visualization (dashed parent/child lines)
- Visual feedback (scaffolding marks, orientation axes)
- Pan mode (Space key + mouse)
- Zoom (mouse wheel, pinch)

**Naming System:**
- Auto-naming (Place 1, Line 1, etc.)
- Inline rename with uniqueness validation
- Line segment end name resolution

---

## **EXPERIMENTAL FEATURES**

These are complex, fully implemented, but represent significant conceptual/UX complexity:

**Circular Repeater System:**
- Add circular repeater (creates N radial axes)
- Modify repeater count (235+ lines, extremely complex)
- Echo groups (synchronized places across repeater axes)
- Alternating patterns (show/skip/start on axes)
- Multi-echo operations (move/rotate synced across all axes)

**Evidence of complexity:**
- Lines 3779-4013 in App.tsx handle repeater modification
- Involves axis cloning, echo group management, polar coordinate scaling, index renumbering
- Most complex feature by far (~10x more code than other transforms)

**Contact test for "experimental":** This feature works but adds significant cognitive load. Usage data would show whether users actually use repeaters or abandon them due to complexity.

---

## **DEAD FEATURES**

**None detected.** 

All implemented features show active usage:
- Every schema table is queried and rendered
- Every transformation has UI controls
- Every utility function is imported and called
- No commented-out major features
- No TODO markers indicating abandonment

**However:** Absence of test files (`test/*.test.js`) suggests testing infrastructure is configured (Brittle) but unused. The test setup itself might be considered "dead infrastructure."

---

## **SIMPLIFICATION RECOMMENDATIONS**

### **High-Confidence Removals:**

1. **Circular Repeater System (Priority: HIGH)**
   - **Rationale:** 235+ lines for modify operation alone, extreme complexity
   - **Files:** Remove circularRepeater table, repeaterEchoGroupId fields, alternating* fields
   - **Code:** Lines 3744-4103, 3115-3233, portions of coordinate system
   - **Contact test needed:** Do users actually use repeaters? Check transformation history for addCircularRepeater frequency
   - **Impact:** Would remove ~500 lines, simplify coordinate system significantly
   - **Mythology risk:** Assuming repeaters are "living centers" without usage evidence

2. **Bending Circular Fields (Priority: MEDIUM)**
   - **Rationale:** Adds geometric complexity, curved lines may not be essential
   - **Files:** Remove bendingCircularField table, bentSegmentPath.ts
   - **Code:** Lines 202-338, 4320-4385, rendering logic
   - **Contact test needed:** Do users bend lines or use only straight segments?
   - **Impact:** ~300 lines removed, simpler line rendering

3. **DrawingDNAPane (Priority: LOW)**
   - **Rationale:** Debugging/inspection tool, not essential for drawing
   - **Files:** DrawingDNAPane.tsx, DrawingObjectsList.tsx, TransformationsList.tsx
   - **Code:** Entire components (~400 lines)
   - **Contact test:** Is this used for learning/debugging or ignored?
   - **Impact:** Cleaner UI, ~500 lines removed
   - **Alternative:** Keep DrawingObjectsList for rename functionality, remove TransformationsList

4. **Relationship Visualization Lines (Priority: LOW)**
   - **Rationale:** Visual clutter, dashed lines showing hierarchy
   - **Files:** drawingRelations.ts, rendering code
   - **Contact test:** Do users enable/disable this? Is it helpful or distracting?
   - **Impact:** ~200 lines, cleaner canvas

### **Medium-Confidence Removals:**

5. **Split Line Operation (Priority: MEDIUM)**
   - **Rationale:** Complex async operation with refresh cycles
   - **Files:** splitLineHierarchy.ts, async logic in App.tsx
   - **Code:** Lines 3014-3052, 4127-4248
   - **Contact test:** How often do users split lines vs. just adding new places?
   - **Alternative:** Users can achieve similar results with delete + add two lines
   - **Impact:** ~300 lines removed, simpler state machine

6. **Alternating Pattern System (Priority: MEDIUM)**
   - **Rationale:** Even without full repeater removal, alternating patterns add complexity
   - **Fields:** alternatingShow, alternatingSkip, alternatingStart
   - **Code:** Lines 776-791, UI controls, echo filtering logic
   - **Contact test:** Do users actually use skip/show patterns or want all echoes?
   - **Impact:** ~150 lines, simpler repeater logic

### **Low-Confidence (Require Usage Data):**

7. **Circular Fields (Priority: UNKNOWN)**
   - **Rationale:** May or may not be a strong center
   - **Contact test needed:** Are circles essential drawing primitives or rarely used?
   - **Impact if removed:** ~400 lines, simpler schema
   - **Keep if:** Usage shows they're frequently created/modified

8. **Axes System (Priority: UNKNOWN)**
   - **Rationale:** May be core to "unfolding" drawing metaphor or underused
   - **Contact test needed:** Do axes strengthen place centers or add clutter?
   - **Impact if removed:** ~500 lines including geometry utilities
   - **Keep if:** Axes are validated as essential to drawing workflow

---

## **RECOMMENDED SIMPLIFICATION PATH**

**Phase 1 (Contact Tests Required):**
1. Add analytics/logging to track transformation frequency
2. Run usage study for 2-4 weeks
3. Identify which transforms are never/rarely used

**Phase 2 (High-Confidence Removals):**
1. Remove circular repeater system (~500 lines)
2. Remove bending fields (~300 lines)
3. Remove DrawingDNAPane or reduce to minimal tree view (~300 lines)

**Expected impact:** ~1,100 lines removed (19% reduction from 5,686-line App.tsx), significantly simpler coordinate system, reduced cognitive load

**Phase 3 (Evidence-Based):**
4. Based on usage data, evaluate axes, circular fields, split-line
5. Remove features with <5% usage rate
6. Consolidate remaining features to strengthen core centers

---

## **ANTI-MYTHOLOGY WARNING**

⚠️ **These recommendations assume complexity reduction increases coherence.**

**Contact tests needed before removal:**
- Circular repeaters may be the strongest center for some users despite complexity
- Bending may be essential for organic drawing feel
- Axes may enable unfolding patterns not yet discovered

**Do not remove features based on code complexity alone.** Usage evidence is required to distinguish:
- **Dead structure:** No usage, blocks evolution → remove increases life
- **Complex center:** High cognitive load but strong organizing power → removal decreases life

**Next step:** Instrument the transformation recording system to log timestamps, then analyze which transforms are actually used over representative sessions.
