document.addEventListener('DOMContentLoaded', () => {
  // API Base URL resolution (Express backend runs on port 5001)
  const isServedFromBackend = window.location.port === '5001';
  const API_BASE_URL = isServedFromBackend ? '' : 'http://localhost:5001';

  // DOM Elements - Navigation & Headers
  const formTitle = document.getElementById('form-title');
  const formSubtitle = document.getElementById('form-subtitle');
  const tabsWrapper = document.getElementById('tabs-wrapper');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const authFormsContainer = document.getElementById('auth-forms-container');
  const authenticatedScreen = document.getElementById('authenticated-screen');
  const alertBanner = document.getElementById('alert-banner');
  const toggleFooterPrompt = document.getElementById('toggle-footer-prompt');
  const switchToSignup = document.getElementById('switch-to-signup');

  // DOM Elements - Forms & Inputs
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const rememberMe = document.getElementById('remember-me');
  const signupName = document.getElementById('signup-name');
  const signupEmail = document.getElementById('signup-email');
  const signupPassword = document.getElementById('signup-password');
  const termsAgree = document.getElementById('terms-agree');

  // DOM Elements - Authenticated State Elements
  const displayUserName = document.getElementById('display-user-name');
  const displayUserEmail = document.getElementById('display-user-email');
  const displayUserId = document.getElementById('display-user-id');
  const userAvatar = document.getElementById('user-avatar');
  const logoutBtn = document.getElementById('logout-btn');
  const nextScreenBtn = document.getElementById('next-screen-btn');

  // Social & action buttons
  const googleBtn = document.getElementById('google-btn');
  const githubBtn = document.getElementById('github-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');

  // Check saved email
  const savedEmail = localStorage.getItem('remembered_email');
  if (savedEmail && loginEmail) {
    loginEmail.value = savedEmail;
    if (rememberMe) rememberMe.checked = true;
  }

  // --- Tab Switching ---
  function showTab(mode) {
    clearAlert();
    clearAllErrors();

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabSignup.classList.remove('active');
      tabSignup.setAttribute('aria-selected', 'false');

      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');

      formTitle.textContent = 'Welcome back';
      formSubtitle.textContent = 'Please enter your details to sign in';
      toggleFooterPrompt.innerHTML = `Don't have an account? <a href="#" id="switch-to-signup">Sign up for free</a>`;
      
      const newSwitch = document.getElementById('switch-to-signup');
      if (newSwitch) {
        newSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          showTab('signup');
        });
      }
    } else {
      tabSignup.classList.add('active');
      tabSignup.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');

      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');

      formTitle.textContent = 'Create an account';
      formSubtitle.textContent = 'Get started with your free account today';
      toggleFooterPrompt.innerHTML = `Already have an account? <a href="#" id="switch-to-login">Sign in</a>`;
      
      const newSwitch = document.getElementById('switch-to-login');
      if (newSwitch) {
        newSwitch.addEventListener('click', (e) => {
          e.preventDefault();
          showTab('login');
        });
      }
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', () => showTab('login'));
  if (tabSignup) tabSignup.addEventListener('click', () => showTab('signup'));
  if (switchToSignup) {
    switchToSignup.addEventListener('click', (e) => {
      e.preventDefault();
      showTab('signup');
    });
  }

  // --- Password Visibility Toggle ---
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const eyeOpen = button.querySelector('.eye-open');
      const eyeClosed = button.querySelector('.eye-closed');

      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.classList.add('hidden');
        if (eyeClosed) eyeClosed.classList.remove('hidden');
      } else {
        input.type = 'password';
        if (eyeOpen) eyeOpen.classList.remove('hidden');
        if (eyeClosed) eyeClosed.classList.add('hidden');
      }
    });
  });

  // --- Helper Validations ---
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    const inputWrapper = inputEl ? inputEl.closest('.input-wrapper') : null;
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    if (inputWrapper) {
      inputWrapper.classList.add('has-error');
    }
  }

  function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    const inputWrapper = inputEl ? inputEl.closest('.input-wrapper') : null;
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
    if (inputWrapper) {
      inputWrapper.classList.remove('has-error');
    }
  }

  function clearAllErrors() {
    ['login-email', 'login-password', 'signup-name', 'signup-email', 'signup-password'].forEach(clearFieldError);
  }

  [loginEmail, loginPassword, signupName, signupEmail, signupPassword].forEach(input => {
    if (input) {
      input.addEventListener('input', () => clearFieldError(input.id));
    }
  });

  // --- Alert Banners ---
  function showAlert(message, type = 'error') {
    if (!alertBanner) return;
    alertBanner.textContent = message;
    alertBanner.className = `alert ${type}`;
    alertBanner.classList.remove('hidden');
  }

  function clearAlert() {
    if (!alertBanner) return;
    alertBanner.className = 'alert hidden';
    alertBanner.textContent = '';
  }

  // --- Screen State Rendering ---
  function renderAuthenticatedState(user, token) {
    if (authFormsContainer) authFormsContainer.classList.add('hidden');
    if (tabsWrapper) tabsWrapper.classList.add('hidden');
    if (authenticatedScreen) authenticatedScreen.classList.remove('hidden');

    formTitle.textContent = 'Authentication Verified';
    formSubtitle.textContent = 'Screen 1 complete. Session is active.';

    if (displayUserName) displayUserName.textContent = user.name || 'Authenticated User';
    if (displayUserEmail) displayUserEmail.textContent = user.email || '';
    if (displayUserId) displayUserId.textContent = user.id ? `#${user.id}` : '#1';

    if (userAvatar) {
      const initial = (user.name && user.name.trim().length > 0)
        ? user.name.trim().charAt(0).toUpperCase()
        : 'U';
      userAvatar.textContent = initial;
    }
  }

  function renderUnauthenticatedState() {
    if (authFormsContainer) authFormsContainer.classList.remove('hidden');
    if (tabsWrapper) tabsWrapper.classList.remove('hidden');
    if (authenticatedScreen) authenticatedScreen.classList.add('hidden');
    showTab('login');
  }

  // --- Check Active Session on Load ---
  async function checkExistingSession() {
    const token = localStorage.getItem('finathon_jwt_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          renderAuthenticatedState(data.user, token);
          showAlert(`Welcome back, ${data.user.name}!`, 'success');
        }
      } else {
        // Token invalid or expired
        localStorage.removeItem('finathon_jwt_token');
        localStorage.removeItem('finathon_user');
      }
    } catch (err) {
      console.warn('Session check request failed:', err.message);
    }
  }

  // Run session check on load
  checkExistingSession();

  // --- Sign In Submission (Real Node/Express API) ---
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();
      clearAllErrors();

      const email = loginEmail.value.trim();
      const password = loginPassword.value;
      let hasError = false;

      if (!email) {
        setFieldError('login-email', 'Please enter your email address');
        hasError = true;
      } else if (!isValidEmail(email)) {
        setFieldError('login-email', 'Please enter a valid email address');
        hasError = true;
      }

      if (!password) {
        setFieldError('login-password', 'Please enter your password');
        hasError = true;
      }

      if (hasError) return;

      const btn = document.getElementById('login-btn');
      const btnText = btn.querySelector('.btn-text');
      const btnLoader = btn.querySelector('.btn-loader');

      btn.disabled = true;
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          showAlert(data.message || 'Invalid email or password.', 'error');
          return;
        }

        // Save session
        localStorage.setItem('finathon_jwt_token', data.token);
        localStorage.setItem('finathon_user', JSON.stringify(data.user));

        if (rememberMe && rememberMe.checked) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        showAlert(`Login successful! Welcome ${data.user.name}.`, 'success');
        renderAuthenticatedState(data.user, data.token);
      } catch (err) {
        showAlert('Cannot connect to authentication server. Please verify backend is running on ' + API_BASE_URL, 'error');
      } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
    });
  }

  // --- Sign Up Submission (Real Node/Express API) ---
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();
      clearAllErrors();

      const name = signupName.value.trim();
      const email = signupEmail.value.trim();
      const password = signupPassword.value;
      let hasError = false;

      if (!name) {
        setFieldError('signup-name', 'Please enter your full name');
        hasError = true;
      }

      if (!email) {
        setFieldError('signup-email', 'Please enter your email address');
        hasError = true;
      } else if (!isValidEmail(email)) {
        setFieldError('signup-email', 'Please enter a valid email address');
        hasError = true;
      }

      if (!password) {
        setFieldError('signup-password', 'Please enter a password');
        hasError = true;
      } else if (password.length < 8) {
        setFieldError('signup-password', 'Password must be at least 8 characters');
        hasError = true;
      }

      if (termsAgree && !termsAgree.checked) {
        showAlert('Please accept the Terms and Privacy Policy to continue.', 'error');
        hasError = true;
      }

      if (hasError) return;

      const btn = document.getElementById('signup-btn');
      const btnText = btn.querySelector('.btn-text');
      const btnLoader = btn.querySelector('.btn-loader');

      btn.disabled = true;
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          showAlert(data.message || 'Registration failed. Please check inputs.', 'error');
          return;
        }

        // Save session
        localStorage.setItem('finathon_jwt_token', data.token);
        localStorage.setItem('finathon_user', JSON.stringify(data.user));

        showAlert(`Account created successfully! Welcome ${data.user.name}.`, 'success');
        signupForm.reset();
        renderAuthenticatedState(data.user, data.token);
      } catch (err) {
        showAlert('Cannot connect to authentication server. Please verify backend is running on ' + API_BASE_URL, 'error');
      } finally {
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      }
    });
  }

  // --- Sign Out ---
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const token = localStorage.getItem('finathon_jwt_token');
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (_) {}
      }

      localStorage.removeItem('finathon_jwt_token');
      localStorage.removeItem('finathon_user');
      renderUnauthenticatedState();
      showAlert('Signed out successfully.', 'success');
    });
  }

  // --- Next Screen Button ---
  if (nextScreenBtn) {
    nextScreenBtn.addEventListener('click', () => {
      showAlert('First screen authentication verified! Ready for Screen 2 integration.', 'success');
    });
  }

  // --- Social Logins & Forgot Password Placeholders ---
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      if (email && isValidEmail(email)) {
        showAlert(`Password reset request sent for ${email}. Check server logs.`, 'success');
      } else {
        showAlert('Enter your email address in the field above to receive a reset link.', 'error');
        loginEmail.focus();
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      showAlert('Google OAuth integration can be hooked into /api/auth/oauth/google.', 'info');
    });
  }

  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      showAlert('GitHub OAuth integration can be hooked into /api/auth/oauth/github.', 'info');
    });
  }
});
