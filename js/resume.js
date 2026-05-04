// ── PART 1: SETUP ────────────────────────────
const API_URL = window.API_CONFIG.BASE;
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const resumeForm        = document.getElementById('resumeForm');
const resumeText        = document.getElementById('resumeText');
const analyzeBtn        = document.getElementById('analyzeBtn');
const analyzeBtnText    = document.getElementById('analyzeBtnText');
const analyzeBtnLoader  = document.getElementById('analyzeBtnLoader');
const resultsSection    = document.getElementById('resultsSection');
const resumeScore       = document.getElementById('resumeScore');
const atsScore          = document.getElementById('atsScore');
const resumeScoreFill   = document.getElementById('resumeScoreFill');
const atsScoreFill      = document.getElementById('atsScoreFill');
const suggestionsList   = document.getElementById('suggestionsList');
const improvedContent   = document.getElementById('improvedContent');
const historyList       = document.getElementById('historyList');
const logoutBtn         = document.getElementById('logoutBtn');
const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');

let currentResumeData = null;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const uName   = localStorage.getItem('userName') || 'User';
const uInitEl = document.getElementById('userInitial');
const uNameEl = document.getElementById('userName');
if (uInitEl) uInitEl.textContent = uName.charAt(0).toUpperCase();
if (uNameEl)  uNameEl.textContent = uName;

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
});

// ── TABS ─────────────────────────────────────
window.switchTab = function(tab) {
  document.getElementById('tabText').classList.toggle('active', tab === 'text');
  document.getElementById('tabPdf').classList.toggle('active',  tab === 'pdf');
  document.getElementById('panelText').style.display = tab === 'text' ? 'block' : 'none';
  document.getElementById('panelPdf').style.display  = tab === 'pdf'  ? 'block' : 'none';
};

// ── PDF UPLOAD ────────────────────────────────
window.handlePdfUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') { showPdfStatus('Sirf PDF files allowed hain', 'error'); return; }
  showPdfStatus('PDF se text extract ho raha hai...', 'loading');
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(it => it.str).join(' ') + '\n';
    }
    fullText = fullText.trim();
    if (!fullText || fullText.length < 50) { showPdfStatus('PDF se text extract nahi hua.', 'error'); return; }
    resumeText.value = fullText;
    document.getElementById('pdfPreview').style.display = 'block';
    document.getElementById('pdfPreviewText').textContent = fullText.substring(0, 500) + (fullText.length > 500 ? '...' : '');
    showPdfStatus(`${pdf.numPages} page(s) se ${fullText.length} characters extract hue`, 'success');
    showToast('PDF successfully read! Ab Analyze karo.', 'success');
  } catch (err) { showPdfStatus('PDF read karne mein error. Dobara try karo.', 'error'); }
};

function showPdfStatus(msg, type) {
  const el = document.getElementById('pdfStatus');
  el.style.display = 'block'; el.textContent = msg;
  el.className = 'pdf-status pdf-status-' + type;
}

window.clearPdf = function() {
  document.getElementById('pdfFileInput').value = '';
  document.getElementById('pdfPreview').style.display = 'none';
  document.getElementById('pdfStatus').style.display  = 'none';
  resumeText.value = '';
};

document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('pdfDropZone');
  if (!dz) return;
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handlePdfUpload({ target: { files: e.dataTransfer.files } });
  });
});

// ── ANALYZE ───────────────────────────────────
resumeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = resumeText.value.trim();
  if (!text) return alert('Resume text daalo ya PDF upload karo');
  if (text.length < 50) return alert('Resume text bahut chhota hai.');

  analyzeBtn.disabled = true;
  analyzeBtnText.style.display   = 'none';
  analyzeBtnLoader.style.display = 'block';
  resultsSection.style.display   = 'none';

  try {
    const res = await axios.post(`${API_URL}/resume/analyze`, { resumeText: text });
    currentResumeData = res.data;
    displayResults(res.data);
    loadHistory();
    showToast('Resume analyzed successfully!', 'success');
    setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 300);
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Analysis failed';
    if (err.response?.status === 401) {
      showToast('Session expire ho gayi. Dobara login karo.', 'error');
      localStorage.removeItem('token'); window.location.href = 'index.html';
    } else { showToast('Error: ' + msg, 'error'); }
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtnText.style.display   = 'flex';
    analyzeBtnLoader.style.display = 'none';
  }
});

