DURGA DESIGNS — IMAGE GUIDE
============================

Replace all emoji placeholders with real photos in these folders.

RECOMMENDED FOLDERS:
  images/                    — Main product/brand images
  images/products/           — Individual product photos
  images/gallery/            — Shop & boutique photos
  images/categories/         — Category cover photos

NAMING CONVENTION (keep these exact filenames):
  og-home.jpg                — Homepage Open Graph image (1200x630px)
  logo.png                   — Main logo (PNG with transparency)
  favicon.ico                — Browser favicon (32x32)

CATEGORY COVERS (aspect ratio 4:3):
  cat-ladies-suits.jpg
  cat-sarees.jpg
  cat-abayas.jpg
  cat-unstitched.jpg
  cat-kids.jpg
  cat-laces-buttons.jpg
  cat-modern.jpg
  cat-tailoring.jpg

PRODUCT PHOTOS (aspect ratio 3:4 — portrait):
  products/suit-1.jpg
  products/suit-2.jpg
  products/saree-1.jpg
  products/saree-2.jpg
  products/abaya-1.jpg
  products/abaya-2.jpg
  products/kids-1.jpg
  products/unstitched-1.jpg
  products/lace-1.jpg
  products/modern-1.jpg

GALLERY PHOTOS (square 1:1):
  gallery/shop-exterior.jpg
  gallery/shop-interior.jpg
  gallery/suits-display.jpg
  gallery/sarees-display.jpg
  gallery/abayas-display.jpg
  gallery/tailoring-1.jpg
  gallery/tailoring-2.jpg
  gallery/laces-buttons.jpg

ABOUT/FEATURE PHOTOS (4:3):
  about-shop.jpg             — Used on About page
  misha-tailoring.jpg        — Used on Home & Tailoring pages
  about-tailoring.jpg        — Used on About page tailoring section

PHOTO REQUIREMENTS:
- Minimum 800px wide (1200px+ recommended for category/hero images)
- Well-lit, clear, real product photos
- No heavy filters
- JPEG format for photos, PNG for logo/graphics
- Compress before upload (use tinypng.com)
- Add descriptive alt text in the HTML when replacing placeholders

HOW TO ADD A PRODUCT PHOTO:
1. Save photo as images/products/your-product.jpg
2. Open the relevant HTML file (collections.html or index.html)
3. Find the product card you want to update
4. Replace the emoji placeholder div with:
   <img src="images/products/your-product.jpg" alt="Descriptive product name" loading="lazy" />
5. Update the product name, category and WhatsApp link

HOW TO UPDATE WHATSAPP LINKS:
All product WhatsApp links follow this format:
https://wa.me/447907975847?text=Hi%20Durga%20Designs%2C%20I%20am%20interested%20in%3A%20PRODUCT%20NAME.%20Is%20it%20available%3F

Replace PRODUCT NAME with the URL-encoded product name.
(Spaces = %20, comma = %2C, colon = %3A)

GOOGLE MAPS EMBED:
On index.html and contact.html, replace the .map-placeholder div with a real embed:
1. Go to maps.google.co.uk
2. Search: Shop 606 Stratford Road Sparkhill Birmingham B11 4AP
3. Click Share > Embed a map
4. Copy the <iframe> code
5. Wrap it in: <div class="map-embed">YOUR IFRAME HERE</div>

SOCIAL MEDIA LINKS TO UPDATE:
Once accounts are confirmed, update these in all HTML files:
  Facebook:  https://www.facebook.com/durgadesignsbirmingham
  Instagram: https://www.instagram.com/durgadesignsbirmingham
  TikTok:    https://www.tiktok.com/@durgadesignsbirmingham
  Google:    https://g.page/r/durgadesigns/review

ANALYTICS (add before </head> in each HTML file):
  Google Analytics: Replace UA-XXXXXXXXXX with your tracking ID
  Google Search Console: Add verification meta tag
