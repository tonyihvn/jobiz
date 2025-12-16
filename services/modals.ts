export function openProductModal(detail?: any) {
  try { window.dispatchEvent(new CustomEvent('open:productModal', { detail })); } catch (e) {}
}

export function openServiceModal(detail?: any) {
  try { window.dispatchEvent(new CustomEvent('open:serviceModal', { detail })); } catch (e) {}
}
