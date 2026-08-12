/* ================================================================
   DURGA DESIGNS — SITE CONFIGURATION
   Single source of truth for business details, links, and future
   analytics pixels. Update this file when contact details change.
   ================================================================ */

const DD_CONFIG = {
  brand: {
    name:           'Durga Designs',
    tailoringName:  'Misha Tailoring',
    domain:         'durgadesigns.co.uk',
    url:            'https://durgadesigns.co.uk/',
    email:          'info@durgadesigns.co.uk',
    tagline:        'Style that speaks before you do.',
    taglineSecondary: 'South Asian fashion for every occasion.',
    taglineTailoring: 'Expert stitching & alterations for every style.',
  },

  contact: {
    phone:          '+447907975847',
    phoneDisplay:   '+44 7907 975847',
    whatsapp:       '447907975847',
    whatsappDefault:'Hi Durga Designs, I would like to enquire.',
  },

  address: {
    street:         'Shop 606, Stratford Road',
    locality:       'Sparkhill',
    city:           'Birmingham',
    postcode:       'B11 4AP',
    country:        'GB',
    full:           'Shop 606, Stratford Road, Sparkhill, Birmingham, B11 4AP',
    short:          'Shop 606, Stratford Road, Sparkhill',
  },

  geo: {
    latitude:  '52.4588',
    longitude: '-1.8576',
  },

  hours: {
    weekday: 'Mon–Sat: 10:00 – 19:00',
    sunday:  'Sunday: 11:00 – 17:00',
    note:    'Please call us or check Google for current opening hours',
  },

  maps: {
    directions: 'https://maps.google.com/maps?q=Shop+606+Stratford+Road+Sparkhill+Birmingham+B11+4AP',
    embed:      'https://maps.google.com/maps?q=Shop+606+Stratford+Road+Sparkhill+Birmingham+B11+4AP&hl=en&z=16&output=embed',
  },

  social: {
    instagram: 'https://www.instagram.com/durgadesignsuk/',
    facebook:  'https://www.facebook.com/profile.php?id=61590616796961',
    tiktok:    'https://www.tiktok.com/@durgadesignsuk', // placeholder — update when live
    whatsapp:  'https://wa.me/447907975847',
  },

  seo: {
    keywords: 'South Asian fashion Birmingham, Pakistani clothes Birmingham, Indian clothes Birmingham, ladies suits Birmingham, abayas Birmingham, sarees Birmingham, laces and buttons Birmingham, tailor Sparkhill, ladies tailoring Birmingham, clothing alterations Birmingham, Misha Tailoring, Durga Designs Birmingham',
  },

  /* Future analytics — leave empty until ready, then paste IDs here */
  analytics: {
    googleAnalyticsId:  '', // e.g. 'G-XXXXXXXXXX'
    googleTagManagerId: '', // e.g. 'GTM-XXXXXXX'
    metaPixelId:        '', // e.g. '1234567890'
    tiktokPixelId:      '', // e.g. 'XXXXXXXX'
  },
};

/* ── Helper URLs ─────────────────────────────────────────────── */
DD_CONFIG.waUrl = (message) =>
  `https://wa.me/${DD_CONFIG.contact.whatsapp}?text=${encodeURIComponent(message)}`;

DD_CONFIG.waGeneral = DD_CONFIG.waUrl(DD_CONFIG.contact.whatsappDefault);

DD_CONFIG.waTailoring = DD_CONFIG.waUrl(
  'Hi Durga Designs, I would like to enquire about the Misha Tailoring service.'
);

DD_CONFIG.waProduct = (productName) =>
  DD_CONFIG.waUrl(`Hi Durga Designs, I am interested in: ${productName}. Is it available?`);

if (typeof module !== 'undefined') module.exports = DD_CONFIG;
