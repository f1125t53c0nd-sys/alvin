/* ==========================================================
   STOCKMARKET SIM — GOOGLE APPS SCRIPT BACKEND
   File ini dijalankan di Google Apps Script (script.google.com),
   BUKAN di website. Fungsinya sebagai penghubung antara
   website (fetch) dengan Google Spreadsheet.

   Struktur Spreadsheet yang dibutuhkan:

   Sheet "Products"  -> A:ID | B:Nama | C:Kategori | D:Harga
                         | E:Stok | F:Deskripsi | G:Gambar | H:CreatedAt

   Sheet "Transactions" -> A:TransactionID | B:Date | C:ProductID
                            | D:ProductName | E:Quantity | F:Price | G:Total

   Lihat README.md untuk tutorial pembuatan sheet & deployment.
   ========================================================== */

const SHEET_PRODUCTS = "Products";
const SHEET_TRANSACTIONS = "Transactions";

/* ---------- ENTRY POINT: POST (tambah/ubah/hapus data) ---------- */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data || {};

    let hasil;
    switch (action) {
      case "addProduct":    hasil = addProduct(data); break;
      case "updateProduct": hasil = updateProduct(data); break;
      case "deleteProduct": hasil = deleteProduct(data); break;
      case "addTransaction": hasil = addTransaction(data); break;
      case "getProducts":    hasil = getProducts(); break;
      case "getTransactions": hasil = getTransactions(); break;
      default:
        hasil = { success: false, message: "Action tidak dikenali: " + action };
    }
    return responJson(hasil);

  } catch (err) {
    return responJson({ success: false, message: "Terjadi kesalahan: " + err.message });
  }
}

/* ---------- ENTRY POINT: GET (ambil data) ---------- */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let hasil;
    switch (action) {
      case "getProducts":     hasil = getProducts(); break;
      case "getTransactions": hasil = getTransactions(); break;
      default:
        hasil = { success: false, message: "Action tidak dikenali: " + action };
    }
    return responJson(hasil);
  } catch (err) {
    return responJson({ success: false, message: "Terjadi kesalahan: " + err.message });
  }
}

/* ---------- HELPER: BUNGKUS RESPON JSON ---------- */
function responJson(objek) {
  return ContentService
    .createTextOutput(JSON.stringify(objek))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- HELPER: AMBIL SHEET (buat header otomatis jika belum ada) ---------- */
function ambilSheetProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PRODUCTS);
    sheet.appendRow(["ID", "Nama", "Kategori", "Harga", "Stok", "Deskripsi", "Gambar", "CreatedAt"]);
  }
  return sheet;
}

function ambilSheetTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TRANSACTIONS);
    sheet.appendRow(["TransactionID", "Date", "ProductID", "ProductName", "Quantity", "Price", "Total"]);
  }
  return sheet;
}

/* ============================================================
   FUNGSI: PRODUK
   ============================================================ */
function addProduct(data) {
  const sheet = ambilSheetProducts();
  const id = data.id || "PRD" + new Date().getTime();
  sheet.appendRow([
    id, data.nama, data.kategori, data.harga, data.stok,
    data.deskripsi || "", data.gambar || "", new Date()
  ]);
  return { success: true, message: "Produk berhasil ditambahkan", id: id };
}

function updateProduct(data) {
  const sheet = ambilSheetProducts();
  const baris = cariBarisById(sheet, data.id);
  if (baris === -1) return { success: false, message: "Produk tidak ditemukan" };

  sheet.getRange(baris, 2).setValue(data.nama);
  sheet.getRange(baris, 3).setValue(data.kategori);
  sheet.getRange(baris, 4).setValue(data.harga);
  sheet.getRange(baris, 5).setValue(data.stok);
  sheet.getRange(baris, 6).setValue(data.deskripsi || "");
  sheet.getRange(baris, 7).setValue(data.gambar || "");

  return { success: true, message: "Produk berhasil diperbarui" };
}

function deleteProduct(data) {
  const sheet = ambilSheetProducts();
  const baris = cariBarisById(sheet, data.id);
  if (baris === -1) return { success: false, message: "Produk tidak ditemukan" };

  sheet.deleteRow(baris);
  return { success: true, message: "Produk berhasil dihapus" };
}

function getProducts() {
  const sheet = ambilSheetProducts();
  const rows = sheet.getDataRange().getValues();
  rows.shift(); // buang baris header

  const produk = rows
    .filter(r => r[0] !== "")
    .map(r => ({
      id: r[0], nama: r[1], kategori: r[2], harga: r[3],
      stok: r[4], deskripsi: r[5], gambar: r[6]
    }));

  return { success: true, data: produk };
}

/* ============================================================
   FUNGSI: TRANSAKSI
   ============================================================ */
function addTransaction(data) {
  const sheet = ambilSheetTransactions();
  const id = data.id || "TRX" + new Date().getTime();
  sheet.appendRow([
    id, data.tanggal || new Date(), data.produkId,
    data.namaProduk, data.jumlah, data.harga, data.total
  ]);
  return { success: true, message: "Transaksi berhasil disimpan", id: id };
}

function getTransactions() {
  const sheet = ambilSheetTransactions();
  const rows = sheet.getDataRange().getValues();
  rows.shift();

  const transaksi = rows
    .filter(r => r[0] !== "")
    .map(r => ({
      id: r[0], tanggal: r[1], produkId: r[2],
      namaProduk: r[3], jumlah: r[4], harga: r[5], total: r[6]
    }));

  return { success: true, data: transaksi };
}

/* ---------- HELPER: CARI BARIS BERDASARKAN ID ---------- */
function cariBarisById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) return i + 1; // +1 karena getRange bersifat 1-indexed
  }
  return -1;
}
