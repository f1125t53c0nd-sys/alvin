/* ==========================================================
   STOCKMARKET SIM — SCRIPT.JS
   Berisi seluruh logika aplikasi: data produk & transaksi,
   CRUD produk, simulasi penjualan, grafik, tema, toast,
   dan koneksi ke Google Spreadsheet (via Google Apps Script).
   ========================================================== */

/* ============================================================
   KONFIGURASI GOOGLE APPS SCRIPT
   Isi URL di bawah ini dengan URL Web App Google Apps Script-mu
   setelah proses deploy (lihat README.md bagian "Cara
   Menghubungkan Website dengan Google Sheets").

   Jika dibiarkan kosong (""), website akan otomatis
   menggunakan localStorage sebagai penyimpanan sementara,
   sehingga tetap bisa didemokan tanpa Google Sheets.
   ============================================================ */
const GOOGLE_SCRIPT_URL = "MASUKKAN_URL_GOOGLE_APPS_SCRIPT_DI_SINIhttps://script.google.com/macros/s/AKfycbxfREzwGyMXNoUr4UZ7z3qqKazxv4tst7zkoOxesxCTcwZGmbkvUUbzpIyizV2j5BMf9g/exec";

const isGoogleSheetsActive = () =>
  GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith("http");

/* ---------- FORMAT MATA UANG ---------- */
const formatRupiah = (angka) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(angka || 0);

/* ============================================================
   DATA DUMMY AWAL (dipakai jika localStorage masih kosong)
   ============================================================ */
const PRODUK_DUMMY = [
  { id: "PRD001", nama: "Kaos Basic", kategori: "Fashion", harga: 75000, stok: 20, deskripsi: "Kaos katun combed 30s, nyaman dipakai harian.", gambar: "" },
  { id: "PRD002", nama: "Hoodie Oversize", kategori: "Fashion", harga: 175000, stok: 12, deskripsi: "Hoodie fleece tebal dengan potongan oversize.", gambar: "" },
  { id: "PRD003", nama: "Sneakers Casual", kategori: "Fashion", harga: 320000, stok: 3, deskripsi: "Sepatu sneakers untuk penggunaan sehari-hari.", gambar: "" },
  { id: "PRD004", nama: "Tas Ransel", kategori: "Aksesoris", harga: 150000, stok: 8, deskripsi: "Tas ransel dengan banyak kompartemen.", gambar: "" },
  { id: "PRD005", nama: "Topi Baseball", kategori: "Aksesoris", harga: 60000, stok: 25, deskripsi: "Topi baseball adjustable, cocok untuk outdoor.", gambar: "" },
  { id: "PRD006", nama: "Botol Minum", kategori: "Aksesoris", harga: 45000, stok: 0, deskripsi: "Botol minum stainless 500ml, tahan panas & dingin.", gambar: "" },
  { id: "PRD007", nama: "Keyboard Mechanical", kategori: "Elektronik", harga: 450000, stok: 6, deskripsi: "Keyboard mechanical blue switch dengan RGB.", gambar: "" },
  { id: "PRD008", nama: "Mouse Wireless", kategori: "Elektronik", harga: 120000, stok: 15, deskripsi: "Mouse wireless ergonomis dengan baterai tahan lama.", gambar: "" }
];

const TRANSAKSI_DUMMY = [];

/* ============================================================
   STATE APLIKASI
   ============================================================ */
let produkList = [];
let transaksiList = [];
let produkAkanDihapus = null;

/* ============================================================
   PENYIMPANAN DATA: localStorage (fallback) & Google Sheets
   ============================================================ */
function muatDataAwal() {
  const produkTersimpan = localStorage.getItem('sm_produk');
  const transaksiTersimpan = localStorage.getItem('sm_transaksi');

  produkList = produkTersimpan ? JSON.parse(produkTersimpan) : [...PRODUK_DUMMY];
  transaksiList = transaksiTersimpan ? JSON.parse(transaksiTersimpan) : [...TRANSAKSI_DUMMY];

  simpanKeLocalStorage();

  // Jika Google Sheets aktif, coba ambil data terbaru dari sana
  if (isGoogleSheetsActive()) {
    ambilDataDariSheets();
  }
}

