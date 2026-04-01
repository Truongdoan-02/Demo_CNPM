const products = [
  { id: 1, name: 'iPhone 15 Pro Max', price: 32990000, img: 'https://via.placeholder.com/400x300?text=iPhone+15+Pro+Max', storage: '512GB', color: 'Graphite' },
  { id: 2, name: 'iPhone 15 Pro', price: 27990000, img: 'https://via.placeholder.com/400x300?text=iPhone+15+Pro', storage: '256GB', color: 'Silver' },
  { id: 3, name: 'iPhone 15', price: 20990000, img: 'https://via.placeholder.com/400x300?text=iPhone+15', storage: '128GB', color: 'Pink' },
  { id: 4, name: 'iPhone 14 Plus', price: 18490000, img: 'https://via.placeholder.com/400x300?text=iPhone+14+Plus', storage: '128GB', color: 'Blue' }
];

const cart = [];

function formatVND(number) {
  return new Intl.NumberFormat('vi-VN').format(number);
}

function renderProducts() {
  const grid = document.querySelector('.product-grid');
  grid.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p>Ram 8GB • ${p.storage} • ${p.color}</p>
      <div class="price">${formatVND(p.price)} đ</div>
      <button data-id="${p.id}">Thêm vào giỏ</button>
    `;
    grid.appendChild(card);
  });

  grid.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
      const id = Number(e.target.dataset.id);
      addToCart(id);
    }
  });
}

function addToCart(productId) {
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    const product = products.find(p => p.id === productId);
    cart.push({ ...product, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  const container = document.querySelector('.cart-items');
  const totalEl = document.getElementById('cart-total');

  container.innerHTML = '';
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (cart.length === 0) {
    container.innerHTML = '<p>Giỏ hàng trống.</p>';
  } else {
    cart.forEach(item => {
      const itemDom = document.createElement('div');
      itemDom.className = 'item';
      itemDom.innerHTML = `
        <span>${item.name} x${item.qty}</span>
        <strong>${formatVND(item.price * item.qty)} đ</strong>
      `;
      container.appendChild(itemDom);
    });
  }

  totalEl.textContent = formatVND(total);
}

function init() {
  renderProducts();
  renderCart();

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (cart.length === 0) {
      alert('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
      return;
    }
    alert('Cảm ơn bạn đã đặt hàng! Tổng: ' + formatVND(cart.reduce((sum, item) => sum + item.price * item.qty, 0)) + ' đ');
    cart.length = 0;
    renderCart();
  });
}

init();
