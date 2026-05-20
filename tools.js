import { supabaseClient, currentUser, isAdmin } from './auth.js';

// ==========================================
// 1. STATE & UI ELEMENTS
// ==========================================

let activeTab = 'public'; // 'public' or 'private' or 'admin'
let currentCategoryFilter = 'All';
let searchQuery = '';
let allLoadedPrompts = []; // store last loaded set for client-side search

const tabPublic = document.getElementById('tab-public');
const tabPrivate = document.getElementById('tab-private');
const tabAdmin = document.getElementById('tab-admin');
const btnAddPrompt = document.getElementById('btn-add-prompt');
const promptsContainer = document.getElementById('prompts-container');
const searchInput = document.getElementById('prompt-search');
const searchClear  = document.getElementById('search-clear');

// Modal Elements
const promptModal = document.getElementById('prompt-modal');
const closeModal = document.getElementById('close-modal');
const promptForm = document.getElementById('prompt-form');


// ==========================================
// 2. AUTHENTICATION LOGIC (via auth.js)
// ==========================================

window.addEventListener('authStateChanged', (e) => {
  const user = e.detail.user;
  if (user) {
    // User is signed in
    tabPrivate.style.display = 'block';
    btnAddPrompt.style.display = 'block';
    if (isAdmin()) {
      tabAdmin.style.display = 'block';
    } else {
      tabAdmin.style.display = 'none';
      if (activeTab === 'admin') switchTab('public');
    }
  } else {
    // User is signed out
    tabPrivate.style.display = 'none';
    tabAdmin.style.display = 'none';
    btnAddPrompt.style.display = 'none'; // Hide add prompt when logged out - requires login
    
    if (activeTab === 'private' || activeTab === 'admin') {
      switchTab('public');
    }
  }
  
// Refresh the prompts
  loadPrompts();
});

// ==========================================
// 2.5 MANUAL PROMPTS (Hardcoded)
// ==========================================
// Add your manual prompts here. They will always appear in the "Public" tab.
const manualPrompts = [
  {
    title: "Professional Email Writer",
    content: "Act as an executive assistant. Write a professional, polite, yet assertive email to a client who is late on their payment by 2 weeks. Offer a brief extension but make it clear that services will be paused if payment is not received.",
    visibility: "public",
    status: "Approved",
    author: "GenAI Academy",
    imageUrl: "img_professional_email.png",
    tool: "Text Prompts",
    tags: "business, email, professional"
  },
  {
    title: "Code Refactoring Expert",
    content: "Review the following JavaScript code. Identify any performance bottlenecks, security vulnerabilities, and stylistic issues. Rewrite the code to follow modern ES6+ best practices and explain your changes step-by-step.",
    visibility: "public",
    status: "Approved",
    author: "GenAI Academy",
    imageUrl: "img_code_refactoring.png",
    tool: "Coding Prompts",
    tags: "coding, javascript, refactor"
  },
  {
    title: "Creative Story Concept",
    content: "Generate 3 unique and engaging concepts for a science fiction short story. Each concept should include a protagonist, a setting, a central conflict, and a mind-bending twist.",
    visibility: "public",
    status: "Approved",
    author: "GenAI Academy",
    imageUrl: "img_creative_story.png",
    tool: "Text Prompts",
    tags: "creative, writing, scifi"
  }
];

// ==========================================
// 3. DATABASE LOGIC & UI RENDER
// ==========================================

// LocalStorage helpers for Likes and Saves
function getLikedStatus(key) {
  const likes = JSON.parse(localStorage.getItem('genai-liked-prompts') || '{}');
  return !!likes[key];
}

function toggleLikedStatus(key) {
  const likes = JSON.parse(localStorage.getItem('genai-liked-prompts') || '{}');
  likes[key] = !likes[key];
  localStorage.setItem('genai-liked-prompts', JSON.stringify(likes));
  return likes[key];
}

function getSavedStatus(key) {
  const saves = JSON.parse(localStorage.getItem('genai-saved-prompts') || '{}');
  return !!saves[key];
}

function toggleSavedStatus(key) {
  const saves = JSON.parse(localStorage.getItem('genai-saved-prompts') || '{}');
  saves[key] = !saves[key];
  localStorage.setItem('genai-saved-prompts', JSON.stringify(saves));
  return saves[key];
}

function getLikeCountOffset(key) {
  const offsets = JSON.parse(localStorage.getItem('genai-like-offsets') || '{}');
  return offsets[key] || 0;
}

function adjustLikeCountOffset(key, liked) {
  const offsets = JSON.parse(localStorage.getItem('genai-like-offsets') || '{}');
  offsets[key] = (offsets[key] || 0) + (liked ? 1 : -1);
  localStorage.setItem('genai-like-offsets', JSON.stringify(offsets));
  return offsets[key];
}

