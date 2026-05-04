// ✅ Global config se URL lo
const API_URL = window.API_CONFIG.BASE;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

// Axios default header set karo
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const userNameEl   = document.getElementById('userName');
const logoutBtn    = document.getElementById('logoutBtn');
const resumeCount  = document.getElementById('resumeCount');
const jobCount     = document.getElementById('jobCount');
const recentResumes = document.getElementById('recentResumes');
const recentJobs   = document.getElementById('recentJobs');

// User ka naam dikhao
const storedName = localStorage.getItem('userName');
if (storedName && userNameEl) userNameEl.textContent = `Welcome, ${storedName}!`;

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
});

// Dashboard data load karo
async function loadDashboardData() {
  try {
    const [resumes, jobs] = await Promise.allSettled([
      axios.get(`${API_URL}/resume`),
      axios.get(`${API_URL}/jobs`)
    ]);

    // Resumes
    if (resumes.status === 'fulfilled') {
      const data = resumes.value.data;
      resumeCount.textContent = `${data.length} resume${data.length !== 1 ? 's' : ''} analyzed`;
      if (data.length > 0) displayRecentResumes(data.slice(0, 3));
    }

    // Jobs
    if (jobs.status === 'fulfilled') {
      const data = jobs.value.data;
      jobCount.textContent = `${data.length} application${data.length !== 1 ? 's' : ''} tracked`;
      if (data.length > 0) displayRecentJobs(data.slice(0, 3));
    }

  } catch (error) {
    console.error('Dashboard load error:', error);
    // 401 hone par logout karo
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    }
  }
}

function displayRecentResumes(resumes) {
  recentResumes.innerHTML = resumes.map(r => `
    <div class="activity-item">
      <span class="activity-text">Resume analyzed — Score: <strong>${r.aiScore || 'N/A'}</strong> | ATS: <strong>${r.atsScore || 'N/A'}</strong></span>
      <span class="activity-date">${new Date(r.createdAt).toLocaleDateString()}</span>
    </div>
  `).join('');
}

function displayRecentJobs(jobs) {
  recentJobs.innerHTML = jobs.map(j => `
    <div class="activity-item">
      <span class="activity-text">${j.position} at <strong>${j.company}</strong> — <span class="status-badge status-${j.status.toLowerCase()}">${j.status}</span></span>
      <span class="activity-date">${new Date(j.createdAt).toLocaleDateString()}</span>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadDashboardData);
