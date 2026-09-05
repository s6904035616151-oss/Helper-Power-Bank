/* =========================================================
   script.js — ใช้ร่วมกันทุกหน้า (product.html, order.html, admin.html)
   ========================================================= */

/* -------------------- CONFIG (แก้ตรงนี้ที่เดียว) -------------------- */
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzGcQmAig6rORunr-ulush4ZQ4h2IJApMy_JWKtOSRujs52X_u_gWYzIa6p5vnDswod/exec', // URL ของ Google Apps Script Web App
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_O_K52M1tn-L-7GJ_nQo0MHY4wd75ysIRluT1p1QgVUEZdjG7CS5AgKU8tZ_0fxNCHlkvD-z3DAxP/pub?gid=0&single=true&output=csv', // URL ของ Google Sheet ที่ publish เป็น CSV
  PRODUCTS_JSON: 'products.json'
};

/* -------------------- ตัวช่วยทั่วไป -------------------- */
function formatPrice(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('th-TH');
}

function qs(selector) {
  return document.querySelector(selector);
}

/* =========================================================
   1) PRODUCT PAGE (product.html)
   ต้องมี #filter-bar และ #product-list
   ========================================================= */
function initProductPage() {
  const filterBar = qs('#filter-bar');
  const productList = qs('#product-list');
  if (!filterBar || !productList) return;

  let allProducts = [];
  const params = new URLSearchParams(window.location.search);
  let currentType = params.get('type') || 'all';

  fetch(CONFIG.PRODUCTS_JSON)
    .then(res => res.json())
    .then(data => {
      allProducts = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.products) ? data.products : []);
      renderFilterBar(allProducts);
      renderProducts(currentType);
    })
    .catch(err => {
      console.error('โหลด products.json ไม่สำเร็จ:', err);
      productList.innerHTML = '<p>ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>';
    });

  function renderFilterBar(products) {
    // ดึงประเภทสินค้าที่ไม่ซ้ำกันจากข้อมูลจริง
    const types = [...new Set(products.map(p => p.type).filter(Boolean))];

    filterBar.innerHTML = '';

    const allBtn = createFilterButton('ทั้งหมด', 'all');
    filterBar.appendChild(allBtn);

    types.forEach(type => {
      filterBar.appendChild(createFilterButton(type, type));
    });

    updateActiveButton(currentType);
  }

  function createFilterButton(label, typeValue) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.dataset.type = typeValue;
    btn.classList.add('filter-btn');
    btn.addEventListener('click', () => {
      currentType = typeValue;
      updateActiveButton(currentType);
      renderProducts(currentType);

      // อัปเดต URL parameter โดยไม่รีโหลดหน้า
      const url = new URL(window.location.href);
      if (typeValue === 'all') {
        url.searchParams.delete('type');
      } else {
        url.searchParams.set('type', typeValue);
      }
      window.history.replaceState({}, '', url);
    });
    return btn;
  }

  function updateActiveButton(typeValue) {
    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === typeValue);
    });
  }

  function renderProducts(typeValue) {
    const filtered = typeValue === 'all'
      ? allProducts
      : allProducts.filter(p => p.type === typeValue);

    productList.innerHTML = '';

    if (filtered.length === 0) {
      productList.innerHTML = '<p>ไม่พบสินค้าในหมวดนี้</p>';
      return;
    }

    filtered.forEach(product => {
      productList.appendChild(createProductCard(product));
    });
  }

  function createProductCard(product) {
    const card = document.createElement('div');
    card.classList.add('product-card');

    const img = document.createElement('img');
    img.src = product.image || '';
    img.alt = product.name || '';
    card.appendChild(img);

    const name = document.createElement('h3');
    name.textContent = product.name || '';
    card.appendChild(name);

    if (product.size) {
      const size = document.createElement('p');
      size.classList.add('product-size');
      size.textContent = 'ไซส์: ' + product.size;
      card.appendChild(size);
    }

    const price = document.createElement('p');
    price.classList.add('product-price');
    price.textContent = formatPrice(product.price) + ' บาท';
    card.appendChild(price);

    const hasColors = Array.isArray(product.colors) && product.colors.length > 0;
    let selectedColor = hasColors ? product.colors[0] : null;

    const orderBtn = document.createElement('a');
    orderBtn.classList.add('order-btn');
    orderBtn.textContent = 'สั่งซื้อ';

    function updateOrderLink() {
      const itemName = selectedColor
        ? (product.name || '') + ' สี' + selectedColor.name
        : (product.name || '');
      const orderUrl = new URL('order.html', window.location.href);
      orderUrl.searchParams.set('item', itemName);
      orderUrl.searchParams.set('price', product.price != null ? product.price : '');
      orderBtn.href = orderUrl.toString();
    }

    if (hasColors) {
      const swatchGroup = document.createElement('div');
      swatchGroup.classList.add('swatch-group');

      const swatchButtons = [];

      product.colors.forEach(color => {
        const swatchBtn = document.createElement('button');
        swatchBtn.type = 'button';
        swatchBtn.classList.add('swatch');
        swatchBtn.style.backgroundColor = color.hex || '#FFFFFF';
        swatchBtn.setAttribute('aria-label', color.name || '');
        swatchBtn.title = color.name || '';

        swatchBtn.addEventListener('click', () => {
          selectedColor = color;
          swatchButtons.forEach(b => b.classList.remove('is-selected'));
          swatchBtn.classList.add('is-selected');
          updateOrderLink();
        });

        swatchButtons.push(swatchBtn);
        swatchGroup.appendChild(swatchBtn);
      });

      if (swatchButtons.length > 0) {
        swatchButtons[0].classList.add('is-selected');
      }

      card.appendChild(swatchGroup);
    }

    updateOrderLink();
    card.appendChild(orderBtn);

    return card;
  }
}

