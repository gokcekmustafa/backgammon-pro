# Responsive Layout Specification

## Overview

This document defines the responsive layout behavior of the Backgammon Pro game interface across desktop, tablet, and mobile viewports. Six distinct layouts are specified, each describing how the game board, chat, player panels, and controls are positioned and scaled.

## Layout Canvas

The game interface contains five primary visual regions:

| Region                    | Role                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Board**                 | The backgammon board (15 checkers per side, 24 points, bar, home boards, doubling cube) |
| **Chat**                  | Message history and input field for in-game communication                               |
| **Player Panel (Top)**    | Opponent information (name, rating, captured checkers count, borne-off count)           |
| **Player Panel (Bottom)** | Current player information (name, rating, captured checkers, borne-off count)           |
| **Controls**              | Dice display, roll button, double button, resign button, game/match score               |

## Breakpoint Reference

| Layout           | Media Query Criteria                               | Typical Devices                       |
| ---------------- | -------------------------------------------------- | ------------------------------------- |
| Desktop          | `min-width: 1440px`, landscape                     | 1920×1080 monitors, 2560×1440         |
| Laptop           | `1025px ≤ width ≤ 1439px`, landscape               | 1366×768, 1440×900                    |
| Tablet Landscape | `768px ≤ width ≤ 1024px`, `orientation: landscape` | iPad (1024×768), iPad Pro (1366×1024) |
| Tablet Portrait  | `481px ≤ width ≤ 1024px`, `orientation: portrait`  | iPad (768×1024), iPad Pro (1024×1366) |
| Mobile Landscape | `width ≤ 768px`, `orientation: landscape`          | iPhone Plus/Max in landscape          |
| Mobile Portrait  | `width ≤ 480px`, `orientation: portrait`           | Phones in portrait                    |

---

## 1. Desktop (1920×1080)

### Board Position

- Vertically centered in the primary content column
- Horizontally offset left of center to balance the right-side chat panel
- Board baseline size: approximately one-third of viewport width
- Aspect ratio preserved (board width-to-height approximately 2.2:1)

### Chat Position

- Fixed-width right panel, 340px wide
- Full viewport height
- Contains message history scrolling to fill the panel height
- Input field pinned to the bottom of the panel
- Separated from the play area by a visible divider

### Player Panels

- **Top panel (opponent):** Positioned directly above the board. Horizontal strip containing name, rating, captured checkers count, borne-off count. Width matches the board width.
- **Bottom panel (current player):** Positioned directly below the board. Same structure as the top panel, with additional indicators for active turn and available moves.

### Control Buttons

- Arranged in a horizontal strip below the bottom player panel
- Dice display centered above or within this strip
- Primary controls: Roll Dice, Double, Accept Double, Resign
- Buttons have visible labels and are sized for mouse interaction (minimum 36px height)
- Inactive buttons are visually dimmed

### Scaling Rules

- Board size is derived from viewport height: `board_height = vh × 0.55`, capped at 380px
- Board width follows from aspect ratio
- All other elements scale relative to the board size
- Text: 14px–16px base, proportionally scaled
- Padding and margins: fixed values, consistent spacing

### Minimum Supported Resolution

1440 × 900. Below this width, the layout transitions to the laptop breakpoint.

---

## 2. Laptop (1366×768)

### Board Position

- Centered in the available space between the left edge and the chat panel
- Slightly smaller than desktop to account for reduced viewport height

### Chat Position

- Right panel, reduced to 280px width
- May be collapsed to a narrow tab (40px) with an expand toggle
- When collapsed, messages are hidden and a notification badge shows unread count
- Full-height when expanded

### Player Panels

- Same above/below arrangement as desktop
- Compact layout: name and rating on a single line
- Captured and borne-off counts shown as icon+number, no labels

### Control Buttons

- Same arrangement as desktop
- Compact sizing: 32px minimum height
- Labels shortened or replaced with icons where possible
- Roll dice button remains prominent

