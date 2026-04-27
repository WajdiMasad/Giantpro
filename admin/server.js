const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { execSync } = require('child_process');

const app = express();
const PORT = 4000;
const ROOT = path.join(__dirname, '..');
const DB = path.join(ROOT, 'products.json');

// Auth
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'giant2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(ROOT, 'images')));

// Basic auth middleware
function auth(req, res, next) {
  const b64 = (req.headers.authorization || '').split(' ')[1] || '';
  const [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
  if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="Giant Admin"');
  res.status(401).send('Authentication required');
}
app.use(auth);

// Image upload
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(ROOT, 'images', 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  })
});
fs.mkdirSync(path.join(ROOT, 'images', 'uploads'), { recursive: true });

// Helpers
function loadDB() { return JSON.parse(fs.readFileSync(DB, 'utf8')); }
function saveDB(data) { fs.writeFileSync(DB, JSON.stringify(data, null, 2)); }

// ── API Routes ──
app.get('/api/products', (req, res) => {
  const products = loadDB();
  const q = (req.query.q || '').toLowerCase();
  const filtered = q ? products.filter(p => p.title.toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q)) : products;
  res.json({ total: products.length, products: filtered });
});

app.get('/api/products/:id', (req, res) => {
  const products = loadDB();
  const p = products.find(x => x.id === req.params.id || x.handle === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/products', (req, res) => {
  const products = loadDB();
  const p = req.body;
  p.id = p.handle || 'product-' + Date.now();
  if (!p.images) p.images = [];
  if (!p.tags) p.tags = '';
  products.push(p);
  saveDB(products);
  res.json({ success: true, product: p });
});

app.put('/api/products/:id', (req, res) => {
  const products = loadDB();
  const idx = products.findIndex(x => x.id === req.params.id || x.handle === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products[idx] = { ...products[idx], ...req.body };
  saveDB(products);
  res.json({ success: true, product: products[idx] });
});

app.delete('/api/products/:id', (req, res) => {
  let products = loadDB();
  const before = products.length;
  products = products.filter(x => x.id !== req.params.id && x.handle !== req.params.id);
  saveDB(products);
  res.json({ success: true, removed: before - products.length });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/images/uploads/' + req.file.filename });
});

app.post('/api/rebuild', (req, res) => {
  try {
    const out = execSync('node build.js', { cwd: ROOT, timeout: 30000 }).toString();
    const match = out.match(/Summary: (.+)/);
    res.json({ success: true, output: match ? match[1] : out.trim() });
  } catch (e) {
    res.status(500).json({ error: e.stderr ? e.stderr.toString() : e.message });
  }
});

app.get('/api/collections', (req, res) => {
  // Read collection keys from build.js COLLECTIONS object
  const buildSrc = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
  const keys = [];
  const re = /'([a-z\-]+)':\s*\{\s*name:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(buildSrc))) keys.push({ key: m[1], name: m[2] });
  res.json(keys);
});

// ── Admin UI ──
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Giant Promotions — Admin</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f1117;--card:#171923;--border:#2d2f3a;--gold:#f0c040;--gold-dark:#c9a030;--white:#f0f0f5;--muted:#8b8da3;--danger:#ef4444;--success:#22c55e;--radius:10px}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--white);min-height:100vh}
a{color:var(--gold);text-decoration:none}

/* Layout */
.topbar{background:var(--card);border-bottom:1px solid var(--border);padding:0.8rem 2rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.topbar h1{font-size:1.1rem;font-weight:700;display:flex;align-items:center;gap:0.6rem}
.topbar h1 span{color:var(--gold)}
.topbar-actions{display:flex;gap:0.8rem;align-items:center}
.main{max-width:1200px;margin:0 auto;padding:2rem}

/* Buttons */
.btn{padding:0.55rem 1.2rem;border:none;border-radius:var(--radius);font-family:inherit;font-size:0.82rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;transition:all 0.2s}
.btn-gold{background:var(--gold);color:#111}
.btn-gold:hover{background:var(--gold-dark)}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--white)}
.btn-outline:hover{border-color:var(--gold);color:var(--gold)}
.btn-danger{background:rgba(239,68,68,0.12);color:var(--danger);border:1px solid rgba(239,68,68,0.2)}
.btn-danger:hover{background:var(--danger);color:#fff}
.btn-success{background:rgba(34,197,94,0.12);color:var(--success);border:1px solid rgba(34,197,94,0.2)}
.btn-success:hover{background:var(--success);color:#fff}

/* Stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.4rem;display:flex;align-items:center;gap:1rem}
.stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
.stat-icon.gold{background:rgba(240,192,64,0.1);color:var(--gold)}
.stat-icon.green{background:rgba(34,197,94,0.1);color:var(--success)}
.stat-icon.blue{background:rgba(59,130,246,0.1);color:#3b82f6}
.stat-num{font-size:1.6rem;font-weight:700;line-height:1}
.stat-label{font-size:0.78rem;color:var(--muted);margin-top:0.2rem}

/* Toolbar */
.toolbar{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap}
.search-box{flex:1;min-width:200px;padding:0.6rem 1rem 0.6rem 2.4rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);color:var(--white);font-size:0.88rem;font-family:inherit}
.search-box:focus{outline:none;border-color:var(--gold)}
.search-wrap{position:relative;flex:1;min-width:200px}
.search-wrap i{position:absolute;left:0.8rem;top:50%;transform:translateY(-50%);color:var(--muted);font-size:0.85rem}

/* Table */
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:0.8rem 1rem;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02)}
td{padding:0.7rem 1rem;border-bottom:1px solid rgba(255,255,255,0.03);font-size:0.88rem;vertical-align:middle}
tr:hover td{background:rgba(255,255,255,0.02)}
.product-cell{display:flex;align-items:center;gap:0.8rem}
.product-cell img{width:44px;height:44px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid var(--border)}
.product-name{font-weight:500}
.tag{display:inline-block;padding:0.15rem 0.5rem;border-radius:20px;font-size:0.7rem;font-weight:600;background:rgba(240,192,64,0.08);color:var(--gold);border:1px solid rgba(240,192,64,0.1)}

