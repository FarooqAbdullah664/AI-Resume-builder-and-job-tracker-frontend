/* =============================================
   RESUMEAI — SHARED UI UTILITIES
   Scroll progress, hamburger menu, toasts,
   scroll reveal
   ============================================= */

(function () {

  // ── SCROLL PROGRESS BAR ─────────────────────
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);

  window.addEventListener('scroll', () => {
    const scrolled = document.documentElement.scrollTop;
    const total    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
  }, { passive: true });

  // ── TOAST SYSTEM ────────────────────────────
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  window.showToast = function (msg, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: '💡' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '💡'}</span><span>${msg}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  };

  // ── HAMBURGER MOBILE MENU ───────────────────
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const navContainer = navbar.querySelector('.nav-container');
    const navLinks     = navbar.querySelector('.nav-links');

    if (navLinks && navContainer) {
      // Create hamburger button
      const hamburger = document.createElement('button');
      hamburger.className = 'nav-hamburger';
      hamburger.setAttribute('aria-label', 'Toggle menu');
      hamburger.innerHTML = '<span></span><span></span><span></span>';
      navContainer.appendChild(hamburger);

      // Create mobile drawer
      const drawer = document.createElement('div');
      drawer.className = 'nav-drawer';
      // Clone nav links into drawer
      navLinks.querySelectorAll('.nav-link').forEach(link => {
        const clone = link.cloneNode(true);
        drawer.appendChild(clone);
      });
      navbar.appendChild(drawer);

      // Toggle
      hamburger.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
      });

      // Close on link click
      drawer.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          drawer.classList.remove('open');
          hamburger.classList.remove('open');
        });
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) {
          drawer.classList.remove('open');
          hamburger.classList.remove('open');
        }
      });
    }
  }

  // ── SCROLL REVEAL ───────────────────────────
  const revealEls = document.querySelectorAll('.card, .stat-card, .history-item');
  revealEls.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  revealEls.forEach(el => observer.observe(el));

  // ── TYPEWRITER CURSOR ───────────────────────
  // Add .typing class while typewriter is running
  const improvedContent = document.getElementById('improvedContent');
  if (improvedContent) {
    const origTypeWriter = window.typeWriter;
    // Patch: add cursor class during typing
    const mo = new MutationObserver(() => {
      if (improvedContent.textContent.length > 0) {
        improvedContent.classList.add('typing');
      }
    });
    mo.observe(improvedContent, { childList: true, characterData: true, subtree: true });

    // Remove cursor when done (after 30s max)
    setTimeout(() => improvedContent.classList.remove('typing'), 30000);
  }

  // ── BUTTON RIPPLE ───────────────────────────
  document.querySelectorAll('.btn-primary, .dl-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect   = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position:absolute;
        width:20px; height:20px;
        background:rgba(255,255,255,0.3);
        border-radius:50%;
        top:${e.clientY - rect.top - 10}px;
        left:${e.clientX - rect.left - 10}px;
        pointer-events:none;
        animation: ripple 0.5s ease-out forwards;
      `;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // ── PAGE LOAD COMPLETE ──────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '1';
  });

})();
