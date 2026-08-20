// ============================================================
// Museum Tuanku Imam Bonjol — app.js
// Dipakai oleh 404.html untuk menampilkan info koleksi
// berdasarkan Kode QR yang ada di alamat URL (mis. /qr/QR001)
// ============================================================

// ⚠️ GANTI sesuai nama repo GitHub kalian, contoh: "/koleksi-tib"
const REPO_BASE = "/Koleksi";

const root = document.getElementById("app-root");

function getQrCodeFromPath() {
  // Ambil segmen terakhir dari path, mis. "/koleksi-tib/qr/QR001" -> "QR001"
  const path = window.location.pathname.replace(/\/+$/, "");
  const parts = path.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "").toUpperCase();
}

function showState(title, message) {
  root.innerHTML = `
    <div class="state-box">
      <h2>${title}</h2>
      <p>${message}</p>
    </div>`;
}

function fieldHtml(label, value) {
  const isEmpty = !value || value.trim() === "";
  return `
    <div class="meta-item">
      <p class="label">${label}</p>
      <p class="value ${isEmpty ? "kosong" : ""}">${isEmpty ? "Belum tercatat" : escapeHtml(value)}</p>
    </div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function ukuranText(u) {
  if (!u) return "";
  const parts = [];
  if (u.panjang) parts.push(`P ${u.panjang}`);
  if (u.lebar) parts.push(`L ${u.lebar}`);
  if (u.tinggi) parts.push(`T ${u.tinggi}`);
  if (u.tebal) parts.push(`Tebal ${u.tebal}`);
  if (u.diameter) parts.push(`Diameter ${u.diameter}`);
  return parts.join(" \u00d7 ");
}

function renderDetail(item, opts = {}) {
  const fotoHtml = `
    <img class="foto" src="${REPO_BASE}/${item.foto}" alt="Foto ${escapeHtml(item.nama_umum)}"
      onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'foto-placeholder',textContent:'Foto belum tersedia'}))">`;

  const namaDaerah = item.nama_daerah && item.nama_daerah !== item.nama_umum
    ? `<p class="nama-daerah">${escapeHtml(item.nama_daerah)}</p>` : "";

  const backHtml = opts.showBack
    ? `<button class="back-link" onclick="renderList(window.__currentMapping, window.__currentQr)">&larr; Kembali ke daftar koleksi Box ${escapeHtml(item.nomor_box)}</button>`
    : "";

  root.innerHTML = `
    ${backHtml}
    <div class="tag">
      <span class="kode">${escapeHtml(item.kode_tib)}</span>
      ${fotoHtml}
      <h2>${escapeHtml(item.nama_umum)}</h2>
      ${namaDaerah}
      <hr>
      <div class="meta-grid">
        ${fieldHtml("No. Registrasi", item.no_registrasi)}
        ${fieldHtml("No. Inventaris", item.no_inventaris_b)}
        ${fieldHtml("Jenis Koleksi", item.jenis_koleksi)}
        ${fieldHtml("Sub Jenis", item.sub_jenis_koleksi)}
        ${fieldHtml("Bahan", item.bahan)}
        ${fieldHtml("Kondisi Benda", item.kondisi_benda)}
        ${fieldHtml("Ukuran", ukuranText(item.ukuran))}
        ${fieldHtml("Cara Didapat", item.cara_didapat)}
        <div class="meta-item full">${fieldHtml("Tempat Asal Didapat / Dibuat", [item.tempat_asal_didapat, item.tempat_asal_dibuat].filter(Boolean).join(" / "))}</div>
      </div>
      ${item.deskripsi ? `
        <div class="deskripsi">
          <p class="label">Deskripsi</p>
          <p>${escapeHtml(item.deskripsi)}</p>
        </div>` : ""}
      ${item.pencatat ? `<p class="pencatat">Pencatat/Pengolah data: ${escapeHtml(item.pencatat)}</p>` : ""}
    </div>
  `;
}

function renderList(koleksiList, kodeQr) {
  window.__currentQr = kodeQr;
  const intro = `
    <p class="list-intro">Box <strong>${escapeHtml(kodeQr.replace("QR",""))}</strong> berisi
      <strong>${koleksiList.length} koleksi</strong>. Ketuk salah satu untuk melihat detail.</p>`;

  const rows = koleksiList.map((item, i) => `
    <div class="item-row" tabindex="0" role="button"
      onclick="renderDetail(window.__currentItems[${i}], {showBack:true})"
      onkeypress="if(event.key==='Enter')this.click()">
      <img class="thumb" src="${REPO_BASE}/${item.foto}" alt=""
        onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb-placeholder'}))">
      <div class="info">
        <p class="nama">${escapeHtml(item.nama_umum)}</p>
        <p class="jenis">${escapeHtml(item.jenis_koleksi || "")}${item.sub_jenis_koleksi ? " \u00b7 " + escapeHtml(item.sub_jenis_koleksi) : ""}</p>
      </div>
      <span class="arrow">&rsaquo;</span>
    </div>`).join("");

  root.innerHTML = `${intro}<div>${rows}</div>`;
}

async function init() {
  const kodeQr = getQrCodeFromPath();

  if (!kodeQr || !/^QR/.test(kodeQr)) {
    showState("Kode QR tidak dikenali", "Pastikan Anda memindai QR yang tertempel resmi di koleksi museum.");
    return;
  }

  try {
    const [mappingRes, koleksiRes] = await Promise.all([
      fetch(`${REPO_BASE}/data/qr_mapping.json`),
      fetch(`${REPO_BASE}/data/koleksi.json`),
    ]);
    if (!mappingRes.ok || !koleksiRes.ok) throw new Error("Gagal memuat data");

    const mapping = await mappingRes.json();
    const koleksi = await koleksiRes.json();
    window.__currentMapping = mapping;

    const kodeTibList = mapping[kodeQr];
    if (!kodeTibList || kodeTibList.length === 0) {
      showState("Koleksi tidak ditemukan", `Kode QR "${escapeHtml(kodeQr)}" belum terdaftar di data museum.`);
      return;
    }

    const items = kodeTibList.map((tib) => koleksi[tib]).filter(Boolean);
    window.__currentItems = items;

    if (items.length === 1) {
      renderDetail(items[0]);
    } else {
      renderList(items, kodeQr);
    }
  } catch (err) {
    showState("Gagal memuat data", "Periksa koneksi internet Anda, lalu coba pindai ulang QR-nya.");
    console.error(err);
  }
}

init();
