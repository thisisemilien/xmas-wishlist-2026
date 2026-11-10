// ============================================================================
// ÉMILIEN'S XMAS WISHLIST — 2026 EDITION
// Clean Girl Tactile Stationery & Postage-Stamp Moodboard Logic
// ============================================================================

const STORAGE_KEY_GIFTS = "noel_editorial_gifts_v2";
const STORAGE_KEY_PROFILE = "emilien_xmas_profile_2026";

const DEFAULT_PROFILE = {
  edition: "2026 EDITION",
  owner: "Émilien’s",
  subtitle: ""
};

const FALLBACK_GIFTS = [
  {
    id: "gift-1",
    title: "Machine à Expresso Sage — The Barista Express",
    category: "Maison & Déco",
    priority: "Most Wanted",
    description: "Finition Acier Inoxydable Brossé",
    image:
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=85",
    stores: [
      {
        name: "Boulanger",
        price: 549.0,
        originalPrice: 699.0,
        promoCode: "NOEL50",
        url: "https://www.boulanger.com"
      },
      {
        name: "MaxiCoffee",
        price: 579.0,
        originalPrice: 699.0,
        promoCode: "CAFE250G",
        url: "https://www.maxicoffee.com"
      }
    ]
  },
  {
    id: "gift-2",
    title: "Casque Sony WH-1000XM5",
    category: "Tech & Audio",
    priority: "Coup de cœur",
    description: "Coloris : Noir Minuit",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=85",
    stores: [
      {
        name: "Amazon",
        price: 299.0,
        originalPrice: 419.0,
        promoCode: "",
        url: "https://www.amazon.fr"
      },
      {
        name: "Darty",
        price: 329.0,
        originalPrice: 419.0,
        promoCode: "AUDIO15",
        url: "https://www.darty.com"
      }
    ]
  },
  {
    id: "gift-3",
    title: "Bougie Diptyque — Sapin",
    category: "Beauté & Parfums",
    priority: "Édition Limitée",
    description: "Format 190g avec capot doré",
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=85",
    stores: [
      {
        name: "Diptyque Paris",
        price: 68.0,
        originalPrice: 68.0,
        promoCode: "HIVER26",
        url: "https://www.diptyqueparis.com"
      }
    ]
  }
];

let state = {
  gifts: [],
  profile: { ...DEFAULT_PROFILE },
  isEditing: false,
  selectedCategory: "all",
  budgetFilter: "all",
  sortBy: "default",
  serverAvailable: false
};

// ============================================================================
// HELPERS
// ============================================================================

function getBestStore(gift) {
  if (!gift.stores || gift.stores.length === 0) {
    return { name: "Boutique", price: 0, originalPrice: 0, promoCode: "", url: "#" };
  }
  const sorted = [...gift.stores].sort((a, b) => Number(a.price) - Number(b.price));
  return sorted[0];
}

function getDiscountPercent(store) {
  if (store.discountPercent && Number(store.discountPercent) > 0) {
    return Math.round(Number(store.discountPercent));
  }
  const price = Number(store.price) || 0;
  const orig = Number(store.originalPrice) || 0;
  if (orig > price && orig > 0) {
    return Math.round(((orig - price) / orig) * 100);
  }
  return 0;
}

function formatPrice(num) {
  const n = Number(num) || 0;
  return n % 1 === 0 ? `${n} €` : `${n.toFixed(2).replace(".", ",")} €`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

// Detect if an image is likely a cut-out object on pure white studio background (Apple, Amazon)
function isStudioProductUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("apple.com") ||
    lower.includes("media-amazon.com") ||
    lower.includes("ssl-images-amazon") ||
    lower.includes("fnac-static") ||
    lower.includes("boulanger") ||
    lower.includes("darty")
  );
}

