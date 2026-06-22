import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA4FLwLAHH_PGLp7HZ9PGqeAjHgMvOitWw",
  authDomain:        "icon-employees.firebaseapp.com",
  projectId:         "icon-employees",
  storageBucket:     "icon-employees.firebasestorage.app",
  messagingSenderId: "979984495420",
  appId:             "1:979984495420:web:7e5f2595213c92a1926439"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const grid             = document.getElementById("grid");
const emptyState       = document.getElementById("empty-state");
const countLabel       = document.getElementById("count-label");
const searchInput      = document.getElementById("search");
const btnAdd           = document.getElementById("btn-add");
const modalOverlay     = document.getElementById("modal-overlay");
const modalTitle       = document.getElementById("modal-title");
const btnCancel        = document.getElementById("btn-cancel");
const btnSave          = document.getElementById("btn-save");
const modalClose       = document.getElementById("modal-close");
const viewOverlay      = document.getElementById("view-overlay");
const viewClose        = document.getElementById("view-close");
const viewEdit         = document.getElementById("view-edit");
const viewDelete       = document.getElementById("view-delete");
const photoArea        = document.getElementById("photo-area");
const photoInput       = document.getElementById("photo-input");
const photoPreview     = document.getElementById("photo-preview");
const photoPlaceholder = document.getElementById("photo-placeholder");

let employees   = [];
let editingId   = null;
let viewingId   = null;
let photoBase64 = null;

const q = query(collection(db, "employees"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  employees = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderGrid(employees);
});

function renderGrid(list) {
  grid.querySelectorAll(".card").forEach(c => c.remove());
  const term = searchInput.value.toLowerCase();
  const filtered = list.filter(e =>
    [e.name, e.position, e.department].some(v => v?.toLowerCase().includes(term))
  );
  countLabel.textContent = `${filtered.length} сотрудник${plural(filtered.length)}`;
  emptyState.classList.toggle("hidden", filtered.length > 0);
  filtered.forEach(e => grid.appendChild(buildCard(e)));
}

function plural(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "";
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return "а";
  return "ов";
}

