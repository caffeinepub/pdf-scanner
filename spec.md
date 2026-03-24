# PDF Scanner

## Current State
Scanify is a full-featured mobile document scanning app with camera, gallery, OCR, AI detection, dark/light themes, and export options built into the scanner flow.

## Requested Changes (Diff)

### Add
- A "Convert Images" section/page where users can select multiple pictures from their device (file input accepting images)
- Preview selected images in a grid
- Conversion options: PDF, PNG, JPG
- Convert button that processes selected images into the chosen format and triggers a download
- For PDF: combine all selected images into a single multi-page PDF using jsPDF or canvas-based approach
- For PNG/JPG: if single image selected, convert and download; if multiple, download as a zip or individually
- Progress indicator during conversion
- Option to clear/reset selection

### Modify
- Add a "Convert" entry in the main navigation or dashboard so users can access this feature easily

### Remove
- Nothing removed

## Implementation Plan
1. Create a new `ConvertImages` page/component
2. File input (multi-select, accepts image/*) with drag-and-drop support
3. Image preview grid with remove-individual option
4. Format selector: PDF / PNG / JPG toggle
5. Convert & Download button with loading state
6. Use canvas API to handle PNG/JPG conversion; use jsPDF (already likely available or via dynamic import) for PDF generation
7. Wire the page into the router and add nav link
