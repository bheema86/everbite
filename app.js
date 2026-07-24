let data, cart = [], mixSelections = {}, productSelections = {}, customOrderQuantity = 1;
const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);

async function initialise(){
  data = await (await fetch('assets/products.json')).json();
  byId('whatsapp-order').insertAdjacentHTML('beforebegin','<p id="cart-order-note" class="cart-order-note">Minimum order ₹499. Shipping charges applicable.</p>');
  data.ingredients.filter(item => item.customMix !== false).forEach(item => mixSelections[item.id] = 0);
  // Preselect a sensible starting quantity without placing anything in the bag.
  data.featuredMixes.filter(item => !item.comingSoon).forEach(item => productSelections[item.id] = {quantity:1});
  data.ingredients.forEach(item => productSelections[`single:${item.id}`] = {size:item.packWeight||250,quantity:1});
  data.combos.forEach(item => productSelections[item.id] = {quantity:1});
  document.querySelector('.catalogue-heading')?.remove();
  document.querySelector('.minimum-note').textContent = 'Add any ingredients you like. Your total weight and price update as you build.';
  addCustomQuantityControls(); renderProducts(); renderCombos(); renderMixer(); renderCart(); bindInterface();
  byId('year').textContent = new Date().getFullYear();
}

function quantityControl(key, count){ return `<div class="count-control"><button data-count="-1" data-key="${key}">−</button><strong>${count}</strong><button data-count="1" data-key="${key}">+</button></div>`; }
function bindCountControls(){ document.querySelectorAll('[data-count]').forEach(button=>button.addEventListener('click',()=>{ const key=button.dataset.key, change=Number(button.dataset.count); if(key.startsWith('mix:')){ const id=key.slice(4); productSelections[id]={quantity:Math.max(0,(productSelections[id]?.quantity||0)+change)}; renderProducts(); } else if(key.startsWith('combo:')){ const id=key.slice(6); productSelections[id]={quantity:Math.max(0,(productSelections[id]?.quantity||0)+change)}; renderCombos(); } else { const previous=productSelections[key]||{size:0,quantity:0}; productSelections[key]={...previous,quantity:Math.max(0,previous.quantity+change)}; renderProducts(); } })); }

function renderProducts(){
  byId('featured-products').innerHTML=data.featuredMixes.map(product=>{
    const count=productSelections[product.id]?.quantity||0, total=product.price*Math.max(1,count);
    return `<article class="mix-card"><span class="product-kicker">${product.tag}</span><h3>${product.name}</h3><p class="pack-items">${product.comingSoon?'Recipe coming soon':product.description}</p>${product.comingSoon?'':`<p class="pack-weight">Pack weight: ${product.weight} g</p>`}${''/*product.proteinGrams?`<span class="nutrition-pill">${product.proteinGrams}g protein</span>`:''*/}<div class="purchase-area">${product.comingSoon?'<strong>Coming soon</strong>':`<strong class="live-price">${money(total)}</strong>${quantityControl(`mix:${product.id}`,count)}<button class="add-button" data-add-pack="${product.id}" ${count?'':'disabled'}>Add to bag</button>`}</div></article>`;
  }).join('');
  byId('single-products').innerHTML=data.ingredients.map(product=>{
    const state=productSelections[`single:${product.id}`]||{size:0,quantity:0}; const unitPrice=state.size?Math.ceil(product.pricePerKg*state.size/1000):0;
    return `<article class="product-card"><img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'" /><div class="product-card-copy"><h3>${product.name}</h3>${''/*`<p><strong>${product.proteinPer100g}g protein</strong> / 100 g</p>`*/}${product.packWeight?`<p class="pack-weight">Pack weight: ${product.packWeight} g</p>`:`<div class="size-options"><button class="${state.size===250?'selected':''}" data-size="250" data-id="${product.id}">250 g</button><button class="${state.size===500?'selected':''}" data-size="500" data-id="${product.id}">500 g</button><button class="${state.size===1000?'selected':''}" data-size="1000" data-id="${product.id}">1 kg</button></div>`}<div class="purchase-area"><strong class="live-price">${state.size?money(unitPrice*Math.max(1,state.quantity)):'₹0'}</strong>${quantityControl(`single:${product.id}`,state.quantity)}<button class="add-button" data-add-single="${product.id}" ${state.size&&state.quantity?'':'disabled'}>Add to bag</button></div></div></article>`;
  }).join('');
  document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{ const key=`single:${button.dataset.id}`, previous=productSelections[key]||{quantity:0}; productSelections[key]={size:Number(button.dataset.size),quantity:previous.quantity}; renderProducts(); }));
  bindCountControls();
  document.querySelectorAll('[data-add-pack]').forEach(button=>button.addEventListener('click',()=>{ const product=data.featuredMixes.find(item=>item.id===button.dataset.addPack), count=productSelections[product.id].quantity; addToCart({id:`pack:${product.id}`,name:product.name,detail:`${product.weight} g pack`,price:product.price},count); showToast(`${product.name} added to bag`); }));
  document.querySelectorAll('[data-add-single]').forEach(button=>button.addEventListener('click',()=>{ const product=data.ingredients.find(item=>item.id===button.dataset.addSingle), state=productSelections[`single:${product.id}`], grams=state.size; addToCart({id:`single:${product.id}:${grams}`,name:product.name,detail:grams===1000?'1 kg':`${grams} g`,price:Math.ceil(product.pricePerKg*grams/1000)},state.quantity); showToast(`${product.name} added to bag`); }));
}