window.handleLikeClick = (btn, key, baseLikes) => {
  const liked = toggleLikedStatus(key);
  adjustLikeCountOffset(key, liked);
  
  if (liked) {
    btn.classList.add('active-like');
  } else {
    btn.classList.remove('active-like');
  }
  
  const newCount = baseLikes + getLikeCountOffset(key);
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${newCount}`;
  
  if (liked) {
    showToast('❤️ Prompt liked!', 'success');
  }
};

window.handleSaveClick = (btn, key) => {
  const saved = toggleSavedStatus(key);
  
  if (saved) {
    btn.classList.add('active-save');
  } else {
    btn.classList.remove('active-save');
  }
  
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> ${saved ? 'Saved' : 'Save'}`;
  
  showToast(saved ? '📌 Saved to your favorites!' : '🗑️ Removed from favorites.', 'success');
};

async function loadPrompts() {
  if (!supabaseClient) {
    promptsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center;">Supabase client not initialized.</div>`;
    return;
  }

  promptsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center;">Loading prompts...</div>`;
  
  try {
    let query = supabaseClient.from('prompts').select('*').order('created_at', { ascending: false });
    
    if (activeTab === 'public') {
      // Public: only approved public prompts (RLS also enforces this)
      query = query.eq('visibility', 'public').eq('status', 'Approved');
    } else if (activeTab === 'private') {
      // Private vault: fetch only this user's private prompts
      // The visibility='private' field + RLS double-enforces that no one else can see them
      if (!currentUser) {
        promptsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; opacity:0.7; padding:40px;">Please log in to see your private library.</div>`;
        return;
      }
      query = query.eq('author_id', currentUser.id).eq('visibility', 'private');
    } else if (activeTab === 'admin') {
      // Admin queue: ONLY public prompts pending review (private prompts never appear here)
      if (!isAdmin()) return;
      query = query.eq('visibility', 'public').eq('status', 'Pending');
    }
    
    const { data: prompts, error } = await query;
    
    if (error) throw error;
    
    // Combine manual prompts with Supabase prompts
    let allPrompts = prompts || [];
    if (activeTab === 'public') {
      allPrompts = [...manualPrompts, ...allPrompts];
    }
    
    // Client-side filtering for tools
    if (currentCategoryFilter !== 'All') {
      allPrompts = allPrompts.filter(p => p.tool === currentCategoryFilter);
    }

    // Store for search filtering
    allLoadedPrompts = allPrompts;

    // Apply search filter if any
    renderPrompts(filterBySearch(allPrompts));
    
  } catch (err) {
    console.error("Error loading prompts from Supabase:", err);
    // Fallback to manual prompts if database fails
    if (activeTab === 'public') {
      console.log("Falling back to manual prompts.");
      renderPrompts(manualPrompts);
    } else {
      promptsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; color: red;">Failed to load prompts. Did you set up the database?</div>`;
    }
  }
}

