/* ============================================================
   ARCANES MYSTIQUES — Formulaire produit (création / édition)
   ============================================================ */

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');
const isEditMode = !!productId;

let slugManuallyEdited = false;
let pendingThumbnailFile = null;
let pendingBannerFile = null;
let pendingGalleryFiles = [];
let existingGalleryUrls = [];
let pendingPdfFile = null;
let existingPdfPath = null;
let existingThumbnailUrl = null;
let existingBannerUrl = null;

const els = {
  title: document.getElementById('f-title'),
  slug: document.getElementById('f-slug'),
  slugPreview: document.getElementById('slug-preview'),
  slugError: document.getElementById('slug-error'),
  category: document.getElementById('f-category'),
  categoryOther: document.getElementById('f-category-other'),
  shortDesc: document.getElementById('f-short-desc'),
  fullDesc: document.getElementById('f-full-desc'),
  price: document.getElementById('f-price'),
  promoPrice: document.getElementById('f-promo-price'),
  chariowProductId: document.getElementById('f-chariow-product-id'),
  seoTitle: document.getElementById('f-seo-title'),
  seoDesc: document.getElementById('f-seo-desc'),
  seoKeywords: document.getElementById('f-seo-keywords'),
  thumbnail: document.getElementById('f-thumbnail'),
  thumbnailError: document.getElementById('thumbnail-error'),
  thumbnailPreview: document.getElementById('thumbnail-preview'),
  banner: document.getElementById('f-banner'),
  bannerError: document.getElementById('banner-error'),
  bannerPreview: document.getElementById('banner-preview'),
  gallery: document.getElementById('f-gallery'),
  galleryPreview: document.getElementById('gallery-preview'),
  pdf: document.getElementById('f-pdf'),
  pdfError: document.getElementById('pdf-error'),
  pdfPreview: document.getElementById('pdf-preview'),
  form: document.getElementById('product-form'),
  submitBtn: document.getElementById('submit-btn'),
};

(async () => {
  await AdminAuth.require();

  if (isEditMode) {
    document.getElementById('page-title').textContent = 'Modifier un produit — Administration Arcanes Mystiques';
    document.getElementById('form-heading').textContent = 'Modifier le produit';
    await loadExistingProduct();
  } else {
    updateSlugPreview();
  }
})();

document.getElementById('logout-btn').addEventListener('click', () => AdminAuth.logout());