// ── DISPLAY RESULTS ───────────────────────────
function displayResults(data) {
  currentResumeData = data;
  resultsSection.style.display = 'block';
  resultsSection.classList.add('show');
  resumeScore.textContent = '0'; atsScore.textContent = '0';
  resumeScoreFill.style.width = '0%'; atsScoreFill.style.width = '0%';
  setTimeout(() => {
    animateScore(resumeScore, data.aiScore || 0);
    animateScore(atsScore,    data.atsScore || 0);
    resumeScoreFill.style.width = `${data.aiScore  || 0}%`;
    atsScoreFill.style.width    = `${data.atsScore || 0}%`;
  }, 300);
  suggestionsList.innerHTML = '';
  const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];
  if (sugs.length > 0) {
    sugs.forEach((s, i) => setTimeout(() => {
      const li = document.createElement('li');
      li.textContent = s; li.style.opacity = '0'; li.style.transform = 'translateX(-20px)';
      suggestionsList.appendChild(li);
      setTimeout(() => { li.style.transition = 'all 0.3s ease'; li.style.opacity = '1'; li.style.transform = 'translateX(0)'; }, 50);
    }, i * 100));
  } else {
    const li = document.createElement('li'); li.textContent = 'No suggestions available';
    suggestionsList.appendChild(li);
  }
  improvedContent.textContent = '';
  typeWriter(improvedContent, data.aiImprovedText || 'No improved version available', 6);
}

function animateScore(el, target) {
  let cur = 0; const step = target / 40;
  const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = Math.round(cur); }, 40);
}
function typeWriter(el, text, speed = 6) {
  let i = 0; el.textContent = '';
  function type() { if (i < text.length) { el.textContent += text.charAt(i++); setTimeout(type, speed); } }
  setTimeout(type, 300);
}