function renderPrompts(prompts) {
  if (!prompts || prompts.length === 0) {
    promptsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; opacity:0.7;">No prompts found.</div>`;
    return;
  }
  
  promptsContainer.innerHTML = '';
  
  prompts.forEach(prompt => {
    const card = document.createElement('div');
    card.className = 'genai-prompt-card';
    
    const promptKey = prompt.id || `manual-${prompt.title}`;
    const baseLikes = prompt.likes || 24;
    const isLiked = getLikedStatus(promptKey);
    const currentLikes = baseLikes + getLikeCountOffset(promptKey);
    const isSaved = getSavedStatus(promptKey);
    
    let statusBadge = '';
    if (activeTab === 'private' || activeTab === 'admin') {
      const statusClass = prompt.status === 'Approved' ? 'status-approved' : 'status-pending';
      statusBadge = `<span class="genai-status-badge ${statusClass}">${prompt.status || 'Pending'}</span>`;
    }
    
    let adminControls = '';
    if (activeTab === 'admin') {
      adminControls = `
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button onclick="window.approvePrompt('${prompt.id}')" style="background:#28a745; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; flex:1;">Approve</button>
          <button onclick="window.rejectPrompt('${prompt.id}')" style="background:#dc3545; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; flex:1;">Reject</button>
        </div>
      `;
    }
    
    let tagsHtml = '';
    if (prompt.tool) {
      tagsHtml += `<span class="genai-tag tool">${escapeHTML(prompt.tool)}</span>`;
    }
    if (prompt.tags) {
      const tagArray = prompt.tags.split(',').map(t => t.trim()).filter(t => t);
      tagArray.forEach(t => {
        tagsHtml += `<span class="genai-tag">${escapeHTML(t)}</span>`;
      });
    }
    
    // --- Delete button logic ---
    // Public tab: only admin can delete
    // Private tab: the owner (any logged-in user) can delete their own prompt
    // Manual/hardcoded prompts have no 'id' so no delete shown
    let deleteBtn = '';
    if (prompt.id) {
      const showDeleteOnPublic  = (activeTab === 'public')  && isAdmin();
      const showDeleteOnPrivate = (activeTab === 'private') && currentUser;
      if (showDeleteOnPublic || showDeleteOnPrivate) {
        deleteBtn = `
          <button class="action-btn" onclick="window.deletePrompt('${prompt.id}')" title="Delete prompt"
            style="color:rgba(255,80,80,0.7); margin-left:auto;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6M14 11v6"></path>
              <path d="M9 6V4h6v2"></path>
            </svg>
            Delete
          </button>`;
      }
    }

    card.innerHTML = `
      ${(prompt.imageUrl || prompt.image_url) ? `<div class="genai-prompt-image" style="background-image: url('${escapeHTML(prompt.imageUrl || prompt.image_url)}')"></div>` : ''}
      <div class="genai-prompt-title">${escapeHTML(prompt.title || 'Untitled')}</div>
      ${tagsHtml ? `<div class="genai-prompt-tags">${tagsHtml}</div>` : ''}
      <div class="genai-prompt-content">${escapeHTML(prompt.content || '')}</div>
      <div class="genai-prompt-meta" style="margin-top: auto;">
        <span>By: ${escapeHTML(prompt.author ? prompt.author : (activeTab === 'private' ? 'You' : 'Community'))}</span>
        ${statusBadge}
      </div>
      <div class="genai-prompt-actions">
        <button class="action-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(prompt.content || '')}); showToast('\u2705 Copied to clipboard!', 'success')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy
        </button>
        <div style="display:flex; gap:12px; align-items:center;">
          <button class="action-btn ${isLiked ? 'active-like' : ''}" onclick="window.handleLikeClick(this, '${promptKey}', ${baseLikes})">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${currentLikes}
          </button>
          <button class="action-btn ${isSaved ? 'active-save' : ''}" onclick="window.handleSaveClick(this, '${promptKey}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> ${isSaved ? 'Saved' : 'Save'}
          </button>
          ${deleteBtn}
        </div>
      </div>
      ${adminControls}
    `;
    
    promptsContainer.appendChild(card);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

// Global functions for Admin Approval / Deletion
window.approvePrompt = async (id) => {
  if (!isAdmin()) return;
  try {
    const { error } = await supabaseClient.from('prompts').update({ status: 'Approved' }).eq('id', id);
    if (error) throw error;
    showToast('✅ Prompt approved!', 'success');
    loadPrompts();
  } catch (err) {
    console.error("Error approving prompt:", err);
    showToast('❌ Failed to approve prompt.', 'error');
  }
};

window.rejectPrompt = async (id) => {
  if (!isAdmin()) return;
  if (!confirm("Reject and delete this prompt?")) return;
  try {
    const { error } = await supabaseClient.from('prompts').delete().eq('id', id);
    if (error) throw error;
    showToast('🗑️ Prompt rejected and removed.', 'success');
    loadPrompts();
  } catch (err) {
    console.error("Error rejecting prompt:", err);
    showToast('❌ Failed to reject prompt.', 'error');
  }
};

// deletePrompt: Admin in Public, Owner in Private
window.deletePrompt = async (id) => {
  const isPublicAdminDelete  = activeTab === 'public'  && isAdmin();
  const isPrivateOwnerDelete = activeTab === 'private' && currentUser;
  if (!isPublicAdminDelete && !isPrivateOwnerDelete) return;

  if (!confirm('Are you sure you want to delete this prompt? This cannot be undone.')) return;

  try {
    const { error } = await supabaseClient.from('prompts').delete().eq('id', id);
    if (error) throw error;
    showToast('🗑️ Prompt deleted.', 'success');
    loadPrompts();
  } catch (err) {
    console.error('Error deleting prompt:', err);
    showToast('❌ Failed to delete. ' + (err.message || ''), 'error');
  }
};

// ==========================================
// 4. EVENT LISTENERS
// ==========================================

// ---- Search helpers ----
function filterBySearch(prompts) {
  if (!searchQuery) return prompts;
  const q = searchQuery.toLowerCase();
  return prompts.filter(p =>
    (p.title || '').toLowerCase().includes(q) ||
    (p.tags  || '').toLowerCase().includes(q) ||
    (p.tool  || '').toLowerCase().includes(q)
  );
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    if (searchClear) searchClear.style.display = searchQuery ? 'block' : 'none';
    renderPrompts(filterBySearch(allLoadedPrompts));
  });
}
if (searchClear) {
  searchClear.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    searchClear.style.display = 'none';
    searchInput.focus();
    renderPrompts(allLoadedPrompts);
  });
}

