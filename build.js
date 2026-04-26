const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// ── Parse CSVs ──
const mainCsv = parse(fs.readFileSync('products_export_1.csv', 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });
const dealerCsv = parse(fs.readFileSync('dealer supplies.csv', 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });

// ── Build product database ──
function extractProducts(rows, defaultCollection) {
  const products = {};
  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;
    if (!products[handle]) {
      products[handle] = {
        handle,
        title: row.Title || '',
        body: row['Body (HTML)'] || '',
        vendor: row.Vendor || '',
        type: row.Type || '',
        tags: row.Tags || '',
        images: [],
        price: row['Variant Price'] || '0.00',
        defaultCollection
      };
    }
    const imgSrc = row['Image Src'];
    if (imgSrc && !products[handle].images.includes(imgSrc)) {
      products[handle].images.push(imgSrc);
    }
    if (!products[handle].title && row.Title) products[handle].title = row.Title;
  }
  return Object.values(products).filter(p => p.title);
}

const mainProducts = extractProducts(mainCsv, null);
const dealerProducts = extractProducts(dealerCsv, 'dealer-supplies');

// ── Collection mapping based on tags/title keywords ──
const COLLECTIONS = {
  'casino': { name: 'Casino Night', parent: 'Casino Night', match: p => /casino|blackjack|roulette|poker|slot|dice|chips|vegas|dealer|money.*machine|tycoon typhoon/i.test(p.tags + ' ' + p.title) && !/car dealer/i.test(p.tags) },
  'advertising-led-displays': { name: 'LED Displays', parent: 'Advertising', match: p => /led.*sign|led.*display|led.*billboard|led.*truck|interior led|exterior led|hydraulic led|led.*board/i.test(p.title) },
  'advertising-mobile-planters': { name: 'Mobile Signs & Planters', parent: 'Advertising', match: p => /planter|mobile sign|rounded mobile/i.test(p.title + ' ' + p.tags) },
  'advertising-store-front': { name: 'Storefront Signs', parent: 'Advertising', match: p => /storefront|store.?front|pylon|vinyl graphic/i.test(p.title + ' ' + p.tags) },
  'advertising-flags': { name: 'Flags', parent: 'Advertising', match: p => /flag/i.test(p.title) && !/pride/i.test(p.title) },
  'event-rentals-concessions': { name: 'Concessions & Catering', parent: 'Event Rentals', match: p => /popcorn|hot dog|slush|cotton candy|waffle|snow cone|bbq|propane|nacho/i.test(p.title) },
  'event-rentals-props': { name: 'Props & Decor', parent: 'Event Rentals', match: p => /backdrop|photo.*booth|selfie|photo op|mirror.*booth|pipe.*drape|throne|tiki|surf.*board|gas pump.*prop|podium/i.test(p.title) },
  'event-rentals-sound-lighting': { name: 'Sound & Lighting', parent: 'Event Rentals', match: p => /search light|sky tracker|space cannon|siren|projector|jukebox|karaoke|speaker|luminescent|bubble column|led tree|firework|megaphone|dj lighting|accu.*spot/i.test(p.title) },
  'event-rentals-equipment': { name: 'Equipment', parent: 'Event Rentals', match: p => /generator|table[s]?$|chair|stanchion|stag(e|ing)|carpet|confetti|countdown|massage|raffle|t-shirt cannon|marquee letter|pipe|truss|gong/i.test(p.title) && !/poker|blackjack|roulette/i.test(p.title) },
  'event-rentals-entertainment': { name: 'Entertainment', parent: 'Event Rentals', match: p => /game room|mobile.*game|movie night|mobile event/i.test(p.title) },
  'event-rentals-auto': { name: 'Auto Events', parent: 'Event Rentals', match: p => /vehicle turntable|pit stop/i.test(p.title) },
  'event-rentals-dance-floors': { name: 'Dance Floors', parent: 'Event Rentals', match: p => /dance floor|led.*floor/i.test(p.title) && !/dance dome|dance party/i.test(p.title) },
  'games-arcade': { name: 'Arcade Games', parent: 'Games', match: p => /skee ball|plinko|roller bowler|spinn.*wheel|mock jail|maze runner|big baller|connect four|crack.*safe|conk.*crow/i.test(p.title) },
  'games-carnival': { name: 'Carnival Games', parent: 'Games', match: p => /carnival|juggling|potty toss|rope.*bull|lumberjack|axe|cow milking|dunk tank|midway/i.test(p.title) },
  'games-casino': { name: 'Casino Games', parent: 'Games', match: p => false },
  'games-bouncers-slides': { name: 'Bouncers & Slides', parent: 'Games › Inflatable Games', match: p => /bounce|bouncy|jumperoo|ounce.*bounce|slide.*inflat|monster truck.*slide|treasure.*caribbean|jolly jump|dance dome|dance party/i.test(p.title) },
  'games-obstacle-courses': { name: 'Obstacle Courses', parent: 'Games › Inflatable Games', match: p => /obstacle|eliminator|giant alliance|rapid fire|touchdown|adventure run|double trouble/i.test(p.title) },
  'games-interactive': { name: 'Interactive Games', parent: 'Games › Inflatable Games', match: p => /interactive|monster bash|paintball|water wars|inflatable hoop|bazooka.*ball|electronic.*hockey/i.test(p.title) },
  'games-inflatable-sports': { name: 'Inflatable Sports', parent: 'Games › Inflatable Games', match: p => /sumo|wrecking ball|sticky wall|boxing|bungee basket|sports cage|strike zone|play-a-round|golf.*hole/i.test(p.title) },
  'games-extreme-sports': { name: 'Extreme Sports', parent: 'Games › Inflatable Games', match: p => /mechanical bull|climbing wall|surf simulator|vr.*roller|virtual reality/i.test(p.title) },
  'games-rides': { name: 'Rides', parent: 'Games', match: p => /train.*ride|pedal kart|mini bus|royal express|swingball|tetherball/i.test(p.title) },
  'games-sports': { name: 'Sports Games', parent: 'Games', match: p => /golf putting|cornhole/i.test(p.title) },
  'inflatables-advertising': { name: 'Advertising Inflatables', parent: 'Inflatables', match: p => /billboard.*inflat|inflat.*billboard|sale.*billboard|tire.*banner|inflat.*movie|dome tent|outdoor.*inflat.*tent/i.test(p.title) },
  'inflatables-arches': { name: 'Arches', parent: 'Inflatables', match: p => /arch/i.test(p.title) && !/balloon/i.test(p.title) },
  'inflatables-characters': { name: 'Characters', parent: 'Inflatables', match: p => /inflatable|gorilla|dragon|dinosaur|t-rex|triceratops|shark|whale|parrot|penguin|panda|teddy|bunny|bear|clown|cowboy|elf|mummy|wolfman|dracula|nutcracker|muscle|snowman|spider|sun|pumpkin|santa|reindeer|hamburger|airplane|beaver|lobster|stocking|candy cane|bulb ornament|hockey player|football player|vehicle inflat|sale arms|champagne|clock|crab|elephant|air dancer/i.test(p.title) && !/bounce|slide|obstacle|interactive|game|arch|billboard|tent/i.test(p.title) },
  'inflatables-holidays': { name: 'Holiday Inflatables', parent: 'Inflatables', match: p => /holiday.*inflat|gift box|holiday.*pole|holiday.*photo|gingerbread|led standee|giant.*bow|decorative bow|las vegas.*lighted|las vegas.*hanging/i.test(p.title) },
  'tents': { name: 'Tents', parent: 'Tents', match: p => /tent|ez-up|canop/i.test(p.title) && !/midway/i.test(p.title) && !/inflatable tent/i.test(p.title) && !/carnival/i.test(p.title) },
  'balloons': { name: 'Balloons', parent: 'Balloons', match: p => /balloon/i.test(p.title) },
  'yard-signs': { name: 'Yard Signs', parent: 'Printing', match: p => /yard sign|yard card/i.test(p.title) },
  'dealer-supplies': { name: 'Dealer Supplies', parent: 'Auto Advertising', match: p => p.defaultCollection === 'dealer-supplies' },
  'event-rentals-misc': { name: 'More Event Rentals', parent: 'Event Rentals', match: p => /streamers|pennant|led.*portable.*bar|led.*stanchion|led mini golf|movie screen/i.test(p.title) },
};

