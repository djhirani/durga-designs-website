/* ================================================================
   DURGA DESIGNS — SHOP CATALOGUE (Stage 1: catalogue/enquiry only)
   ================================================================
   This is the SINGLE SOURCE OF DATA for the new artisan shop
   (Sindhi Embroidered Bags, Kurtas, Wall Hangings, Home Decor).

   It deliberately mirrors the structure already used in
   js/media-map.js so the patterns stay familiar — but is kept
   in its own file so nothing here can affect the existing
   WhatsApp-enquiry pages (collections, gallery, homepage).

   IMPORTANT — IMAGES
   ──────────────────
   These are brand-new artisan product lines that have not yet
   been professionally photographed. Per the owner's instruction,
   we do NOT invent or substitute random product photos. Every
   product below has `image: null`, which the shop renderer
   displays as an elegant branded placeholder ("Photography
   coming soon — handmade in our Sparkhill studio").

   When real photography is ready:
   1. Add the optimised image to images/optimized/shop/<category>/
   2. Set `image: "images/optimized/shop/<category>/<file>.jpg"`
   3. The placeholder is replaced automatically — no other change
      needed.

   STOCK STATUS VALUES (used for the coloured badge):
     "in-stock"   → "In stock"
     "limited"    → "Limited stock"
     "preorder"   → "Pre-order"
     "soldout"    → "Sold out"
   ================================================================ */

const SHOP_CATEGORIES = [
  {
    slug:        "bags",
    title:       "Sindhi Embroidered Bags",
    shortTitle:  "Bags",
    description: "Hand-stitched mirror-work and thread-embroidered bags, each one a wearable piece of Sindhi craft heritage.",
    icon:        "👜",
    page:        "shop/bags/index.html"
  },
  {
    slug:        "kurtas",
    title:       "Sindhi Embroidered Kurtas",
    shortTitle:  "Kurtas",
    description: "Breathable cotton kurtas finished with traditional Sindhi hand embroidery — everyday elegance with artisan detail.",
    icon:        "👚",
    page:        "shop/kurtas/index.html"
  },
  {
    slug:        "wall-hangings",
    title:       "Wall Hangings",
    shortTitle:  "Wall Hangings",
    description: "Rectangular and round embroidered wall art — mirror work, tassels and mandala motifs to bring colour and craft into any room.",
    icon:        "🖼️",
    page:        "shop/wall-hangings/index.html"
  },
  {
    slug:        "home-decor",
    title:       "Home Decor / Future Collection",
    shortTitle:  "Home Decor",
    description: "Cushion covers, table runners and small handmade pieces — the newest additions to our artisan collection, with more to come.",
    icon:        "🏺",
    page:        "shop/home-decor/index.html"
  }
];

/* ── Helper: category lookup ─────────────────────────────────── */
const SHOP_CATEGORY_MAP = SHOP_CATEGORIES.reduce((map, c) => {
  map[c.slug] = c;
  return map;
}, {});

/* ── Handmade disclaimer (shown on every product detail page) ─ */
const SHOP_HANDMADE_DISCLAIMER =
  "Each piece is individually handmade. Slight variations in embroidery, " +
  "colour, size and finish are part of its authenticity.";

/* ── WhatsApp enquiry message builder (product-specific) ─────── */
function shopWaMessage(productTitle) {
  return "Hi Durga Designs, I am interested in this product:\n" +
         "Product: " + productTitle + "\n" +
         "Delivery postcode: \n" +
         "Please confirm availability.";
}

/* ================================================================
   PRODUCTS
   active:true  → shown in catalogue
   image:null   → renders the branded "photography coming soon"
                  placeholder (see js/shop-renderer.js)
   ================================================================ */