async function loadExistingProduct() {
  const { data, error } = await window.sb.from('products').select('*').eq('id', productId).single();
  if (error || !data) {
    adminToast('Produit introuvable.', true);
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  els.title.value = data.title || '';
  els.slug.value = data.slug || '';
  slugManuallyEdited = true;
  updateSlugPreview();

  const knownCategories = [...els.category.options].map(o => o.value);
  if (data.category && knownCategories.includes(data.category)) {
    els.category.value = data.category;
  } else if (data.category) {
    els.category.value = '__other__';
    els.categoryOther.style.display = 'block';
    els.categoryOther.value = data.category;
  }

  els.shortDesc.value = data.short_description || '';
  els.fullDesc.value = data.full_description || '';
  els.price.value = data.price ?? '';
  els.promoPrice.value = data.promo_price ?? '';
  els.chariowProductId.value = data.chariow_product_id || '';
  els.seoTitle.value = data.seo_meta_title || '';
  els.seoDesc.value = data.seo_meta_description || '';
  els.seoKeywords.value = data.seo_keywords || '';

  document.getElementById(data.status === 'published' ? 'f-status-published' : 'f-status-draft').checked = true;

  if (data.thumbnail_url) {
    existingThumbnailUrl = data.thumbnail_url;
    renderSinglePreview(els.thumbnailPreview, data.thumbnail_url, () => {
      existingThumbnailUrl = null;
      pendingThumbnailFile = null;
      els.thumbnailPreview.innerHTML = '';
    });
  }
  if (data.banner_url) {
    existingBannerUrl = data.banner_url;
    renderSinglePreview(els.bannerPreview, data.banner_url, () => {
      existingBannerUrl = null;
      pendingBannerFile = null;
      els.bannerPreview.innerHTML = '';
    }, true);
  }
  if (Array.isArray(data.gallery) && data.gallery.length) {
    existingGalleryUrls = [...data.gallery];
    renderGalleryPreview();
  }
  if (data.pdf_path) {
    existingPdfPath = data.pdf_path;
    renderPdfChip(data.pdf_path.split('/').pop());
  }
}

/* ---------- Slug auto-generation ---------- */
els.title.addEventListener('input', () => {
  if (!slugManuallyEdited) {
    els.slug.value = adminSlugify(els.title.value);
    updateSlugPreview();
  }
});
els.slug.addEventListener('input', () => {
  slugManuallyEdited = true;
  els.slug.value = adminSlugify(els.slug.value);
  updateSlugPreview();
});
function updateSlugPreview() {
  els.slugPreview.textContent = els.slug.value || '…';
}

/* ---------- Category "other" toggle ---------- */
els.category.addEventListener('change', () => {
  els.categoryOther.style.display = els.category.value === '__other__' ? 'block' : 'none';
});

/* ---------- File previews ---------- */
function renderSinglePreview(container, url, onRemove, isBanner = false) {
  container.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'file-preview-item' + (isBanner ? ' is-banner' : '');
  item.innerHTML = `<img src="${url}" alt=""><button type="button" class="file-preview-remove" aria-label="Retirer">×</button>`;
  item.querySelector('.file-preview-remove').addEventListener('click', () => {
    item.remove();
    onRemove();
  });
  container.appendChild(item);
}

function renderGalleryPreview() {
  els.galleryPreview.innerHTML = '';
  existingGalleryUrls.forEach((url, i) => {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    item.innerHTML = `<img src="${url}" alt=""><button type="button" class="file-preview-remove" aria-label="Retirer">×</button>`;
    item.querySelector('.file-preview-remove').addEventListener('click', () => {
      existingGalleryUrls.splice(i, 1);
      renderGalleryPreview();
    });
    els.galleryPreview.appendChild(item);
  });
  pendingGalleryFiles.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    const url = URL.createObjectURL(file);
    item.innerHTML = `<img src="${url}" alt=""><button type="button" class="file-preview-remove" aria-label="Retirer">×</button>`;
    item.querySelector('.file-preview-remove').addEventListener('click', () => {
      pendingGalleryFiles.splice(i, 1);
      renderGalleryPreview();
    });
    els.galleryPreview.appendChild(item);
  });
}

function renderPdfChip(filename) {
  els.pdfPreview.innerHTML = `<div class="pdf-chip"><span>${adminEscapeHtml(filename)}</span><button type="button" class="file-preview-remove" style="position:static" aria-label="Retirer">×</button></div>`;
  els.pdfPreview.querySelector('.file-preview-remove').addEventListener('click', () => {
    pendingPdfFile = null;
    existingPdfPath = null;
    els.pdfPreview.innerHTML = '';
    els.pdf.value = '';
  });
}

els.thumbnail.addEventListener('change', async () => {
  els.thumbnailError.classList.remove('show');
  const file = els.thumbnail.files[0];
  if (!file) return;
  const check = await adminCheckImageDimensions(file, 600, 600);
  if (!check.ok) {
    els.thumbnailError.textContent = `Image trop petite (${check.width}×${check.height}px). Minimum requis : 600×600px.`;
    els.thumbnailError.classList.add('show');
    els.thumbnail.value = '';
    return;
  }
  pendingThumbnailFile = file;
  existingThumbnailUrl = null;
  renderSinglePreview(els.thumbnailPreview, URL.createObjectURL(file), () => {
    pendingThumbnailFile = null;
    els.thumbnail.value = '';
  });
});

els.banner.addEventListener('change', async () => {
  els.bannerError.classList.remove('show');
  const file = els.banner.files[0];
  if (!file) return;
  const check = await adminCheckImageDimensions(file, 702, 260);
  if (!check.ok) {
    els.bannerError.textContent = `Image trop petite (${check.width}×${check.height}px). Minimum requis : 702×260px.`;
    els.bannerError.classList.add('show');
    els.banner.value = '';
    return;
  }
  pendingBannerFile = file;
  existingBannerUrl = null;
  renderSinglePreview(els.bannerPreview, URL.createObjectURL(file), () => {
    pendingBannerFile = null;
    els.banner.value = '';
  }, true);
});

els.gallery.addEventListener('change', () => {
  pendingGalleryFiles = pendingGalleryFiles.concat(Array.from(els.gallery.files));
  els.gallery.value = '';
  renderGalleryPreview();
});

els.pdf.addEventListener('change', () => {
  els.pdfError.classList.remove('show');
  const file = els.pdf.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    els.pdfError.textContent = 'Le fichier doit être au format PDF.';
    els.pdfError.classList.add('show');
    els.pdf.value = '';
    return;
  }
  pendingPdfFile = file;
  existingPdfPath = null;
  renderPdfChip(file.name);
});

