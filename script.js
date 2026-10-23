/* =========================================================
   script.js — ใช้ร่วมกันทุกหน้า (product / order / admin)
   แต่ละส่วนจะทำงานเฉพาะเมื่อหน้านั้นมี element ที่กำหนดเท่านั้น
   ========================================================= */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhdslQZNjSQMpr6Ego6q_TtO4fEUlXV1cKkBLx3m1lx9ZhvVPlj1jM6Ofv6L04OQ8F/exec';
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRsxz7aQbcot7FuQfaCpjRfURRiIVKJdeqnqO4tQ_DoZj4Yfurl_zHHpazw2am5qOmbeH9HrjBts3g4/pub?gid=0&single=true&output=csv';

// key = ค่า mood ใน products.json (ตัวพิมพ์เล็ก), label = ข้อความบนปุ่ม
const MOODS = [
  { key: 'all',     label: 'ทั้งหมด' },
  { key: 'fresh',   label: 'Fresh' },
  { key: 'relax',   label: 'Relax' },
  { key: 'focus',   label: 'Focus' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});


/* =========================================================
   1) product.html — #filter-bar, #product-list
   ========================================================= */

let allProducts = [];

function initProductPage() {
  const list = document.getElementById('product-list');
  const params = new URLSearchParams(window.location.search);
  const moodParam = (params.get('mood') || 'all').trim().toLowerCase();
  const initialMood = MOODS.some(m => m.key === moodParam) ? moodParam : 'all';

  renderFilterBar(initialMood);
  list.innerHTML = '<p class="loading">กำลังโหลดสินค้า...</p>';

  fetch('products.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      allProducts = Array.isArray(data) ? data : [];
      renderProducts(initialMood);
    })
    .catch(error => {
      console.error(error);
      list.innerHTML = '<p class="error">โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

function renderFilterBar(activeMood) {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;
  bar.innerHTML = '';

  MOODS.forEach(m => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-btn' + (m.key === activeMood ? ' active' : '');
    btn.dataset.mood = m.key;
    btn.textContent = m.label;
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(m.key);
      updateMoodInUrl(m.key);
    });
    bar.appendChild(btn);
  });
}

function updateMoodInUrl(mood) {
  const url = new URL(window.location.href);
  if (mood === 'all') url.searchParams.delete('mood');
  else url.searchParams.set('mood', mood);
  window.history.replaceState(null, '', url);
}

function renderProducts(mood) {
  const list = document.getElementById('product-list');
  list.innerHTML = '';

  const items = mood === 'all'
    ? allProducts
    : allProducts.filter(p => String(p.mood).toLowerCase() === mood);

  if (items.length === 0) {
    list.innerHTML = '<p class="empty">ไม่พบสินค้าในหมวดนี้</p>';
    return;
  }

  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';

    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = p.name;

    const size = document.createElement('p');
    size.className = 'product-size';
    size.textContent = 'ไซส์: ' + p.size;

    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = p.price + ' บาท';

    const orderParams = new URLSearchParams({ item: p.name, price: p.price });
    const btn = document.createElement('a');
    btn.className = 'order-btn';
    btn.href = 'order.html?' + orderParams.toString();
    btn.textContent = 'สั่งซื้อ';

    card.append(img, name, size, price, btn);
    list.appendChild(card);
  });
}


/* =========================================================
   2) order.html — #orderForm, #customerName, #contact,
                   #items, #total, #note
   ========================================================= */

function initOrderPage() {
  const form = document.getElementById('orderForm');
  const params = new URLSearchParams(window.location.search);

  const item = params.get('item');
  const price = params.get('price');

  // เติมค่าลงฟอร์มทันทีที่โหลดหน้า — ทั้ง #items และ #total
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');
  if (itemsInput && item !== null) itemsInput.value = item;
  if (totalInput && price !== null) totalInput.value = price;

  form.addEventListener('submit', event => {
    event.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true; // กันกดซ้ำ

    const payload = {
      customerName: getValue('customerName'),
      contact: getValue('contact'),
      items: getValue('items'),
      total: getValue('total'),
      note: getValue('note')
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}


/* =========================================================
   3) admin.html — #ordersTable tbody
   คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line,
            รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
   ========================================================= */

const ADMIN_COLUMNS = 6;

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  showTableMessage(tbody, 'กำลังโหลดข้อมูล...');

  fetch(SHEET_CSV_URL, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(text => {
      let rows = parseCSV(text).filter(r => r.some(cell => cell.trim() !== ''));

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องจำนวนเงินไม่ใช่ตัวเลข) ให้ตัดออก
      if (rows.length > 0 && isHeaderRow(rows[0])) rows.shift();

      // ชีตต่อแถวใหม่ไว้ล่างสุด → กลับลำดับเพื่อให้ล่าสุดขึ้นก่อน
      rows.reverse();

      renderOrders(tbody, rows);
    })
    .catch(error => {
      console.error(error);
      showTableMessage(tbody, 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    });
}

function isHeaderRow(row) {
  const totalCell = (row[4] || '').replace(/,/g, '').trim();
  return totalCell === '' || isNaN(Number(totalCell));
}

function renderOrders(tbody, rows) {
  tbody.innerHTML = '';

  if (rows.length === 0) {
    showTableMessage(tbody, 'ยังไม่มีรายการสั่งซื้อ');
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    for (let i = 0; i < ADMIN_COLUMNS; i++) {
      const td = document.createElement('td');
      td.textContent = row[i] !== undefined ? row[i] : '';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function showTableMessage(tbody, message) {
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = ADMIN_COLUMNS;
  td.textContent = message;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

/* parse CSV เอง (ไม่ใช้ library)
   รองรับ: ช่องที่ครอบด้วย "...", "" ภายในช่อง, คอมม่าและขึ้นบรรทัดใหม่ในช่อง,
   บรรทัดแบบ CRLF และ BOM ต้นไฟล์ */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  text = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
