

## Plan: Tighten Messages page layout on wide screens

**Problem**: The Messages page uses `max-w-2xl` (672px) which is fine for width, but the conversation list items stretch edge-to-edge within that container. On wide monitors the content feels spread out.

**Solution**: A single-file change in `src/pages/Messages.tsx`:

1. Reduce the outer container max-width from `max-w-2xl` to `max-w-lg` (512px) so the conversation list stays compact and centered on wide screens.
2. This keeps the layout comfortable on mobile (unchanged) while pulling everything closer together on desktop.

**File**: `src/pages/Messages.tsx` — change `max-w-2xl` → `max-w-lg` on the container div (line ~141).