function simpanKeLocalStorage() {
  localStorage.setItem('sm_produk', JSON.stringify(produkList));
  localStorage.setItem('sm_transaksi', JSON.stringify(transaksiList));
}

/* Mengirim data ke Google Apps Script Web App.
   Menggunakan mode 'no-cors' pada fetch tidak cocok untuk membaca
   response, jadi kita gunakan text/plain agar terhindar dari
   preflight CORS yang sering gagal pada Apps Script. */
async function kirimKeSheets(action, data) {
  if (!isGoogleSheetsActive()) return { success: true, offline: true };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    });
    const hasil = await response.json();
    return hasil;
  } catch (err) {
    console.error('Gagal mengirim ke Google Sheets:', err);
    tampilkanToast('error', 'Gagal terhubung ke Google Sheets. Data tetap tersimpan lokal.');
    return { success: false, message: err.message };
  }
}

async function ambilDataDariSheets() {
  try {
    const resProduk = await fetch(`${GOOGLE_SCRIPT_URL}?action=getProducts`);
    const dataProduk = await resProduk.json();
    if (dataProduk.success && Array.isArray(dataProduk.data) && dataProduk.data.length > 0) {
      produkList = dataProduk.data;
    }

    const resTransaksi = await fetch(`${GOOGLE_SCRIPT_URL}?action=getTransactions`);
    const dataTransaksi = await resTransaksi.json();
    if (dataTransaksi.success && Array.isArray(dataTransaksi.data)) {
      transaksiList = dataTransaksi.data;
    }

    simpanKeLocalStorage();
    renderSemua();
  } catch (err) {
    console.error('Gagal mengambil data dari Google Sheets:', err);
  }
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function tampilkanToast(tipe, pesan) {
  const container = document.getElementById('toastContainer');
  const ikon = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${tipe}`;
  toast.textContent = `${ikon[tipe] || ''} ${pesan}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

/* ============================================================
   NAVIGASI ANTAR HALAMAN
   ============================================================ */
function pindahHalaman(namaPage) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${namaPage}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === namaPage);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === namaPage);
  });

  tutupSidebarMobile();

  if (namaPage === 'statistik') renderStatistik();
  if (namaPage === 'penjualan') renderFormPenjualan();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
  item.addEventListener('click', () => pindahHalaman(item.dataset.page));
});

/* ---------- Sidebar Mobile ---------- */
function bukaSidebarMobile() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
}
function tutupSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
document.getElementById('hamburgerBtn').addEventListener('click', bukaSidebarMobile);
document.getElementById('sidebarOverlay').addEventListener('click', tutupSidebarMobile);

/* ============================================================
   DARK MODE / LIGHT MODE
   ============================================================ */
function terapkanTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('sm_theme', tema);
}

function toggleTema() {
  const temaSaatIni = document.documentElement.getAttribute('data-theme');
  terapkanTema(temaSaatIni === 'dark' ? 'light' : 'dark');
  renderGrafikDashboard();
  if (document.getElementById('page-statistik').classList.contains('active')) renderStatistik();
}

['themeToggleDesktop', 'themeToggleMobile', 'themeToggleSettings'].forEach(id => {
  document.getElementById(id).addEventListener('click', toggleTema);
});

// Muat tema tersimpan saat halaman pertama kali dibuka
terapkanTema(localStorage.getItem('sm_theme') || 'light');

/* ============================================================
   STATUS PRODUK (badge stok)
   ============================================================ */
function statusStok(stok) {
  if (stok <= 0) return { label: 'Stok habis', kelas: 'badge-red', emoji: '🔴' };
  if (stok <= 5) return { label: 'Stok menipis', kelas: 'badge-yellow', emoji: '🟡' };
  return { label: 'Stok tersedia', kelas: 'badge-green', emoji: '🟢' };
}

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard() {
  const totalProduk = produkList.length;
  const totalStok = produkList.reduce((sum, p) => sum + Number(p.stok), 0);
  const totalPenjualan = transaksiList.reduce((sum, t) => sum + Number(t.total), 0);
  const totalTransaksi = transaksiList.length;

  document.getElementById('statTotalProduk').textContent = `${totalProduk} Produk`;
  document.getElementById('statTotalStok').textContent = `${totalStok} Unit`;
  document.getElementById('statTotalPenjualan').textContent = formatRupiah(totalPenjualan);
  document.getElementById('statTotalTransaksi').textContent = `${totalTransaksi} Transaksi`;

  renderGrafikDashboard();
}