/* Modal */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:var(--card);border:1px solid var(--border);border-radius:16px;width:680px;max-width:94vw;max-height:88vh;overflow-y:auto;padding:2rem}
.modal h2{font-size:1.2rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
.form-group{margin-bottom:1rem}
.form-group label{display:block;font-size:0.78rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.3rem}
.form-group input,.form-group textarea,.form-group select{width:100%;padding:0.65rem 0.8rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--white);font-family:inherit;font-size:0.88rem}
.form-group input:focus,.form-group textarea:focus{outline:none;border-color:var(--gold)}
.form-group textarea{min-height:80px;resize:vertical}
.form-actions{display:flex;gap:0.8rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)}

/* Image upload area */
.img-preview{display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.5rem}
.img-preview img{width:60px;height:60px;object-fit:contain;border-radius:6px;border:1px solid var(--border);background:var(--bg);cursor:pointer}
.img-preview img:hover{border-color:var(--danger);opacity:0.7}
.upload-zone{border:2px dashed var(--border);border-radius:8px;padding:1.2rem;text-align:center;color:var(--muted);font-size:0.85rem;cursor:pointer;transition:all 0.2s}
.upload-zone:hover{border-color:var(--gold);color:var(--gold)}

/* Toast */
.toast{position:fixed;bottom:2rem;right:2rem;padding:0.8rem 1.4rem;border-radius:var(--radius);font-size:0.88rem;font-weight:500;z-index:300;transform:translateY(100px);opacity:0;transition:all 0.3s}
.toast.show{transform:translateY(0);opacity:1}
.toast.success{background:var(--success);color:#fff}
.toast.error{background:var(--danger);color:#fff}

/* Pagination */
.pagination{display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:1rem;color:var(--muted);font-size:0.85rem}
.pagination button{padding:0.4rem 0.8rem}

/* Rebuild banner */
.rebuild-bar{background:rgba(240,192,64,0.06);border:1px solid rgba(240,192,64,0.15);border-radius:var(--radius);padding:0.8rem 1.2rem;margin-bottom:1.5rem;display:none;align-items:center;justify-content:space-between}
.rebuild-bar.show{display:flex}
.rebuild-bar span{font-size:0.88rem;color:var(--gold)}
</style>
</head>
<body>
<div class="topbar">
  <h1><i class="fas fa-crown" style="color:var(--gold)"></i> Giant <span>Admin</span></h1>
  <div class="topbar-actions">
    <a href="http://localhost:8081" target="_blank" class="btn btn-outline"><i class="fas fa-external-link-alt"></i> View Site</a>
    <button class="btn btn-gold" onclick="rebuildSite()"><i class="fas fa-hammer"></i> Rebuild Site</button>
  </div>
</div>

<div class="main">
  <div id="rebuildBar" class="rebuild-bar">
    <span><i class="fas fa-exclamation-circle"></i> You have unsaved changes. Rebuild the site to publish them.</span>
    <button class="btn btn-gold btn-sm" onclick="rebuildSite()"><i class="fas fa-hammer"></i> Rebuild Now</button>
  </div>

  <div class="stats" id="stats"></div>

  <div class="toolbar">
    <div class="search-wrap">
      <i class="fas fa-search"></i>
      <input type="text" class="search-box" id="searchBox" placeholder="Search products..." oninput="loadProducts()">
    </div>
    <button class="btn btn-gold" onclick="openModal()"><i class="fas fa-plus"></i> Add Product</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Product</th><th>Collection</th><th>Price</th><th>Images</th><th style="width:120px">Actions</th>
      </tr></thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" id="modal"></div>
</div>

<div class="toast" id="toast"></div>

<script>
const PER_PAGE = 25;
let currentPage = 1;
let allProducts = [];
let dirty = false;

async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...opts.headers, 'Content-Type': 'application/json' } });
  return res.json();
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.className = 'toast ' + type, 2500);
}

