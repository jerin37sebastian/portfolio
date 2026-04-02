import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, doc, getDoc,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── HERO ────────────────────────────────────────────
async function loadHero() {
  try {
    const snap = await getDoc(doc(db, 'hero', 'main'));
    if (!snap.exists()) return;
    const d = snap.data();

    if (d.bio)   document.getElementById('hero-bio').textContent   = d.bio;
    if (d.title) document.getElementById('hero-title').textContent = d.title;
    if (d.label) document.getElementById('hero-label').childNodes[1]
      ? (document.getElementById('hero-label').lastChild.textContent = ' ' + d.label)
      : null;

    if (d.socials && d.socials.length) {
      const container = document.getElementById('hero-socials');
      container.innerHTML = d.socials.map(s =>
        `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`
      ).join('');
    }
  } catch (e) { console.warn('Hero load error:', e); }
}

// ─── PROJECTS ────────────────────────────────────────
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  try {
    const snap = await getDocs(query(collection(db, 'projects'), orderBy('order')));
    if (snap.empty) {
      grid.innerHTML = '<p style="color:var(--muted)">No projects yet.</p>';
      return;
    }
    grid.innerHTML = '';
    snap.forEach(docSnap => {
      const p = docSnap.data();
      const card = document.createElement('div');
      card.className = 'project-card reveal';
      card.innerHTML = `
        <div class="project-img">
          ${p.image
            ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:200px;object-fit:cover;" />`
            : '🚀'}
        </div>
        <div class="project-body">
          <div class="project-tags">
            ${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="project-name">${p.title}</div>
          <p class="project-desc">${p.description}</p>
          ${p.url ? `<a class="project-link" href="${p.url}" target="_blank" rel="noopener">View Project →</a>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
    observeReveal();
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--muted)">Could not load projects.</p>';
    console.error(e);
  }
}

// ─── SKILLS ──────────────────────────────────────────
async function loadSkills() {
  const grid = document.getElementById('skills-grid');
  try {
    const snap = await getDocs(collection(db, 'skills'));
    if (snap.empty) {
      grid.innerHTML = '<p style="color:var(--muted)">No skills yet.</p>';
      return;
    }

    // Group by category
    const categories = {};
    snap.forEach(d => {
      const s = d.data();
      if (!categories[s.category]) categories[s.category] = [];
      categories[s.category].push(s);
    });

    grid.innerHTML = '';
    for (const [cat, skills] of Object.entries(categories)) {
      const col = document.createElement('div');
      col.className = 'skill-category reveal';
      col.innerHTML = `
        <div class="skill-cat-title">${cat}</div>
        ${skills.map(s => `
          <div class="skill-item">
            <div class="skill-top">
              <span class="skill-name">${s.name}</span>
              <span class="skill-pct">${s.level}%</span>
            </div>
            <div class="skill-bar">
              <div class="skill-fill" data-level="${s.level}"></div>
            </div>
          </div>
        `).join('')}
      `;
      grid.appendChild(col);
    }

    animateSkillBars();
    observeReveal();
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--muted)">Could not load skills.</p>';
    console.error(e);
  }
}

function animateSkillBars() {
  const bars = document.querySelectorAll('.skill-fill');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const level = entry.target.dataset.level;
        entry.target.style.width = level + '%';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(b => observer.observe(b));
}

// ─── BLOG ────────────────────────────────────────────
async function loadBlog() {
  const grid = document.getElementById('blog-grid');
  try {
    const snap = await getDocs(
      query(collection(db, 'blogs'), where('published', '==', true), orderBy('date', 'desc'))
    );
    if (snap.empty) {
      grid.innerHTML = '<p style="color:var(--muted)">No articles yet.</p>';
      return;
    }
    grid.innerHTML = '';
    snap.forEach(docSnap => {
      const b = docSnap.data();
      const date = b.date?.toDate
        ? b.date.toDate().toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' })
        : b.date || '';
      const card = document.createElement('div');
      card.className = 'blog-card reveal';
      card.innerHTML = `
        <div class="blog-date">${date}</div>
        <div class="blog-title">${b.title}</div>
        <p class="blog-body">${b.body.substring(0, 160)}...</p>
        <span class="blog-read-more">Read more →</span>
      `;
      grid.appendChild(card);
    });
    observeReveal();
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--muted)">Could not load articles.</p>';
    console.error(e);
  }
}

// ─── CONTACT FORM ────────────────────────────────────
function initContactForm() {
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      await addDoc(collection(db, 'messages'), {
        name:      document.getElementById('name').value.trim(),
        email:     document.getElementById('email').value.trim(),
        message:   document.getElementById('message').value.trim(),
        createdAt: serverTimestamp(),
        read:      false
      });
      form.reset();
      success.style.display = 'block';
      btn.style.display = 'none';
    } catch (err) {
      btn.textContent = 'Failed. Try again.';
      btn.disabled = false;
      console.error(err);
    }
  });
}

// ─── SCROLL REVEAL ───────────────────────────────────
function observeReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── INIT ────────────────────────────────────────────
(async () => {
  await loadHero();
  await loadProjects();
  await loadSkills();
  await loadBlog();
  initContactForm();
  observeReveal();
})();