// ══════════════════════════════════════════════
//  SMART TEXT PARSER
//  aiImprovedText se structured CV banata hai
// ══════════════════════════════════════════════
function parseResumeText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const cv = {
    name: '', title: '',
    contact: { email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '', experience: [], education: [], skills: [], certifications: []
  };

  // Email, phone, linkedin, github extract karo
  const emailMatch    = rawText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  const phoneMatch    = rawText.match(/(\+?\d[\d\s\-().]{8,15}\d)/);
  const linkedinMatch = rawText.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch   = rawText.match(/github\.com\/[\w-]+/i);

  if (emailMatch)    cv.contact.email    = emailMatch[0];
  if (phoneMatch)    cv.contact.phone    = phoneMatch[0].trim();
  if (linkedinMatch) cv.contact.linkedin = linkedinMatch[0];
  if (githubMatch)   cv.contact.github   = githubMatch[0];

  // Name = first non-empty line (jo email/phone nahi)
  for (const line of lines) {
    if (!line.match(/[@|•\-]/)) { cv.name = line; break; }
  }

  // Section headings detect karo
  const SECTION_RE = /^(SUMMARY|OBJECTIVE|PROFILE|ABOUT|EXPERIENCE|WORK|EMPLOYMENT|EDUCATION|SKILLS|TECHNOLOGIES|CERTIFICATIONS?|AWARDS?|PROJECTS?|LANGUAGES?|CONTACT|REFERENCES?)/i;

  let currentSection = '';
  let currentExp = null;
  let summaryLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const secMatch = line.match(SECTION_RE);

    if (secMatch) {
      // Save previous experience entry
      if (currentExp) { cv.experience.push(currentExp); currentExp = null; }
      currentSection = secMatch[1].toUpperCase();
      continue;
    }

    // Skip contact lines in body
    if (line.match(/[@|linkedin|github]/i) && line.length < 80) continue;

    if (currentSection.match(/SUMMARY|OBJECTIVE|PROFILE|ABOUT/)) {
      summaryLines.push(line);

    } else if (currentSection.match(/EXPERIENCE|WORK|EMPLOYMENT/)) {
      // Detect job entry: line with year or company pattern
      const isJobTitle = line.match(/\b(20\d\d|19\d\d|present|current)\b/i) ||
                         (line.length < 80 && !line.startsWith('•') && !line.startsWith('-') && i < lines.length - 1);
      if (isJobTitle && !line.startsWith('•') && !line.startsWith('-')) {
        if (currentExp) cv.experience.push(currentExp);
        // Try to split "Role at Company | Duration" or "Role — Company (2020-2023)"
        const parts = line.split(/\s+(?:at|@|—|-{1,2}|\|)\s+/i);
        currentExp = {
          role:     parts[0] || line,
          company:  parts[1] ? parts[1].replace(/\(.*?\)/g,'').trim() : '',
          duration: (line.match(/\(?(20\d\d|19\d\d)[^)]*\)?/i) || [''])[0].replace(/[()]/g,'').trim(),
          points:   []
        };
      } else if (currentExp && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
        currentExp.points.push(line.replace(/^[•\-*]\s*/, ''));
      } else if (currentExp && line.length > 20) {
        currentExp.points.push(line);
      }

    } else if (currentSection.match(/EDUCATION/)) {
      if (!line.startsWith('•') && !line.startsWith('-')) {
        const yearMatch = line.match(/\b(20\d\d|19\d\d)\b/);
        cv.education.push({
          degree:      line.replace(/\b(20\d\d|19\d\d)\b.*/, '').trim(),
          institution: lines[i+1] && !lines[i+1].match(SECTION_RE) ? lines[i+1] : '',
          year:        yearMatch ? yearMatch[0] : ''
        });
        if (lines[i+1] && !lines[i+1].match(SECTION_RE)) i++; // skip institution line
      }

    } else if (currentSection.match(/SKILLS|TECHNOLOGIES/)) {
      // Skills can be comma-separated or bullet points
      const skillLine = line.replace(/^[•\-*]\s*/, '');
      const parts = skillLine.split(/[,|•\/]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
      cv.skills.push(...parts);

    } else if (currentSection.match(/CERTIF/)) {
      cv.certifications.push(line.replace(/^[•\-*]\s*/, ''));
    }
  }

  // Push last experience
  if (currentExp) cv.experience.push(currentExp);

  cv.summary = summaryLines.join(' ').trim();

  // Deduplicate skills
  cv.skills = [...new Set(cv.skills)].slice(0, 20);

  // Title = second line if short and not contact info
  if (!cv.title) {
    for (let i = 1; i < Math.min(5, lines.length); i++) {
      const l = lines[i];
      if (l !== cv.name && l.length < 60 && !l.match(/[@\d|•]/)) {
        cv.title = l; break;
      }
    }
  }

  return cv;
}

// ══════════════════════════════════════════════
//  PDF DOWNLOAD ENGINE
// ══════════════════════════════════════════════
window.downloadResume = function(style) {
  if (!currentResumeData) { showToast('Pehle resume analyze karo.', 'error'); return; }
  const cv  = getCVData(currentResumeData);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const builders = { classic: buildClassic, modern: buildModern, minimal: buildMinimal, executive: buildExecutive, creative: buildCreative };
  (builders[style] || buildClassic)(doc, cv);
  const fname = (cv.name || 'resume').replace(/\s+/g, '-').toLowerCase();
  doc.save(`${fname}-${style}.pdf`);
  showToast(`${style.charAt(0).toUpperCase()+style.slice(1)} style PDF download ho rahi hai!`, 'success');
};

// ── PDF HELPERS ───────────────────────────────
const PW = 210, PH = 297;

function txt(doc, text, x, y, maxW, lh) {
  if (!text) return y;
  const wrapped = doc.splitTextToSize(String(text), maxW);
  doc.text(wrapped, x, y);
  return y + wrapped.length * lh;
}

