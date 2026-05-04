// ✅ Global config se URL lo
const API_URL = window.API_CONFIG.BASE;

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const logoutBtn       = document.getElementById('logoutBtn');
const addJobBtn       = document.getElementById('addJobBtn');
const jobModal        = document.getElementById('jobModal');
const closeModal      = document.getElementById('closeModal');
const cancelBtn       = document.getElementById('cancelBtn');
const jobForm         = document.getElementById('jobForm');
const modalTitle      = document.getElementById('modalTitle');
const saveJobBtn      = document.getElementById('saveJobBtn');
const saveBtnText     = document.getElementById('saveBtnText');
const saveBtnLoader   = document.getElementById('saveBtnLoader');
const jobsTableBody   = document.getElementById('jobsTableBody');
const statusFilter    = document.getElementById('statusFilter');
const appliedCount    = document.getElementById('appliedCount');
const interviewingCount = document.getElementById('interviewingCount');
const offeredCount    = document.getElementById('offeredCount');
const rejectedCount   = document.getElementById('rejectedCount');

let currentEditId = null;
let allJobs = [];

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
});

// Modal open
addJobBtn.addEventListener('click', () => {
  currentEditId = null;
  modalTitle.textContent = 'Add New Job';
  saveBtnText.textContent = 'Save Job';
  jobForm.reset();
  jobModal.classList.add('show');
});

// Modal close
const closeJobModal = () => jobModal.classList.remove('show');
closeModal?.addEventListener('click', closeJobModal);
cancelBtn?.addEventListener('click', closeJobModal);
jobModal.addEventListener('click', (e) => { if (e.target === jobModal) closeJobModal(); });

// Job save (add or update)
jobForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const company        = document.getElementById('company').value.trim();
  const position       = document.getElementById('position').value.trim();
  const jobDescription = document.getElementById('jobDescription').value.trim();
  const status         = document.getElementById('status').value;
  const notes          = document.getElementById('notes').value.trim();

  if (!company || !position) return alert('Company and position are required');

  saveJobBtn.disabled = true;
  saveBtnText.style.display = 'none';
  saveBtnLoader.style.display = 'block';

  try {
    const payload = { company, position, jobDescription, status, notes };

    if (currentEditId) {
      await axios.put(`${API_URL}/jobs/${currentEditId}`, payload);
    } else {
      await axios.post(`${API_URL}/jobs`, payload);
    }

    closeJobModal();
    loadJobs();
  } catch (error) {
    const msg = error.response?.data?.message || error.message || 'Failed to save job';
    if (error.response?.status === 401) {
      alert('Session expired. Please login again.');
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    } else {
      alert('Error: ' + msg);
    }
  } finally {
    saveJobBtn.disabled = false;
    saveBtnText.style.display = 'block';
    saveBtnLoader.style.display = 'none';
  }
});

// Jobs load karo
async function loadJobs() {
  try {
    const response = await axios.get(`${API_URL}/jobs`);
    allJobs = response.data;
    updateStats(allJobs);
    displayJobs(allJobs);
  } catch (error) {
    if (error.response?.status === 401) {
      alert('Session expired. Please login again.');
      localStorage.removeItem('token');
      window.location.href = 'index.html';
    } else {
      jobsTableBody.innerHTML = `
        <tr class="empty-state">
          <td colspan="6">
            <div class="empty-message">
              <p style="color:var(--danger);">Failed to load jobs. Please refresh.</p>
            </div>
          </td>
        </tr>`;
    }
  }
}

// Stats update karo
function updateStats(jobs) {
  const stats = { Applied: 0, Interviewing: 0, Offered: 0, Rejected: 0 };
  jobs.forEach(j => { if (stats[j.status] !== undefined) stats[j.status]++; });
  appliedCount.textContent    = stats.Applied;
  interviewingCount.textContent = stats.Interviewing;
  offeredCount.textContent    = stats.Offered;
  rejectedCount.textContent   = stats.Rejected;
}

// Table mein jobs dikhao
function displayJobs(jobs) {
  if (jobs.length === 0) {
    jobsTableBody.innerHTML = `
      <tr class="empty-state">
        <td colspan="6">
          <div class="empty-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No job applications yet</p>
            <button class="btn-secondary" onclick="document.getElementById('addJobBtn').click()">Add Your First Job</button>
          </div>
        </td>
      </tr>`;
    return;
  }

  jobsTableBody.innerHTML = jobs.map(job => `
    <tr>
      <td data-label="Company"><strong>${escHtml(job.company)}</strong></td>
      <td data-label="Position">${escHtml(job.position)}</td>
      <td data-label="Status"><span class="status-badge status-${job.status.toLowerCase()}">${job.status}</span></td>
      <td data-label="Date">${new Date(job.createdAt).toLocaleDateString()}</td>
      <td data-label="Notes">${job.notes ? escHtml(job.notes.substring(0, 50)) + (job.notes.length > 50 ? '…' : '') : '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit" onclick="editJob('${job._id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon delete" onclick="deleteJob('${job._id}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// XSS se bacho
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Edit job
window.editJob = (id) => {
  const job = allJobs.find(j => j._id === id);
  if (!job) return;

  currentEditId = id;
  modalTitle.textContent = 'Edit Job';
  saveBtnText.textContent = 'Update Job';

  document.getElementById('company').value        = job.company || '';
  document.getElementById('position').value        = job.position || '';
  document.getElementById('jobDescription').value  = job.jobDescription || '';
  document.getElementById('status').value          = job.status || 'Applied';
  document.getElementById('notes').value           = job.notes || '';

  jobModal.classList.add('show');
};

// Delete job
window.deleteJob = async (id) => {
  if (!confirm('Are you sure you want to delete this job application?')) return;

  try {
    await axios.delete(`${API_URL}/jobs/${id}`);
    loadJobs();
  } catch (error) {
    const msg = error.response?.data?.message || error.message || 'Failed to delete';
    alert('Error: ' + msg);
  }
};

// Status filter
statusFilter?.addEventListener('change', (e) => {
  const val = e.target.value;
  displayJobs(val === 'all' ? allJobs : allJobs.filter(j => j.status === val));
});

// Page load par jobs lo
loadJobs();
