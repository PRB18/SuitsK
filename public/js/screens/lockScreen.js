/**
 * lockScreen.js — Vault initialization and unlock screen
 */
import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';

export function renderLockScreen(container) {
  const isFirstRun = state.status.firstRun;

  const wrapper = document.createElement('div');
  wrapper.className = 'lock-screen-wrapper';

  wrapper.innerHTML = `
    <div class="lock-card">
      <div class="lock-header">
        <div class="brand-monogram">KS</div>
        <h1 class="brand-title">Krishna Suits</h1>
        <p class="brand-subtitle">Bespoke Tailoring Configurator</p>
      </div>

      <div class="lock-body">
        <h2 class="lock-heading">${isFirstRun ? 'Set Vault Password' : 'Vault Locked'}</h2>
        <p class="lock-instructions">
          ${isFirstRun 
            ? 'Create a master password to encrypt your bespoke suits on this device.'
            : 'Enter your master password to access your saved suits and configurations.'}
        </p>

        <form id="lock-form" class="lock-form">
          <div class="form-group">
            <label for="password-input">Master Password</label>
            <input 
              type="password" 
              id="password-input" 
              class="form-input" 
              placeholder="${isFirstRun ? 'Choose a strong master password' : 'Enter master password'}" 
              autocomplete="current-password"
              required 
              autofocus 
            />
          </div>

          ${isFirstRun ? `
            <div class="form-group">
              <label for="confirm-input">Confirm Master Password</label>
              <input 
                type="password" 
                id="confirm-input" 
                class="form-input" 
                placeholder="Re-enter password" 
                autocomplete="new-password"
                required 
              />
            </div>
          ` : ''}

          <div id="lock-error" class="form-error" style="display: none;"></div>

          <button type="submit" id="lock-submit-btn" class="btn btn-primary btn-block">
            ${isFirstRun ? 'Initialize Encrypted Vault' : 'Unlock Vault'}
          </button>
        </form>

        <div class="lock-advisory">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="advisory-icon">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <div class="advisory-text">
            <strong>Security Notice:</strong> All data is encrypted at rest using SQLCipher (AES-256-CBC). 
            No password recovery exists. If the password is lost, saved suits cannot be recovered.
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const form = wrapper.querySelector('#lock-form');
  const passwordInput = wrapper.querySelector('#password-input');
  const confirmInput = wrapper.querySelector('#confirm-input');
  const errorEl = wrapper.querySelector('#lock-error');
  const submitBtn = wrapper.querySelector('#lock-submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    errorEl.textContent = '';

    const password = passwordInput.value.trim();
    if (!password) {
      showError('Password cannot be empty.');
      return;
    }

    if (isFirstRun) {
      const confirm = confirmInput.value.trim();
      if (password !== confirm) {
        showError('Passwords do not match. Please verify.');
        return;
      }
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = isFirstRun ? 'Creating vault...' : 'Decrypting vault...';

    try {
      if (isFirstRun) {
        await api.setup(password);
      } else {
        await api.unlock(password);
      }

      // Refresh status and load suits
      const updatedStatus = await api.getStatus();
      state.setStatus(updatedStatus);

      const suits = await api.getSuits();
      state.setSuits(suits);

      router.navigate('#dashboard');
    } catch (err) {
      showError(err.message || 'Operation failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}