function switchTab(tab) {
  activeTab = tab;
  // Clear search when changing tabs
  searchQuery = '';
  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.style.display = 'none';

  tabPublic.classList.remove('active');
  tabPrivate.classList.remove('active');
  tabAdmin.classList.remove('active');
  
  if (tab === 'public') {
    tabPublic.classList.add('active');
  } else if (tab === 'private') {
    tabPrivate.classList.add('active');
  } else if (tab === 'admin') {
    tabAdmin.classList.add('active');
  }
  
  loadPrompts();
}

tabPublic.addEventListener('click', () => switchTab('public'));
tabPrivate.addEventListener('click', () => switchTab('private'));
tabAdmin.addEventListener('click', () => switchTab('admin'));

// Sidebar filtering
document.querySelectorAll('.genai-sidebar-item[data-filter]').forEach(item => {
  item.addEventListener('click', (e) => {
    document.querySelectorAll('.genai-sidebar-item[data-filter]').forEach(i => i.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentCategoryFilter = e.currentTarget.dataset.filter;
    loadPrompts();
  });
});

// Modal functionality
btnAddPrompt.addEventListener('click', () => {
  promptModal.classList.add('active');
});

closeModal.addEventListener('click', () => {
  promptModal.classList.remove('active');
});

// Close modal on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && promptModal && promptModal.classList.contains('active')) {
    promptModal.classList.remove('active');
  }
});

window.addEventListener('click', (e) => {
  if (e.target === promptModal) {
    promptModal.classList.remove('active');
  }
});

// Form Submission
promptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('prompt-title').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  const visibility = document.getElementById('prompt-visibility').value;
  const tool = document.getElementById('prompt-tool').value;
  const tags = document.getElementById('prompt-tags').value.trim();
  const imageUrl = document.getElementById('prompt-image-url').value.trim();
  
  const submitBtn = promptForm.querySelector('button[type="submit"]');
  submitBtn.innerText = "Submitting...";
  submitBtn.disabled = true;
  
  if (!currentUser) {
    showToast('Please log in to submit a prompt.', 'error');
    submitBtn.innerText = "Submit";
    submitBtn.disabled = false;
    return;
  }

  try {
    const promptData = {
      title: title,
      content: content,
      visibility: visibility,
      // Private prompts: status = 'Approved' but visibility = 'private' keeps them secret
      // RLS policies ensure only the owner can ever read them
      // Public prompts: 'Pending' for review, unless the admin is posting
      status: (visibility === 'private') ? 'Approved' : (isAdmin() ? 'Approved' : 'Pending'),
      tool: tool,
      tags: tags,
      image_url: imageUrl || null,
      author_id: currentUser.id  // Always store author; RLS requires it
    };
    
    const { error } = await supabaseClient.from('prompts').insert([promptData]);
    
    if (error) throw error;
    
    const msg = visibility === 'private' 
      ? '✅ Saved to your private library!' 
      : '✅ Submitted! Waiting for admin approval.';
    showToast(msg, 'success');
    promptForm.reset();
    promptModal.classList.remove('active');
    
    // Reload prompts to show the newly added one
    loadPrompts();
    
  } catch (err) {
    console.error("Error submitting prompt:", err);
    showToast('❌ Failed to submit. Are you logged in?', 'error');
  } finally {
    submitBtn.innerText = "Submit";
    submitBtn.disabled = false;
  }
});

// Initial load
setTimeout(loadPrompts, 500);

// ==========================================
// 5. TOAST NOTIFICATIONS
// ==========================================

window.showToast = function showToast(message, type = 'success') {
  let toast = document.getElementById('genai-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'genai-toast';
    toast.style.cssText = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(100px);
      padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 0.95rem;
      z-index: 9999; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s;
      opacity: 0; backdrop-filter: blur(12px); white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.background = type === 'success' 
    ? 'rgba(0, 200, 100, 0.9)' 
    : 'rgba(220, 53, 69, 0.9)';
  toast.style.color = '#fff';
  toast.style.boxShadow = type === 'success'
    ? '0 8px 32px rgba(0, 200, 100, 0.3)'
    : '0 8px 32px rgba(220, 53, 69, 0.3)';

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });

  // Animate out
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
  }, 3500);
}