const SHOP_PRODUCTS = [

  /* ── BAGS ─────────────────────────────────────────────────── */
  {
    slug:        "sindhi-embroidered-tote-mirror-work",
    title:       "Sindhi Embroidered Tote Bag — Mirror Work",
    category:    "bags",
    image:       null,
    gallery:     [],
    badge:       "Handmade",
    price:       null,                 // → "Price on request"
    stockStatus: "preorder",
    shortDescription: "A spacious hand-embroidered tote finished with traditional Sindhi mirror work (shisha) and tasselled edges.",
    longDescription:  "This tote is built on sturdy handwoven cotton and finished entirely by hand using techniques passed down through generations of Sindhi artisans. Mirror discs are framed with dense thread embroidery in contrasting colours, and the edges are finished with hand-tied tassels. A practical, statement piece that pairs equally well with traditional and everyday wear.",
    story:       "Sindhi mirror-work embroidery (shisha kaam) is one of the oldest decorative crafts of the Sindh region, traditionally used to brighten garments and homewares with reflective glasswork set into hand-stitched patterns. Each bag in this line is produced by independent artisans using techniques that have changed very little over centuries — meaning every piece carries its own character.",
    colour:      "Multicolour embroidery on black base",
    material:    "Handwoven cotton, glass mirror discs, cotton thread",
    dimensions:  "Approx. 35cm x 30cm x 10cm, adjustable shoulder strap",
    active: true, order: 1
  },
  {
    slug:        "sindhi-embroidered-clutch-floral",
    title:       "Sindhi Embroidered Clutch — Floral Motif",
    category:    "bags",
    image:       null,
    gallery:     [],
    badge:       "Limited Run",
    price:       null,
    stockStatus: "limited",
    shortDescription: "A compact occasion clutch featuring dense floral hand embroidery and a gold-tone clasp.",
    longDescription:  "Designed for evenings and special occasions, this clutch showcases a traditional floral motif worked entirely by hand in coloured thread, finished with a structured shape and a secure gold-tone clasp. A refined complement to formal and festive outfits.",
    story:       "This floral pattern is inspired by classic Sindhi textile motifs traditionally embroidered onto dupattas and garment panels for weddings and celebrations — reimagined here as a modern accessory.",
    colour:      "Ivory base with multicolour floral embroidery",
    material:    "Cotton blend exterior, fully lined interior, gold-tone hardware",
    dimensions:  "Approx. 24cm x 14cm",
    active: true, order: 2
  },

  /* ── KURTAS ───────────────────────────────────────────────── */
  {
    slug:        "sindhi-embroidered-kurta-indigo",
    title:       "Sindhi Embroidered Cotton Kurta — Indigo",
    category:    "kurtas",
    image:       null,
    gallery:     [],
    badge:       "Made to Order",
    price:       null,
    stockStatus: "preorder",
    shortDescription: "A relaxed-fit cotton kurta in deep indigo with hand-embroidered neckline and cuff detailing.",
    longDescription:  "Cut from breathable handwoven cotton in a relaxed silhouette, this kurta is finished with traditional Sindhi hand embroidery worked around the neckline, placket and cuffs in contrasting gold and ivory thread. Comfortable enough for daily wear, distinctive enough for special occasions. Made to order in your size — please share your measurements when enquiring.",
    story:       "Our tailoring team works directly with embroidery artisans in the Sindh tradition, hand-finishing each garment after stitching so that the embroidery sits naturally with the cut and drape of the kurta — a process that simply cannot be replicated by machine.",
    colour:      "Indigo with gold and ivory thread embroidery",
    material:    "100% handwoven cotton",
    dimensions:  "Made to order — sizes XS–XXL, custom measurements available",
    active: true, order: 1
  },
  {
    slug:        "sindhi-embroidered-kurta-ivory-gold",
    title:       "Sindhi Embroidered Kurta — Ivory &amp; Gold Thread",
    category:    "kurtas",
    image:       null,
    gallery:     [],
    badge:       "Handmade",
    price:       null,
    stockStatus: "in-stock",
    shortDescription: "An elegant ivory kurta with all-over panel embroidery in fine gold-tone thread.",
    longDescription:  "A statement piece for festive occasions — soft ivory cotton lifted with gold-tone thread embroidery worked across the front yoke and sleeve panels. Lightweight and breathable, with a tailored straight-cut silhouette that flatters most body types.",
    story:       "Gold-thread (zari-style) embroidery has long been associated with celebration in South Asian dress. This piece brings that tradition into an everyday-wearable kurta, hand-finished by our artisan partners.",
    colour:      "Ivory with gold-tone thread embroidery",
    material:    "Cotton blend, gold-tone metallic thread",
    dimensions:  "Available in S, M, L, XL — please confirm size when enquiring",
    active: true, order: 2
  },

  /* ── WALL HANGINGS (rectangular + round) ──────────────────── */
  {
    slug:        "sindhi-wall-hanging-mirror-tassel",
    title:       "Sindhi Embroidered Wall Hanging — Mirror &amp; Tassel",
    category:    "wall-hangings",
    subType:     "rectangular",
    image:       null,
    gallery:     [],
    badge:       "Handmade",
    price:       null,
    stockStatus: "limited",
    shortDescription: "A rectangular hand-embroidered wall hanging with mirror work, geometric borders and a tasselled hem.",
    longDescription:  "This piece brings the colour and texture of Sindhi textile art into home decor — a rectangular panel densely embroidered with geometric border patterns, mirror discs catching the light, and a fully hand-tied tassel trim along the base. Comes with a fabric loop for easy hanging.",
    story:       "Wall hangings of this style were traditionally made as dowry pieces and home blessings in Sindhi households — combining decorative beauty with symbolic patterns passed down through families. Each one is unique to the artisan who made it.",
    colour:      "Multicolour embroidery on deep maroon base",
    material:    "Cotton base fabric, mirror discs, hand-tied cotton tassels",
    dimensions:  "Approx. 60cm (w) x 90cm (h) including tassels",
    active: true, order: 1
  },
  {
    slug:        "round-sindhi-wall-hanging-mandala",
    title:       "Round Sindhi Wall Hanging — Mandala Embroidery",
    category:    "wall-hangings",
    subType:     "round",
    image:       null,
    gallery:     [],
    badge:       "New Collection",
    price:       null,
    stockStatus: "preorder",
    shortDescription: "A circular embroidered wall piece featuring a radiating mandala pattern in rich jewel-tone thread.",
    longDescription:  "A circular wall hanging built around a hand-embroidered mandala motif — radiating geometric patterns worked in deep jewel-tone threads with fine mirror accents. Mounted on a lightweight circular frame for clean, ready-to-hang display. A striking centrepiece for any wall.",
    story:       "Round and mandala-form embroidery pieces are among the newest directions in our artisan collection — adapting traditional Sindhi motifs into contemporary circular formats suited to modern interiors.",
    colour:      "Jewel-tone multicolour on deep navy base",
    material:    "Embroidered cotton on a lightweight circular frame, mirror accents",
    dimensions:  "Approx. 40cm diameter",
    active: true, order: 2
  },

  /* ── HOME DECOR / FUTURE COLLECTION ───────────────────────── */
  {
    slug:        "embroidered-cushion-cover-sindhi-pattern",
    title:       "Embroidered Cushion Cover — Sindhi Pattern",
    category:    "home-decor",
    image:       null,
    gallery:     [],
    badge:       "New Collection",
    price:       null,
    stockStatus: "preorder",
    shortDescription: "A hand-embroidered cushion cover featuring traditional geometric Sindhi pattern work and mirror accents.",
    longDescription:  "Refresh any room with this hand-embroidered cushion cover — dense geometric pattern work in warm contrasting threads, finished with mirror accents and a neat piped edge. Pairs beautifully with our wall hangings and table runners for a coordinated look. Cover only; insert sold separately on request.",
    story:       "Part of our new Home Decor line, bringing the same artisan embroidery techniques used in our garments and bags into everyday home pieces.",
    colour:      "Warm multicolour embroidery on natural cotton base",
    material:    "Cotton, mirror accents, concealed zip closure",
    dimensions:  "Approx. 45cm x 45cm (cover only)",
    active: true, order: 1
  },
  {
    slug:        "handmade-table-runner-mirror-trim",
    title:       "Handmade Table Runner — Mirror Work Trim",
    category:    "home-decor",
    image:       null,
    gallery:     [],
    badge:       "New Collection",
    price:       null,
    stockStatus: "preorder",
    shortDescription: "A long table runner in handwoven cotton, finished with an embroidered mirror-work trim along both edges.",
    longDescription:  "An elegant addition to any dining table — handwoven cotton finished along both long edges with hand-stitched mirror-work trim and a row of small tassels. Brings warmth and craft detail to everyday and occasion table settings alike.",
    story:       "Table linens finished with mirror and embroidery trim are a familiar sight in Sindhi homes during festivals and gatherings — this piece adapts that tradition for modern dining tables.",
    colour:      "Natural cotton base with multicolour embroidered trim",
    material:    "Handwoven cotton, mirror discs, cotton tassels",
    dimensions:  "Approx. 33cm x 180cm",
    active: true, order: 2
  }
];

/* ── Helpers used by the renderer ─────────────────────────────── */
function getActiveShopProducts(categorySlug) {
  return SHOP_PRODUCTS
    .filter(p => p.active && (!categorySlug || p.category === categorySlug))
    .sort((a, b) => (a.order || 99) - (b.order || 99));
}

function getShopProductBySlug(slug) {
  return SHOP_PRODUCTS.find(p => p.slug === slug && p.active) || null;
}

const SHOP_STOCK_LABELS = {
  "in-stock": "In stock",
  "limited":  "Limited stock",
  "preorder": "Pre-order",
  "soldout":  "Sold out"
};
