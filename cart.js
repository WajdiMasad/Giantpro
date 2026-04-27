/* ── Giant Promotions Quote System ── */
/* 3-step modal: Products → Contact Info → Review & Submit */
/* Mirrors the existing giantpro.com Shopify quote flow */

// ── Cart Data ──
function getCart() {
  try { return JSON.parse(localStorage.getItem('gp_cart') || '[]'); }
  catch(e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem('gp_cart', JSON.stringify(cart));
  updateBadge();
}

// ── Add / Remove / Update ──
function addToCart(btn) {
  const name = btn.dataset.name;
  const img = btn.dataset.img;
  const price = btn.dataset.price;
  const cart = getCart();
  const existing = cart.find(i => i.name === name);
  if (existing) { existing.qty++; }
  else { cart.push({ name, img, price, qty: 1 }); }
  saveCart(cart);

  // Button feedback
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check"></i> Added!';
  btn.classList.add('added');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('added'); }, 1200);

  // Open modal at step 1
  openQuoteModal(1);
}

function removeFromCart(name) {
  saveCart(getCart().filter(i => i.name !== name));
  renderStep(currentStep);
}

function updateCartQty(name, val) {
  const cart = getCart();
  const item = cart.find(i => i.name === name);
  if (item) {
    item.qty = Math.max(1, parseInt(val) || 1);
  }
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem('gp_cart');
  updateBadge();
  renderStep(1);
}

// ── Badge ──
function updateBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('quoteBadge');
  const tabCount = document.getElementById('quoteTabCount');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
  if (tabCount) tabCount.textContent = total;
  const toggleBtn = document.getElementById('quoteToggle');
  if (toggleBtn) toggleBtn.classList.toggle('has-items', total > 0);
}

// ── Modal Control ──
let currentStep = 1;