/* ---------- Submit ---------- */
els.form.addEventListener('submit', async e => {
  e.preventDefault();

  const title = els.title.value.trim();
  const slug = adminSlugify(els.slug.value);
  const category = els.category.value === '__other__' ? els.categoryOther.value.trim() : els.category.value;
  const shortDescription = els.shortDesc.value.trim();
  const fullDescription = els.fullDesc.value.trim();
  const price = parseFloat(els.price.value);
  const promoPriceRaw = els.promoPrice.value.trim();
  const promoPrice = promoPriceRaw === '' ? null : parseFloat(promoPriceRaw);
  const status = document.querySelector('input[name="status"]:checked').value;

  if (!title || !slug || !category || !shortDescription || !fullDescription || isNaN(price)) {
    adminToast('Merci de remplir tous les champs obligatoires (*).', true);
    return;
  }
  if (!isEditMode && !pendingThumbnailFile) {
    adminToast('Une vignette est requise.', true);
    return;
  }
  if (!isEditMode && !pendingBannerFile) {
    adminToast('Une bannière est requise.', true);
    return;
  }
  if (promoPrice !== null && (isNaN(promoPrice) || promoPrice >= price)) {
    adminToast('Le prix promotionnel doit être inférieur au prix normal.', true);
    return;
  }

  els.submitBtn.disabled = true;
  const originalLabel = els.submitBtn.textContent;
  els.submitBtn.innerHTML = '<span class="admin-loading"></span> Enregistrement…';

  try {
    let thumbnailUrl = existingThumbnailUrl;
    if (pendingThumbnailFile) {
      thumbnailUrl = await uploadImage(pendingThumbnailFile, adminBuildUploadPath(slug, 'thumbnail', pendingThumbnailFile.name));
    }

    let bannerUrl = existingBannerUrl;
    if (pendingBannerFile) {
      bannerUrl = await uploadImage(pendingBannerFile, adminBuildUploadPath(slug, 'banner', pendingBannerFile.name));
    }

    const newGalleryUrls = [];
    for (const file of pendingGalleryFiles) {
      const url = await uploadImage(file, adminBuildUploadPath(slug, 'gallery', file.name));
      newGalleryUrls.push(url);
    }
    const gallery = existingGalleryUrls.concat(newGalleryUrls);

    let pdfPath = existingPdfPath;
    if (pendingPdfFile) {
      pdfPath = adminBuildUploadPath(slug, 'pdf', pendingPdfFile.name);
      const { error: pdfError } = await window.sb.storage.from('product-files').upload(pdfPath, pendingPdfFile, { upsert: true });
      if (pdfError) throw pdfError;
    }

    const payload = {
      slug,
      title,
      short_description: shortDescription,
      full_description: fullDescription,
      category,
      price,
      promo_price: promoPrice,
      chariow_product_id: els.chariowProductId.value.trim() || null,
      thumbnail_url: thumbnailUrl,
      banner_url: bannerUrl,
      gallery,
      pdf_path: pdfPath,
      seo_meta_title: els.seoTitle.value.trim() || null,
      seo_meta_description: els.seoDesc.value.trim() || null,
      seo_keywords: els.seoKeywords.value.trim() || null,
      status,
    };

    let saveError;
    if (isEditMode) {
      ({ error: saveError } = await window.sb.from('products').update(payload).eq('id', productId));
    } else {
      ({ error: saveError } = await window.sb.from('products').insert(payload));
    }

    if (saveError) {
      if (saveError.code === '23505') {
        els.slugError.classList.add('show');
        throw new Error('Ce slug est déjà utilisé.');
      }
      throw saveError;
    }

    adminToast('Produit enregistré.');
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  } catch (err) {
    console.error('[Admin] Save error:', err);
    const isNetworkError = err instanceof TypeError && /fetch/i.test(err.message || '');
    const message = isNetworkError
      ? 'Connexion au serveur impossible. Vérifie ta connexion internet, puis rafraîchis complètement la page (Ctrl/Cmd+Shift+R) avant de réessayer.'
      : 'Erreur : ' + (err.message || 'échec de l\'enregistrement.');
    adminToast(message, true);
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = originalLabel;
  }
});

async function uploadImage(file, path) {
  const { error } = await window.sb.storage.from('product-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = window.sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