function secHead(doc, label, x, y, maxW, textRGB, lineRGB) {
  if (y > PH - 30) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textRGB);
  doc.text(label.toUpperCase(), x, y);
  doc.setDrawColor(...lineRGB);
  doc.setLineWidth(0.5);
  doc.line(x, y + 1.8, x + maxW, y + 1.8);
  return y + 8;
}

function contactRow(doc, c, x, y, maxW, rgb) {
  const parts = [c.email, c.phone, c.location, c.linkedin, c.github].filter(Boolean);
  if (!parts.length) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...rgb);
  const wrapped = doc.splitTextToSize(parts.join('   |   '), maxW);
  doc.text(wrapped, x, y);
  return y + wrapped.length * 4.8 + 2;
}

function expBlock(doc, exp, x, y, maxW, roleRGB, bodyRGB) {
  if (!exp || !exp.length) return y;
  exp.forEach(e => {
    if (y > PH - 28) { doc.addPage(); y = 18; }
    // Role
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...roleRGB);
    y = txt(doc, e.role || '', x, y, maxW, 5.5);
    // Company + duration
    const sub = [e.company, e.duration].filter(Boolean).join('   |   ');
    if (sub) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...bodyRGB);
      y = txt(doc, sub, x, y, maxW, 5); y += 1;
    }
    // Bullet points
    (e.points || []).forEach(pt => {
      if (y > PH - 18) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...bodyRGB);
      y = txt(doc, '\u2022  ' + pt, x + 2, y, maxW - 2, 5); y += 0.5;
    });
    y += 4;
  });
  return y;
}

function eduBlock(doc, edu, x, y, maxW, degRGB, subRGB) {
  if (!edu || !edu.length) return y;
  edu.forEach(e => {
    if (y > PH - 22) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...degRGB);
    y = txt(doc, e.degree || '', x, y, maxW, 5.5);
    const sub = [e.institution, e.year].filter(Boolean).join('   |   ');
    if (sub) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...subRGB);
      y = txt(doc, sub, x, y, maxW, 5); y += 1;
    }
    y += 3;
  });
  return y;
}

function skillsRow(doc, skills, x, y, maxW, rgb) {
  if (!skills || !skills.length) return y;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...rgb);
  return txt(doc, skills.join('   \u2022   '), x, y, maxW, 5.5) + 3;
}

function certsBlock(doc, certs, x, y, maxW, rgb) {
  if (!certs || !certs.length) return y;
  certs.forEach(c => {
    if (y > PH - 18) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...rgb);
    y = txt(doc, '\u2022  ' + c, x + 2, y, maxW - 2, 5); y += 1;
  });
  return y + 2;
}

// ── RAW TEXT RENDERER ─────────────────────────
// Jab structured parse fail ho — aiImprovedText ko
// directly PDF mein render karo with smart formatting
function renderRawText(doc, rawText, x, y, maxW, headRGB, bodyRGB) {
  const SECTION_RE = /^(SUMMARY|OBJECTIVE|PROFILE|EXPERIENCE|WORK|EDUCATION|SKILLS|CERTIF|PROJECTS?|LANGUAGES?|AWARDS?|CONTACT|REFERENCES?)/i;
  const lines = rawText.split('\n');

  lines.forEach(line => {
    if (y > PH - 18) { doc.addPage(); y = 18; }
    const trimmed = line.trim();
    if (!trimmed) { y += 3; return; }

    if (SECTION_RE.test(trimmed) && trimmed.length < 50) {
      // Section heading
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...headRGB);
      doc.text(trimmed.toUpperCase(), x, y);
      doc.setDrawColor(...headRGB);
      doc.setLineWidth(0.4);
      doc.line(x, y + 1.5, x + maxW, y + 1.5);
      y += 8;
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      // Bullet point
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...bodyRGB);
      const bullet = '\u2022  ' + trimmed.replace(/^[•\-*]\s*/, '');
      y = txt(doc, bullet, x + 3, y, maxW - 3, 5);
      y += 1;
    } else if (trimmed.length < 60 && !trimmed.includes('@') && !trimmed.match(/^\d/) &&
               trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
      // ALL CAPS short line = likely a name or heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...headRGB);
      y = txt(doc, trimmed, x, y, maxW, 6);
      y += 2;
    } else {
      // Normal text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...bodyRGB);
      y = txt(doc, trimmed, x, y, maxW, 5.5);
      y += 1;
    }
  });
  return y;
}