// ── Assign products to collections ──
const collectionProducts = {};
for (const key of Object.keys(COLLECTIONS)) collectionProducts[key] = [];

const allProducts = [...mainProducts, ...dealerProducts];
const assigned = new Set();

for (const p of allProducts) {
  for (const [key, col] of Object.entries(COLLECTIONS)) {
    if (col.match(p)) {
      collectionProducts[key].push(p);
      assigned.add(p.handle);
    }
  }
}

// Report unassigned
const unassigned = allProducts.filter(p => !assigned.has(p.handle));
if (unassigned.length > 0) {
  console.log(`\n⚠ ${unassigned.length} unassigned products:`);
  unassigned.forEach(p => console.log(`  - ${p.title} (${p.handle})`));
}

// ── HTML Templates ──
const NAV_HTML = `<header>
  <nav class="nav">
    <a href="/index.html" class="nav-logo"><img src="/images/logo.png" alt="Giant Promotions"></a>
    <button class="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
    <ul class="nav-links">
      <li><a href="/index.html">Home</a></li>
      <li><a href="/about.html">About</a></li>
      <li><a href="/catalog.html">Catalog</a></li>
      <li><a href="/services.html">Services</a></li>
      <li><a href="/gallery.html">Gallery</a></li>
      <li><a href="/contact.html">Contact</a></li>
    </ul>
  </nav>
</header>`;

