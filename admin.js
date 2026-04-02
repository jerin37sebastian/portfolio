import { db, auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, orderBy, query, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ─── AUTH ─────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    initAdmin();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-app').style.display = 'none';
  }
});

window.handleLogin = async () => {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const err   = document.getElementById('login-error');
  err.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    err.style.display = 'block';
  }
};

window.handleLogout = () => signOut(auth);

// ─── PANEL NAVIGATION ─────────────────────────────────
window.showPanel = (name) => {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  event.currentTarget.classList.add('active');
};

// ─── TOAST ────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = type;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

// ─── HERO ─────────────────────────────────────────────
let heroSocials = [];

async function loadHeroAdmin() {
  try {
    const snap = await getDoc(doc(db, 'hero', 'main'));
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById('hero-title').value = d.title || '';
      document.getElementById('hero-label').value = d.label || '';
      document.getElementById('hero-bio').value   = d.bio   || '';
      heroSocials = d.socials || [];
      renderSocials();
    }
  } catch (e) { console.error(e); }
}

function renderSocials() {
  const list = document.getElementById('socials-list');
  list.innerHTML = heroSocials.map((s, i) => `
    <div class="item-row" style="margin-bottom:0.5rem">
      <div class="item-info">
        <div class="item-title">${s.label}</div>
        <div class="item-meta">${s.url}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeSocial(${i})">Remove</button>
    </div>
  `).join('') || '<p style="color:var(--muted);font-size:0.85rem">No social links yet.</p>';
}

window.addSocial = () => {
  const label = document.getElementById('social-label').value.trim();
  const url   = document.getElementById('social-url').value.trim();
  if (!label || !url) return toast('Fill both fields', 'error');
  heroSocials.push({ label, url });
  document.getElementById('social-label').value = '';
  document.getElementById('social-url').value   = '';
  renderSocials();
};

window.removeSocial = (i) => {
  heroSocials.splice(i, 1);
  renderSocials();
};

window.saveHero = async () => {
  try {
    await setDoc(doc(db, 'hero', 'main'), {
      title:   document.getElementById('hero-title').value.trim(),
      label:   document.getElementById('hero-label').value.trim(),
      bio:     document.getElementById('hero-bio').value.trim(),
      socials: heroSocials
    });
    toast('✓ Hero saved!');
  } catch (e) { toast('Error saving hero', 'error'); console.error(e); }
};

// ─── PROJECTS ─────────────────────────────────────────
async function loadProjects() {
  const list = document.getElementById('projects-list');
  try {
    const snap = await getDocs(query(collection(db, 'projects'), orderBy('order')));
    if (snap.empty) { list.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">No projects yet.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const p = d.data();
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${p.title}</div>
          <div class="item-meta">${(p.tags || []).join(', ')}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editProject('${d.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProject('${d.id}')">Delete</button>
        </div>
      `;
      list.appendChild(row);
    });
  } catch (e) { console.error(e); }
}

window.saveProject = async () => {
  const id    = document.getElementById('project-id').value;
  const title = document.getElementById('project-title').value.trim();
  if (!title) return toast('Title is required', 'error');
  const data = {
    title,
    tags:        document.getElementById('project-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    description: document.getElementById('project-desc').value.trim(),
    url:         document.getElementById('project-url').value.trim(),
    image:       document.getElementById('project-image').value.trim(),
    order:       parseInt(document.getElementById('project-order').value) || 1,
  };
  try {
    if (id) await updateDoc(doc(db, 'projects', id), data);
    else    await addDoc(collection(db, 'projects'), data);
    toast('✓ Project saved!');
    clearProjectForm();
    loadProjects();
  } catch (e) { toast('Error saving project', 'error'); console.error(e); }
};

window.editProject = async (id) => {
  const snap = await getDoc(doc(db, 'projects', id));
  if (!snap.exists()) return;
  const p = snap.data();
  document.getElementById('project-id').value    = id;
  document.getElementById('project-title').value = p.title || '';
  document.getElementById('project-tags').value  = (p.tags || []).join(', ');
  document.getElementById('project-desc').value  = p.description || '';
  document.getElementById('project-url').value   = p.url || '';
  document.getElementById('project-image').value = p.image || '';
  document.getElementById('project-order').value = p.order || 1;
  window.scrollTo(0, 0);
};

window.deleteProject = async (id) => {
  if (!confirm('Delete this project?')) return;
  await deleteDoc(doc(db, 'projects', id));
  toast('Project deleted');
  loadProjects();
};

window.clearProjectForm = () => {
  ['project-id','project-title','project-tags','project-desc','project-url','project-image'].forEach(
    id => document.getElementById(id).value = ''
  );
  document.getElementById('project-order').value = '1';
};

// ─── SKILLS ───────────────────────────────────────────
async function loadSkills() {
  const list = document.getElementById('skills-list');
  try {
    const snap = await getDocs(collection(db, 'skills'));
    if (snap.empty) { list.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">No skills yet.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const s = d.data();
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${s.name}</div>
          <div class="item-meta">${s.category} · ${s.level}%</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editSkill('${d.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSkill('${d.id}')">Delete</button>
        </div>
      `;
      list.appendChild(row);
    });
  } catch (e) { console.error(e); }
}

