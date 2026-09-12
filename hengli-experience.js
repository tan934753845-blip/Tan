(() => {
  const dialog = document.querySelector('#hengli-experience');
  if (!dialog) return;
  const triggers = [...document.querySelectorAll('[data-experience-open]')];
  let returnFocus;
  let startedOnBackdrop = false;

  function openExperience(trigger) {
    if (dialog.open || document.querySelector('dialog[open]')) return;
    returnFocus = trigger;
    document.documentElement.classList.add('hengli-experience-open');
    dialog.showModal();
    document.dispatchEvent(new Event('hengli:experience-toggle'));
    dialog.querySelector('.experience-close').focus({ preventScroll: true });
  }

  function outsideDialog(event) {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }

  triggers.forEach(trigger => trigger.addEventListener('click', () => openExperience(trigger)));
  dialog.querySelector('.experience-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('pointerdown', event => { startedOnBackdrop = event.target === dialog && outsideDialog(event); });
  dialog.addEventListener('pointercancel', () => { startedOnBackdrop = false; });
  dialog.addEventListener('click', event => {
    if (startedOnBackdrop && event.target === dialog && outsideDialog(event)) dialog.close();
    startedOnBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('hengli-experience-open');
    startedOnBackdrop = false;
    if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
    document.dispatchEvent(new Event('hengli:experience-toggle'));
  });

  if (new URLSearchParams(location.search).get('experience') === '1') {
    openExperience(triggers.find(trigger => !trigger.closest('[inert]')));
  }
})();