const FOOTER_HTML = `<footer>
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <img src="/images/logo.png" alt="Giant Promotions" style="height:55px;margin-bottom:1.2rem;">
        <p>Atlantic Canada's premier promotions and event rental company. Making events giant since 1992.</p>
        <div class="socials">
          <a href="https://www.facebook.com/GiantPromotions/" target="_blank"><i class="fab fa-facebook-f"></i></a>
          <a href="https://www.instagram.com/giantpromotions/" target="_blank"><i class="fab fa-instagram"></i></a>
          <a href="https://twitter.com/GiantProHfx" target="_blank"><i class="fab fa-x-twitter"></i></a>
          <a href="https://www.youtube.com/@giantpromotionsltd9955" target="_blank"><i class="fab fa-youtube"></i></a>
        </div>
      </div>
      <div class="footer-col"><h4>Navigation</h4><ul class="footer-links"><li><a href="/index.html">Home</a></li><li><a href="/about.html">About Us</a></li><li><a href="/catalog.html">Full Catalog</a></li><li><a href="/services.html">Services</a></li><li><a href="/gallery.html">Gallery</a></li><li><a href="/contact.html">Contact</a></li></ul></div>
      <div class="footer-col"><h4>Popular</h4><ul class="footer-links"><li><a href="/collections/casino.html">Casino Night</a></li><li><a href="/collections/games-bouncers-slides.html">Bouncers & Slides</a></li><li><a href="/collections/inflatables-characters.html">Inflatables</a></li><li><a href="/collections/event-rentals-entertainment.html">Entertainment</a></li><li><a href="/collections/tents.html">Tents</a></li><li><a href="/collections/dealer-supplies.html">Dealer Supplies</a></li></ul></div>
      <div class="footer-col"><h4>Contact</h4><div class="contact-line"><i class="fas fa-location-dot"></i><span>3797 MacKintosh St<br>Halifax, NS B3K 5A6</span></div><div class="contact-line"><i class="fas fa-phone"></i><span>902-456-6487</span></div><div class="contact-line"><i class="fas fa-envelope"></i><span>info@giantpro.com</span></div></div>
    </div>
    <div class="footer-bottom">&copy; 2026 Giant Promotions & Events Ltd. All rights reserved.</div>
  </div>
</footer>`;

const CART_HTML = `<!-- Cart Toggle Button -->
<button class="cart-toggle" id="cartToggle" onclick="toggleCart()">
  <i class="fas fa-shopping-cart"></i>
  <span class="cart-badge" id="cartBadge">0</span>
</button>

<!-- Cart Drawer -->
<div class="cart-overlay" id="cartOverlay" onclick="toggleCart()"></div>
<div class="cart-drawer" id="cartDrawer">
  <div class="cart-header">
    <h3><i class="fas fa-shopping-cart"></i> Your Quote Cart</h3>
    <button class="cart-close" onclick="toggleCart()"><i class="fas fa-times"></i></button>
  </div>
  <div class="cart-items" id="cartItems">
    <div class="cart-empty" id="cartEmpty">
      <i class="fas fa-cart-plus"></i>
      <p>Your cart is empty</p>
      <span>Add products to request a quote</span>
    </div>
  </div>
  <div class="cart-footer" id="cartFooter" style="display:none;">
    <button class="btn btn-ghost btn-sm" onclick="clearCart()" style="width:100%;margin-bottom:0.8rem;"><i class="fas fa-trash"></i> Clear Cart</button>
    <a href="/contact.html?cart=true" class="btn btn-gold" id="checkoutBtn" style="width:100%;justify-content:center;" onclick="return prepareCheckout()"><i class="fas fa-paper-plane"></i> Request Quote</a>
  </div>
</div>`;

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim().substring(0, 120);
}