function renderCombos(){
  byId('combo-products').innerHTML=data.combos.map(product=>{
    const count=productSelections[product.id]?.quantity||0, total=product.price*Math.max(1,count);
    return `<article class="product-card"><img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'" /><div class="product-card-copy"><h3>${product.name}</h3><p>${product.description}</p><p class="pack-weight">Pack weight: ${product.weight} g</p>${''/*product.proteinGrams?`<span class="nutrition-pill">${product.proteinGrams}g protein</span>`:''*/}<div class="purchase-area"><strong class="live-price">${money(total)}</strong>${quantityControl(`combo:${product.id}`,count)}<button class="add-button" data-add-combo="${product.id}" ${count?'':'disabled'}>Add to bag</button></div></div></article>`;
  }).join('');
  bindCountControls();
  document.querySelectorAll('[data-add-combo]').forEach(button=>button.addEventListener('click',()=>{ const product=data.combos.find(item=>item.id===button.dataset.addCombo), count=productSelections[product.id].quantity; addToCart({id:`combo:${product.id}`,name:product.name,detail:`${product.weight} g pack`,price:product.price},count); showToast(`${product.name} added to bag`); }));
}

function addCustomQuantityControls(){ const button=byId('add-custom-mix'); button.insertAdjacentHTML('beforebegin','<div class="custom-buy-actions"><div class="count-control"><button id="custom-minus">−</button><strong id="custom-order-qty">1</strong><button id="custom-plus">+</button></div></div>'); byId('custom-minus').addEventListener('click',()=>{customOrderQuantity=Math.max(1,customOrderQuantity-1);byId('custom-order-qty').textContent=customOrderQuantity;});byId('custom-plus').addEventListener('click',()=>{customOrderQuantity++;byId('custom-order-qty').textContent=customOrderQuantity;});byId('reset-custom-mix').addEventListener('click',()=>{Object.keys(mixSelections).forEach(id=>mixSelections[id]=0);customOrderQuantity=1;byId('custom-order-qty').textContent='1';renderMixer();}); }
function renderMixer(){
  const mixItems = data.ingredients.filter(item => item.customMix !== false);
  byId('mixer-ingredients').innerHTML=mixItems.map(item=>`<div class="ingredient-control"><b class="ingredient-icon">${item.icon}</b><span>${item.name}</span><div class="quantity-control"><button data-mix="-1" data-id="${item.id}">−</button><strong>${mixSelections[item.id]}</strong><button data-mix="1" data-id="${item.id}">+</button><button class="clear-ingredient" data-clear="${item.id}" ${mixSelections[item.id]?'':'disabled'}>×</button></div></div>`).join('');
  byId('mixer-ingredients').querySelectorAll('.ingredient-control').forEach((card,index)=>{ const item=mixItems[index], count=mixSelections[item.id]; card.querySelector('.quantity-control strong').textContent=item.unit==='grams'?`${count*item.unitWeightG} g`:`${count} pc`; });
  document.querySelectorAll('[data-mix]').forEach(button=>button.addEventListener('click',()=>{mixSelections[button.dataset.id]=Math.max(0,mixSelections[button.dataset.id]+Number(button.dataset.mix));renderMixer();}));
  document.querySelectorAll('[data-clear]').forEach(button=>button.addEventListener('click',()=>{mixSelections[button.dataset.clear]=0;renderMixer();})); updateMixTotal();
}
function updateMixTotal(){
  const mixItems = data.ingredients.filter(item => item.customMix !== false);
  const weight=mixItems.reduce((sum,item)=>sum+mixSelections[item.id]*item.unitWeightG,0), raw=mixItems.reduce((sum,item)=>sum+(mixSelections[item.id]*item.unitWeightG/1000*item.pricePerKg),0), protein=mixItems.reduce((sum,item)=>sum+(mixSelections[item.id]*item.unitWeightG*item.proteinPer100g/100),0), price=Math.ceil(raw*data.store.customMixMarkup*2)/2;
  byId('mix-weight').textContent=`${weight.toFixed(weight%1?2:0)} g`;byId('mix-price').textContent=money(price);byId('mix-protein').textContent=`${protein.toFixed(1)} g protein`;
  const button=byId('add-custom-mix'), resetButton=byId('reset-custom-mix');button.disabled=weight<=0;resetButton.disabled=weight<=0;button.onclick=()=>{const detail=mixItems.filter(item=>mixSelections[item.id]).map(item=>`${item.name} × ${mixSelections[item.id]}`).join(', ');addToCart({id:`custom:${detail}`,name:'Your custom mix',detail,price},customOrderQuantity);showToast('Custom mix added to bag');};
}