function markDirty() {
  dirty = true;
  document.getElementById('rebuildBar').classList.add('show');
}

async function loadProducts() {
  const q = document.getElementById('searchBox').value;
  const data = await api('/api/products?q=' + encodeURIComponent(q));
  allProducts = data.products;
  
  document.getElementById('stats').innerHTML =
    '<div class="stat-card"><div class="stat-icon gold"><i class="fas fa-box"></i></div><div><div class="stat-num">' + data.total + '</div><div class="stat-label">Total Products</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon green"><i class="fas fa-images"></i></div><div><div class="stat-num">' + allProducts.filter(p => p.images && p.images.length).length + '</div><div class="stat-label">With Images</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon blue"><i class="fas fa-filter"></i></div><div><div class="stat-num">' + allProducts.length + '</div><div class="stat-label">Showing</div></div></div>';
  
  renderTable();
}

function renderTable() {
  const start = (currentPage - 1) * PER_PAGE;
  const page = allProducts.slice(start, start + PER_PAGE);
  const tbody = document.getElementById('tbody');
  
  tbody.innerHTML = page.map(p => {
    const img = (p.images && p.images[0]) || '';
    const imgTag = img ? '<img src="' + img + '" alt="">' : '<div style="width:44px;height:44px;background:var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--muted)"><i class="fas fa-image"></i></div>';
    const tags = (p.tags || '').split(',').filter(t => t.trim()).slice(0, 2).map(t => '<span class="tag">' + t.trim() + '</span>').join(' ');
    const price = parseFloat(p.price) > 0 ? '$' + parseFloat(p.price).toFixed(2) : '—';
    return '<tr><td><div class="product-cell">' + imgTag + '<div><div class="product-name">' + (p.title || 'Untitled') + '</div><div style="margin-top:3px">' + tags + '</div></div></div></td>' +
      '<td style="color:var(--muted);font-size:0.82rem">' + (p.defaultCollection || 'auto') + '</td>' +
      '<td>' + price + '</td>' +
      '<td style="color:var(--muted)">' + (p.images ? p.images.length : 0) + '</td>' +
      '<td><button class="btn btn-outline" style="padding:0.35rem 0.6rem;font-size:0.75rem" onclick="editProduct(\\'' + (p.id || p.handle) + '\\')"><i class="fas fa-pen"></i></button> ' +
      '<button class="btn btn-danger" style="padding:0.35rem 0.6rem;font-size:0.75rem" onclick="deleteProduct(\\'' + (p.id || p.handle) + '\\',\\'' + (p.title || '').replace(/'/g, '') + '\\')"><i class="fas fa-trash"></i></button></td></tr>';
  }).join('');
  
  const totalPages = Math.ceil(allProducts.length / PER_PAGE);
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  pag.innerHTML = '<button class="btn btn-outline" ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="currentPage--;renderTable()"><i class="fas fa-chevron-left"></i></button>' +
    ' Page ' + currentPage + ' of ' + totalPages +
    ' <button class="btn btn-outline" ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="currentPage++;renderTable()"><i class="fas fa-chevron-right"></i></button>';
}

