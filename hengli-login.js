(() => {
  if (document.querySelector('#hengli-login')) return;
  const icon = name => `<img src="hengli-login-${name}.svg" alt="" aria-hidden="true">`;
  const dialog = document.createElement('dialog');
  dialog.id = 'hengli-login';
  dialog.setAttribute('aria-labelledby', 'auth-title');
  dialog.innerHTML = `
    <div class="auth-top"><div class="auth-brand">恒立财富</div><button class="auth-icon-button" id="auth-close" type="button" title="关闭登录" aria-label="关闭登录">${icon('x')}</button></div>
    <div class="auth-body">
      <button id="auth-back" type="button" hidden>${icon('arrow-left')}返回登录</button>
      <h2 id="auth-title">欢迎登录</h2>
      <p class="auth-subtitle" id="auth-subtitle">专注港美股，与每一份认真思考同行。</p>
      <div class="auth-tabs" role="tablist" aria-label="手机号登录方式">
        <button id="auth-tab-sms" type="button" role="tab" aria-selected="true" aria-controls="auth-form" data-auth-mode="sms">验证码登录</button>
        <button id="auth-tab-password" type="button" role="tab" aria-selected="false" aria-controls="auth-form" tabindex="-1" data-auth-mode="password">密码登录</button>
      </div>
      <form id="auth-form" role="tabpanel" aria-labelledby="auth-tab-sms" novalidate>
        <label for="auth-phone" class="auth-label">手机号码</label>
        <div class="auth-field"><div class="auth-region-wrap"><span id="auth-region-label" aria-hidden="true">+86</span>${icon('chevron-down')}<select id="auth-region" aria-label="手机区号"><option value="86">+86 中国内地</option><option value="852">+852 中国香港</option><option value="853">+853 中国澳门</option><option value="886">+886 中国台湾</option><option value="1">+1 美国 / 加拿大</option></select></div><input id="auth-phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="20" placeholder="请输入手机号码" aria-describedby="auth-phone-error" autofocus></div>
        <p class="auth-error" id="auth-phone-error" aria-live="polite"></p>
        <div id="auth-code-group"><label for="auth-code" class="auth-label">短信验证码</label><div class="auth-field"><input id="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6位验证码" aria-describedby="auth-code-error"><button id="auth-send-code" type="button" disabled>获取验证码</button></div><p class="auth-error" id="auth-code-error" aria-live="polite"></p></div>
        <div id="auth-password-group" hidden><label for="auth-password" class="auth-label" id="auth-password-label">登录密码</label><div class="auth-field"><input id="auth-password" type="password" autocomplete="current-password" maxlength="64" placeholder="请输入登录密码" aria-describedby="auth-password-error"><button class="auth-icon-button" id="auth-toggle-password" type="button" title="显示密码" aria-label="显示密码" aria-pressed="false">${icon('eye')}</button></div><p class="auth-error" id="auth-password-error" aria-live="polite"></p></div>
        <div id="auth-confirm-group" hidden><label for="auth-confirm" class="auth-label" id="auth-confirm-label">确认新密码</label><div class="auth-field"><input id="auth-confirm" type="password" autocomplete="new-password" maxlength="32" placeholder="再次输入新密码" aria-describedby="auth-confirm-error"></div><p class="auth-error" id="auth-confirm-error" aria-live="polite"></p></div>
        <div class="auth-password-links" id="auth-password-links" hidden><button id="auth-forgot" type="button">忘记密码？</button></div>
        <p class="auth-feedback" id="auth-feedback" role="status"></p>
        <button type="submit" class="auth-primary" id="auth-submit" disabled>登录</button>
      </form>
      <div class="auth-success" id="auth-success" hidden><div class="auth-success-icon">${icon('check')}</div><h3 id="auth-success-title" tabindex="-1">登录预览完成</h3><p id="auth-success-copy"></p><button class="auth-primary" id="auth-done" type="button">返回浏览</button></div>
      <p class="auth-switch" id="auth-switch-row"><span id="auth-switch-label">还没有账户？</span><button id="auth-switch" type="button">立即注册</button></p>
      <p class="auth-preview-note">交互预览 · 不发送短信、不提交或保存输入内容</p>
      <div class="auth-footer">${icon('shield-check')}香港炬元 · 恒立财富</div>
    </div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const form = $('#auth-form');
  const phone = $('#auth-phone');
  const region = $('#auth-region');
  const code = $('#auth-code');
  const password = $('#auth-password');
  const confirm = $('#auth-confirm');
  const submit = $('#auth-submit');
  const send = $('#auth-send-code');
  const tabs = [...dialog.querySelectorAll('[data-auth-mode]')];
  const codes = new Map();
  const patterns = { '86': /^1[3-9]\d{9}$/, '852': /^[4-9]\d{7}$/, '853': /^6\d{7}$/, '886': /^9\d{8}$/, '1': /^[2-9]\d{9}$/ };
  let mode = 'sms';
  let verificationStage = 'verify';
  let verifiedPhone = '';
  let timer;
  let returnFocus;
  let afterLogin = null;
  const previewStateKey = 'hengli-design-account-v1';
  let accountState = { loggedIn: false, opened: false };
  try {
    const saved = JSON.parse(sessionStorage.getItem(previewStateKey));
    if (saved?.loggedIn === true) accountState = { loggedIn: true, opened: saved.opened === true };
  } catch { /* Private browsing can make session storage unavailable. */ }

  // These flags drive a design preview only; real authorization belongs on the server.
  function saveAccountState(next) {
    accountState = { loggedIn: next.loggedIn === true, opened: next.loggedIn === true && next.opened === true };
    try { sessionStorage.setItem(previewStateKey, JSON.stringify(accountState)); } catch { /* Keep the current page interactive. */ }
    renderAccountState();
  }

  const serviceDialog = document.createElement('dialog');
  serviceDialog.id = 'hengli-service';
  serviceDialog.className = 'hl-dialog';
  serviceDialog.setAttribute('aria-labelledby', 'service-title');
  serviceDialog.innerHTML = `
    <div class="hl-dialog-top"><span class="hl-dialog-brand">恒立财富</span><button type="button" class="hl-icon-button" data-service-close title="关闭弹窗" aria-label="关闭弹窗">${icon('x')}</button></div>
    <div class="hl-dialog-body">
      <h2 id="service-title" tabindex="-1">联系我们</h2>
      <div data-service-panel="contact" hidden>
        <p class="hl-dialog-intro">投资路上，与您保持联系。</p>
        <section class="hl-contact-email" aria-labelledby="contact-email-title"><img src="hengli-opening-mail.svg" alt="" aria-hidden="true"><div><h3 id="contact-email-title">客服邮箱</h3><p>邮箱地址待更新</p></div></section>
        <section class="hl-contact-wecom" aria-labelledby="contact-wecom-title"><h3 id="contact-wecom-title">企业微信</h3><div class="hl-contact-qr" role="img" aria-label="企业微信二维码预留位置，尚未配置，暂不可扫码"><img src="hengli-opening-scan-line.svg" alt="" aria-hidden="true"><span>企业微信二维码</span><small>待配置</small></div><p>账户咨询 · 客户服务</p></section>
      </div>
      <div data-service-panel="session" hidden>
        <p class="hl-dialog-intro" id="service-session-copy"></p>
        <button type="button" class="hl-primary" id="service-continue">继续开户</button>
        <button type="button" class="hl-secondary" id="service-logout">退出登录</button>
        <p class="hl-preview-note">当前为演示状态，未登录真实账户。</p>
      </div>
      <div data-service-panel="opening" hidden>
        <p class="hl-dialog-intro">真实开户申请尚未开放。您可以先查看开户完成后的页面与联系入口。</p>
        <button type="button" class="hl-primary" id="service-preview-complete">预览开户完成效果</button>
        <button type="button" class="hl-secondary" data-service-close>返回开户页</button>
        <p class="hl-preview-note">仅切换展示状态，不创建账户或提交资料。</p>
      </div>
      <div class="hl-dialog-footer">${icon('shield-check')}香港炬元 · 恒立财富</div>
    </div>`;
  document.body.append(serviceDialog);
  let serviceReturnFocus;
  let serviceMode;

  function openService(mode, trigger) {
    serviceMode = mode;
    serviceReturnFocus = trigger;
    serviceDialog.querySelectorAll('[data-service-panel]').forEach(panel => { panel.hidden = panel.dataset.servicePanel !== mode; });
    serviceDialog.querySelector('#service-title').textContent = { contact: '联系我们', session: '我的账户', opening: '开户申请预览' }[mode];
    serviceDialog.querySelector('#service-session-copy').textContent = accountState.opened ? '已开户，可通过客服邮箱或企业微信联系我们。' : '已登录，您可以继续办理开户。';
    serviceDialog.querySelector('#service-continue').textContent = accountState.opened ? '联系我们' : '继续开户';
    if (!serviceDialog.open) serviceDialog.showModal();
    document.documentElement.classList.add('hengli-service-open');
    serviceDialog.querySelector('#service-title').focus({ preventScroll: true });
  }

  serviceDialog.querySelectorAll('[data-service-close]').forEach(button => button.addEventListener('click', () => serviceDialog.close()));
  serviceDialog.addEventListener('click', event => {
    if (event.target !== serviceDialog) return;
    const bounds = serviceDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) serviceDialog.close();
  });
  serviceDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('hengli-service-open');
    serviceReturnFocus?.focus({ preventScroll: true });
  });
  serviceDialog.querySelector('#service-logout').addEventListener('click', () => {
    afterLogin = null;
    saveAccountState({ loggedIn: false, opened: false });
    serviceDialog.close();
  });
  serviceDialog.querySelector('#service-continue').addEventListener('click', () => {
    if (accountState.opened) { openService('contact', serviceReturnFocus); return; }
    serviceDialog.close();
    continueOpening();
  });
  serviceDialog.querySelector('#service-preview-complete').addEventListener('click', () => {
    if (serviceMode !== 'opening' || !accountState.loggedIn) return;
    saveAccountState({ loggedIn: true, opened: true });
    serviceDialog.close();
  });

  function renderAccountState() {
    document.querySelectorAll('.account-entry').forEach(entry => {
      entry.textContent = accountState.opened ? '联系我们' : '立即开户';
      entry.setAttribute('role', 'button');
      if (!accountState.loggedIn || accountState.opened) entry.setAttribute('aria-haspopup', 'dialog');
      else entry.removeAttribute('aria-haspopup');
    });
    document.querySelectorAll('.login-trigger').forEach(trigger => {
      const label = accountState.loggedIn ? '我的账户' : '登录';
      trigger.setAttribute('aria-label', label);
      trigger.title = label;
      if (trigger.classList.contains('login-desktop')) trigger.textContent = accountState.loggedIn ? '已登录' : '登录';
    });
    const next = document.querySelector('[data-opening-next]');
    if (next) {
      next.querySelector('span').textContent = accountState.opened ? '联系我们' : '下一步';
      document.querySelector('#opening-title').textContent = accountState.opened ? '开户已完成' : '第三方见证开户';
      document.querySelector('.opening-intro').textContent = accountState.opened ? '感谢您的信任，恒立财富与您同行。' : '从资料准备开始，开启您的投资之旅。';
      document.querySelector('.opening-process').classList.toggle('is-opened', accountState.opened);
      document.querySelector('[data-opening-complete]').hidden = !accountState.opened;
      document.querySelector('.opening-steps').hidden = accountState.opened;
    }
  }

  function continueOpening() {
    if (!accountState.loggedIn || accountState.opened) return;
    if (document.querySelector('[data-opening-next]')) document.querySelector('[data-opening-next]').focus();
    else location.assign(new URL('hengli-account-open.html', location.href).href);
  }

  function accountAction(trigger, isNext = false) {
    if (accountState.opened) { openService('contact', trigger); return; }
    if (!accountState.loggedIn) {
      openLogin({ currentTarget: trigger }, () => isNext ? openService('opening', trigger) : continueOpening());
      return;
    }
    if (isNext) openService('opening', trigger);
    else continueOpening();
  }
  document.querySelectorAll('.account-entry').forEach(entry => {
    entry.addEventListener('click', event => { event.preventDefault(); accountAction(entry); });
    entry.addEventListener('keydown', event => {
      if (event.key === ' ') { event.preventDefault(); entry.click(); }
    });
  });
  document.querySelector('[data-opening-next]')?.addEventListener('click', event => accountAction(event.currentTarget, true));
  renderAccountState();
  window.addEventListener('pageshow', () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(previewStateKey));
      accountState = { loggedIn: saved?.loggedIn === true, opened: saved?.loggedIn === true && saved?.opened === true };
    } catch { /* Fall back to this page's state. */ }
    renderAccountState();
  });

  const digits = () => phone.value.replace(/[\s()-]/g, '');
  const phoneKey = () => `+${region.value} ${digits()}`;
  const codeKey = () => `${mode === 'register' ? 'register' : mode === 'reset' ? 'reset' : 'login'}:${phoneKey()}`;
  const validPhone = () => patterns[region.value].test(digits());
  const newPasswordValid = () => password.value.length >= 8 && password.value.length <= 32 && /[a-zA-Z]/.test(password.value) && /\d/.test(password.value);
  const isNewPassword = () => (mode === 'reset' || mode === 'register') && verificationStage === 'password';

  function fieldError(input, message) {
    input.setAttribute('aria-invalid', String(Boolean(message)));
    $(`#${input.id}-error`).textContent = message;
  }

  function clearErrors() {
    [phone, code, password, confirm].forEach(input => fieldError(input, ''));
    $('#auth-feedback').textContent = '';
  }

  function updateControls() {
    $('#auth-region-label').textContent = `+${region.value}`;
    const sent = codes.get(codeKey());
    const remaining = Math.max(0, Math.ceil(((sent?.retryAt || 0) - Date.now()) / 1000));
    send.textContent = remaining ? `${remaining}秒后重发` : (sent ? '重新获取' : '获取验证码');
    send.disabled = !validPhone() || remaining > 0;
    submit.disabled = isNewPassword()
      ? verifiedPhone !== phoneKey() || !newPasswordValid() || password.value !== confirm.value
      : !validPhone() || (mode === 'register' && verificationStage === 'phone' ? false : mode === 'password' ? !password.value : !/^\d{6}$/.test(code.value));
  }

  function showMode(nextMode) {
    mode = nextMode;
    verificationStage = mode === 'register' ? 'phone' : 'verify';
    verifiedPhone = '';
    form.hidden = false;
    $('#auth-success').hidden = true;
    $('#auth-title').textContent = mode === 'register' ? '欢迎注册' : mode === 'reset' ? '找回密码' : '欢迎登录';
    $('#auth-subtitle').textContent = mode === 'register' ? '使用手机号码，注册恒立财富账户。' : mode === 'reset' ? '通过绑定的手机号码验证身份。' : afterLogin ? '请先登录，再继续办理开户。' : '专注港美股，与每一份认真思考同行。';
    $('.auth-tabs').hidden = mode === 'reset' || mode === 'register';
    $('#auth-back').hidden = mode !== 'reset';
    $('#auth-back').innerHTML = `${icon('arrow-left')}返回登录`;
    $('#auth-code-group').hidden = mode === 'password' || mode === 'register';
    $('#auth-password-group').hidden = mode !== 'password';
    $('#auth-confirm-group').hidden = true;
    $('#auth-password-links').hidden = mode !== 'password';
    $('#auth-password-label').textContent = '登录密码';
    $('#auth-confirm-label').textContent = '确认新密码';
    confirm.placeholder = '再次输入新密码';
    $('#auth-switch-row').hidden = mode === 'reset';
    $('#auth-switch-label').textContent = mode === 'register' ? '已有账户？' : '还没有账户？';
    $('#auth-switch').textContent = mode === 'register' ? '立即登录' : '立即注册';
    $('#auth-close').title = mode === 'register' ? '关闭注册' : '关闭登录';
    $('#auth-close').setAttribute('aria-label', $('#auth-close').title);
    password.placeholder = '请输入登录密码';
    password.autocomplete = 'current-password';
    password.maxLength = 64;
    password.type = 'password';
    password.value = '';
    confirm.value = '';
    code.value = '';
    phone.readOnly = false;
    region.disabled = false;
    submit.textContent = mode === 'reset' || mode === 'register' ? '下一步' : '登录';
    form.setAttribute('role', mode === 'reset' || mode === 'register' ? 'group' : 'tabpanel');
    form.setAttribute('aria-labelledby', mode === 'reset' || mode === 'register' ? 'auth-title' : `auth-tab-${mode}`);
    tabs.forEach(tab => {
      const active = tab.dataset.authMode === mode;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    setPasswordVisibility(false);
    clearErrors();
    updateControls();
  }

  function showRegistrationVerification() {
    verificationStage = 'verify';
    verifiedPhone = '';
    code.value = '';
    password.value = '';
    confirm.value = '';
    $('#auth-title').textContent = '验证手机';
    $('#auth-subtitle').textContent = '获取短信验证码，验证您的手机号码。';
    $('#auth-back').hidden = false;
    $('#auth-back').innerHTML = `${icon('arrow-left')}修改手机号`;
    $('#auth-code-group').hidden = false;
    $('#auth-password-group').hidden = true;
    $('#auth-confirm-group').hidden = true;
    phone.readOnly = true;
    region.disabled = true;
    submit.textContent = '下一步';
    setPasswordVisibility(false);
    clearErrors();
    updateControls();
    if (send.disabled) code.focus();
    else send.focus();
  }

  function showNewPassword() {
    verifiedPhone = phoneKey();
    verificationStage = 'password';
    code.value = '';
    password.value = '';
    confirm.value = '';
    $('#auth-title').textContent = mode === 'register' ? '设置登录密码' : '找回密码';
    $('#auth-subtitle').textContent = mode === 'register' ? '手机号验证通过，请设置您的登录密码。' : '设置新的登录密码。';
    $('#auth-code-group').hidden = true;
    $('#auth-password-group').hidden = false;
    $('#auth-confirm-group').hidden = false;
    $('#auth-password-label').textContent = mode === 'register' ? '登录密码' : '新密码';
    $('#auth-confirm-label').textContent = mode === 'register' ? '确认密码' : '确认新密码';
    confirm.placeholder = mode === 'register' ? '再次输入登录密码' : '再次输入新密码';
    if (mode === 'register') $('#auth-back').innerHTML = `${icon('arrow-left')}重新验证手机`;
    password.placeholder = '8-32位字母与数字';
    password.autocomplete = 'new-password';
    password.maxLength = 32;
    phone.readOnly = true;
    region.disabled = true;
    submit.textContent = mode === 'register' ? '完成注册' : '确认重设';
    setPasswordVisibility(false);
    clearErrors();
    updateControls();
    password.focus();
  }

  function setPasswordVisibility(visible) {
    password.type = visible ? 'text' : 'password';
    const toggle = $('#auth-toggle-password');
    const label = visible ? '隐藏密码' : '显示密码';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.querySelector('img').src = `hengli-login-${visible ? 'eye-off' : 'eye'}.svg`;
  }

  function openLogin(event, continuation = null) {
    if (dialog.open) return;
    afterLogin = continuation;
    returnFocus = event.currentTarget;
    showMode('sms');
    if (afterLogin) $('#auth-subtitle').textContent = '请先登录，再继续办理开户。';
    dialog.showModal();
    document.documentElement.classList.add('hengli-login-open');
    phone.focus({ preventScroll: true });
    timer = setInterval(updateControls, 1000);
  }

  document.querySelectorAll('[data-login-open]').forEach(button => button.addEventListener('click', event => {
    if (accountState.loggedIn) openService('session', event.currentTarget);
    else openLogin(event);
  }));
  $('#auth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    afterLogin = null;
    clearInterval(timer);
    codes.clear();
    form.reset();
    verifiedPhone = '';
    $('#auth-success-copy').textContent = '';
    clearErrors();
    document.documentElement.classList.remove('hengli-login-open');
    returnFocus?.focus({ preventScroll: true });
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showMode(tab.dataset.authMode));
    tab.addEventListener('keydown', event => {
      const destination = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
      if (destination === undefined) return;
      event.preventDefault();
      showMode(tabs[destination].dataset.authMode);
      tabs[destination].focus();
    });
  });
  [phone, region].forEach(input => input.addEventListener('input', () => {
    verifiedPhone = '';
    code.value = '';
    fieldError(phone, '');
    fieldError(code, '');
    $('#auth-feedback').textContent = '';
    updateControls();
  }));
  phone.addEventListener('blur', () => { if (phone.value) fieldError(phone, validPhone() ? '' : '请输入与所选区号对应的手机号码'); });
  [code, password, confirm].forEach(input => input.addEventListener('input', () => {
    if (input === code) code.value = code.value.replace(/\D/g, '').slice(0, 6);
    fieldError(input, '');
    updateControls();
  }));
  password.addEventListener('blur', () => {
    if (isNewPassword() && password.value) fieldError(password, newPasswordValid() ? '' : '请使用8至32位字母和数字组合');
  });
  confirm.addEventListener('blur', () => { if (confirm.value) fieldError(confirm, confirm.value === password.value ? '' : '两次输入的密码不一致'); });
  $('#auth-toggle-password').addEventListener('click', () => setPasswordVisibility(password.type === 'password'));
  $('#auth-forgot').addEventListener('click', () => { showMode('reset'); phone.focus(); });
  $('#auth-back').addEventListener('click', () => {
    if (mode === 'register' && verificationStage === 'password') {
      codes.delete(codeKey());
      showRegistrationVerification();
    } else {
      showMode(mode === 'register' ? 'register' : 'password');
      phone.focus();
    }
  });
  $('#auth-switch').addEventListener('click', () => {
    showMode(mode === 'register' ? 'sms' : 'register');
    phone.focus();
  });

  send.addEventListener('click', () => {
    if (!validPhone() || send.disabled) return;
    // The prototype never sends a request or persists credentials.
    codes.set(codeKey(), { retryAt: Date.now() + 60000, expiresAt: Date.now() + 300000 });
    fieldError(code, '');
    $('#auth-feedback').textContent = '演示验证码：123456（5分钟内有效）';
    updateControls();
    code.focus();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    updateControls();
    if (submit.disabled) return;
    if (mode === 'register' && verificationStage === 'phone') {
      showRegistrationVerification();
      return;
    }
    if (mode !== 'password' && verificationStage !== 'password') {
      const sent = codes.get(codeKey());
      if (!sent) { fieldError(code, '请先获取验证码'); code.focus(); return; }
      if (sent.expiresAt <= Date.now()) { fieldError(code, '验证码已过期，请重新获取'); return; }
      if (code.value !== '123456') { fieldError(code, '验证码不正确，请重新输入'); code.focus(); return; }
    }
    if ((mode === 'reset' || mode === 'register') && verificationStage === 'verify') {
      showNewPassword();
      return;
    }
    if ((mode === 'reset' || mode === 'register') && (verifiedPhone !== phoneKey() || !newPasswordValid() || password.value !== confirm.value)) return;
    if (mode !== 'reset') {
      saveAccountState({ loggedIn: true, opened: false });
      const continuation = afterLogin;
      phone.value = '';
      password.value = '';
      confirm.value = '';
      code.value = '';
      codes.clear();
      if (continuation && mode !== 'register') {
        dialog.addEventListener('close', continuation, { once: true });
        dialog.close();
        return;
      }
    }
    form.hidden = true;
    $('.auth-tabs').hidden = true;
    $('#auth-back').hidden = true;
    $('#auth-switch-row').hidden = true;
    $('#auth-title').textContent = '恒立财富';
    $('#auth-subtitle').textContent = '与每一份认真思考同行。';
    $('#auth-success').hidden = false;
    $('#auth-success-title').textContent = mode === 'register' ? '注册预览完成' : mode === 'reset' ? '密码重设预览完成' : '登录预览完成';
    $('#auth-success-copy').textContent = mode === 'register' ? '已完成手机号验证与密码设置流程演示，未创建真实账户。' : mode === 'reset' ? '已完成操作流程演示，真实账户密码未变更。' : '已完成操作流程演示，尚未验证或登录真实账户。';
    $('#auth-done').textContent = mode === 'register' && afterLogin ? '继续开户' : mode === 'reset' ? '返回登录' : '返回浏览';
    password.value = '';
    confirm.value = '';
    code.value = '';
    $('#auth-success-title').focus();
  });
  $('#auth-done').addEventListener('click', () => {
    if (mode === 'reset') { showMode('password'); password.focus(); }
    else {
      if (mode === 'register' && afterLogin) dialog.addEventListener('close', afterLogin, { once: true });
      dialog.close();
    }
  });
  const authParams = new URLSearchParams(location.search);
  if (authParams.get('login') === '1' || authParams.get('register') === '1') {
    const trigger = [...document.querySelectorAll('[data-login-open]')].find(button => button.getClientRects().length);
    if (trigger) {
      if (accountState.loggedIn) openService('session', trigger);
      else {
        openLogin({ currentTarget: trigger });
        if (authParams.get('register') === '1') showMode('register');
      }
    }
  }
})();
