# Scanify - Dynamic Pictures & Smart Camera

## Current State
Scanify is a full-featured document scanning app with camera scanning, real-time document tracking, AI document type detection, OCR, and multiple export options. Camera auto-starts using the rear camera by default.

## Requested Changes (Diff)

### Add
- Dynamic pictures gallery: browsable scanned images with thumbnails, full-screen lightbox, swipe navigation, rename/delete/share actions
- Smart camera enhancements: pinch-to-zoom, tap-to-focus with visual ring indicator, exposure lock indicator, rule-of-thirds grid overlay, improved animated document edge detection, zoom level display, tilt/distance hints

### Modify
- ScanPage: integrate smart camera features (zoom, tap-to-focus, exposure feedback, better edge detection)
- DashboardPage: show recent scans as dynamic picture tiles
- App.tsx: add GalleryPage route
- Navbar: add Gallery link

### Remove
- Nothing removed

## Implementation Plan
1. Enhance ScanPage with smart camera: pinch-to-zoom, tap-to-focus visual ring, zoom indicator, exposure feedback, improved corner markers
2. Add GalleryPage with dynamic picture grid, full-screen lightbox viewer, swipe navigation, and image management
3. Add gallery route to App.tsx
4. Update DashboardPage with recent scans as picture tiles
5. Update Navbar with Gallery link