function openModal(product) {
  const p = product || { title: '', handle: '', body: '', tags: '', price: '0.00', images: [], defaultCollection: null, vendor: '', type: '' };
  const isEdit = !!product;
  
  document.getElementById('modal').innerHTML =
    '<h2><i class="fas fa-' + (isEdit ? 'pen' : 'plus') + '"></i> ' + (isEdit ? 'Edit' : 'Add') + ' Product</h2>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Product Name *</label><input id="fTitle" value="' + (p.title || '').replace(/"/g, '&quot;') + '"></div>' +
      '<div class="form-group"><label>Handle (URL slug)</label><input id="fHandle" value="' + (p.handle || '') + '" placeholder="auto-generated"></div>' +
    '</div>' +
    '<div class="form-group"><label>Description (HTML)</label><textarea id="fBody">' + (p.body || '') + '</textarea></div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Tags (comma-separated)</label><input id="fTags" value="' + (p.tags || '').replace(/"/g, '&quot;') + '"></div>' +
      '<div class="form-group"><label>Price</label><input id="fPrice" type="number" step="0.01" value="' + (p.price || '0.00') + '"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Collection Override</label><input id="fCollection" value="' + (p.defaultCollection || '') + '" placeholder="auto (leave blank)"></div>' +
      '<div class="form-group"><label>Vendor</label><input id="fVendor" value="' + (p.vendor || '') + '"></div>' +
    '</div>' +
    '<div class="form-group"><label>Images</label>' +
      '<div class="img-preview" id="imgPreview">' + (p.images || []).map(u => '<img src="' + u + '" title="Click to remove" onclick="removeImg(this,\\'' + u.replace(/'/g, '') + '\\')">').join('') + '</div>' +
      '<div class="upload-zone" id="uploadZone" onclick="document.getElementById(\\'fileInput\\').click()">📁 Click to upload image</div>' +
      '<input type="file" id="fileInput" accept="image/*" style="display:none" onchange="uploadImage(this)">' +
    '</div>' +
    '<input type="hidden" id="fId" value="' + (p.id || p.handle || '') + '">' +
    '<input type="hidden" id="fIsEdit" value="' + (isEdit ? '1' : '0') + '">' +
    '<div class="form-actions">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-gold" onclick="saveProduct()"><i class="fas fa-save"></i> Save</button>' +
    '</div>';
  
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

let pendingImages = [];

function removeImg(el, url) {
  el.remove();
}

async function uploadImage(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('image', input.files[0]);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.url) {
    const preview = document.getElementById('imgPreview');
    const img = document.createElement('img');
    img.src = data.url;
    img.title = 'Click to remove';
    img.onclick = function() { this.remove(); };
    preview.appendChild(img);
    toast('Image uploaded');
  }
}

async function saveProduct() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) { toast('Product name is required', 'error'); return; }
  
  const handle = document.getElementById('fHandle').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const images = Array.from(document.getElementById('imgPreview').querySelectorAll('img')).map(i => i.src);
  
  const product = {
    title, handle,
    body: document.getElementById('fBody').value,
    tags: document.getElementById('fTags').value,
    price: document.getElementById('fPrice').value || '0.00',
    defaultCollection: document.getElementById('fCollection').value || null,
    vendor: document.getElementById('fVendor').value,
    images,
    id: handle
  };
  
  const isEdit = document.getElementById('fIsEdit').value === '1';
  const id = document.getElementById('fId').value;
  
  if (isEdit) {
    await api('/api/products/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(product) });
    toast('Product updated');
  } else {
    await api('/api/products', { method: 'POST', body: JSON.stringify(product) });
    toast('Product added');
  }
  
  closeModal();
  markDirty();
  loadProducts();
}

async function editProduct(id) {
  const p = await api('/api/products/' + encodeURIComponent(id));
  if (p.error) { toast('Product not found', 'error'); return; }
  openModal(p);
}

async function deleteProduct(id, name) {
  if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
  await api('/api/products/' + encodeURIComponent(id), { method: 'DELETE' });
  toast('Product deleted');
  markDirty();
  loadProducts();
}

async function rebuildSite() {
  toast('Rebuilding site...');
  const data = await api('/api/rebuild', { method: 'POST' });
  if (data.success) {
    toast('Site rebuilt: ' + data.output);
    dirty = false;
    document.getElementById('rebuildBar').classList.remove('show');
  } else {
    toast('Build failed: ' + (data.error || 'Unknown error'), 'error');
  }
}

loadProducts();
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log('\\n🔧 Giant Promotions Admin Panel');
  console.log('   http://localhost:' + PORT);
  console.log('   Login: ' + ADMIN_USER + ' / ' + ADMIN_PASS);
  console.log('');
});
