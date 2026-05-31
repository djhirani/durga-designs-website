/* ================================================================
   DURGA DESIGNS — CENTRAL MEDIA MAP
   ================================================================
   IMPORTANT: src paths below point to OPTIMISED copies in images/optimized/
   Original unmodified files remain in images/Durga-Designs-assets/
   To update an image: replace the optimised copy OR add a new optimised
   copy and update the src path here.
   This is the ONE file you edit to manage all website images
   and videos. No other file needs to change for most updates.

   HOW THIS FILE WORKS
   ───────────────────
   Every image and video on the website is defined here.
   The renderer (media-renderer.js) reads this file and
   automatically places the correct images on each page.

   QUICK REFERENCE
   ───────────────
   ✅ Show an image          → active: true
   ❌ Hide an image          → active: false
   ⭐ Show on homepage       → featured: true
   📌 Change display order   → change the order: number
   🖼 Replace an image       → update the src path (or keep same
                               filename and just replace the file)
   ➕ Add a new image        → copy any product block, change the
                               id, title, src and details

   FOLDER STRUCTURE (do not rename these folders)
   ───────────────────────────────────────────────
   images/Durga-Designs-assets/
     ├── Logo/              — logo files
     ├── Abaya Collection/  — abaya product photos + videos
     ├── Shalwar Kameez/    — shalwar kameez photos
     ├── Products/          — laces, buttons, accessories
     ├── Shop Photoes/      — boutique interior & exterior
     └── Reels/             — short video reels

   ADDING NEW IMAGES — step by step
   ──────────────────────────────────
   1. Copy the new photo into the correct folder above.
   2. Scroll to the right section below (e.g. ABAYAS).
   3. Copy any existing product block.
   4. Change:  id        → unique lowercase-hyphenated name
               title     → the product display name
               src       → the file path (copy folder/filename exactly)
               alt       → descriptive text for Google/accessibility
               description → short sentence about the product
               whatsappMsg → message that opens when customer taps Ask
               active    → true to show, false to hide
               featured  → true to show on homepage, false for collection only
               order     → lower number = shown first
   5. Save. The website updates automatically.

   REPLACING AN IMAGE
   ──────────────────
   Option A (same filename): Replace the file on disk with a new
             photo using the EXACT same filename. Website updates
             automatically. No code changes needed.
   Option B (new filename): Update the src value in this file
             to point to the new filename. Set old entry active: false.

   ================================================================ */