function buildCard(e) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = e.id;
  if (e.photoBase64) {
    const img = document.createElement("img");
    img.className = "card-photo";
    img.src = e.photoBase64;
    img.alt = e.name;
    card.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "card-no-photo";
    ph.textContent = "👤";
    card.appendChild(ph);
  }
  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <div class="card-name">${e.name || "—"}</div>
    <div class="card-position">${e.position || ""}</div>
    <div class="card-dept">${e.department || ""}</div>
  `;
  card.appendChild(body);
  card.addEventListener("click", () => openView(e.id));
  return card;
}

searchInput.addEventListener("input", () => renderGrid(employees));

btnAdd.addEventListener("click", () => {
  editingId = null;
  modalTitle.textContent = "Новый сотрудник";
  clearForm();
  modalOverlay.classList.remove("hidden");
});

[btnCancel, modalClose].forEach(b =>
  b.addEventListener("click", () => modalOverlay.classList.add("hidden"))
);
modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
});

photoArea.addEventListener("click", () => photoInput.click());
photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (!file) return;
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const TARGET_H = 320;
    const TARGET_W = Math.round(TARGET_H * 3 / 4);
    const canvas = document.createElement("canvas");
    canvas.width  = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d");
    const srcRatio = img.width / img.height;
    const tgtRatio = TARGET_W / TARGET_H;
    let sx, sy, sw, sh;
    if (srcRatio > tgtRatio) {
      sh = img.height; sw = sh * tgtRatio; sy = 0; sx = (img.width - sw) / 2;
    } else {
      sw = img.width; sh = sw / tgtRatio; sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);
    photoBase64 = canvas.toDataURL("image/jpeg", 0.60);
    photoPreview.src = photoBase64;
    photoPreview.classList.remove("hidden");
    photoPlaceholder.classList.add("hidden");
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

btnSave.addEventListener("click", async () => {
  const name = document.getElementById("f-name").value.trim();
  if (!name) { alert("Введите полное имя сотрудника"); return; }
  btnSave.disabled = true;
  btnSave.textContent = "Сохранение…";
  try {
    const existing = editingId ? employees.find(e => e.id === editingId) : null;
    const data = {
      name,
      dob:          document.getElementById("f-dob").value,
      passportNum:  document.getElementById("f-passport-num").value.trim(),
      pinfl:        document.getElementById("f-pinfl").value.trim(),
      issuedBy:     document.getElementById("f-issued-by").value.trim(),
      passportExp:  document.getElementById("f-passport-exp").value,
      position:     document.getElementById("f-position").value.trim(),
      department:   document.getElementById("f-department").value.trim(),
      experience:   document.getElementById("f-experience").value.trim(),
      achievements: document.getElementById("f-achievements").value.trim(),
      photoBase64:  photoBase64 !== null ? photoBase64 : (existing?.photoBase64 || null),
    };
    if (editingId) {
      await updateDoc(doc(db, "employees", editingId), data);
    } else {
      await addDoc(collection(db, "employees"), { ...data, createdAt: serverTimestamp() });
    }
    modalOverlay.classList.add("hidden");
    clearForm();
  } catch (err) {
    console.error(err);
    alert("Ошибка сохранения: " + err.message);
  }
  btnSave.disabled = false;
  btnSave.textContent = "Сохранить";
});

function openView(id) {
  const e = employees.find(x => x.id === id);
  if (!e) return;
  viewingId = id;
  document.getElementById("view-name").textContent         = e.name || "—";
  document.getElementById("view-position").textContent     = [e.position, e.department].filter(Boolean).join(" · ");
  document.getElementById("view-dob").textContent          = formatDate(e.dob);
  document.getElementById("view-passport-num").textContent = e.passportNum || "—";
  document.getElementById("view-pinfl").textContent        = e.pinfl || "—";
  document.getElementById("view-issued-by").textContent    = e.issuedBy || "—";
  document.getElementById("view-passport-exp").textContent = formatDate(e.passportExp);
  document.getElementById("view-experience").textContent   = e.experience || "—";
  document.getElementById("view-achievements").textContent = e.achievements || "—";
  const vp = document.getElementById("view-photo");
  if (e.photoBase64) { vp.src = e.photoBase64; vp.style.display = "block"; }
  else { vp.src = ""; vp.style.display = "none"; }
  viewOverlay.classList.remove("hidden");
}

viewClose.addEventListener("click", () => viewOverlay.classList.add("hidden"));
viewOverlay.addEventListener("click", e => {
  if (e.target === viewOverlay) viewOverlay.classList.add("hidden");
});

viewEdit.addEventListener("click", () => {
  const e = employees.find(x => x.id === viewingId);
  if (!e) return;
  editingId = viewingId;
  modalTitle.textContent = "Редактировать карточку";
  fillForm(e);
  viewOverlay.classList.add("hidden");
  modalOverlay.classList.remove("hidden");
});

viewDelete.addEventListener("click", async () => {
  if (!confirm("Удалить карточку сотрудника?")) return;
  await deleteDoc(doc(db, "employees", viewingId));
  viewOverlay.classList.add("hidden");
});

function clearForm() {
  ["f-name","f-dob","f-passport-num","f-pinfl","f-issued-by",
   "f-passport-exp","f-position","f-department","f-experience","f-achievements"]
    .forEach(id => { document.getElementById(id).value = ""; });
  photoBase64 = null;
  photoPreview.src = "";
  photoPreview.classList.add("hidden");
  photoPlaceholder.classList.remove("hidden");
  photoInput.value = "";
}

function fillForm(e) {
  document.getElementById("f-name").value         = e.name || "";
  document.getElementById("f-dob").value          = e.dob || "";
  document.getElementById("f-passport-num").value = e.passportNum || "";
  document.getElementById("f-pinfl").value        = e.pinfl || "";
  document.getElementById("f-issued-by").value    = e.issuedBy || "";
  document.getElementById("f-passport-exp").value = e.passportExp || "";
  document.getElementById("f-position").value     = e.position || "";
  document.getElementById("f-department").value   = e.department || "";
  document.getElementById("f-experience").value   = e.experience || "";
  document.getElementById("f-achievements").value = e.achievements || "";
  photoBase64 = null;
  if (e.photoBase64) {
    photoPreview.src = e.photoBase64;
    photoPreview.classList.remove("hidden");
    photoPlaceholder.classList.add("hidden");
  } else {
    photoPreview.src = "";
    photoPreview.classList.add("hidden");
    photoPlaceholder.classList.remove("hidden");
  }
}

function formatDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  if (!y || !m || !d) return str;
  return `${d}.${m}.${y}`;
}