let chartPenjualan, chartTerlaris, chartStatTerlaris, chartStatTren;

function warnaGrafik() {
  const gelap = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    teks: gelap ? '#94a3b8' : '#64748b',
    grid: gelap ? '#29344a' : '#e2e8f0',
    primer: gelap ? '#6366f1' : '#4f46e5',
    aksen: gelap ? '#22d3ee' : '#06b6d4'
  };
}

/* Menghitung total penjualan 7 hari terakhir dari data transaksi */
function dataPenjualanMingguan() {
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu'];
  const labelUrut = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu', 'Minggu'];
  const totalPerHari = {};
  labelUrut.forEach(h => totalPerHari[h] = 0);

  transaksiList.forEach(t => {
    const tanggal = new Date(t.tanggalIso || t.tanggal);
    if (isNaN(tanggal)) return;
    const hari = namaHari[tanggal.getDay()];
    totalPerHari[hari] = (totalPerHari[hari] || 0) + Number(t.total);
  });

  // Jika belum ada transaksi sama sekali, tampilkan data dummy ringan agar grafik tidak kosong
  const adaData = Object.values(totalPerHari).some(v => v > 0);
  if (!adaData) {
    return { label: labelUrut, data: [120000, 95000, 150000, 80000, 210000, 260000, 175000], dummy: true };
  }
  return { label: labelUrut, data: labelUrut.map(h => totalPerHari[h]), dummy: false };
}

/* Menghitung produk terlaris berdasarkan jumlah unit terjual */
function dataProdukTerlaris() {
  const jumlahPerProduk = {};
  transaksiList.forEach(t => {
    jumlahPerProduk[t.namaProduk] = (jumlahPerProduk[t.namaProduk] || 0) + Number(t.jumlah);
  });

  const entri = Object.entries(jumlahPerProduk);
  if (entri.length === 0) {
    // data dummy agar grafik tetap informatif sebelum ada transaksi
    return { label: ['Kaos', 'Hoodie', 'Sepatu', 'Tas', 'Topi'], data: [18, 12, 9, 7, 5] };
  }
  entri.sort((a, b) => b[1] - a[1]);
  const top5 = entri.slice(0, 5);
  return { label: top5.map(e => e[0]), data: top5.map(e => e[1]) };
}

function renderGrafikDashboard() {
  const warna = warnaGrafik();
  const mingguan = dataPenjualanMingguan();
  const terlaris = dataProdukTerlaris();

  if (chartPenjualan) chartPenjualan.destroy();
  chartPenjualan = new Chart(document.getElementById('chartPenjualan'), {
    type: 'line',
    data: {
      labels: mingguan.label,
      datasets: [{
        label: 'Penjualan (Rp)',
        data: mingguan.data,
        borderColor: warna.primer,
        backgroundColor: hexToRgba(warna.primer, 0.12),
        fill: true, tension: 0.35, pointRadius: 3
      }]
    },
    options: opsiGrafik(warna)
  });

  if (chartTerlaris) chartTerlaris.destroy();
  chartTerlaris = new Chart(document.getElementById('chartTerlaris'), {
    type: 'bar',
    data: {
      labels: terlaris.label,
      datasets: [{ label: 'Unit Terjual', data: terlaris.data, backgroundColor: warna.aksen, borderRadius: 6 }]
    },
    options: opsiGrafik(warna, true)
  });
}

function opsiGrafik(warna, horizontal = false) {
  return {
    responsive: true,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: warna.teks }, grid: { color: warna.grid } },
      y: { ticks: { color: warna.teks }, grid: { color: warna.grid } }
    }
  };
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ============================================================
   RENDER: HALAMAN PRODUK
   ============================================================ */