function addToCart(item,quantity){ if(!quantity||quantity<1)return; const current=cart.find(entry=>entry.id===item.id);if(current)current.quantity+=quantity;else cart.push({...item,quantity});renderCart(); }
function renderCart(){ const total=cart.reduce((sum,item)=>sum+item.price*item.quantity,0);document.querySelector('.cart-count').textContent=cart.reduce((sum,item)=>sum+item.quantity,0);byId('cart-total').textContent=money(total);byId('cart-items').innerHTML=cart.length?cart.map((item,index)=>`<article class="cart-item"><div><h3>${item.name}</h3><p>${item.detail}</p><div class="cart-quantity"><button data-cart="-1" data-index="${index}">−</button><strong>${item.quantity}</strong><button data-cart="1" data-index="${index}">+</button></div></div><div><strong>${money(item.price*item.quantity)}</strong><button class="delete-item" data-delete="${index}" aria-label="Remove ${item.name}">Remove</button></div></article>`).join(''):'<p class="empty-cart">Your bag is waiting for a better bite.</p>';document.querySelectorAll('[data-cart]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.index);cart[index].quantity+=Number(button.dataset.cart);if(cart[index].quantity<1)cart.splice(index,1);renderCart();}));document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>{cart.splice(Number(button.dataset.delete),1);renderCart();})); }
function showToast(message){let toast=document.querySelector('.bag-toast');if(!toast){toast=document.createElement('div');toast.className='bag-toast';document.body.append(toast);}toast.textContent=`✓ ${message}`;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400);}
function openCart(){document.querySelector('.cart-drawer').classList.add('open');document.querySelector('.backdrop').classList.add('open');}function closeCart(){document.querySelector('.cart-drawer').classList.remove('open');document.querySelector('.backdrop').classList.remove('open');}
function bindInterface(){document.querySelector('.cart-button').addEventListener('click',openCart);document.querySelector('.close-cart').addEventListener('click',closeCart);document.querySelector('.backdrop').addEventListener('click',closeCart);byId('whatsapp-order').addEventListener('click',orderWhatsApp);document.querySelector('.whatsapp-link').addEventListener('click',event=>{event.preventDefault();window.open(`https://wa.me/${data.store.whatsappNumber}`,'_blank','noopener');});const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.main-nav');menu.addEventListener('click',()=>{nav.classList.toggle('open');menu.setAttribute('aria-expanded',nav.classList.contains('open'));});nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>nav.classList.remove('open')));}
function renderCart(){
  const total=cart.reduce((sum,item)=>sum+item.price*item.quantity,0), minimumOrder=499, freebieOrder=999, orderButton=byId('whatsapp-order'), orderNote=byId('cart-order-note');
  document.querySelector('.cart-count').textContent=cart.reduce((sum,item)=>sum+item.quantity,0);
  byId('cart-total').textContent=money(total);
  orderButton.disabled=!cart.length;
  if(!cart.length)orderNote.textContent='Minimum order ₹499. Shipping charges applicable.';
  else if(total<minimumOrder)orderNote.textContent=`Add ${money(minimumOrder-total)} more to place your order. Minimum order ₹499.`;
  else if(total>=freebieOrder)orderNote.textContent='Eligible for a free one-day trial pack on your first order. Shipping charges applicable.';
  else orderNote.textContent='Minimum order met. Shipping charges applicable.';
  byId('cart-items').innerHTML=cart.length?cart.map((item,index)=>`<article class="cart-item"><div><h3>${item.name}</h3><p>${item.detail}</p><div class="cart-quantity"><button data-cart="-1" data-index="${index}">−</button><strong>${item.quantity}</strong><button data-cart="1" data-index="${index}">+</button></div></div><div><strong>${money(item.price*item.quantity)}</strong><button class="delete-item" data-delete="${index}" aria-label="Remove ${item.name}">Remove</button></div></article>`).join(''):'<p class="empty-cart">Your bag is waiting for a better bite.</p>';
  document.querySelectorAll('[data-cart]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.index);cart[index].quantity+=Number(button.dataset.cart);if(cart[index].quantity<1)cart.splice(index,1);renderCart();}));
  document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>{cart.splice(Number(button.dataset.delete),1);renderCart();}));
}
function orderWhatsApp(){
  const total=cart.reduce((sum,item)=>sum+item.price*item.quantity,0);
  if(!cart.length)return;
  const lines=cart.map(item=>`• ${item.name} (${item.detail}) × ${item.quantity} — ${money(item.price*item.quantity)}`).join('\n'), freebieNote=total>=999?'\n\n*Freebie:* Please include the free one-day trial pack if this is my first order.':'', text=`Hello ${data.store.name}! I would like to place an order:\n\n${lines}\n\n*Total: ${money(total)}*\nShipping charges applicable.${freebieNote}`;
  window.open(`https://wa.me/${data.store.whatsappNumber}?text=${encodeURIComponent(text)}`,'_blank','noopener');
}
initialise().catch(error=>{console.error(error);document.body.insertAdjacentHTML('afterbegin','<p style="padding:20px">Could not load product data. Please run this folder through a local server.</p>');});
