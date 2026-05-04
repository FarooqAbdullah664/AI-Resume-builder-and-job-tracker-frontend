// ✅ Global config se URL lo — sirf config.js mein change karo
const API_URL = window.API_CONFIG.BASE;

let isLogin = true;

const formTitle    = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const nameGroup    = document.getElementById('nameGroup');
const authForm     = document.getElementById('authForm');
const toggleText   = document.getElementById('toggleText');
const submitBtn    = document.getElementById('submitBtn');
const btnText      = document.getElementById('btnText');
const btnLoader    = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// ✅ FIX: Token validate karo — sirf valid token pe redirect karo
async function checkExistingToken() {
  const token = localStorage.getItem('token');
  if (!token) return; // No token — stay on login page

  try {
    // Token verify karo backend se
    const res = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      window.location.href = 'dashboard.html';
    } else {
      // Token invalid/expired — clear karo
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
    }
  } catch (err) {
    // Network error — token check skip karo, login page pe raho
    // Agar token hai toh dashboard pe jaane do
    window.location.href = 'dashboard.html';
  }
}

checkExistingToken();

// Login / Register toggle
document.getElementById('toggleText').addEventListener('click', (e) => {
  if (e.target.id !== 'toggleLink') return;
  e.preventDefault();
  isLogin = !isLogin;
  hideMessages();

  if (isLogin) {
    formTitle.textContent = 'Welcome Back';
    formSubtitle.textContent = 'Sign in to continue to your account';
    nameGroup.style.display = 'none';
    btnText.textContent = 'Sign In';
    toggleText.innerHTML = `Don't have an account? <a href="#" id="toggleLink">Sign Up</a>`;
  } else {
    formTitle.textContent = 'Create Account';
    formSubtitle.textContent = 'Sign up to get started';
    nameGroup.style.display = 'block';
    btnText.textContent = 'Sign Up';
    toggleText.innerHTML = `Already have an account? <a href="#" id="toggleLink">Sign In</a>`;
  }
});

// Form submit
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();

  const name     = document.getElementById('name')?.value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  if (!email || !password) return showError('Please fill in all required fields');
  if (!isLogin && !name)   return showError('Please enter your full name');
  if (password.length < 6) return showError('Password must be at least 6 characters');

  // Loading state
  submitBtn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline-block';

  try {
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body     = isLogin ? { email, password } : { name, email, password };

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Request failed');

    if (isLogin) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.name || 'User');
      showSuccess('Login successful! Redirecting...');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      showSuccess('Account created! Please sign in.');
      setTimeout(() => {
        // Login form par switch karo
        isLogin = true;
        formTitle.textContent = 'Welcome Back';
        formSubtitle.textContent = 'Sign in to continue to your account';
        nameGroup.style.display = 'none';
        btnText.textContent = 'Sign In';
        toggleText.innerHTML = `Don't have an account? <a href="#" id="toggleLink">Sign Up</a>`;
        authForm.reset();
        hideMessages();
      }, 1500);
    }
  } catch (error) {
    showError(error.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
});

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');
}
function showSuccess(msg) {
  successMessage.textContent = msg;
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
}
function hideMessages() {
  errorMessage.classList.remove('show');
  successMessage.classList.remove('show');
}
