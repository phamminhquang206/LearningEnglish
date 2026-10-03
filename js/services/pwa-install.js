let deferredInstallPrompt = null;
let notifyUser = () => {};
let bannerTimer = null;
let initialized = false;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(navigator.userAgent);
const isMobile = () => matchMedia('(max-width: 900px)').matches;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshPwaInstall();
  scheduleBanner();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideBanner();
  refreshPwaInstall();
  notifyUser('Đã cài English Learning Assistant. Bạn có thể mở app từ màn hình chính.');
});

export function initPwaInstall({ notify } = {}) {
  if (initialized) return;
  initialized = true;
  if (notify) notifyUser = notify;

  document.addEventListener('click', event => {
    const installButton = event.target.closest('[data-pwa-install]');
    if (installButton) {
      event.preventDefault();
      handleInstall();
      return;
    }
    if (event.target.closest('[data-pwa-dismiss]')) dismissBanner();
    if (event.target.closest('[data-pwa-close]')) closeGuide();
  });

  const dialog = document.querySelector('#pwa-install-dialog');
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) closeGuide();
  });

  refreshPwaInstall();
  scheduleBanner();
}

export function refreshPwaInstall() {
  const installed = isStandalone();
  document.querySelectorAll('[data-pwa-install]').forEach(button => {
    button.hidden = installed;
  });
  if (installed) hideBanner();
}

async function handleInstall() {
  if (isStandalone()) {
    notifyUser('Ứng dụng đã được cài trên thiết bị này.');
    return;
  }

  if (deferredInstallPrompt) {
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    hideBanner();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome !== 'accepted') notifyUser('Bạn có thể cài ứng dụng sau trong phần Cài đặt.');
    } catch {
      notifyUser('Không thể mở hộp thoại cài đặt. Hãy thử từ menu trình duyệt.');
      openGuide();
    } finally {
      refreshPwaInstall();
    }
    return;
  }

  openGuide();
}

function scheduleBanner() {
  if (bannerTimer || isStandalone() || !isMobile() || sessionStorage.getItem('ela_pwa_banner_dismissed')) return;
  if (!deferredInstallPrompt && !isIOS) return;
  bannerTimer = setTimeout(() => {
    bannerTimer = null;
    const banner = document.querySelector('#pwa-install-banner');
    if (banner && !isStandalone() && !sessionStorage.getItem('ela_pwa_banner_dismissed')) banner.hidden = false;
  }, 1200);
}

function dismissBanner() {
  sessionStorage.setItem('ela_pwa_banner_dismissed', '1');
  hideBanner();
}

function hideBanner() {
  const banner = document.querySelector('#pwa-install-banner');
  if (banner) banner.hidden = true;
}

function openGuide() {
  hideBanner();
  const dialog = document.querySelector('#pwa-install-dialog');
  const title = document.querySelector('#pwa-guide-title');
  const intro = document.querySelector('#pwa-guide-intro');
  const steps = document.querySelector('#pwa-guide-steps');
  if (!dialog || !title || !intro || !steps) return;

  if (isIOS) {
    title.textContent = 'Cài trên iPhone hoặc iPad';
    intro.textContent = 'iOS dùng menu Chia sẻ để thêm ứng dụng vào màn hình chính.';
    steps.innerHTML = guideSteps([
      'Mở trang này trong Safari, sau đó nhấn nút Chia sẻ trên thanh công cụ.',
      'Chọn “Thêm vào Màn hình chính” trong danh sách tác vụ.',
      'Nhấn “Thêm” để hoàn tất.'
    ]);
  } else if (isAndroid) {
    title.textContent = 'Cài trên Android';
    intro.textContent = 'Chrome sẽ mở hộp thoại cài trực tiếp khi ứng dụng đã sẵn sàng.';
    steps.innerHTML = guideSteps([
      'Mở menu ba chấm của trình duyệt.',
      'Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.',
      'Xác nhận Cài đặt.'
    ]);
  } else {
    title.textContent = 'Cài English Learning Assistant';
    intro.textContent = 'Bạn có thể cài ứng dụng từ trình duyệt để mở trong một cửa sổ riêng.';
    steps.innerHTML = guideSteps([
      'Mở menu trình duyệt hoặc tìm biểu tượng cài đặt trên thanh địa chỉ.',
      'Chọn “Cài đặt English Learning Assistant”.',
      'Xác nhận Cài đặt.'
    ]);
  }

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  dialog.querySelector('[data-pwa-close]')?.focus();
}

function guideSteps(items) {
  return items.map((text, index) => `<li><span>${index + 1}</span><p>${text}</p></li>`).join('');
}

function closeGuide() {
  const dialog = document.querySelector('#pwa-install-dialog');
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}
