/* ── Giant Promotions Cart System ── */
/* Cart stored in localStorage, checkout = quote request */

function getCart() {
  try { return JSON.parse(localStorage.getItem('gp_cart') || '[]'); }
  catch(e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem('gp_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(btn) {
  const name = btn.dataset.name;
  const img = btn.dataset.img;
  const price = btn.dataset.price;
  const cart = getCart();
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, img, price, qty: 1 });
  }
  saveCart(cart);
  // Button feedback
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check"></i> Added!';
  btn.classList.add('added');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('added'); }, 1200);
  // Briefly flash open the cart
  const drawer = document.getElementById('cartDrawer');
  if (drawer && !drawer.classList.contains('open')) {
    toggleCart();
    setTimeout(() => { if(drawer.classList.contains('open')) toggleCart(); }, 2000);
  }
}

function removeFromCart(name) {
  let cart = getCart().filter(i => i.name !== name);
  saveCart(cart);
}

function updateQty(name, delta) {
  let cart = getCart();
  const item = cart.find(i => i.name === name);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.name !== name);
  }
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem('gp_cart');
  updateCartUI();
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  drawer.classList.toggle('open');
  overlay.classList.toggle('open');
  document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
}

function updateCartUI() {
  const cart = getCart();
  const badge = document.getElementById('cartBadge');
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const toggleBtn = document.getElementById('cartToggle');
  
  if (!badge) return;
  
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = totalItems;
  badge.style.display = totalItems > 0 ? 'flex' : 'none';
  if (toggleBtn) toggleBtn.classList.toggle('has-items', totalItems > 0);
  
  if (!itemsEl) return;
  
  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    if (footerEl) footerEl.style.display = 'none';
    // Remove all item elements
    itemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());
    return;
  }
  
  if (emptyEl) emptyEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'block';
  
  // Rebuild items
  itemsEl.querySelectorAll('.cart-item').forEach(el => el.remove());
  
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    const priceStr = parseFloat(item.price) > 0 ? `<span class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</span>` : '<span class="cart-item-price quote">Quote</span>';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        ${priceStr}
        <div class="cart-item-qty">
          <button onclick="updateQty('${item.name.replace(/'/g, "\\'")}', -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateQty('${item.name.replace(/'/g, "\\'")}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash-alt"></i></button>
    `;
    itemsEl.appendChild(div);
  });
}

function prepareCheckout() {
  const cart = getCart();
  if (cart.length === 0) return false;
  // Store cart data for the contact page to pick up
  localStorage.setItem('gp_checkout', 'true');
  return true;
}

// ── Contact page: pick up cart items ──
function handleCheckout() {
  const params = new URLSearchParams(window.location.search);
  const isCart = params.get('cart') === 'true';
  const isCheckout = localStorage.getItem('gp_checkout') === 'true';
  
  if (isCart && isCheckout) {
    const cart = getCart();
    if (cart.length > 0) {
      const textarea = document.querySelector('textarea.form-control');
      const heading = document.querySelector('form') && document.querySelector('form').closest('div').querySelector('h3');
      
      let msg = "Hi, I'd like to request a quote for the following items:\n\n";
      cart.forEach((item, i) => {
        msg += `${i+1}. ${item.name} — Qty: ${item.qty}`;
        if (parseFloat(item.price) > 0) msg += ` (Listed: $${parseFloat(item.price).toFixed(2)} each)`;
        msg += '\n';
      });
      msg += '\nPlease let me know about availability and pricing. Thank you!';
      
      if (textarea) textarea.value = msg;
      if (heading) heading.textContent = `Quote Request (${cart.length} items)`;
      
      const pageH1 = document.querySelector('.page-hero h1');
      if (pageH1) pageH1.textContent = 'Request a Quote';
      
      // Clear checkout flag (but keep cart so they can still see it)
      localStorage.removeItem('gp_checkout');
    }
  }
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  if (window.location.pathname.includes('contact')) {
    handleCheckout();
  }
});