// Parse legacy description into { color, size, note } so existing items get the 2 clean lines automatically
function extractSpecs(gift) {
  let color = (gift.color || "").trim();
  let size = (gift.size || "").trim();
  let note = (gift.description || "").trim();

  if (!color && !size && note) {
    const colorMatch = note.match(/couleur\s*:\s*([^.,;/\n]+)/i);
    const sizeMatch = note.match(/taille\s*:?\s*([^.,;/\n]+)/i);

    if (colorMatch) {
      color = colorMatch[1].trim();
    }
    if (sizeMatch) {
      size = sizeMatch[1].trim();
    }

    if (color || size) {
      note = note
        .replace(/couleur\s*:\s*[^.,;/\n]+[.,;/\s]*/i, "")
        .replace(/taille\s*:?\s*[^.,;/\n]+[.,;/\s]*/i, "")
        .trim();
    }
  }

  return { color, size, note };
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

async function loadInitialData() {
  try {
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (savedProfile) {
      state.profile = { ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) };
    }
  } catch (e) {}

  // Check if opened via shared link (?data=...)
  const params = new URLSearchParams(window.location.search);
  const sharedData = params.get("data");
  if (sharedData) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
      if (decoded.gifts && Array.isArray(decoded.gifts)) {
        state.gifts = decoded.gifts;
      }
      if (decoded.profile) {
        state.profile = { ...DEFAULT_PROFILE, ...decoded.profile };
      }
      document.getElementById("toggleEditModeBtn").classList.add("hidden");
      renderAll();
      return;
    } catch (err) {
      console.warn("Erreur de décodage du lien partagé", err);
    }
  }

  // Try localStorage first if the user already added items in browser
  let localItems = null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_GIFTS) ||
      localStorage.getItem("noel_wishlist_gifts_v1");
    if (raw) {
      localItems = JSON.parse(raw);
    }
  } catch (e) {}

  // Try Python API (/api/gifts)
  try {
    const res = await fetch("/api/gifts", { cache: "no-store" });
    if (res.ok) {
      const serverData = await res.json();
      state.serverAvailable = true;
      if (localItems && localItems.length > 0 && serverData.length === 0) {
        state.gifts = localItems;
      } else {
        state.gifts = serverData;
      }
      localStorage.setItem(STORAGE_KEY_GIFTS, JSON.stringify(state.gifts));
      renderAll();
      return;
    }
  } catch (e) {}

  // Try static gifts.json (Cloudflare Pages / GitHub Pages / Netlify static hosting)
  try {
    const res = await fetch("gifts.json", { cache: "no-store" });
    if (res.ok) {
      const staticGifts = await res.json();
      if (Array.isArray(staticGifts) && staticGifts.length > 0) {
        state.gifts = staticGifts;
        renderAll();
        return;
      }
    }
  } catch (e) {}

  if (localItems && Array.isArray(localItems)) {
    state.gifts = localItems;
    renderAll();
    return;
  }

  state.gifts = FALLBACK_GIFTS;
  renderAll();
}

async function persistGifts() {
  localStorage.setItem(STORAGE_KEY_GIFTS, JSON.stringify(state.gifts));
  if (state.serverAvailable) {
    try {
      await fetch("/api/gifts/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.gifts)
      });
    } catch (e) {}
  }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderProfile() {
  const editionEl = document.getElementById("heroEdition");
  const ownerEl = document.getElementById("heroOwner");
  const subEl = document.getElementById("heroSubtitle");
  if (editionEl) editionEl.textContent = state.profile.edition;
  if (ownerEl) ownerEl.textContent = state.profile.owner;
  if (subEl) subEl.textContent = state.profile.subtitle;
}

function renderEditToolbar() {
  const editBtn = document.getElementById("toggleEditModeBtn");
  const editLabel = document.getElementById("editModeLabel");
  const toolbar = document.getElementById("creatorToolbar");

  if (state.isEditing) {
    editBtn.classList.add("active");
    editLabel.textContent = "Terminer";
    toolbar.classList.remove("hidden");
  } else {
    editBtn.classList.remove("active");
    editLabel.textContent = "Éditer";
    toolbar.classList.add("hidden");
  }
}

function renderCategories() {
  const container = document.getElementById("categoryPills");
  const categories = ["all", ...new Set(state.gifts.map((g) => g.category).filter(Boolean))];

  container.innerHTML = categories
    .map((cat) => {
      const label = cat === "all" ? "All Pieces" : cat;
      const active = state.selectedCategory === cat ? "active" : "";
      return `<button type="button" class="curation-tab ${active}" data-category="${escapeHtml(
        cat
      )}">${escapeHtml(label)}</button>`;
    })
    .join("");

  container.querySelectorAll(".curation-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedCategory = btn.dataset.category;
      renderCategories();
      renderStampGrid();
    });
  });
}