function ambilProdukTersaring() {
  const kataKunci = document.getElementById('searchProduk').value.toLowerCase();
  const kategori = document.getElementById('filterKategori').value;
  const urutan = document.getElementById('sortProduk').value;

  let hasil = produkList.filter(p => {
    const cocokKataKunci = p.nama.toLowerCase().includes(kataKunci) || p.kategori.toLowerCase().includes(kataKunci);
    const cocokKategori = kategori === 'Semua' || p.kategori === kategori;
    return cocokKataKunci && cocokKategori;
  });

  switch (urutan) {
    case 'harga-asc': hasil.sort((a, b) => a.harga - b.harga); break;
    case 'harga-desc': hasil.sort((a, b) => b.harga - a.harga); break;
    case 'stok-desc': hasil.sort((a, b) => b.stok - a.stok); break;
    case 'stok-asc': hasil.sort((a, b) => a.stok - b.stok); break;
    case 'nama-asc': hasil.sort((a, b) => a.nama.localeCompare(b.nama)); break;
  }
  return hasil;
}

function renderProduk() {
  const tbody = document.getElementById('tabelProdukBody');
  const daftar = ambilProdukTersaring();
  const emptyState = document.getElementById('emptyProduk');

  tbody.innerHTML = '';

  if (produkList.length === 0) {
    emptyState.hidden = false;
    document.querySelector('#tabelProduk thead').hidden = true;
    return;
  }
  emptyState.hidden = true;
  document.querySelector('#tabelProduk thead').hidden = false;

  daftar.forEach(p => {
    const status = statusStok(p.stok);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="product-cell">
          <img class="product-thumb" src="${p.gambar || placeholderGambar(p.nama)}" alt="${escapeHtml(p.nama)}"
               onerror="this.src='${placeholderGambar(p.nama)}'">
          <span class="product-name">${escapeHtml(p.nama)}</span>
        </div>
      </td>
      <td>${escapeHtml(p.kategori)}</td>
      <td class="text-right">${formatRupiah(p.harga)}</td>
      <td class="text-right">${p.stok}</td>
      <td><span class="badge ${status.kelas}">${status.emoji} ${status.label}</span></td>
      <td>
        <div class="row-actions">
          <button class="action-btn" data-aksi="edit" data-id="${p.id}" title="Edit"><i data-lucide="pencil"></i></button>
          <button class="action-btn delete" data-aksi="hapus" data-id="${p.id}" title="Hapus"><i data-lucide="trash-2"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  lucide.createIcons();

  tbody.querySelectorAll('[data-aksi="edit"]').forEach(btn =>
    btn.addEventListener('click', () => bukaModalEdit(btn.dataset.id)));
  tbody.querySelectorAll('[data-aksi="hapus"]').forEach(btn =>
    btn.addEventListener('click', () => bukaModalHapus(btn.dataset.id)));
}

function placeholderGambar(nama) {
  const inisial = encodeURIComponent(nama.slice(0, 2).toUpperCase());
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='8' fill='%23e2e8f0'/><text x='50%' y='55%' font-family='sans-serif' font-size='13' fill='%2364748b' text-anchor='middle'>${nama.slice(0,2).toUpperCase()}</text></svg>`)}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

['searchProduk', 'filterKategori', 'sortProduk'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderProduk);
  document.getElementById(id).addEventListener('change', renderProduk);
});

/* ---------- Tambah / Edit Produk (Modal) ---------- */
const modalProduk = document.getElementById('modalProduk');

function bukaModalTambah() {
  document.getElementById('modalProdukTitle').textContent = 'Tambah Produk';
  document.getElementById('formProduk').reset();
  document.getElementById('produkId').value = '';
  modalProduk.classList.add('open');
  lucide.createIcons();
}

function bukaModalEdit(id) {
  const p = produkList.find(item => item.id === id);
  if (!p) return;
  document.getElementById('modalProdukTitle').textContent = 'Edit Produk';
  document.getElementById('produkId').value = p.id;
  document.getElementById('inputNama').value = p.nama;
  document.getElementById('inputKategori').value = p.kategori;
  document.getElementById('inputHarga').value = p.harga;
  document.getElementById('inputStok').value = p.stok;
  document.getElementById('inputDeskripsi').value = p.deskripsi || '';
  document.getElementById('inputGambar').value = p.gambar || '';
  modalProduk.classList.add('open');
}

function tutupModalProduk() { modalProduk.classList.remove('open'); }

document.getElementById('btnTambahProduk').addEventListener('click', bukaModalTambah);
document.getElementById('btnTambahProdukEmpty').addEventListener('click', bukaModalTambah);
document.getElementById('closeModalProduk').addEventListener('click', tutupModalProduk);
document.getElementById('cancelModalProduk').addEventListener('click', tutupModalProduk);

document.getElementById('formProduk').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('produkId').value;
  const dataProduk = {
    nama: document.getElementById('inputNama').value.trim(),
    kategori: document.getElementById('inputKategori').value,
    harga: Number(document.getElementById('inputHarga').value),
    stok: Number(document.getElementById('inputStok').value),
    deskripsi: document.getElementById('inputDeskripsi').value.trim(),
    gambar: document.getElementById('inputGambar').value.trim()
  };

  // Validasi input dasar
  if (!dataProduk.nama || dataProduk.harga < 0 || dataProduk.stok < 0) {
    tampilkanToast('error', 'Pastikan semua data produk valid.');
    return;
  }

  const tombolSubmit = document.getElementById('submitModalProduk');
  tombolSubmit.disabled = true;
  tombolSubmit.textContent = 'Menyimpan...';

  if (id) {
    // EDIT PRODUK
    const index = produkList.findIndex(p => p.id === id);
    produkList[index] = { ...produkList[index], ...dataProduk };
    await kirimKeSheets('updateProduct', { id, ...dataProduk });
    tampilkanToast('success', 'Produk berhasil diperbarui.');
  } else {
    // TAMBAH PRODUK
    const idBaru = buatIdProduk();
    produkList.push({ id: idBaru, ...dataProduk });
    await kirimKeSheets('addProduct', { id: idBaru, ...dataProduk });
    tampilkanToast('success', 'Produk berhasil ditambahkan.');
  }

  simpanKeLocalStorage();
  renderSemua();
  tutupModalProduk();

  tombolSubmit.disabled = false;
  tombolSubmit.textContent = 'Simpan Produk';
});

function buatIdProduk() {
  const nomor = produkList.length + 1;
  return `PRD${String(nomor).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
}

/* ---------- Hapus Produk (Modal Konfirmasi) ---------- */
const modalHapus = document.getElementById('modalHapus');

function bukaModalHapus(id) {
  const p = produkList.find(item => item.id === id);
  if (!p) return;
  produkAkanDihapus = id;
  document.getElementById('hapusNamaProduk').textContent = p.nama;
  modalHapus.classList.add('open');
}

function tutupModalHapus() { modalHapus.classList.remove('open'); produkAkanDihapus = null; }

document.getElementById('closeModalHapus').addEventListener('click', tutupModalHapus);
document.getElementById('cancelHapus').addEventListener('click', tutupModalHapus);
document.getElementById('confirmHapus').addEventListener('click', async () => {
  if (!produkAkanDihapus) return;
  produkList = produkList.filter(p => p.id !== produkAkanDihapus);
  await kirimKeSheets('deleteProduct', { id: produkAkanDihapus });
  simpanKeLocalStorage();
  renderSemua();
  tampilkanToast('success', 'Produk berhasil dihapus.');
  tutupModalHapus();
});

/* ============================================================
   RENDER: HALAMAN SIMULASI PENJUALAN
   ============================================================ */
function renderFormPenjualan() {
  const select = document.getElementById('saleProduk');
  select.innerHTML = produkList.map(p => `<option value="${p.id}">${escapeHtml(p.nama)}</option>`).join('');
  perbaruiInfoPenjualan();
}

function perbaruiInfoPenjualan() {
  const id = document.getElementById('saleProduk').value;
  const p = produkList.find(item => item.id === id);
  const jumlahInput = document.getElementById('saleJumlah');

  if (!p) {
    document.getElementById('saleHarga').textContent = 'Rp0';
    document.getElementById('saleStok').textContent = '0';
    document.getElementById('saleTotal').textContent = 'Rp0';
    return;
  }

  document.getElementById('saleHarga').textContent = formatRupiah(p.harga);
  document.getElementById('saleStok').textContent = p.stok;

  const jumlah = Number(jumlahInput.value) || 0;
  document.getElementById('saleTotal').textContent = formatRupiah(p.harga * jumlah);

  document.getElementById('salePreviewImg').src = p.gambar || placeholderGambar(p.nama);
  document.getElementById('salePreviewNama').textContent = p.nama;
  document.getElementById('salePreviewDeskripsi').textContent = p.deskripsi || 'Tidak ada deskripsi.';
  document.getElementById('salePreviewKategori').textContent = p.kategori;

  const warningEl = document.getElementById('saleWarning');
  if (jumlah > p.stok) {
    warningEl.hidden = false;
    warningEl.textContent = '⚠️ Stok tidak mencukupi.';
  } else {
    warningEl.hidden = true;
  }
}

document.getElementById('saleProduk').addEventListener('change', perbaruiInfoPenjualan);
document.getElementById('saleJumlah').addEventListener('input', perbaruiInfoPenjualan);

document.getElementById('btnSimulasikan').addEventListener('click', async () => {
  const id = document.getElementById('saleProduk').value;
  const jumlah = Number(document.getElementById('saleJumlah').value);
  const p = produkList.find(item => item.id === id);

  // ---------- VALIDASI PENJUALAN ----------
  if (!p) { tampilkanToast('error', 'Pilih produk terlebih dahulu.'); return; }
  if (!jumlah || jumlah <= 0) { tampilkanToast('error', 'Jumlah penjualan tidak boleh 0 atau negatif.'); return; }
  if (jumlah > p.stok) { tampilkanToast('error', 'Stok tidak mencukupi.'); return; }

  const tombol = document.getElementById('btnSimulasikan');
  tombol.disabled = true;
  tombol.textContent = 'Memproses...';

  const total = p.harga * jumlah;
  const sekarang = new Date();
  const transaksiId = `TRX-${String(transaksiList.length + 1).padStart(3, '0')}`;

  const transaksiBaru = {
    id: transaksiId,
    tanggal: sekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tanggalIso: sekarang.toISOString(),
    produkId: p.id,
    namaProduk: p.nama,
    kategori: p.kategori,
    jumlah,
    harga: p.harga,
    total
  };

  // 1. Kurangi stok
  p.stok -= jumlah;
  // 2. Tambahkan ke riwayat transaksi
  transaksiList.unshift(transaksiBaru);
  // 3. Simpan lokal & kirim ke Google Sheets
  simpanKeLocalStorage();
  await kirimKeSheets('addTransaction', transaksiBaru);
  await kirimKeSheets('updateProduct', { id: p.id, ...p });

  // 4-5. Update dashboard & grafik
  renderSemua();
  renderFormPenjualan();

  // 6. Tampilkan animasi sukses
  document.getElementById('suksesDetail').innerHTML =
    `<strong>${jumlah} × ${escapeHtml(p.nama)}</strong><br>Total: ${formatRupiah(total)}`;
  document.getElementById('modalSukses').classList.add('open');

  document.getElementById('saleJumlah').value = 1;

  tombol.disabled = false;
  tombol.innerHTML = '<i data-lucide="check-circle-2"></i> Simulasikan Penjualan';
  lucide.createIcons();
});

document.getElementById('closeSukses').addEventListener('click', () => {
  document.getElementById('modalSukses').classList.remove('open');
});

/* ============================================================
   RENDER: HALAMAN RIWAYAT TRANSAKSI
   ============================================================ */
function renderRiwayat() {
  const tbody = document.getElementById('tabelRiwayatBody');
  const emptyState = document.getElementById('emptyRiwayat');
  const kataKunci = document.getElementById('searchRiwayat').value.toLowerCase();
  const tanggalFilter = document.getElementById('filterTanggal').value;

  const hasil = transaksiList.filter(t => {
    const cocokKataKunci = t.namaProduk.toLowerCase().includes(kataKunci) || (t.kategori || '').toLowerCase().includes(kataKunci);
    const cocokTanggal = !tanggalFilter || (t.tanggalIso && t.tanggalIso.startsWith(tanggalFilter));
    return cocokKataKunci && cocokTanggal;
  });

  tbody.innerHTML = '';

  if (transaksiList.length === 0) {
    emptyState.hidden = false;
    document.querySelector('#tabelRiwayat thead').hidden = true;
    return;
  }
  emptyState.hidden = true;
  document.querySelector('#tabelRiwayat thead').hidden = false;

  hasil.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>${t.tanggal}</td>
      <td>${escapeHtml(t.namaProduk)}</td>
      <td class="text-right">${t.jumlah}</td>
      <td class="text-right">${formatRupiah(t.harga)}</td>
      <td class="text-right">${formatRupiah(t.total)}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('searchRiwayat').addEventListener('input', renderRiwayat);
document.getElementById('filterTanggal').addEventListener('change', renderRiwayat);

/* ============================================================
   RENDER: HALAMAN STATISTIK
   ============================================================ */
function renderStatistik() {
  const totalOmzet = transaksiList.reduce((sum, t) => sum + Number(t.total), 0);
  const produkTerjual = transaksiList.reduce((sum, t) => sum + Number(t.jumlah), 0);

  document.getElementById('statOmzet').textContent = formatRupiah(totalOmzet);
  document.getElementById('statProdukTerjual').textContent = produkTerjual;
  document.getElementById('statJumlahTransaksi').textContent = transaksiList.length;

  const stokTersedikit = [...produkList].sort((a, b) => a.stok - b.stok)[0];
  document.getElementById('statStokSedikit').textContent = stokTersedikit ? `${stokTersedikit.nama} (${stokTersedikit.stok})` : '—';

  const warna = warnaGrafik();
  const terlaris = dataProdukTerlaris();
  const mingguan = dataPenjualanMingguan();

  if (chartStatTerlaris) chartStatTerlaris.destroy();
  chartStatTerlaris = new Chart(document.getElementById('chartStatTerlaris'), {
    type: 'bar',
    data: { labels: terlaris.label, datasets: [{ label: 'Unit Terjual', data: terlaris.data, backgroundColor: warna.primer, borderRadius: 6 }] },
    options: opsiGrafik(warna, true)
  });

  if (chartStatTren) chartStatTren.destroy();
  chartStatTren = new Chart(document.getElementById('chartStatTren'), {
    type: 'line',
    data: { labels: mingguan.label, datasets: [{ label: 'Omzet (Rp)', data: mingguan.data, borderColor: warna.aksen, backgroundColor: hexToRgba(warna.aksen, 0.12), fill: true, tension: 0.35 }] },
    options: opsiGrafik(warna)
  });
}

/* ============================================================
   PENGATURAN
   ============================================================ */
function perbaruiStatusKoneksi() {
  document.getElementById('connStatus').textContent = isGoogleSheetsActive()
    ? 'Terhubung ke Google Spreadsheet'
    : 'Mode Lokal (localStorage)';
}

document.getElementById('btnTestConn').addEventListener('click', async () => {
  if (!isGoogleSheetsActive()) {
    tampilkanToast('warning', 'GOOGLE_SCRIPT_URL belum diisi. Website menggunakan localStorage.');
    return;
  }
  tampilkanToast('info', 'Menguji koneksi ke Google Sheets...');
  const hasil = await kirimKeSheets('getProducts', {});
  tampilkanToast(hasil.success ? 'success' : 'error', hasil.success ? 'Koneksi berhasil!' : 'Koneksi gagal, periksa URL Apps Script.');
});

document.getElementById('btnResetData').addEventListener('click', () => {
  if (!confirm('Reset seluruh data lokal ke data dummy awal?')) return;
  produkList = [...PRODUK_DUMMY];
  transaksiList = [...TRANSAKSI_DUMMY];
  simpanKeLocalStorage();
  renderSemua();
  tampilkanToast('success', 'Data lokal berhasil direset.');
});

/* ============================================================
   RENDER SEMUA (dipanggil setelah perubahan data)
   ============================================================ */
function renderSemua() {
  renderDashboard();
  renderProduk();
  renderRiwayat();
  perbaruiStatusKoneksi();
  lucide.createIcons();
}

/* ============================================================
   INISIALISASI APLIKASI
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  muatDataAwal();
  renderSemua();
  renderFormPenjualan();
});