// ══════════════════════════════════════════════
//  STYLE 1 — CLASSIC
// ══════════════════════════════════════════════
function buildClassic(doc, cv) {
  const M = 18, TW = PW - M * 2;
  const BLK = [20,20,20], GRY = [70,70,70], LGT = [110,110,110];

  // Dark header bar
  doc.setFillColor(28, 28, 35); doc.rect(0, 0, PW, 34, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(22);
  doc.text(cv.name || 'Your Name', M, 17);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(180,180,200);
  doc.text(cv.title || '', M, 26);

  let y = 40;
  y = contactRow(doc, cv.contact || {}, M, y, TW, LGT);
  y += 4;
  doc.setDrawColor(220,220,220); doc.setLineWidth(0.3); doc.line(M, y, PW-M, y); y += 6;

  // ── Raw text fallback ──
  if (cv._rawText) {
    y = renderRawText(doc, cv._rawText, M, y, TW, BLK, GRY);
    return;
  }

  if (cv.summary) {
    y = secHead(doc, 'Professional Summary', M, y, TW, BLK, BLK);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRY);
    y = txt(doc, cv.summary, M, y, TW, 5.5); y += 7;
  }
  if (cv.experience && cv.experience.length) {
    y = secHead(doc, 'Work Experience', M, y, TW, BLK, BLK);
    y = expBlock(doc, cv.experience, M, y, TW, BLK, GRY);
  }
  if (cv.education && cv.education.length) {
    y = secHead(doc, 'Education', M, y, TW, BLK, BLK);
    y = eduBlock(doc, cv.education, M, y, TW, BLK, GRY);
  }
  if (cv.skills && cv.skills.length) {
    y = secHead(doc, 'Skills', M, y, TW, BLK, BLK);
    y = skillsRow(doc, cv.skills, M, y, TW, GRY);
  }
  if (cv.certifications && cv.certifications.length) {
    y = secHead(doc, 'Certifications', M, y, TW, BLK, BLK);
    y = certsBlock(doc, cv.certifications, M, y, TW, GRY);
  }
}

// ══════════════════════════════════════════════
//  STYLE 2 — MODERN (Blue sidebar)
// ══════════════════════════════════════════════
function buildModern(doc, cv) {
  const SB = 60, MX = SB + 10, TW = PW - MX - 10;
  const BLUE = [25,75,190], LBLUE = [180,210,255], WHITE = [255,255,255];
  const BLK = [20,20,20], GRY = [60,60,60];

  // Sidebar background
  doc.setFillColor(...BLUE); doc.rect(0, 0, SB, PH, 'F');

  // Sidebar — Name
  doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(14);
  const nLines = doc.splitTextToSize(cv.name || 'Your Name', SB - 14);
  doc.text(nLines, 7, 20);
  let sy = 20 + nLines.length * 7 + 2;

  // Sidebar — Title
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...LBLUE);
  const tLines = doc.splitTextToSize(cv.title || '', SB - 14);
  doc.text(tLines, 7, sy); sy += tLines.length * 5 + 8;

  // Sidebar divider
  doc.setDrawColor(255,255,255); doc.setLineWidth(0.3); doc.line(7, sy-3, SB-7, sy-3);

  // Sidebar — Contact
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
  doc.text('CONTACT', 7, sy); sy += 6;
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...LBLUE);
  const c = cv.contact || {};
  [c.email, c.phone, c.location, c.linkedin, c.github].filter(Boolean).forEach(v => {
    if (sy > PH - 10) return;
    const vl = doc.splitTextToSize(v, SB - 14);
    doc.text(vl, 7, sy); sy += vl.length * 4.5 + 1.5;
  });
  sy += 6;

  // Sidebar — Skills
  if (cv.skills && cv.skills.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
    doc.text('SKILLS', 7, sy); sy += 6;
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...LBLUE);
    cv.skills.slice(0, 16).forEach(sk => {
      if (sy > PH - 10) return;
      doc.text('\u2022  ' + sk, 7, sy); sy += 5;
    });
  }

  // Main content
  let y = 18;
  if (cv._rawText) {
    y = renderRawText(doc, cv._rawText, MX, y, TW, BLUE, GRY);
    return;
  }
  if (cv.summary) {
    y = secHead(doc, 'Summary', MX, y, TW, BLUE, BLUE);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...GRY);
    y = txt(doc, cv.summary, MX, y, TW, 5.5); y += 7;
  }
  if (cv.experience && cv.experience.length) {
    y = secHead(doc, 'Experience', MX, y, TW, BLUE, BLUE);
    y = expBlock(doc, cv.experience, MX, y, TW, BLUE, GRY);
  }
  if (cv.education && cv.education.length) {
    y = secHead(doc, 'Education', MX, y, TW, BLUE, BLUE);
    y = eduBlock(doc, cv.education, MX, y, TW, BLUE, GRY);
  }
  if (cv.certifications && cv.certifications.length) {
    y = secHead(doc, 'Certifications', MX, y, TW, BLUE, BLUE);
    y = certsBlock(doc, cv.certifications, MX, y, TW, GRY);
  }
}

