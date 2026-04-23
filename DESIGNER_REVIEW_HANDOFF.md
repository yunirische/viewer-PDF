# Designer Review Handoff

This repository now contains the current `pdf_spec` web UI used for designer review.

## What changed

- replaced the old empty PDF placeholder with a dedicated `EmptyState` component
- added drag-and-drop support for PDF upload
- added active dropzone border highlight on drag over
- unified successful upload feedback to `toast.success('Документ загружен')`
- redesigned the PDF split divider with a visible hover handle
- extracted the PDF toolbar into a separate `Toolbar` component
- moved page navigation and zoom controls into the top toolbar
- added print, download, and `new document` actions to the toolbar
- restyled the PDF canvas area with a softer stage background and elevated canvas presentation
- added `framer-motion` and animated PDF appearance with fade/scale-in

## Files touched for this pass

- `src/App.tsx`
- `src/components/EmptyState.tsx`
- `src/components/PdfSourceViewer.tsx`
- `src/components/Toolbar.tsx`
- `src/components/workflow/useWorkflowActions.ts`
- `src/styles.css`
- `package.json`
- `package-lock.json`

## What the designer should re-check

- empty upload state clarity and perceived affordance
- dropzone hover feedback during drag-and-drop
- visibility and usability of the resizable divider
- toolbar density, grouping, and scanability
- PDF canvas presentation and perceived readability
- whether the new `New document` action is clear enough in the toolbar
- whether page and zoom controls feel balanced on desktop widths
- whether any mobile or narrow-width regressions are visible after the toolbar extraction

## Verification

- local production build passes with `npm run build`