### Scaling Rules

- Board height: `vh × 0.50`, capped at 340px
- Text: 13px–14px base
- Touch targets remain at mouse-friendly sizes (no touch optimization needed)

### Minimum Supported Resolution

1024 × 768. Below this width, the layout transitions to a tablet breakpoint.

---

## 3. Tablet Landscape (1024×768)

### Board Position

- Centered in the viewport as the primary visual element
- Chat panel is not displayed by default, maximizing board space
- Board occupies the central region, extending from near the top to near the bottom

### Chat Position

- Hidden by default. Activated via a toggle button in the top or bottom toolbar.
- Opens as a slide-in overlay from the right edge
- Overlay width: 320px, covering the board
- Contains a close button, message history, and input field
- System events (dice rolls, moves) displayed as transient overlays on the board, not in chat

### Player Panels

- **Top panel:** Minimal strip above the board. Shows opponent name, rating, and captured count as compact badges.
- **Bottom panel:** Similar minimal strip below the board. Current player indicators.
- Panels use icon-based indicators with numeric values instead of labels.

### Control Buttons

- Positioned in the bottom strip alongside the bottom player panel
- Touch-optimized: minimum 44×44px tap targets
- Primary controls visible: Roll Dice, Double, Resign
- Secondary controls accessible via an overflow menu (⋯)
- Dice shown as large visual elements (not text), centered in the control area

### Scaling Rules

- Board width: `vw × 0.65` (leaving room for the overlay and controls)
- Board height follows from aspect ratio; if it exceeds `vh × 0.70`, scale down to fit
- Touch targets: minimum 44px in any dimension
- Text: 12px–14px base
- Chat overlay appears above the board with a semi-transparent backdrop

### Minimum Supported Resolution

768 × 480 effective viewport. Below this, the layout transitions to mobile landscape.

---

## 4. Tablet Portrait (768×1024)

### Board Position

- Centered horizontally, positioned in the upper portion of the viewport
- Board width is constrained by the narrow viewport
- Board height reduced proportionally, leaving room for panels and controls below

### Chat Position

- Same overlay behavior as tablet landscape
- Toggle button in the bottom control bar
- Overlay slides up from the bottom (sheet style) instead of from the side
- Sheet height: 60% of viewport height when expanded
- Contains recent messages and input field

### Player Panels

- Above and below the board, but more compact than landscape
- Name truncated with ellipsis if too long
- Statistics shown as compact badge rows
- Active turn indicator uses a colored highlight or icon rather than a panel change

### Control Buttons

- Below the bottom player panel, in a single compact row
- Touch-optimized: 44px minimum tap targets
- Dice display integrated into the control row, visually prominent
- Double and Resign buttons may be moved to an overflow menu to save space
- Roll Dice is the primary action, visually emphasized

### Scaling Rules

- Board width: `vw × 0.80` (max 580px)
- Board height constrained by aspect ratio; if total board+panels+controls exceeds viewport height, board size reduces
- Total game content (board, panels, controls) must fit without vertical scrolling
- Text: 12px–13px base
- If the board cannot render at a minimum playable size (determined by touch target minimums), fall back to a zoomed/scrolling mode

### Minimum Supported Resolution

481 × 769. Below this width, the layout transitions to a mobile breakpoint.

---

## 5. Mobile Landscape (480×320 typical, up to 736×414)

### Board Position

- Fills the majority of the viewport
- Board is the primary and dominant element, occupying the full available width and most of the height
- No persistent panels or sidebar — every pixel is allocated to the board when possible

### Chat Position

- Not visible by default
- Activated via a compact chat icon (💬) overlaid in the corner of the board
- Opens as a full-screen overlay when tapped
- Full-screen chat: message history fills the screen, input field at bottom, close button at top
- Returns to board view when dismissed

### Player Panels