// ══════════════════════════════════════════════
//  STYLE 3 — MINIMAL
// ══════════════════════════════════════════════
function buildMinimal(doc, cv) {
  const M = 24, TW = PW - M * 2;
  const BLK = [15,15,15], MID = [80,80,80], LGT = [130,130,130];

  // Top accent
  doc.setFillColor(60,60,60); doc.rect(0, 0, PW, 2, 'F');

  // Centered name
  doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(...BLK);
  doc.text(cv.name || 'Your Name', PW/2, 20, { align: 'center' });
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(...MID);
  doc.text(cv.title || '', PW/2, 28, { align: 'center' });

  let y = 34;
  // Contact centered
  const c = cv.contact || {};
  const cParts = [c.email, c.phone, c.location].filter(Boolean);
  if (cParts.length) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...LGT);
    const cl = doc.splitTextToSize(cParts.join('   |   '), TW);
    doc.text(cl, PW/2, y, { align: 'center' }); y += cl.length * 4.5 + 2;
  }
  if (c.linkedin || c.github) {
    const row2 = [c.linkedin, c.github].filter(Boolean).join('   |   ');
    doc.setFontSize(8); doc.setTextColor(...LGT);
    doc.text(row2, PW/2, y, { align: 'center' }); y += 5;
  }
  y += 4;
  doc.setDrawColor(200,200,200); doc.setLineWidth(0.3); doc.line(M, y, PW-M, y); y += 7;

  if (cv._rawText) {
    y = renderRawText(doc, cv._rawText, M, y, TW, BLK, MID);
    return;
  }

  if (cv.summary) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...LGT);
    doc.text('SUMMARY', M, y); y += 5;
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...MID);
    y = txt(doc, cv.summary, M, y, TW, 5.5); y += 7;
  }
  if (cv.experience && cv.experience.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...LGT);
    doc.text('EXPERIENCE', M, y); y += 5;
    y = expBlock(doc, cv.experience, M, y, TW, BLK, MID);
  }
  if (cv.education && cv.education.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...LGT);
    doc.text('EDUCATION', M, y); y += 5;
    y = eduBlock(doc, cv.education, M, y, TW, BLK, MID);
  }
  if (cv.skills && cv.skills.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...LGT);
    doc.text('SKILLS', M, y); y += 5;
    y = skillsRow(doc, cv.skills, M, y, TW, MID);
  }
  if (cv.certifications && cv.certifications.length) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...LGT);
    doc.text('CERTIFICATIONS', M, y); y += 5;
    y = certsBlock(doc, cv.certifications, M, y, TW, MID);
  }
}