/* =========================================================
   2) ORDER PAGE (order.html)
   ต้องมี #orderForm, #customerName, #contact, #items, #total, #note
   ========================================================= */
function initOrderPage() {
  const form = qs('#orderForm');
  if (!form) return;

  const itemsField = qs('#items');
  const totalField = qs('#total');

  // เติมค่า item และ price จาก URL parameter ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get('item');
  const priceParam = params.get('price');

  if (itemsField && itemParam !== null) {
    itemsField.value = itemParam;
  }
  if (totalField && priceParam !== null) {
    totalField.value = priceParam;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const payload = {
      customerName: qs('#customerName') ? qs('#customerName').value : '',
      contact: qs('#contact') ? qs('#contact').value : '',
      items: qs('#items') ? qs('#items').value : '',
      total: qs('#total') ? qs('#total').value : '',
      note: qs('#note') ? qs('#note').value : ''
    };

    fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* =========================================================
   3) ADMIN PAGE (admin.html)
   ต้องมี #ordersTable tbody
   ========================================================= */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  fetch(CONFIG.CSV_URL)
    .then(res => res.text())
    .then(csvText => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) return;

      // แถวแรกเป็น header, ที่เหลือเป็นข้อมูล
      const dataRows = rows.slice(1).filter(r => r.length > 1 || (r[0] && r[0].trim() !== ''));

      // เรียงจากล่าสุดขึ้นก่อน โดยอิงคอลัมน์แรก (วันเวลา)
      dataRows.sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeB - timeA;
      });

      renderTable(dataRows);
    })
    .catch(err => {
      console.error('โหลดข้อมูลจาก CSV ไม่สำเร็จ:', err);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    });

  function renderTable(rows) {
    tbody.innerHTML = '';

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
      return;
    }

    rows.forEach(row => {
      const tr = document.createElement('tr');
      // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
      for (let i = 0; i < 6; i++) {
        const td = document.createElement('td');
        td.textContent = row[i] !== undefined ? row[i] : '';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }
}

/**
 * parseCSV: แปลงข้อความ CSV ให้เป็น array of array แบบไม่พึ่ง library ภายนอก
 * รองรับค่าที่ครอบด้วยเครื่องหมายคำพูด " " ซึ่งอาจมี comma หรือ newline อยู่ข้างใน
 * และรองรับเครื่องหมาย "" สำหรับ escape เครื่องหมายคำพูดภายในค่า
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let insideQuotes = false;

  // ตัด BOM ที่อาจติดมากับไฟล์ CSV ของ Google Sheets
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++; // ข้ามตัวถัดไป เพราะเป็นคู่ escape
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        // ข้าม \r เพื่อรองรับ \r\n
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  // เพิ่มแถวสุดท้ายถ้ายังมีข้อมูลค้างอยู่
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/* -------------------- เริ่มทำงานเมื่อโหลดหน้าเว็บ -------------------- */
document.addEventListener('DOMContentLoaded', function () {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