- No dedicated panel space
- Player information is overlaid on the board edges:
  - Opponent name and captured count: top-left corner of the board
  - Current player name and captured count: bottom-left corner of the board
- Labels are semi-transparent to avoid obscuring the board
- Active turn shown by a colored indicator or subtle glow on the active player's label

### Control Buttons

- Overlaid on or adjacent to the board, positioned to avoid covering the playing area
- Dice display: integrated into the control area at the bottom-center of the screen
- Key controls and their placement:
  - **Roll Dice:** Large button, bottom-center, below the dice display
  - **Double:** Small icon button, top-right
  - **Resign:** Small icon button, accessible via the double button's overflow or a separate menu
- All controls use icons without text labels
- Overflow menu (⋯) in a corner for less common actions

### Scaling Rules

- Board width: `100vw`
- Board height: `100vh − control_area_height`
- If the board's aspect ratio cannot be maintained within these constraints, center the board with letterboxing
- Touch targets: absolute minimum 44×44px, preferably 48×48px
- Text: minimum 11px, content text preferably 12px+
- Player labels: 10px minimum, with high contrast against the board
- The board must be playable — each of the 24 points must be individually tappable

### Minimum Supported Resolution

320 × 320 (effective minimum). Devices narrower than 320px or shorter than 320px in landscape cannot display a playable board.

---

## 6. Mobile Portrait (≤480×800)

### Board Position

**No board is displayed.** The viewport width is insufficient to render a playable backgammon board while maintaining minimum touch target sizes for the 24 points and checkers.

### Chat Position

Not applicable. Chat is not displayed in this layout.

### Player Panels

Not applicable. Player information is not displayed in this layout.

### Control Buttons

Not applicable. Game controls are not displayed in this layout.

### Rotation Prompt

The screen displays a rotation request:

- A device orientation icon animating or indicating rotation to landscape
- Text message: "Rotate your device to landscape to play"
- The prompt must work in both locked and unlocked orientation modes
- If the user rotates to landscape, the layout transitions to Mobile Landscape
- The prompt should have a subtle background (themed, not a plain color)
- No interactive elements other than orientation detection

### Scaling Rules

- The prompt must fill the viewport exactly — no scrolling
- Icon: scalable vector, centered, sized to approximately 30% of viewport width
- Text: centered below the icon, 16px minimum, readable on all screen densities
- Orientation changes are detected and the layout switches immediately

### Minimum Supported Resolution

320 × 480. Below this, the prompt remains displayed but may be scaled to fit.

---

## Reference: Element Sizing Summary

| Element               | Desktop | Laptop | Tablet Land   | Tablet Port    | Mobile Land      | Mobile Port   |
| --------------------- | ------- | ------ | ------------- | -------------- | ---------------- | ------------- |
| Board width (% of vw) | 35–40%  | 38–42% | 65%           | 80%            | 100%             | —             |
| Board max height      | 380px   | 340px  | 70% vh        | constrained    | 100vh − controls | —             |
| Chat panel width      | 340px   | 280px  | overlay 320px | overlay 60% vh | full-screen      | —             |
| Player panel height   | 64px    | 48px   | 40px          | 36px           | overlay          | —             |
| Control button size   | 36px    | 32px   | 44px          | 44px           | 48px             | —             |
| Base font size        | 16px    | 14px   | 14px          | 13px           | 12px             | 16px (prompt) |
| Dice visual size      | 48px    | 40px   | 44px          | 40px           | 36px             | —             |

## Reference: Breakpoint Transition Rules

- Layouts transition at the specified width boundaries
- Orientation changes within the same width band switch between landscape and portrait layouts
- Chat state (open/closed, scroll position) is preserved when transitioning between layouts that support persistent chat (desktop ↔ laptop)
- Chat state is not preserved when transitioning between persistent and overlay-based chat (laptop ↔ tablet)
- Game state (board position, active turn, dice) is preserved across all layout transitions
- The board must not reset or flash during a breakpoint transition