// ══════════════════════════════════════════════
//  STYLE 4 — EXECUTIVE (Dark + Gold)
// ══════════════════════════════════════════════
function buildExecutive(doc, cv) {
  const M = 16, TW = PW - M * 2;
  const GOLD=[185,145,55], WHITE=[245,245,245], SILVER=[175,185,205], DARK=[15,22,40];

  // Full dark background
  doc.setFillColor(...DARK); doc.rect(0, 0, PW, PH, 'F');

  // Gold header
  doc.setFillColor(...GOLD); doc.rect(0, 0, PW, 32, 'F');
  doc.setTextColor(...DARK);
  doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text(cv.name || 'Your Name', M, 16);
  doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
  doc.text(cv.title || '', M, 25);

  let y = 40;
  // Contact
  const c = cv.contact || {};
  const cParts = [c.email, c.phone, c.location, c.linkedin, c.github].filter(Boolean);
  if (cParts.length) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...SILVER);
    const cl = doc.splitTextToSize(cParts.join('   |   '), TW);
    doc.text(cl, M, y); y += cl.length * 4.8 + 4;
  }
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.6); doc.line(M, y, PW-M, y); y += 7;

  if (cv._rawText) {
    y = renderRawText(doc, cv._rawText, M, y, TW, GOLD, SILVER);
    return;
  }

  if (cv.summary) {
    y = secHead(doc, 'Executive Summary', M, y, TW, GOLD, GOLD);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...SILVER);
    y = txt(doc, cv.summary, M, y, TW, 5.5); y += 7;
  }
  if (cv.experience && cv.experience.length) {
    y = secHead(doc, 'Professional Experience', M, y, TW, GOLD, GOLD);
    y = expBlock(doc, cv.experience, M, y, TW, WHITE, SILVER);
  }
  if (cv.education && cv.education.length) {
    y = secHead(doc, 'Education', M, y, TW, GOLD, GOLD);
    y = eduBlock(doc, cv.education, M, y, TW, WHITE, SILVER);
  }
  if (cv.skills && cv.skills.length) {
    y = secHead(doc, 'Core Competencies', M, y, TW, GOLD, GOLD);
    doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(...SILVER);
    y = txt(doc, cv.skills.join('   \u2022   '), M, y, TW, 5.5); y += 4;
  }
  if (cv.certifications && cv.certifications.length) {
    y = secHead(doc, 'Certifications', M, y, TW, GOLD, GOLD);
    y = certsBlock(doc, cv.certifications, M, y, TW, SILVER);
  }
}

// ══════════════════════════════════════════════
//  STYLE 5 — CREATIVE (Purple gradient)
// ══════════════════════════════════════════════
function buildCreative(doc, cv) {
  const M = 16, TW = PW - M * 2;
  const COLS = [[108,99,255],[56,189,248],[52,211,153],[251,191,36],[248,113,113]];

  // Gradient header
  [[108,99,255],[111,102,255],[114,105,255],[117,108,255],[120,111,255],[123,114,255]].forEach((c,i) => {
    doc.setFillColor(...c); doc.rect(0, i*5, PW, 5.5, 'F');
  });

  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(22);
  doc.text(cv.name || 'Your Name', M, 18);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(220,215,255);
  doc.text(cv.title || '', M, 27);

  let y = 38;
  const c = cv.contact || {};
  const cParts = [c.email, c.phone, c.location].filter(Boolean);
  if (cParts.length) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(90,90,90);
    const cl = doc.splitTextToSize(cParts.join('   |   '), TW);
    doc.text(cl, M, y); y += cl.length * 4.5 + 2;
  }
  if (c.linkedin || c.github) {
    doc.setFontSize(8); doc.setTextColor(120,120,120);
    doc.text([c.linkedin, c.github].filter(Boolean).join('   |   '), M, y); y += 5;
  }
  y += 4;

  if (cv._rawText) {
    renderRawText(doc, cv._rawText, M, y, TW, [50,50,50], [70,70,70]);
    return;
  }

  let ci = 0;
  function pill(label, fn) {
    if (y > PH - 32) { doc.addPage(); y = 18; }
    const col = COLS[ci++ % COLS.length];
    doc.setFillColor(...col);
    doc.roundedRect(M - 2, y - 6, TW + 4, 9, 2.5, 2.5, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(255,255,255);
    doc.text(label.toUpperCase(), M + 2, y);
    y += 9;
    fn();
    y += 5;
  }

  if (cv.summary) {
    pill('Summary', () => {
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(35,35,35);
      y = txt(doc, cv.summary, M, y, TW, 5.5);
    });
  }
  if (cv.experience && cv.experience.length) {
    pill('Experience', () => { y = expBlock(doc, cv.experience, M, y, TW, [50,50,50], [80,80,80]); });
  }
  if (cv.education && cv.education.length) {
    pill('Education', () => { y = eduBlock(doc, cv.education, M, y, TW, [50,50,50], [80,80,80]); });
  }
  if (cv.skills && cv.skills.length) {
    pill('Skills', () => {
      doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.setTextColor(35,35,35);
      y = txt(doc, cv.skills.join('   \u2022   '), M, y, TW, 5.5);
    });
  }
  if (cv.certifications && cv.certifications.length) {
    pill('Certifications', () => { y = certsBlock(doc, cv.certifications, M, y, TW, [60,60,60]); });
  }
}

