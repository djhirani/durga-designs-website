# How to Add or Replace Durga Designs Images Later

## The One Rule
**Only ever edit `js/media-map.js`.** That is the only file you need to change to manage all images, videos and products on the website. No other file needs to be touched for image updates.

---

## Where to Place New Images

All images go inside this folder on your computer:

```
durga-designs/
  images/
    Durga-Designs-assets/
      Abaya Collection/     ← abaya photos + videos
      Shalwar Kameez/       ← ladies suits photos
      Products/             ← laces, buttons, accessories
      Shop Photoes/         ← boutique interior & exterior
      Reels/                ← short video reels
      Logo/                 ← logo files (don't change unless rebranding)
```

**You can keep your original filenames** — spaces and capital letters are fine. The website handles them automatically.

If you want to add a new category later (e.g. Sarees, Kids), create a new subfolder:
```
images/Durga-Designs-assets/Sarees/
images/Durga-Designs-assets/Kids Collection/
```

---

## How to Add a New Product

1. Copy the new photo into the correct folder.
2. Open `js/media-map.js` in any text editor (Notepad, TextEdit, etc.).
3. Find the `products: [` section.
4. Scroll to the right category (e.g. `/* ── ABAYA COLLECTION ──`).
5. Copy this block and paste it at the end of that category:

```javascript
,{
  id:           "my-new-abaya",        // unique name, no spaces
  title:        "My New Abaya",        // display name
  category:     "abayas",             // abayas | ladies-suits | unstitched | laces-buttons | sarees | kids | modern
  categoryLabel:"Abaya Collection",   // text shown on the product card
  src:          "images/Durga-Designs-assets/Abaya Collection/My New Photo.jpeg",
  alt:          "My new abaya at Durga Designs Birmingham",
  description:  "Short description of the product.",
  price:        "Ask for price",      // or "£XX" when pricing is ready
  badge:        "New",                // "New" | "Sale" | null
  whatsappMsg:  "Hi Durga Designs, I am interested in My New Abaya. Is it available?",
  active:       true,
  featured:     true,                 // true = show on homepage, false = collections only
  order:        5                     // lower = shown first in its category
}
```

6. Save the file. The website updates automatically — no other changes needed.

---

## How to Replace an Image

### Option A — Same filename (easiest)
Replace the file on disk with a new photo using the **exact same filename**.  
The website updates automatically. No code changes needed.

### Option B — New filename
1. Copy your new photo to the same folder.
2. Open `js/media-map.js`.
3. Find the product by its `id`.
4. Change the `src` value to the new filename.
5. Optionally set `active: false` on the old entry if you want to keep both.

---

## How to Hide an Image

Find the product in `js/media-map.js` and change:
```javascript
active: true
```
to:
```javascript
active: false
```

The image disappears from the website immediately. The file stays on disk — you can re-enable it anytime by setting `active: true` again.

---

## How to Feature an Image on the Homepage

Find the product in `js/media-map.js` and set:
```javascript
featured: true
```

It will appear in the **New Arrivals** section on the homepage.

To remove it from the homepage (keep it in the collections page only):
```javascript
featured: false
```

The homepage shows up to 8 featured products, sorted by category then by `order` number.

---

## How to Change Display Order

Find the products you want to reorder and change the `order` number.  
Lower number = shown first.

```javascript
order: 1   // shown first
order: 2   // shown second
order: 10  // shown later
```

---

## How to Replace the Homepage Hero Image

The hero section currently uses the shop store front photo as a subtle background overlay.

To change the hero to a different photo:

1. Open `js/media-map.js`.
2. Find the `hero:` section near the top.
3. Change the `src` to your new photo path:

```javascript
hero: {
  storeFront: {
    src: "images/Durga-Designs-assets/Shop Photoes/Your-New-Hero.jpeg",
    alt: "Durga Designs boutique at Shop 606 Stratford Road Sparkhill Birmingham",
    active: true
  }
}
```

To turn off the hero image (gradient only):
```javascript
active: false
```

---

## How to Add New Reels / Videos

1. Copy the video file into `images/Durga-Designs-assets/Reels/`.
2. Open `js/media-map.js`.
3. Find the `reels: [` section.
4. Add a new block:

```javascript
,{
  id:       "my-new-reel",
  title:    "New Stock — Durga Designs",
  src:      "images/Durga-Designs-assets/Reels/My New Video.mp4",
  poster:   "images/Durga-Designs-assets/Abaya Collection/Brown_Abaya.jpeg",   // still image shown before play
  alt:      "New stock reel at Durga Designs Sparkhill Birmingham",
  caption:  "New Stock",
  active:   true,
  featured: true,    // true = show in homepage Reels section
  order:    4
}
```

