let data; let cart = []; let quantities = {};
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const byId = id => document.getElementById(id);

async function initialise() {
  const response = await fetch('assets/products.json');
  data = await response.json();
  data.ingredients.forEach(item => quantities[item.id] = 0);
  renderProducts(); renderMixer(); renderCart(); bindInterface();
  byId('year').textContent = new Date().getFullYear();
}

function renderProducts() {
  byId('featured-products').innerHTML = data.featuredMixes.map(product => `<article class="mix-card"><span class="product-kicker">${product.tag}</span><h3>${product.name}</h3><p>${product.description}</p><p class="ingredients">${product.ingredients}</p>${product.proteinGrams ? `<span class="nutrition-pill">${product.proteinGrams}g protein</span>` : ''}<div class="price-row">${product.comingSoon ? '<strong>Coming soon</strong>' : `<strong>${money(product.price)}</strong><button class="add-button" data-mix="${product.id}">Add to bag</button>`}</div></article>`).join('');
  byId('single-products').innerHTML = data.ingredients.map(product => `<article class="product-card"><img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" /><div class="product-card-copy"><h3>${product.name}</h3><p><strong>${product.proteinPer100g}g protein</strong> / 100 g</p><div class="size-options"><button data-single="${product.id}" data-size="250">250 g</button><button data-single="${product.id}" data-size="500">500 g</button><button data-single="${product.id}" data-size="1000">1 kg</button></div></div></article>`).join('');
  document.querySelectorAll('[data-mix]').forEach(button => button.addEventListener('click', () => {
    const product = data.featuredMixes.find(item => item.id === button.dataset.mix);
    addToCart({ id: product.id, name: product.name, detail: `${product.weight} g blend`, price: product.price });
  }));
  document.querySelectorAll('[data-single]').forEach(button => button.addEventListener('click', () => {
    const product = data.ingredients.find(item => item.id === button.dataset.single);
    const grams = Number(button.dataset.size);
    addToCart({ id: `${product.id}-${grams}`, name: product.name, detail: grams === 1000 ? '1 kg' : `${grams} g`, price: Math.ceil(product.pricePerKg * grams / 1000) });
  }));
}

function renderMixer() {
  byId('mixer-ingredients').innerHTML = data.ingredients.map(item => {
    const selected = quantities[item.id]; const weight = selected * item.unitWeightG;
    const label = item.unit === 'piece' ? `${selected} ${selected === 1 ? 'piece' : 'pieces'} · ${weight.toFixed(weight % 1 ? 2 : 0)} g` : `${weight} g`;
    return `<div class="ingredient-control"><b class="ingredient-icon">${item.icon}</b><span>${item.name}<small>${item.unit === 'piece' ? `1 piece = ${item.unitWeightG} g` : `choose in ${item.unitWeightG} g portions`}</small></span><div class="quantity-control"><button aria-label="Remove one ${item.name}" data-change="-1" data-id="${item.id}">−</button><strong>${label}</strong><button aria-label="Add ${item.name}" data-change="1" data-id="${item.id}">+</button>${selected ? `<button class="clear-ingredient" aria-label="Remove all ${item.name}" data-clear="${item.id}">×</button>` : ''}</div></div>`;
  }).join('');
  document.querySelectorAll('[data-change]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.id; quantities[id] = Math.max(0, quantities[id] + Number(button.dataset.change)); renderMixer(); }));
  document.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click', () => { quantities[button.dataset.clear] = 0; renderMixer(); }));
  updateMixTotal();
}

function updateMixTotal() {
  const weight = data.ingredients.reduce((sum, item) => sum + quantities[item.id] * item.unitWeightG, 0);
  const raw = data.ingredients.reduce((sum, item) => sum + (quantities[item.id] * item.unitWeightG) / 1000 * item.pricePerKg, 0);
  const protein = data.ingredients.reduce((sum, item) => sum + (quantities[item.id] * item.unitWeightG) * item.proteinPer100g / 100, 0);
  const price = Math.ceil(raw * data.store.customMixMarkup);
  byId('mix-weight').textContent = `${weight.toFixed(weight % 1 ? 2 : 0)} g`;
  byId('mix-price').textContent = money(price);
  byId('mix-protein').textContent = `${protein.toFixed(1)} g protein`;
  const button = byId('add-custom-mix'); button.disabled = weight < data.store.minimumCustomMixGrams;
  button.onclick = () => {
    const detail = data.ingredients.filter(item => quantities[item.id]).map(item => `${item.name} ${item.unit === 'piece' ? `${quantities[item.id]} pcs` : `${quantities[item.id] * item.unitWeightG}g`}`).join(', ');
    addToCart({ id: `custom-${Date.now()}`, name: 'Your custom mix', detail, price });
    Object.keys(quantities).forEach(key => quantities[key] = 0); renderMixer();
  };
}

function addToCart(item) { cart.push(item); renderCart(); openCart(); }
function renderCart() { const total = cart.reduce((sum, item) => sum + item.price, 0); document.querySelector('.cart-count').textContent = cart.length; byId('cart-total').textContent = money(total); byId('cart-items').innerHTML = cart.length ? cart.map((item, index) => `<article class="cart-item"><div><h3>${item.name}</h3><p>${item.detail}</p></div><div><strong>${money(item.price)}</strong><button data-remove="${index}">Remove</button></div></article>`).join('') : '<p class="empty-cart">Your bag is waiting for a better bite.</p>'; document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { cart.splice(Number(button.dataset.remove), 1); renderCart(); })); }
function openCart() { document.querySelector('.cart-drawer').classList.add('open'); document.querySelector('.backdrop').classList.add('open'); document.querySelector('.cart-drawer').setAttribute('aria-hidden', 'false'); }
function closeCart() { document.querySelector('.cart-drawer').classList.remove('open'); document.querySelector('.backdrop').classList.remove('open'); document.querySelector('.cart-drawer').setAttribute('aria-hidden', 'true'); }
function orderWhatsApp() { if (!cart.length) return; const total = cart.reduce((sum, item) => sum + item.price, 0); const lines = cart.map(item => `• ${item.name} (${item.detail}) — ${money(item.price)}`).join('\n'); const text = `Hello ${data.store.name}! I would like to place an order:\n\n${lines}\n\n*Total: ${money(total)}*\n\nPlease share payment and delivery details.`; window.open(`https://wa.me/${data.store.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); }
function bindInterface() { document.querySelector('.cart-button').addEventListener('click', openCart); document.querySelector('.close-cart').addEventListener('click', closeCart); document.querySelector('.backdrop').addEventListener('click', closeCart); byId('whatsapp-order').addEventListener('click', orderWhatsApp); document.querySelector('.whatsapp-link').addEventListener('click', event => { event.preventDefault(); window.open(`https://wa.me/${data.store.whatsappNumber}`, '_blank', 'noopener'); }); const menu = document.querySelector('.menu-toggle'), nav = document.querySelector('.main-nav'); menu.addEventListener('click', () => { nav.classList.toggle('open'); menu.setAttribute('aria-expanded', nav.classList.contains('open')); }); nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open'))); }
initialise().catch(() => document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">Could not load product data. Please run this folder through a local server.</p>'));