function getFilteredGifts() {
  return state.gifts
    .filter((g) => {
      if (state.selectedCategory !== "all" && g.category !== state.selectedCategory) {
        return false;
      }
      const bestPrice = Number(getBestStore(g).price) || 0;
      if (state.budgetFilter === "under-100" && bestPrice >= 100) return false;
      if (state.budgetFilter === "100-300" && (bestPrice < 100 || bestPrice > 300)) return false;
      if (state.budgetFilter === "over-300" && bestPrice <= 300) return false;
      return true;
    })
    .sort((a, b) => {
      const bestA = getBestStore(a);
      const bestB = getBestStore(b);
      if (state.sortBy === "price-asc") {
        return Number(bestA.price) - Number(bestB.price);
      }
      if (state.sortBy === "price-desc") {
        return Number(bestB.price) - Number(bestA.price);
      }
      if (state.sortBy === "discount") {
        return getDiscountPercent(bestB) - getDiscountPercent(bestA);
      }
      return 0;
    });
}

function renderStampGrid() {
  const grid = document.getElementById("giftsGrid");
  const emptyState = document.getElementById("emptyState");
  const filtered = getFilteredGifts();

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  grid.innerHTML = filtered
    .map((gift, idx) => {
      const numStr = String(idx + 1).padStart(2, "0");
      const sortedStores = [...(gift.stores || [])].sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
      const bestStore = sortedStores[0] || {
        name: "Boutique",
        price: 0,
        originalPrice: 0,
        promoCode: "",
        url: "#"
      };
      const bestDiscount = getDiscountPercent(bestStore);

      // Alternate crimson linen mat and warm snow mat like the 9-grid moodboard (Ref Image 4)
      const isCrimsonMat = idx % 2 === 0;
      const imageSrc =
        gift.image ||
        "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80";

      // Use explicit imageFit if set, otherwise only contain studio white-background cutouts
      const fitMode = gift.imageFit || (isStudioProductUrl(imageSrc) ? "contain" : "portrait");
      const fitClass = fitMode === "contain" ? "fit-contain" : "";

      const specs = extractSpecs(gift);
      const specsHtml = `
        <div class="stamp-specs-block">
          ${
            specs.color
              ? `<div class="spec-line"><span class="spec-key">Couleur</span><span class="spec-val">${escapeHtml(
                  specs.color
                )}</span></div>`
              : `<div class="spec-line"></div>`
          }
          ${
            specs.size
              ? `<div class="spec-line"><span class="spec-key">Taille</span><span class="spec-val">${escapeHtml(
                  specs.size
                )}</span></div>`
              : `<div class="spec-line"></div>`
          }
          ${
            specs.note
              ? `<p class="stamp-subtitle">${escapeHtml(specs.note)}</p>`
              : ""
          }
        </div>
      `;

      const storesHtml = sortedStores
        .map((st) => {
          const stDiscount = getDiscountPercent(st);
          const hasOldPrice = Number(st.originalPrice) > Number(st.price);

          const discountBadgeHtml =
            stDiscount > 0
              ? `<span class="store-discount-badge">-${stDiscount}%</span>`
              : "";

          const promoBtn = st.promoCode
            ? `<button type="button" class="store-promo-pill" data-code="${escapeHtml(
                st.promoCode
              )}" title="Cliquer pour copier le code">CODE : ${escapeHtml(st.promoCode)}</button>`
            : "";

          const endDateHtml = st.promoEndDate
            ? `<span class="store-end-date">jusqu'au ${escapeHtml(st.promoEndDate)}</span>`
            : "";

          const secondLineHtml =
            promoBtn || endDateHtml
              ? `<div class="store-promo-line">${promoBtn}${endDateHtml}</div>`
              : "";

          return `
            <div class="stamp-store-item">
              <div class="store-main-line">
                <div class="store-left">
                  <span class="store-title">${escapeHtml(st.name)}</span>
                  ${discountBadgeHtml}
                </div>
                <div class="store-right">
                  <div class="store-price-stack">
                    <span class="store-price-num">${formatPrice(st.price)}</span>
                    ${
                      hasOldPrice
                        ? `<span class="store-price-old-inline">${formatPrice(
                            st.originalPrice
                          )}</span>`
                        : ""
                    }
                  </div>
                  <a href="${escapeHtml(
                    st.url || "#"
                  )}" target="_blank" rel="noopener noreferrer" class="store-shop-btn">
                    Shop ↗
                  </a>
                </div>
              </div>
              ${secondLineHtml}
            </div>
          `;
        })
        .join("");

      const adminHtml = state.isEditing
        ? `
          <div class="stamp-admin-actions">
            <button type="button" class="btn-cotton-sm btn-edit-gift" data-id="${escapeHtml(
              gift.id
            )}">Modifier</button>
            <button type="button" class="btn-cotton-sm btn-delete-gift" data-id="${escapeHtml(
              gift.id
            )}">Supprimer</button>
          </div>
        `
        : "";

      return `
        <article class="stamp-card-stage ${isCrimsonMat ? "theme-crimson" : ""}">
          <div class="postage-stamp-frame">
            <div class="stamp-inner-border">
              <div class="stamp-meta-top">
                <span class="stamp-number">N° ${numStr}</span>
                <span class="stamp-category">${escapeHtml(gift.category || "Wishlist")}</span>
              </div>

              <div class="stamp-image-showcase ${fitClass}">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(gift.title)}" loading="lazy" />
                <div class="stamp-badges">
                  <span class="badge-wish-tag">${escapeHtml(gift.priority || "Wishlist")}</span>
                  ${
                    bestDiscount > 0
                      ? `<span class="badge-promo-tag">-${bestDiscount}%</span>`
                      : ""
                  }
                </div>
              </div>

              <!-- Centered Editorial Caption + 2 Spec Lines -->
              <div class="stamp-caption-block">
                <h2 class="stamp-title">${escapeHtml(gift.title)}</h2>
                ${specsHtml}
              </div>

              <!-- Best Price Highlight -->
              <div class="stamp-best-price-row">
                <div class="best-price-left">
                  <span class="best-price-label">Best Price</span>
                  <span class="best-price-merchant">via ${escapeHtml(bestStore.name)}</span>
                </div>
                <div class="best-price-right">
                  <span class="best-price-amount">${formatPrice(bestStore.price)}</span>
                  ${
                    Number(bestStore.originalPrice) > Number(bestStore.price)
                      ? `<span class="best-price-old">${formatPrice(
                          bestStore.originalPrice
                        )}</span>`
                      : ""
                  }
                </div>
              </div>

              <!-- Where to Buy & Promo Codes -->
              <div class="stamp-stores-list">
                ${storesHtml}
              </div>

              ${adminHtml}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  attachCardListeners();
}

function attachCardListeners() {
  document.querySelectorAll(".store-promo-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code.split(" ")[0];
      navigator.clipboard?.writeText(code);
      showToast(`Code « ${code} » copié`);
    });
  });

  document.querySelectorAll(".btn-edit-gift").forEach((btn) => {
    btn.addEventListener("click", () => openGiftModal(btn.dataset.id));
  });

  document.querySelectorAll(".btn-delete-gift").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const gift = state.gifts.find((g) => g.id === id);
      if (!gift) return;
      if (confirm(`Retirer « ${gift.title} » de la wishlist ?`)) {
        state.gifts = state.gifts.filter((g) => g.id !== id);
        await persistGifts();
        renderAll();
        showToast("Souhait supprimé");
      }
    });
  });
}

function renderAll() {
  renderProfile();
  renderEditToolbar();
  renderCategories();
  renderStampGrid();
}

// ============================================================================
// MODALS & EDITOR
// ============================================================================

function createStoreRowHtml(
  store = {
    name: "",
    price: "",
    originalPrice: "",
    discountPercent: "",
    promoCode: "",
    promoEndDate: "",
    url: ""
  }
) {
  const row = document.createElement("div");
  row.className = "store-row-editor";

  const calcPct =
    store.discountPercent !== undefined && store.discountPercent !== ""
      ? store.discountPercent
      : getDiscountPercent(store) || "";

  row.innerHTML = `
    <input type="text" class="paper-input st-name" placeholder="Boutique (Cos, Amazon...)" value="${escapeHtml(
      store.name || ""
    )}" required />
    <input type="number" step="0.01" class="paper-input st-orig" placeholder="Prix initial (€)" value="${
      store.originalPrice !== undefined && store.originalPrice !== "" ? store.originalPrice : ""
    }" />
    <input type="number" step="1" min="0" max="99" class="paper-input st-pct" placeholder="-% (ex: 20)" value="${calcPct}" />
    <input type="number" step="0.01" class="paper-input st-price" placeholder="Prix final (€) *" value="${
      store.price !== undefined && store.price !== "" ? store.price : ""
    }" required />
    <input type="text" class="paper-input st-promo" placeholder="Code (optionnel)" value="${escapeHtml(
      store.promoCode || ""
    )}" />
    <input type="text" class="paper-input st-end" placeholder="Fin (ex: 15 déc.)" value="${escapeHtml(
      store.promoEndDate || ""
    )}" />
    <input type="url" class="paper-input st-url" placeholder="Lien https://..." value="${escapeHtml(
      store.url || ""
    )}" />
    <button type="button" class="btn-remove-store" title="Retirer">✕</button>
  `;

  const origInput = row.querySelector(".st-orig");
  const pctInput = row.querySelector(".st-pct");
  const priceInput = row.querySelector(".st-price");

  // Live calculation: when originalPrice or % changes -> compute final price
  const updateFinalFromPct = () => {
    const orig = parseFloat(origInput.value);
    const pct = parseFloat(pctInput.value);
    if (!isNaN(orig) && orig > 0 && !isNaN(pct) && pct >= 0 && pct < 100) {
      const discounted = orig * (1 - pct / 100);
      priceInput.value = Math.round(discounted * 100) / 100;
    } else if (!isNaN(orig) && orig > 0 && (isNaN(pct) || pct === 0) && !priceInput.value) {
      priceInput.value = orig;
    }
  };

  origInput.addEventListener("input", updateFinalFromPct);
  pctInput.addEventListener("input", () => {
    const orig = parseFloat(origInput.value);
    const curPrice = parseFloat(priceInput.value);
    // If user typed final price first and then enters %, move final price to originalPrice automatically!
    if ((isNaN(orig) || orig <= 0) && !isNaN(curPrice) && curPrice > 0) {
      origInput.value = curPrice;
    }
    updateFinalFromPct();
  });

  // When final price is edited manually and originalPrice is set -> update %
  priceInput.addEventListener("input", () => {
    const orig = parseFloat(origInput.value);
    const finalP = parseFloat(priceInput.value);
    if (!isNaN(orig) && orig > finalP && finalP > 0) {
      pctInput.value = Math.round(((orig - finalP) / orig) * 100);
    }
  });

  row.querySelector(".btn-remove-store").addEventListener("click", () => {
    const container = document.getElementById("storesContainer");
    if (container.children.length > 1) {
      row.remove();
    } else {
      showToast("Indiquez au moins un site marchand.");
    }
  });
  return row;
}

function openGiftModal(giftId = null) {
  const modal = document.getElementById("giftModal");
  const titleEl = document.getElementById("giftModalTitle");
  const storesContainer = document.getElementById("storesContainer");
  storesContainer.innerHTML = "";
  document.getElementById("magicUrlInput").value = "";
  document.getElementById("extractUrlStatus").textContent =
    "Récupère l'image, le titre et la boutique automatiquement.";

  if (giftId) {
    const gift = state.gifts.find((g) => g.id === giftId);
    if (!gift) return;
    const specs = extractSpecs(gift);
    titleEl.textContent = "Modifier le souhait";
    document.getElementById("giftIdInput").value = gift.id;
    document.getElementById("giftTitleInput").value = gift.title || "";
    document.getElementById("giftCategoryInput").value = gift.category || "";
    document.getElementById("giftPriorityInput").value = gift.priority || "Most Wanted";
    document.getElementById("giftImageInput").value = gift.image || "";
    document.getElementById("giftColorInput").value = specs.color || "";
    document.getElementById("giftSizeInput").value = specs.size || "";
    document.getElementById("giftFitInput").value =
      gift.imageFit || (isStudioProductUrl(gift.image) ? "contain" : "portrait");
    document.getElementById("giftDescInput").value = specs.note || "";

    (gift.stores || []).forEach((st) => {
      storesContainer.appendChild(createStoreRowHtml(st));
    });
  } else {
    titleEl.textContent = "Ajouter un souhait";
    document.getElementById("giftIdInput").value = "";
    document.getElementById("giftTitleInput").value = "";
    document.getElementById("giftCategoryInput").value = "Mode & Accessoires";
    document.getElementById("giftPriorityInput").value = "Idée cadeau";
    document.getElementById("giftImageInput").value = "";
    document.getElementById("giftColorInput").value = "";
    document.getElementById("giftSizeInput").value = "";
    document.getElementById("giftFitInput").value = "portrait";
    document.getElementById("giftDescInput").value = "";
    storesContainer.appendChild(createStoreRowHtml());
  }

  modal.classList.remove("hidden");
}

// ============================================================================
// INITIALIZE EVENTS
// ============================================================================

function isCreatorEnvironment() {
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    window.location.protocol === "file:" ||
    params.has("admin")
  );
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isCreatorEnvironment()) {
    document.getElementById("shareListBtn")?.classList.add("hidden");
    document.getElementById("toggleEditModeBtn")?.classList.add("hidden");
  }

  loadInitialData();

  document.getElementById("toggleEditModeBtn").addEventListener("click", () => {
    state.isEditing = !state.isEditing;
    renderAll();
  });

  document.getElementById("budgetFilter").addEventListener("change", (e) => {
    state.budgetFilter = e.target.value;
    renderStampGrid();
  });

  document.getElementById("sortFilter").addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderStampGrid();
  });

  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    state.selectedCategory = "all";
    state.budgetFilter = "all";
    state.sortBy = "default";
    document.getElementById("budgetFilter").value = "all";
    document.getElementById("sortFilter").value = "default";
    renderAll();
  });

  // Gift Modal
  document.getElementById("openAddModalBtn").addEventListener("click", () => openGiftModal());
  document.getElementById("closeGiftModalBtn").addEventListener("click", () => {
    document.getElementById("giftModal").classList.add("hidden");
  });
  document.getElementById("cancelGiftModalBtn").addEventListener("click", () => {
    document.getElementById("giftModal").classList.add("hidden");
  });

  document.getElementById("addStoreRowBtn").addEventListener("click", () => {
    document.getElementById("storesContainer").appendChild(createStoreRowHtml());
  });

  // Extract URL
  document.getElementById("extractUrlBtn").addEventListener("click", async () => {
    const url = document.getElementById("magicUrlInput").value.trim();
    const statusEl = document.getElementById("extractUrlStatus");
    if (!url) {
      statusEl.textContent = "Collez d'abord un lien https://...";
      return;
    }

    statusEl.textContent = "Extraction en cours...";
    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title && !document.getElementById("giftTitleInput").value) {
          document.getElementById("giftTitleInput").value = data.title;
        }
        if (data.image && !document.getElementById("giftImageInput").value) {
          document.getElementById("giftImageInput").value = data.image;
        }
        if (data.description && !document.getElementById("giftDescInput").value) {
          document.getElementById("giftDescInput").value = data.description.slice(0, 140);
        }
        const firstRow = document.querySelector("#storesContainer .store-row-editor");
        if (firstRow) {
          if (data.storeName && !firstRow.querySelector(".st-name").value) {
            firstRow.querySelector(".st-name").value = data.storeName;
          }
          if (data.price && !firstRow.querySelector(".st-price").value) {
            const parsedP = parseFloat(String(data.price).replace(",", "."));
            firstRow.querySelector(".st-price").value = parsedP;
            firstRow.querySelector(".st-orig").value = parsedP;
          }
          firstRow.querySelector(".st-url").value = url;
        }
        statusEl.textContent = data.title
          ? "✓ Infos récupérées ! Vérifiez le prix."
          : "✓ Boutique et lien ajoutés.";
      } else {
        throw new Error("Fallback");
      }
    } catch (err) {
      try {
        const domain = new URL(url).hostname.replace("www.", "").split(".")[0];
        const cap = domain.charAt(0).toUpperCase() + domain.slice(1);
        const firstRow = document.querySelector("#storesContainer .store-row-editor");
        if (firstRow) {
          firstRow.querySelector(".st-name").value = cap;
          firstRow.querySelector(".st-url").value = url;
        }
        statusEl.textContent = `✓ Lien ${cap} associé ! Complétez le titre et le prix.`;
      } catch (e) {
        statusEl.textContent = "Lien invalide.";
      }
    }
  });

  // Save Gift
  document.getElementById("giftForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("giftIdInput").value || `gift-${Date.now()}`;

    const stores = [];
    document.querySelectorAll("#storesContainer .store-row-editor").forEach((row) => {
      const name = row.querySelector(".st-name").value.trim();
      const origRaw = parseFloat(row.querySelector(".st-orig").value);
      const pctRaw = parseFloat(row.querySelector(".st-pct").value);
      let price = parseFloat(row.querySelector(".st-price").value) || 0;
      let originalPrice = !isNaN(origRaw) && origRaw > 0 ? origRaw : price;
      let discountPercent = !isNaN(pctRaw) && pctRaw > 0 ? Math.round(pctRaw) : 0;

      // Ensure discount math is applied if user entered originalPrice (or price) + %
      if (discountPercent > 0 && originalPrice === price && price > 0) {
        price = Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100;
      } else if (discountPercent === 0 && originalPrice > price && price > 0) {
        discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
      }

      const promoCode = row.querySelector(".st-promo").value.trim();
      const promoEndDate = row.querySelector(".st-end").value.trim();
      const url = row.querySelector(".st-url").value.trim();
      if (name) {
        stores.push({
          name,
          price,
          originalPrice,
          discountPercent,
          promoCode,
          promoEndDate,
          url
        });
      }
    });

    const newGift = {
      id,
      title: document.getElementById("giftTitleInput").value.trim(),
      category: document.getElementById("giftCategoryInput").value.trim() || "Wishlist",
      priority: document.getElementById("giftPriorityInput").value,
      image: document.getElementById("giftImageInput").value.trim(),
      color: document.getElementById("giftColorInput").value.trim(),
      size: document.getElementById("giftSizeInput").value.trim(),
      imageFit: document.getElementById("giftFitInput").value,
      description: document.getElementById("giftDescInput").value.trim(),
      stores
    };

    const idx = state.gifts.findIndex((g) => g.id === id);
    if (idx >= 0) {
      state.gifts[idx] = newGift;
    } else {
      state.gifts.unshift(newGift);
    }

    await persistGifts();
    document.getElementById("giftModal").classList.add("hidden");
    renderAll();
    showToast("Souhait enregistré");
  });

  // Share Modal
  document.getElementById("shareListBtn").addEventListener("click", () => {
    const payload = {
      profile: state.profile,
      gifts: state.gifts
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const baseUrl = window.location.origin + window.location.pathname;
    document.getElementById("shareUrlInput").value = `${baseUrl}?data=${encoded}`;
    document.getElementById("shareModal").classList.remove("hidden");
  });

  document.getElementById("closeShareModalBtn").addEventListener("click", () => {
    document.getElementById("shareModal").classList.add("hidden");
  });

  document.getElementById("copyShareUrlBtn").addEventListener("click", () => {
    const input = document.getElementById("shareUrlInput");
    input.select();
    navigator.clipboard?.writeText(input.value);
    showToast("Lien copié");
  });

  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state.gifts, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gifts.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("gifts.json téléchargé");
  });

  document.getElementById("importJsonInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          state.gifts = imported;
          await persistGifts();
          renderAll();
          document.getElementById("shareModal").classList.add("hidden");
          showToast("Liste importée");
        }
      } catch (err) {
        alert("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  });

  // Profile Modal
  document.getElementById("customizeProfileBtn").addEventListener("click", () => {
    document.getElementById("profileEditionInput").value = state.profile.edition;
    document.getElementById("profileOwnerInput").value = state.profile.owner;
    document.getElementById("profileSubtitleInput").value = state.profile.subtitle;
    document.getElementById("profileModal").classList.remove("hidden");
  });

  document.getElementById("closeProfileModalBtn").addEventListener("click", () => {
    document.getElementById("profileModal").classList.add("hidden");
  });
  document.getElementById("cancelProfileModalBtn").addEventListener("click", () => {
    document.getElementById("profileModal").classList.add("hidden");
  });

  document.getElementById("profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.profile.edition = document.getElementById("profileEditionInput").value.trim();
    state.profile.owner = document.getElementById("profileOwnerInput").value.trim();
    state.profile.subtitle = document.getElementById("profileSubtitleInput").value.trim();
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(state.profile));
    document.getElementById("profileModal").classList.add("hidden");
    renderProfile();
    showToast("Carte mise à jour");
  });
});