window.saveSkill = async () => {
  const id   = document.getElementById('skill-id').value;
  const name = document.getElementById('skill-name').value.trim();
  if (!name) return toast('Skill name required', 'error');
  const data = {
    name,
    category: document.getElementById('skill-category').value.trim(),
    level:    parseInt(document.getElementById('skill-level').value),
  };
  try {
    if (id) await updateDoc(doc(db, 'skills', id), data);
    else    await addDoc(collection(db, 'skills'), data);
    toast('✓ Skill saved!');
    clearSkillForm();
    loadSkills();
  } catch (e) { toast('Error saving skill', 'error'); console.error(e); }
};

window.editSkill = async (id) => {
  const snap = await getDoc(doc(db, 'skills', id));
  if (!snap.exists()) return;
  const s = snap.data();
  document.getElementById('skill-id').value       = id;
  document.getElementById('skill-name').value     = s.name || '';
  document.getElementById('skill-category').value = s.category || '';
  document.getElementById('skill-level').value    = s.level || 80;
  document.getElementById('skill-level-display').textContent = s.level || 80;
  window.scrollTo(0, 0);
};

window.deleteSkill = async (id) => {
  if (!confirm('Delete this skill?')) return;
  await deleteDoc(doc(db, 'skills', id));
  toast('Skill deleted');
  loadSkills();
};

window.clearSkillForm = () => {
  document.getElementById('skill-id').value       = '';
  document.getElementById('skill-name').value     = '';
  document.getElementById('skill-category').value = '';
  document.getElementById('skill-level').value    = 80;
  document.getElementById('skill-level-display').textContent = 80;
};

// ─── BLOG ─────────────────────────────────────────────
async function loadBlog() {
  const list = document.getElementById('blog-list');
  try {
    const snap = await getDocs(collection(db, 'blogs'));
    if (snap.empty) { list.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">No articles yet.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const b = d.data();
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <div class="item-title">${b.title}</div>
          <div class="item-meta">${b.published ? '✓ Published' : '○ Draft'}</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" onclick="editBlog('${d.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBlog('${d.id}')">Delete</button>
        </div>
      `;
      list.appendChild(row);
    });
  } catch (e) { console.error(e); }
}

window.saveBlog = async () => {
  const id    = document.getElementById('blog-id').value;
  const title = document.getElementById('blog-title').value.trim();
  if (!title) return toast('Title required', 'error');
  const dateVal = document.getElementById('blog-date').value;
  const data = {
    title,
    body:      document.getElementById('blog-body').value.trim(),
    published: document.getElementById('blog-published').checked,
    date:      dateVal ? Timestamp.fromDate(new Date(dateVal)) : serverTimestamp(),
  };
  try {
    if (id) await updateDoc(doc(db, 'blogs', id), data);
    else    await addDoc(collection(db, 'blogs'), data);
    toast('✓ Article saved!');
    clearBlogForm();
    loadBlog();
  } catch (e) { toast('Error saving article', 'error'); console.error(e); }
};

window.editBlog = async (id) => {
  const snap = await getDoc(doc(db, 'blogs', id));
  if (!snap.exists()) return;
  const b = snap.data();
  document.getElementById('blog-id').value        = id;
  document.getElementById('blog-title').value     = b.title || '';
  document.getElementById('blog-body').value      = b.body  || '';
  document.getElementById('blog-published').checked = b.published ?? true;
  if (b.date?.toDate) {
    const d = b.date.toDate();
    document.getElementById('blog-date').value = d.toISOString().split('T')[0];
  }
  window.scrollTo(0, 0);
};

window.deleteBlog = async (id) => {
  if (!confirm('Delete this article?')) return;
  await deleteDoc(doc(db, 'blogs', id));
  toast('Article deleted');
  loadBlog();
};

window.clearBlogForm = () => {
  ['blog-id','blog-title','blog-body','blog-date'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('blog-published').checked = true;
};

// ─── MESSAGES ─────────────────────────────────────────
async function loadMessages() {
  const list = document.getElementById('messages-list');
  try {
    const snap = await getDocs(collection(db, 'messages'));
    if (snap.empty) { list.innerHTML = '<p style="color:var(--muted);font-size:0.88rem">No messages yet.</p>'; return; }
    list.innerHTML = '';
    snap.forEach(d => {
      const m = d.data();
      const date = m.createdAt?.toDate
        ? m.createdAt.toDate().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
        : '';
      const card = document.createElement('div');
      card.className = `message-card ${m.read ? '' : 'unread'}`;
      card.innerHTML = `
        <div class="message-header">
          <span class="message-from">${m.name}</span>
          <span class="message-date">${date}</span>
        </div>
        <div class="message-email">${m.email}</div>
        <div class="message-body">${m.message}</div>
      `;
      list.appendChild(card);
      if (!m.read) updateDoc(doc(db, 'messages', d.id), { read: true });
    });
  } catch (e) { console.error(e); }
}

// ─── INIT ──────────────────────────────────────────────
function initAdmin() {
  loadHeroAdmin();
  loadProjects();
  loadSkills();
  loadBlog();
  loadMessages();
}
