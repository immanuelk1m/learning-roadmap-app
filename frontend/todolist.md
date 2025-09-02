# PDF Upload: Page Selection to Gemini (Max 20)

## Tasks

- [x] Locate current PDF upload flow and analysis trigger
- [x] Plan UI/logic changes for selecting pages (max 20)
- [x] Add page thumbnails and selection UI in `UploadPDFButton`
- [x] Enforce selection limit and Select All behavior (<=20)
- [x] Generate sliced PDF (selected pages only) on client
- [x] Upload sliced PDF, set correct metadata, trigger analysis
- [x] Default selection: all pages if <=20, else first 20
- [x] Right-side page panel with large preview per page
- [x] Widen modal and rebalance columns for album view
- [x] Move selector to left; file info to right
- [x] Add range input (e.g., 1-12, 15, 19) with 20-page cap
- [x] Sync range input dynamically with current selection
- [ ] Minor UX: selected count indicator and warnings
- [ ] Validate end-to-end on `/subjects/[id]` modal

## Notes

- Sliced PDF is constructed client-side using `pdfjs-dist` (render pages) + `@react-pdf/renderer` (assemble into PDF) to avoid adding new server libs.
- We keep the analyze API unchanged; since storage now has the sliced file, Gemini only receives selected pages.
- We do not change DB schema; `page_count` will reflect the selected page count.