function productCard(p) {
  const img = p.images[0] || '/images/placeholder.jpg';
  const desc = stripHtml(p.body);
  const price = parseFloat(p.price) > 0 ? `<span class="product-price">$${parseFloat(p.price).toFixed(2)}</span>` : '';
  const safeTitle = p.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `      <div class="product-card">
        <div class="product-img-wrap"><img src="${img}" alt="${p.title}" loading="lazy"></div>
        <div class="product-body">
          <h3>${p.title}</h3>
          ${desc ? `<p>${desc}...</p>` : ''}
          ${price}
          <button class="btn btn-gold btn-sm add-to-cart-btn" data-name="${safeTitle}" data-img="${img}" data-price="${p.price || '0.00'}" onclick="addToCart(this)"><i class="fas fa-cart-plus"></i> Add to Cart</button>
        </div>
      </div>`;
}

function collectionPage(key, col, products) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${col.name} | Giant Promotions & Events</title>
  <meta name="description" content="Browse our ${col.name} collection. ${products.length} products available for rent or purchase from Giant Promotions & Events, Halifax NS.">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
${NAV_HTML}

<section class="page-hero">
  <div class="page-hero-bg"><img src="/images/hero-crowd.jpg" alt=""></div>
  <div class="container">
    <span class="section-label">${col.parent}</span>
    <h1>${col.name}</h1>
    <p>${products.length} products available</p>
  </div>
</section>

<section class="catalog-section">
  <div class="container">
    <div class="product-grid">
${products.map(p => productCard(p)).join('\n')}
    </div>
  </div>
</section>

<section class="cta">
  <div class="cta-bg"></div>
  <div class="container">
    <h2>Need Help Choosing?</h2>
    <p>Our team is ready to help you find the perfect fit for your event.</p>
    <a href="/contact.html" class="btn btn-gold">Get a Free Quote</a>
  </div>
</section>