function openQuoteModal(step) {
  currentStep = step || 1;
  document.getElementById('quoteModal').classList.add('open');
  document.getElementById('quoteOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderStep(currentStep);
}

function closeQuoteModal() {
  document.getElementById('quoteModal').classList.remove('open');
  document.getElementById('quoteOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function goToStep(step) {
  if (step === 2) {
    const cart = getCart();
    if (cart.length === 0) return;
  }
  if (step === 3) {
    // Validate contact fields
    const name = document.getElementById('qName').value.trim();
    const email = document.getElementById('qEmail').value.trim();
    if (!name || !email) {
      alert('Please fill in your name and email.');
      return;
    }
  }
  currentStep = step;
  renderStep(step);
}

function renderStep(step) {
  // Update step indicators
  document.querySelectorAll('.quote-step-tab').forEach(tab => {
    const s = parseInt(tab.dataset.step);
    tab.classList.toggle('active', s === step);
    tab.classList.toggle('completed', s < step);
  });

  const body = document.getElementById('quoteBody');
  const footer = document.getElementById('quoteFooter');
  const cart = getCart();

  if (step === 1) {
    renderStep1(body, footer, cart);
  } else if (step === 2) {
    renderStep2(body, footer);
  } else if (step === 3) {
    renderStep3(body, footer, cart);
  }
}

// ── Step 1: Products Selection ──
function renderStep1(body, footer, cart) {
  if (cart.length === 0) {
    body.innerHTML = `
      <div class="quote-empty">
        <i class="fas fa-cart-plus"></i>
        <h4>Your quote list is empty</h4>
        <p>Browse our catalog and add products to get started</p>
      </div>`;
    footer.innerHTML = `
      <button class="quote-btn quote-btn-outline" onclick="closeQuoteModal()">Continue Shopping</button>`;
    return;
  }

  let rows = cart.map(item => `
    <div class="quote-product-row">
      <img src="${item.img}" alt="${item.name}">
      <div class="quote-product-name">${item.name}</div>
      <input type="number" class="quote-qty-input" value="${item.qty}" min="1" 
             onchange="updateCartQty('${item.name.replace(/'/g, "\\'")}', this.value); renderStep(1);">
      <button class="quote-remove-btn" onclick="removeFromCart('${item.name.replace(/'/g, "\\'")}')">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>`).join('');

  body.innerHTML = `
    <div class="quote-products-table">
      <div class="quote-table-header">
        <span>Product</span>
        <span>Quantity</span>
        <span></span>
      </div>
      ${rows}
    </div>`;

  footer.innerHTML = `
    <button class="quote-btn quote-btn-outline" onclick="closeQuoteModal()">Continue Shopping</button>
    <button class="quote-btn quote-btn-primary" onclick="goToStep(2)">Next Step <i class="fas fa-arrow-right"></i></button>`;
}

// ── Step 2: Contact Information ──
function renderStep2(body, footer) {
  // Preserve existing values
  const saved = JSON.parse(localStorage.getItem('gp_contact') || '{}');

  body.innerHTML = `
    <div class="quote-contact-form">
      <div class="quote-form-group">
        <label for="qName">Full Name <span class="req">*</span></label>
        <input type="text" id="qName" class="quote-input" placeholder="John Doe" value="${saved.name || ''}" required>
      </div>
      <div class="quote-form-group">
        <label for="qEmail">Email Address <span class="req">*</span></label>
        <input type="email" id="qEmail" class="quote-input" placeholder="john@example.com" value="${saved.email || ''}" required>
      </div>
      <div class="quote-form-group">
        <label for="qPhone">Phone Number</label>
        <input type="tel" id="qPhone" class="quote-input" placeholder="902-555-0000" value="${saved.phone || ''}">
      </div>
      <div class="quote-form-group">
        <label for="qDate">Event Date</label>
        <input type="date" id="qDate" class="quote-input" value="${saved.date || ''}">
      </div>
      <div class="quote-form-group">
        <label for="qMessage">Message / Special Instructions</label>
        <textarea id="qMessage" class="quote-input quote-textarea" placeholder="Tell us about your event, venue, or any special requirements...">${saved.message || ''}</textarea>
      </div>
    </div>`;

  footer.innerHTML = `
    <button class="quote-btn quote-btn-outline" onclick="goToStep(1)"><i class="fas fa-arrow-left"></i> Back</button>
    <button class="quote-btn quote-btn-primary" onclick="saveContactAndNext()">Next Step <i class="fas fa-arrow-right"></i></button>`;
}

function saveContactAndNext() {
  const contact = {
    name: document.getElementById('qName').value.trim(),
    email: document.getElementById('qEmail').value.trim(),
    phone: document.getElementById('qPhone').value.trim(),
    date: document.getElementById('qDate').value,
    message: document.getElementById('qMessage').value.trim()
  };
  if (!contact.name || !contact.email) {
    alert('Please fill in your name and email address.');
    return;
  }
  localStorage.setItem('gp_contact', JSON.stringify(contact));
  goToStep(3);
}

// ── Step 3: Review & Submit ──
function renderStep3(body, footer, cart) {
  const contact = JSON.parse(localStorage.getItem('gp_contact') || '{}');

  let productRows = cart.map(item => `
    <div class="review-product-row">
      <img src="${item.img}" alt="${item.name}">
      <span class="review-product-name">${item.name}</span>
      <span class="review-product-qty">×${item.qty}</span>
    </div>`).join('');

  body.innerHTML = `
    <div class="quote-review">
      <div class="review-section">
        <h4><i class="fas fa-box"></i> Products (${cart.length})</h4>
        ${productRows}
      </div>
      <div class="review-section">
        <h4><i class="fas fa-user"></i> Contact Information</h4>
        <div class="review-info-grid">
          <div class="review-info-item"><span class="review-label">Name</span><span>${contact.name}</span></div>
          <div class="review-info-item"><span class="review-label">Email</span><span>${contact.email}</span></div>
          ${contact.phone ? `<div class="review-info-item"><span class="review-label">Phone</span><span>${contact.phone}</span></div>` : ''}
          ${contact.date ? `<div class="review-info-item"><span class="review-label">Event Date</span><span>${contact.date}</span></div>` : ''}
          ${contact.message ? `<div class="review-info-item review-message"><span class="review-label">Message</span><span>${contact.message}</span></div>` : ''}
        </div>
      </div>
    </div>`;

  footer.innerHTML = `
    <button class="quote-btn quote-btn-outline" onclick="goToStep(2)"><i class="fas fa-arrow-left"></i> Back</button>
    <button class="quote-btn quote-btn-submit" onclick="submitQuote()"><i class="fas fa-paper-plane"></i> Submit Quote Request</button>`;
}

// ── Submit via Web3Forms ──
async function submitQuote() {
  const cart = getCart();
  const contact = JSON.parse(localStorage.getItem('gp_contact') || '{}');

  // Build readable product list
  let productList = cart.map((item, i) => 
    `${i+1}. ${item.name} — Qty: ${item.qty}`
  ).join('\n');

  let message = `QUOTE REQUEST\n\n`;
  message += `Products:\n${productList}\n\n`;
  message += `Contact:\n`;
  message += `Name: ${contact.name}\n`;
  message += `Email: ${contact.email}\n`;
  if (contact.phone) message += `Phone: ${contact.phone}\n`;
  if (contact.date) message += `Event Date: ${contact.date}\n`;
  if (contact.message) message += `\nMessage:\n${contact.message}\n`;

  // Show loading state
  const modalBody = document.getElementById('quoteBody');
  const modalFooter = document.getElementById('quoteFooter');
  modalBody.innerHTML = `
    <div class="quote-success">
      <div class="success-icon"><i class="fas fa-spinner fa-spin"></i></div>
      <h3>Sending your quote request...</h3>
      <p>Please wait while we process your request.</p>
    </div>`;
  modalFooter.innerHTML = '';

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: 'YOUR_WEB3FORMS_KEY',
        subject: `Quote Request — ${cart.length} item${cart.length > 1 ? 's' : ''} — ${contact.name}`,
        from_name: contact.name,
        email: contact.email,
        phone: contact.phone || 'Not provided',
        event_date: contact.date || 'Not specified',
        products: productList,
        message: contact.message || 'No additional message',
        full_message: message
      })
    });

    const data = await res.json();

    if (data.success) {
      modalBody.innerHTML = `
        <div class="quote-success">
          <div class="success-icon"><i class="fas fa-check-circle"></i></div>
          <h3>Quote Request Sent!</h3>
          <p>Thank you, ${contact.name}! Our team will review your request and get back to you within 24 hours.</p>
          <div class="success-summary">
            <span><strong>${cart.length}</strong> product${cart.length > 1 ? 's' : ''} requested</span>
            <span>We'll respond to <strong>${contact.email}</strong></span>
          </div>
        </div>`;
      modalFooter.innerHTML = `
        <button class="quote-btn quote-btn-primary" onclick="closeQuoteModal(); clearCart(); localStorage.removeItem('gp_contact');" style="width:100%;">Done</button>`;
    } else {
      throw new Error('Submission failed');
    }
  } catch(err) {
    modalBody.innerHTML = `
      <div class="quote-success">
        <div class="success-icon" style="color:#ef4444;"><i class="fas fa-exclamation-triangle"></i></div>
        <h3>Something went wrong</h3>
        <p>Please try again, or contact us directly at <strong>info@giantpro.com</strong> or <strong>902-456-6487</strong>.</p>
      </div>`;
    modalFooter.innerHTML = `
      <button class="quote-btn quote-btn-outline" onclick="goToStep(3)"><i class="fas fa-arrow-left"></i> Back</button>
      <button class="quote-btn quote-btn-submit" onclick="submitQuote()"><i class="fas fa-redo"></i> Try Again</button>`;
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  updateBadge();
});