**Important notes on videos:**
- Videos are **never autoloaded** — they only load when a customer taps the play button.
- This keeps the website fast on mobile even with multiple reels.
- Set `poster` to a product photo for a better preview thumbnail.
- Videos should be portrait format (9:16) for best mobile display.
- If a video is very large (over 20MB), only enable it when needed — set `active: false` otherwise.

---

## How to Hide a Reel

Same as hiding a product — set `active: false` in the reel's entry:

```javascript
// To temporarily hide during non-sale period:
active: false
```

The `Five Pee Sale.mp4` (35MB) reel is disabled by default. Only enable it during a sale:
```javascript
// In the "reel-five-pee-sale" entry, change to:
active: true,
featured: true
```

---

## Recommended Image Sizes

| Use | Dimensions | Format | Max file size |
|-----|-----------|--------|---------------|
| Product photos (portrait) | 800 × 1067px | JPEG | 500KB |
| Category covers | 800 × 600px | JPEG | 400KB |
| Gallery photos (square) | 800 × 800px | JPEG | 400KB |
| Shop/about photos (landscape) | 1200 × 900px | JPEG | 600KB |
| Logo | existing file | PNG | — |
| Hero image | 1200 × 900px | JPEG | 700KB |

**Do not upload photos larger than 2MB.** The current logo (1.8MB) and store front (2.4MB) are large — this is acceptable for launch, but compress before uploading any new photos.

---

## Recommended Video Sizes

| Use | Format | Orientation | Max file size |
|-----|--------|-------------|---------------|
| Reels (homepage) | MP4 (H.264) | Portrait 9:16 | 10MB |
| Gallery videos | MP4 (H.264) | Any | 15MB |

Videos over 20MB should only be enabled for specific campaigns, then disabled again.

---

## How to Compress Images Before Upload

**Free online tools (no software needed):**
- [TinyPNG.com](https://tinypng.com) — compresses JPEG and PNG files
- [Squoosh.app](https://squoosh.app) — more control over quality and size
- [Compressor.io](https://compressor.io) — fast and simple

**Steps:**
1. Go to TinyPNG.com
2. Drop your photos onto the page
3. Download the compressed versions
4. Replace the originals in the Durga-Designs-assets folder

**Target:** Get each JPEG under 500KB before uploading to the website.

---

## How to Compress Videos

**Free tools:**
- [HandBrake](https://handbrake.fr) — free, open source, Mac/Windows
- [Clideo](https://clideo.com/compress-video) — free online tool

**Settings in HandBrake:**
- Format: MP4
- Video codec: H.264
- RF quality: 28–30 (higher number = smaller file but lower quality)
- Resolution: keep original or set to 720px wide

---

## File Naming Tips

You can use any filename — the website supports spaces and capital letters.  
However, if you want to keep things consistent, use underscores instead of spaces:

```
Brown_Abaya_New.jpeg     ✅ good
Brown Abaya New.jpeg     ✅ also works
brown-abaya-new.jpeg     ✅ also works
Brown Abaya New !!!.jpeg ❌ avoid special characters like ! ? # & %
```

---

## Launch Images — Quick Reference

### Currently ACTIVE and FEATURED (shown on homepage):
- Brown Abaya
- Sea Green Abaya
- Modern Style Abaya
- Yellow Party Dress
- Blue Shalwar Kameez
- Lace Variety Collection
- Unstitched Suit Collection
- Reels: Reel_1, Reel_2, New Arrivals1

### Currently ACTIVE but not featured (collections page only):
- Professional Look Abaya
- Abaya Collection (group shot)
- Latest Abaya Design
- Latest Shirt Design
- Buttons Collection
- New Arrival Lace
- Laces Main Collection
- Lace Colours Range
- Long Border Lace
- Long Black Lace
- Gallery: all 12 gallery items

### Currently INACTIVE (reserved for future use):
- Latest Collection Abaya, Latest Design Abaya, New Arrivals Abaya
- Long Lace Variety, Modern Lace, New Design Lace, New Buttons, New Collection Lace
- Pipings, Thread colours, Laces 2, Laces 3, Laces Classic
- Reels: New Arrival2, Chora Reel
- Five Pee Sale (35MB — enable only during sale events)
- Abaya video

To activate any of these: find them in `media-map.js` and set `active: true`.

---

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| Image not showing | Check the `src` path is exactly correct (filename and folder) |
| Image showing on collections but not homepage | Set `featured: true` |
| Product appearing in wrong category filter | Check `category` value matches a filter tab slug |
| Reel video not playing | Check the file exists at the `src` path |
| Logo not showing | Check `images/Durga-Designs-assets/Logo/Durga-logo.png` exists |
| Video loading slowly | The video is loaded on demand — this is normal and intentional |

---

*Guide for Durga Designs — Shop 606, Stratford Road, Sparkhill, Birmingham, B11 4AP*  
*Phone/WhatsApp: +44 7907 975847*