// ══════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════
async function loadHistory() {
  try {
    const res  = await axios.get(`${API_URL}/resume`);
    const data = res.data;
    const totalEl = document.getElementById('totalAnalyses');
    const avgEl   = document.getElementById('avgScore');
    if (totalEl) totalEl.textContent = data.length;
    if (avgEl && data.length > 0)
      avgEl.textContent = Math.round(data.reduce((s,i) => s+(i.aiScore||0),0)/data.length);

    if (!data.length) {
      historyList.innerHTML = '<p style="text-align:center;color:var(--text3);padding:40px;">Abhi tak koi analysis nahi.</p>';
      return;
    }
    historyList.innerHTML = data.map(item => `
      <div class="history-item" onclick="loadHistoryItem(${JSON.stringify(item).replace(/"/g,'&quot;')})">
        <div class="history-scores">
          <div class="history-score">Resume: <strong>${item.aiScore||0}</strong></div>
          <div class="history-score">ATS: <strong>${item.atsScore||0}</strong></div>
        </div>
        <div class="history-preview">${(item.originalText||'').substring(0,100)}...</div>
        <div class="history-date">${new Date(item.createdAt).toLocaleDateString()}</div>
      </div>`).join('');
  } catch (err) {
    if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.href='index.html'; }
    else historyList.innerHTML = '<p style="text-align:center;color:var(--danger);padding:40px;">History load nahi hui.</p>';
  }
}

window.loadHistoryItem = (item) => { displayResults(item); resultsSection.scrollIntoView({ behavior:'smooth' }); };
refreshHistoryBtn?.addEventListener('click', loadHistory);
loadHistory();

// ══════════════════════════════════════════════
//  GET CV DATA (structured or parsed)
// ══════════════════════════════════════════════
function getCVData(resumeData) {
  // 1. Gemini structured data — agar sab fields hain
  const s = resumeData.structured;
  if (s && s.name && s.name.length > 1 &&
      (s.summary || (s.experience && s.experience.length) || (s.skills && s.skills.length))) {
    if (s.skills && !Array.isArray(s.skills)) {
      s.skills = String(s.skills).split(/[,|•]+/).map(x => x.trim()).filter(Boolean);
    }
    return s;
  }

  // 2. aiImprovedText ya originalText parse karo
  const text = resumeData.aiImprovedText || resumeData.originalText || '';
  const cv = parseResumeText(text);

  // 3. Agar parse se kuch nahi mila — raw text ko directly use karo
  // rawLines PDF mein line by line render hongi
  if (!cv.summary && !cv.experience.length && !cv.skills.length) {
    cv._rawText = text;
  }

  return cv;
}