${FOOTER_HTML}
${CART_HTML}
<script src="/script.js"></script>
<script src="/cart.js"></script>
</body>
</html>`;
}

// ── Generate ──
fs.mkdirSync('collections', { recursive: true });

let totalProducts = 0;
let pagesGenerated = 0;

for (const [key, col] of Object.entries(COLLECTIONS)) {
  const products = collectionProducts[key];
  if (products.length === 0) continue;
  const html = collectionPage(key, col, products);
  fs.writeFileSync(`collections/${key}.html`, html);
  console.log(`✅ collections/${key}.html — ${products.length} products`);
  totalProducts += products.length;
  pagesGenerated++;
}

// ── Generate catalog hub ──
const categories = [
  { name: 'Casino Night', icon: 'fa-dice', href: '/collections/casino.html', desc: 'Tables, dealers, props & more' },
  { name: 'LED Displays', icon: 'fa-tv', href: '/collections/advertising-led-displays.html', desc: 'Digital billboards & screens' },
  { name: 'Mobile Signs', icon: 'fa-truck', href: '/collections/advertising-mobile-planters.html', desc: 'Mobile signs & planters' },
  { name: 'Storefront Signs', icon: 'fa-store', href: '/collections/advertising-store-front.html', desc: 'Illuminated storefront signage' },
  { name: 'Flags', icon: 'fa-flag', href: '/collections/advertising-flags.html', desc: 'Feather, teardrop & custom flags' },
  { name: 'Concessions', icon: 'fa-utensils', href: '/collections/event-rentals-concessions.html', desc: 'Popcorn, hot dogs, slushies' },
  { name: 'Props & Decor', icon: 'fa-camera', href: '/collections/event-rentals-props.html', desc: 'Photo booths, backdrops, decor' },
  { name: 'Sound & Lighting', icon: 'fa-volume-high', href: '/collections/event-rentals-sound-lighting.html', desc: 'Projectors, search lights, audio' },
  { name: 'Equipment', icon: 'fa-gears', href: '/collections/event-rentals-equipment.html', desc: 'Generators, tables, staging' },
  { name: 'Entertainment', icon: 'fa-gamepad', href: '/collections/event-rentals-entertainment.html', desc: 'Game trailers, movie nights' },
  { name: 'Dance Floors', icon: 'fa-music', href: '/collections/event-rentals-dance-floors.html', desc: 'LED and classic dance floors' },
  { name: 'Arcade Games', icon: 'fa-trophy', href: '/collections/games-arcade.html', desc: 'Skee ball, plinko, more' },
  { name: 'Carnival Games', icon: 'fa-tent-arrows-down', href: '/collections/games-carnival.html', desc: 'Midway carnival classics' },
  { name: 'Bouncers & Slides', icon: 'fa-child-reaching', href: '/collections/games-bouncers-slides.html', desc: 'Bounce houses & inflatable slides' },
  { name: 'Obstacle Courses', icon: 'fa-person-running', href: '/collections/games-obstacle-courses.html', desc: 'Inflatable obstacle challenges' },
  { name: 'Interactive Games', icon: 'fa-hand-pointer', href: '/collections/games-interactive.html', desc: 'Digital inflatable games' },
  { name: 'Inflatable Sports', icon: 'fa-basketball', href: '/collections/games-inflatable-sports.html', desc: 'Sumo, boxing, wrecking ball' },
  { name: 'Extreme Sports', icon: 'fa-bolt', href: '/collections/games-extreme-sports.html', desc: 'Mechanical bull, climbing wall' },
  { name: 'Rides', icon: 'fa-train', href: '/collections/games-rides.html', desc: 'Trains, pedal karts, more' },
  { name: 'Characters', icon: 'fa-dragon', href: '/collections/inflatables-characters.html', desc: 'Giant inflatable characters' },
  { name: 'Arches', icon: 'fa-archway', href: '/collections/inflatables-arches.html', desc: 'Inflatable arches & tunnels' },
  { name: 'Holiday Inflatables', icon: 'fa-snowflake', href: '/collections/inflatables-holidays.html', desc: 'Christmas, Halloween & more' },
  { name: 'Tents', icon: 'fa-campground', href: '/collections/tents.html', desc: 'EZ-UP, frame tents, canopies' },
  { name: 'Balloons', icon: 'fa-wand-magic-sparkles', href: '/collections/balloons.html', desc: 'Arches, bouquets, foil' },
  { name: 'Yard Signs', icon: 'fa-signs-post', href: '/collections/yard-signs.html', desc: 'Custom yard cards & signs' },
  { name: 'Dealer Supplies', icon: 'fa-car', href: '/collections/dealer-supplies.html', desc: 'Key tags, stickers, supplies' },
];

const catalogHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Catalog | Giant Promotions & Events</title>
  <meta name="description" content="Browse our complete product catalog. Over 300 products available for rent or purchase across Atlantic Canada.">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
${NAV_HTML}

<section class="page-hero">
  <div class="page-hero-bg"><img src="/images/hero-fullshot.jpg" alt=""></div>
  <div class="container">
    <span class="section-label">Browse Everything</span>
    <h1>Product Catalog</h1>
    <p>Over ${totalProducts} products across ${pagesGenerated} categories</p>
  </div>
</section>

<section class="catalog-section">
  <div class="container">
    <div class="catalog-grid">
${categories.filter(c => {
  const key = c.href.replace('/collections/','').replace('.html','');
  return collectionProducts[key] && collectionProducts[key].length > 0;
}).map(c => {
  const key = c.href.replace('/collections/','').replace('.html','');
  const prods = collectionProducts[key] || [];
  const count = prods.length;
  const thumbImg = prods[0] && prods[0].images[0] ? prods[0].images[0] : '/images/placeholder.jpg';
  return `      <a href="${c.href}" class="catalog-card catalog-card-img">
        <div class="catalog-thumb"><img src="${thumbImg}" alt="${c.name}" loading="lazy"></div>
        <div class="catalog-card-body">
          <h3>${c.name}</h3>
          <p>${c.desc}</p>
          <span class="catalog-count">${count} products</span>
        </div>
      </a>`;
}).join('\n')}
    </div>
  </div>
</section>

${FOOTER_HTML}
${CART_HTML}
<script src="/script.js"></script>
<script src="/cart.js"></script>
</body>
</html>`;

fs.writeFileSync('catalog.html', catalogHtml);
console.log(`\n✅ catalog.html generated`);
console.log(`\n📊 Summary: ${pagesGenerated} collection pages, ${totalProducts} product placements, ${unassigned.length} unassigned`);