const DD_ASSETS = {

  /* ──────────────────────────────────────────────────────────────
     LOGO
     Update src paths if the logo file changes.
  ────────────────────────────────────────────────────────────── */
  logo: {
    main: {
      src: "images/optimized/logo-small.png",
      alt: "Durga Designs logo — South Asian fashion boutique Birmingham"
    },
    cover: {
      src: "images/Durga-Designs-assets/Logo/Durga-Coverpage.png",
      alt: "Durga Designs — Misha Tailoring, Sparkhill Birmingham"
    }
  },

  /* ──────────────────────────────────────────────────────────────
     HERO
     The main image shown behind the homepage hero section.
     Set active: false on one and true on another to swap hero.
     For now the hero uses a CSS gradient — the logo is shown
     as a centred brand mark. Add a full-width shop photo here
     when ready for a photographic hero.
  ────────────────────────────────────────────────────────────── */
  hero: {
    // Store front photo — can be used as hero background overlay
    storeFront: {
      src: "images/optimized/store-front.jpg",
      alt: "Durga Designs boutique at Shop 606 Stratford Road Sparkhill Birmingham",
      active: true
    }
  },

  /* ──────────────────────────────────────────────────────────────
     SHOP PHOTOS
     Photos of the boutique interior and exterior.
     Used on: About page, Gallery, Contact, Tailoring page.
  ────────────────────────────────────────────────────────────── */
  shop: [
    {
      id:          "store-front",
      title:       "Durga Designs — Store Front",
      src:         "images/optimized/store-front.jpg",
      alt:         "Durga Designs boutique front at Shop 606 Stratford Road Sparkhill Birmingham",
      description: "Durga Designs boutique on Stratford Road, Sparkhill, Birmingham.",
      section:     "shop",          // gallery filter category
      active:      true,
      featured:    true,
      order:       1
    },
    {
      id:          "inside-shop-1",
      title:       "Inside Durga Designs — Collections Display",
      src:         "images/optimized/inside-shop-1.jpg",
      alt:         "Inside Durga Designs boutique — ladies fashion collection Sparkhill Birmingham",
      description: "Inside the boutique — ladies suits, sarees, abayas and more on display.",
      section:     "shop",
      active:      true,
      featured:    true,
      order:       2
    },
    {
      id:          "inside-shop-2",
      title:       "Inside Durga Designs — Tailoring &amp; Fashion",
      src:         "images/optimized/inside-shop-2.jpg",
      alt:         "Inside Durga Designs — Misha Tailoring and fashion boutique Sparkhill",
      description: "Durga Designs and Misha Tailoring — fashion and stitching in Sparkhill.",
      section:     "shop",
      active:      true,
      featured:    false,
      order:       3
    }
  ],

  /* ──────────────────────────────────────────────────────────────
     CATEGORIES
     Drives the category card grid on the homepage and collections
     page header. Each entry has a cover image (uses one of the
     product photos as a visual), a slug (matches URL param),
     and display settings.

     TO ADD A NEW CATEGORY: copy a block, give it a unique slug,
     point cover to any relevant product image, set active: true.
  ────────────────────────────────────────────────────────────── */
  categories: [
    {
      id:          "cat-abayas",
      title:       "Abaya Collection",
      slug:        "abayas",
      cover:       "images/optimized/brown-abaya.jpg",
      coverAlt:    "Abaya collection at Durga Designs Birmingham",
      description: "Premium embroidered and plain abayas for every occasion.",
      link:        "collections.html?cat=abayas",
      cta:         "View Collection",
      active:      true,
      order:       1
    },
    {
      id:          "cat-shalwar-kameez",
      title:       "Ladies Suits",
      slug:        "ladies-suits",
      cover:       "images/optimized/yellow-dress.jpg",
      coverAlt:    "Ladies suits and shalwar kameez at Durga Designs Birmingham",
      description: "Stitched and unstitched Pakistani and Indian suits for every occasion.",
      link:        "collections.html?cat=ladies-suits",
      cta:         "View Collection",
      active:      true,
      order:       2
    },
    {
      id:          "cat-unstitched",
      title:       "Unstitched Suits",
      slug:        "unstitched",
      cover:       "images/optimized/unstitched-suits.jpg",
      coverAlt:    "Unstitched suit fabric collection at Durga Designs Sparkhill Birmingham",
      description: "Beautiful unstitched fabric sets for custom tailoring through Misha Tailoring.",
      link:        "collections.html?cat=unstitched",
      cta:         "View Collection",
      active:      true,
      order:       3
    },
    {
      id:          "cat-laces-buttons",
      title:       "Laces &amp; Buttons",
      slug:        "laces-buttons",
      cover:       "images/optimized/lace-variety.jpg",
      coverAlt:    "Laces and buttons collection at Durga Designs Sparkhill Birmingham",
      description: "Wide range of decorative laces, buttons, trims and accessories.",
      link:        "collections.html?cat=laces-buttons",
      cta:         "View Collection",
      active:      true,
      order:       4
    },
    {
      id:          "cat-sarees",
      title:       "Sarees",
      slug:        "sarees",
      cover:       null,
      coverAlt:    "Saree collection at Durga Designs Birmingham",
      description: "Elegant sarees in silk, georgette, chiffon and more.",
      link:        "collections.html?cat=sarees",
      cta:         "Enquire on WhatsApp",
      active:      false,            // hidden until saree photos are available
      order:       5
    },
    {
      id:          "cat-kids",
      title:       "Kids Collection",
      slug:        "kids",
      cover:       null,
      coverAlt:    "Kids Asian fashion collection at Durga Designs Birmingham",
      description: "Adorable traditional and modern outfits for girls and boys.",
      link:        "collections.html?cat=kids",
      cta:         "View Collection",
      active:      false,            // hidden until kids photos are available
      order:       6
    },
    {
      id:          "cat-modern",
      title:       "Modern Fashion",
      slug:        "modern",
      cover:       "images/optimized/blue-suit.jpg",
      coverAlt:    "Modern South Asian fashion at Durga Designs Birmingham",
      description: "Contemporary South Asian fashion blending tradition with modern style.",
      link:        "collections.html?cat=modern",
      cta:         "View Collection",
      active:      true,
      order:       7
    },
    {
      id:          "cat-tailoring",
      title:       "Misha Tailoring",
      slug:        "tailoring",
      cover:       "images/optimized/inside-shop-2.jpg",
      coverAlt:    "Misha Tailoring stitching and alterations at Durga Designs Birmingham",
      description: "Expert stitching, fitting and alterations for all outfits.",
      link:        "misha-tailoring.html",
      cta:         "Book Enquiry",
      active:      true,
      order:       8
    }
  ],

  /* ──────────────────────────────────────────────────────────────
     PRODUCTS
     All individual products. The renderer filters these by:
       - active: true/false
       - featured: true → shown on homepage New Arrivals
       - category: matches the URL param and filter tabs
       - order: lower = shown first

     TO ADD A NEW PRODUCT:
     1. Copy any product block below.
     2. Give it a unique id (lowercase, hyphens, no spaces).
     3. Update all fields.
     4. Set active: true, featured: true if it should go on homepage.
     5. Save. Done.

     WHATSAPP MESSAGE FORMAT:
     Keep the text natural. The customer's message will open
     pre-filled when they tap "Ask" on any product.
  ────────────────────────────────────────────────────────────── */
  products: [

    /* ── ABAYA COLLECTION ──────────────────────────────────── */
    {
      id:           "brown-abaya",
      title:        "Brown Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/brown-abaya.jpg",
      alt:          "Brown abaya collection at Durga Designs Birmingham",
      description:  "Elegant brown abaya — a timeless classic from our latest collection.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Brown Abaya. Is it available? Please send more details.",
      active:       true,
      featured:     true,    // ← appears on homepage New Arrivals
      order:        1
    },
    {
      id:           "sea-green-abaya",
      title:        "Sea Green Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/sea-green-abaya.jpg",
      alt:          "Sea green abaya at Durga Designs Sparkhill Birmingham",
      description:  "Fresh sea green abaya — perfect for Eid and special occasions.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Sea Green Abaya. Is it available?",
      active:       true,
      featured:     true,
      order:        2
    },
    {
      id:           "modern-abaya",
      title:        "Modern Style Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/modern-abaya.jpg",
      alt:          "Modern style abaya at Durga Designs Birmingham",
      description:  "Contemporary modern abaya design — elegant and versatile.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Modern Style Abaya. Is it available?",
      active:       true,
      featured:     true,
      order:        3
    },
    {
      id:           "professional-abaya",
      title:        "Professional Look Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/professional-abaya.jpg",
      alt:          "Professional look abaya at Durga Designs Sparkhill",
      description:  "Smart and professional abaya — ideal for work and formal occasions.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in the Professional Look Abaya. Is it available?",
      active:       true,
      featured:     false,   // ← collection only, not homepage
      order:        4
    },
    {
      id:           "abaya-collection-main",
      title:        "Abaya Collection",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/abaya-collection.jpg",
      alt:          "Abaya collection display at Durga Designs Birmingham boutique",
      description:  "Our full abaya collection — visit us or WhatsApp to see all options.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in your Abaya Collection. Can you show me what is available?",
      active:       true,
      featured:     false,
      order:        5
    },
    {
      id:           "latest-abaya-2",
      title:        "Latest Abaya Design",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/optimized/latest-abaya-2.jpg",
      alt:          "Latest abaya design at Durga Designs Birmingham",
      description:  "Brand new abaya design — just arrived in our Sparkhill boutique.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Latest Abaya Design. Is it available?",
      active:       true,
      featured:     false,
      order:        6
    },
    {
      id:           "latest-collection-abaya",
      title:        "Latest Collection Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/Durga-Designs-assets/Abaya Collection/Latest Collection Abaya.jpeg",
      alt:          "Latest collection abaya at Durga Designs Sparkhill Birmingham",
      description:  "From our latest collection — elegant abaya in premium fabric.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Latest Collection Abaya. Is it available?",
      active:       false,   // ← hidden for now, activate when needed
      featured:     false,
      order:        7
    },
    {
      id:           "latest-design-abaya",
      title:        "Latest Design Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/Durga-Designs-assets/Abaya Collection/Latest Design Abayal.jpeg",
      alt:          "Latest design abaya at Durga Designs Birmingham",
      description:  "New arrival abaya with contemporary design details.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Latest Design Abaya. Is it available?",
      active:       false,
      featured:     false,
      order:        8
    },
    {
      id:           "new-arrivals-abaya",
      title:        "New Arrivals Abaya",
      category:     "abayas",
      categoryLabel:"Abaya Collection",
      src:          "images/Durga-Designs-assets/Abaya Collection/New Arrivals.jpeg",
      alt:          "New arrival abayas at Durga Designs Sparkhill Birmingham",
      description:  "Fresh new arrivals just in — abaya styles for all occasions.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the New Arrivals Abaya. Is it available?",
      active:       false,
      featured:     false,
      order:        9
    },

    /* ── SHALWAR KAMEEZ / LADIES SUITS ─────────────────────── */
    {
      id:           "yellow-dress",
      title:        "Yellow Party Dress",
      category:     "ladies-suits",
      categoryLabel:"Ladies Suits",
      src:          "images/optimized/yellow-dress.jpg",
      alt:          "Yellow party dress shalwar kameez at Durga Designs Birmingham",
      description:  "Bright yellow party dress — perfect for celebrations and weddings.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Yellow Party Dress. Is it available?",
      active:       true,
      featured:     true,
      order:        1
    },
    {
      id:           "blue-suit",
      title:        "Blue Shalwar Kameez",
      category:     "ladies-suits",
      categoryLabel:"Ladies Suits",
      src:          "images/optimized/blue-suit.jpg",
      alt:          "Blue shalwar kameez at Durga Designs Sparkhill Birmingham",
      description:  "Elegant blue shalwar kameez — classic style with a modern finish.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Blue Shalwar Kameez. Is it available?",
      active:       true,
      featured:     true,
      order:        2
    },
    {
      id:           "latest-shirt",
      title:        "Latest Shirt Design",
      category:     "ladies-suits",
      categoryLabel:"Ladies Suits",
      src:          "images/optimized/latest-shirt.jpg",
      alt:          "Latest shirt design ladies suit at Durga Designs Birmingham",
      description:  "Fresh shirt design — part of our new ladies collection.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Latest Shirt Design. Is it available?",
      active:       true,
      featured:     false,
      order:        3
    },

    /* ── LACES & BUTTONS ────────────────────────────────────── */
    {
      id:           "lace-variety",
      title:        "Lace Variety Collection",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/lace-variety.jpg",
      alt:          "Lace variety collection at Durga Designs Sparkhill Birmingham",
      description:  "Wide range of decorative laces in multiple styles and colours.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in the Lace Variety. Can you show me what is available?",
      active:       true,
      featured:     true,
      order:        1
    },
    {
      id:           "buttons-collection",
      title:        "Buttons Collection",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/buttons.jpg",
      alt:          "Buttons collection at Durga Designs Birmingham",
      description:  "Beautiful buttons in a variety of sizes, colours and styles.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Buttons. Can you show me what is available?",
      active:       true,
      featured:     false,
      order:        2
    },
    {
      id:           "new-arrival-lace",
      title:        "New Arrival Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/new-arrival-lace.jpg",
      alt:          "New arrival lace designs at Durga Designs Sparkhill Birmingham",
      description:  "Brand new lace designs — just arrived at our Birmingham boutique.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the New Arrival Lace. Is it available?",
      active:       true,
      featured:     false,
      order:        3
    },
    {
      id:           "laces-main",
      title:        "Laces Collection",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/laces.jpg",
      alt:          "Laces collection at Durga Designs Birmingham boutique",
      description:  "A beautiful selection of laces for Pakistani and Indian outfits.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Laces. Can you show me what is available?",
      active:       true,
      featured:     false,
      order:        4
    },
    {
      id:           "lace-colours",
      title:        "Lace Colours Range",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/lace-colours.jpg",
      alt:          "Lace colours range at Durga Designs Sparkhill Birmingham",
      description:  "Laces available in a wide range of colours to match any outfit.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in the Lace Colours range. Can you help me match a colour?",
      active:       true,
      featured:     false,
      order:        5
    },
    {
      id:           "long-lace",
      title:        "Long Border Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/long-lace.jpg",
      alt:          "Long border lace at Durga Designs Birmingham",
      description:  "Long decorative border lace — ideal for suit hems and dupattas.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in the Long Border Lace. Is it available?",
      active:       true,
      featured:     false,
      order:        6
    },
    {
      id:           "long-lace-black",
      title:        "Long Black Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/optimized/long-lace-black.jpg",
      alt:          "Long black lace at Durga Designs Sparkhill Birmingham",
      description:  "Elegant long black lace — perfect for abayas and dark outfits.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in the Long Black Lace. Is it available?",
      active:       true,
      featured:     false,
      order:        7
    },
    {
      id:           "long-lace-variety",
      title:        "Long Lace Variety",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Long_lace variety.jpeg",
      alt:          "Long lace variety at Durga Designs Birmingham boutique",
      description:  "A variety of long lace styles — wide selection available in store.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Long Lace. Can you show me what is available?",
      active:       false,   // reserve — activate when needed
      featured:     false,
      order:        8
    },
    {
      id:           "modern-lace",
      title:        "Modern Design Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Modern Lace.jpeg",
      alt:          "Modern design lace at Durga Designs Birmingham",
      description:  "Contemporary lace design — perfect for modern South Asian outfits.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the Modern Design Lace. Is it available?",
      active:       false,
      featured:     false,
      order:        9
    },
    {
      id:           "new-design-lace",
      title:        "New Design Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/New Dsign Lace.jpeg",
      alt:          "New design lace collection at Durga Designs Sparkhill",
      description:  "Brand new lace design — just added to our collection.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the New Design Lace. Is it available?",
      active:       false,
      featured:     false,
      order:        10
    },
    {
      id:           "new-buttons",
      title:        "New Buttons Collection",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/New_buttons.jpeg",
      alt:          "New buttons collection at Durga Designs Birmingham",
      description:  "New buttons — decorative and functional styles available.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the New Buttons Collection. Is it available?",
      active:       false,
      featured:     false,
      order:        11
    },
    {
      id:           "new-collection-lace",
      title:        "New Collection Lace",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/New_collection_Lace.jpeg",
      alt:          "New lace collection at Durga Designs Sparkhill Birmingham",
      description:  "Latest lace collection — wide range of styles and lengths.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in the New Collection Lace. Is it available?",
      active:       false,
      featured:     false,
      order:        12
    },
    {
      id:           "pipings",
      title:        "Pipings &amp; Trims",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Pipings.jpeg",
      alt:          "Pipings and trims at Durga Designs Birmingham",
      description:  "Decorative pipings and trims for finishing South Asian outfits.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Pipings and Trims. Can you show me what is available?",
      active:       false,
      featured:     false,
      order:        13
    },
    {
      id:           "thread-colours",
      title:        "Thread Colours",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Thread colours.jpeg",
      alt:          "Thread colour selection at Durga Designs Sparkhill Birmingham",
      description:  "Thread in a wide range of colours for stitching and embroidery.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Threads. Can you show me the colour range?",
      active:       false,
      featured:     false,
      order:        14
    },
    {
      id:           "laces-2",
      title:        "Laces — Style 2",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Laces 2.jpeg",
      alt:          "Lace style 2 at Durga Designs Birmingham",
      description:  "More lace styles — available in our Sparkhill boutique.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Laces. Can you show me what is available?",
      active:       false,
      featured:     false,
      order:        15
    },
    {
      id:           "laces-3",
      title:        "Laces — Style 3",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Laces 3.jpeg",
      alt:          "Lace style 3 at Durga Designs Sparkhill Birmingham",
      description:  "More lace styles available in store — visit us or WhatsApp.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Laces. Can you show me what is available?",
      active:       false,
      featured:     false,
      order:        16
    },
    {
      id:           "laces-1",
      title:        "Laces — Classic Style",
      category:     "laces-buttons",
      categoryLabel:"Laces &amp; Buttons",
      src:          "images/Durga-Designs-assets/Products/Laces1.jpeg",
      alt:          "Classic lace style at Durga Designs Birmingham boutique",
      description:  "Classic lace style — a staple for traditional South Asian outfits.",
      price:        "Ask for price",
      badge:        null,
      whatsappMsg:  "Hi Durga Designs, I am interested in Laces. Can you show me what is available?",
      active:       false,
      featured:     false,
      order:        17
    },

    /* ── UNSTITCHED SUITS ───────────────────────────────────── */
    {
      id:           "unstitched-suits",
      title:        "Unstitched Suit Collection",
      category:     "unstitched",
      categoryLabel:"Unstitched Suits",
      src:          "images/optimized/unstitched-suits.jpg",
      alt:          "Unstitched suit collection at Durga Designs Birmingham",
      description:  "Premium unstitched suit fabrics — ready for tailoring through Misha Tailoring.",
      price:        "Ask for price",
      badge:        "New",
      whatsappMsg:  "Hi Durga Designs, I am interested in Unstitched Suits. Can you show me what is available?",
      active:       true,
      featured:     true,
      order:        1
    }

    /* ── TO ADD MORE PRODUCTS ───────────────────────────────────
       Copy the block below and fill in your details:
    ────────────────────────────────────────────────────────────
    ,{
      id:           "my-new-product",
      title:        "My Product Name",
      category:     "abayas",           // abayas | ladies-suits | unstitched | laces-buttons | sarees | kids | modern
      categoryLabel:"Abaya Collection",  // display text
      src:          "images/Durga-Designs-assets/Abaya Collection/My-New-Photo.jpeg",
      alt:          "My product at Durga Designs Birmingham",
      description:  "Short description of the product.",
      price:        "Ask for price",     // or "£XX" when ready
      badge:        "New",               // "New" | "Sale" | null
      whatsappMsg:  "Hi Durga Designs, I am interested in My Product Name. Is it available?",
      active:       true,
      featured:     true,
      order:        10
    }
    ─────────────────────────────────────────────────────────── */
  ],

  /* ──────────────────────────────────────────────────────────────
     GALLERY
     Curated selection for the Gallery page and About page.
     Mix of shop photos and product photos.
     section values: "boutique" | "abayas" | "suits" | "tailoring"
  ────────────────────────────────────────────────────────────── */
  gallery: [
    {
      id:       "g-storefront",
      src:      "images/optimized/store-front.jpg",
      alt:      "Durga Designs boutique exterior — Shop 606 Stratford Road Sparkhill Birmingham",
      section:  "boutique",
      caption:  "Our boutique on Stratford Road, Sparkhill",
      active:   true,
      order:    1
    },
    {
      id:       "g-inside-1",
      src:      "images/optimized/inside-shop-1.jpg",
      alt:      "Inside Durga Designs boutique — fashion collections on display Sparkhill Birmingham",
      section:  "boutique",
      caption:  "Inside our boutique — collections on display",
      active:   true,
      order:    2
    },
    {
      id:       "g-inside-2",
      src:      "images/optimized/inside-shop-2.jpg",
      alt:      "Inside Durga Designs and Misha Tailoring Sparkhill Birmingham",
      section:  "boutique",
      caption:  "Durga Designs & Misha Tailoring",
      active:   true,
      order:    3
    },
    {
      id:       "g-brown-abaya",
      src:      "images/optimized/brown-abaya.jpg",
      alt:      "Brown abaya — Durga Designs abaya collection Birmingham",
      section:  "abayas",
      caption:  "Brown Abaya",
      active:   true,
      order:    4
    },
    {
      id:       "g-sea-green-abaya",
      src:      "images/optimized/sea-green-abaya.jpg",
      alt:      "Sea green abaya — Durga Designs collection Sparkhill Birmingham",
      section:  "abayas",
      caption:  "Sea Green Abaya",
      active:   true,
      order:    5
    },
    {
      id:       "g-modern-abaya",
      src:      "images/optimized/modern-abaya.jpg",
      alt:      "Modern abaya design — Durga Designs Birmingham",
      section:  "abayas",
      caption:  "Modern Abaya",
      active:   true,
      order:    6
    },
    {
      id:       "g-yellow-dress",
      src:      "images/optimized/yellow-dress.jpg",
      alt:      "Yellow ladies suit shalwar kameez at Durga Designs Birmingham",
      section:  "suits",
      caption:  "Yellow Party Dress",
      active:   true,
      order:    7
    },
    {
      id:       "g-blue-suit",
      src:      "images/optimized/blue-suit.jpg",
      alt:      "Blue shalwar kameez ladies suit at Durga Designs Sparkhill",
      section:  "suits",
      caption:  "Blue Shalwar Kameez",
      active:   true,
      order:    8
    },
    {
      id:       "g-latest-shirt",
      src:      "images/optimized/latest-shirt.jpg",
      alt:      "Latest shirt design ladies suit at Durga Designs Birmingham",
      section:  "suits",
      caption:  "Latest Shirt Design",
      active:   true,
      order:    9
    },
    {
      id:       "g-lace-variety",
      src:      "images/optimized/lace-variety.jpg",
      alt:      "Lace variety collection at Durga Designs Sparkhill Birmingham",
      section:  "boutique",
      caption:  "Laces &amp; Trims",
      active:   true,
      order:    10
    },
    {
      id:       "g-professional-abaya",
      src:      "images/optimized/professional-abaya.jpg",
      alt:      "Professional look abaya at Durga Designs Birmingham",
      section:  "abayas",
      caption:  "Professional Look Abaya",
      active:   true,
      order:    11
    },
    {
      id:       "g-unstitched",
      src:      "images/optimized/unstitched-suits.jpg",
      alt:      "Unstitched suits collection at Durga Designs Birmingham",
      section:  "suits",
      caption:  "Unstitched Suits",
      active:   true,
      order:    12
    }
  ],

  /* ──────────────────────────────────────────────────────────────
     REELS / VIDEOS
     Short video reels shown on the homepage and gallery.

     ⚠️  IMPORTANT: Videos are NEVER autoloaded on page load
         to keep the website fast. They are click-to-play only.

     poster: a still image shown before the video plays.
             Set this to a product photo from the same shoot.
             If null, a branded placeholder is shown instead.

     featured: true → shown in homepage Reels section
     active: false  → hidden from website, file kept on disk

     NOTE: "Five Pee Sale.mp4" is 35MB and should only be
     enabled when the sale is active. Keep active: false normally.
  ────────────────────────────────────────────────────────────── */
  reels: [
    {
      id:       "reel-1",
      title:    "Durga Designs — Latest Collection",
      src:      "images/Durga-Designs-assets/Reels/Reel_1.mp4",
      poster:   "images/optimized/brown-abaya.jpg",
      alt:      "Durga Designs latest collection reel — South Asian fashion Birmingham",
      caption:  "Latest Collection",
      active:   true,
      featured: true,
      order:    1
    },
    {
      id:       "reel-2",
      title:    "New Arrivals at Durga Designs",
      src:      "images/Durga-Designs-assets/Reels/Reel_2.mp4",
      poster:   "images/optimized/sea-green-abaya.jpg",
      alt:      "New arrivals reel at Durga Designs Sparkhill Birmingham",
      caption:  "New Arrivals",
      active:   true,
      featured: true,
      order:    2
    },
    {
      id:       "reel-new-arrivals-1",
      title:    "New Arrivals — Abaya & Suits",
      src:      "images/Durga-Designs-assets/Reels/New Arrivals1.mp4",
      poster:   "images/optimized/yellow-dress.jpg",
      alt:      "New arrivals abaya and suits reel at Durga Designs Birmingham",
      caption:  "Abayas &amp; Suits",
      active:   true,
      featured: true,
      order:    3
    },
    {
      id:       "reel-new-arrivals-2",
      title:    "New Arrival — Fashion Reel",
      src:      "images/Durga-Designs-assets/Reels/New Arrival2.mp4",
      poster:   "images/optimized/blue-suit.jpg",
      alt:      "Fashion reel at Durga Designs Birmingham boutique",
      caption:  "Fashion Reel",
      active:   false,   // reserve — activate when needed
      featured: false,
      order:    4
    },
    {
      id:       "reel-chora",
      title:    "Durga Designs — Style Reel",
      src:      "images/Durga-Designs-assets/Reels/Chora_Reel.mp4",
      poster:   null,
      alt:      "Style reel at Durga Designs Sparkhill Birmingham",
      caption:  "Style Reel",
      active:   false,
      featured: false,
      order:    5
    },
    {
      id:       "reel-five-pee-sale",
      title:    "Five Pee Sale — Durga Designs",
      src:      "images/Durga-Designs-assets/Reels/Five Pee Sale.mp4",
      poster:   null,
      alt:      "Sale reel at Durga Designs Birmingham",
      caption:  "Sale Event",
      // ⚠️  35MB file — ONLY activate during an active sale
      active:   false,
      featured: false,
      order:    6
    },
    {
      id:       "abaya-reel",
      title:    "Abaya Collection — Video",
      src:      "images/Durga-Designs-assets/Abaya Collection/WhatsApp Video 2026-05-30 at 4.56.35 PM.mp4",
      poster:   "images/optimized/brown-abaya.jpg",
      alt:      "Abaya collection video at Durga Designs Birmingham",
      caption:  "Abaya Collection",
      active:   false,
      featured: false,
      order:    7
    }
  ]

}; // end DD_ASSETS

/* ── Make available globally (loaded before media-renderer.js) ── */
if (typeof module !== "undefined") module.exports = DD_ASSETS;
