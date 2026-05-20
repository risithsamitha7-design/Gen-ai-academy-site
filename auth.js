import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

// ==========================================
// 1. CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://khlrftorctbebbnkpjbt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VXLT5QijvLrq0XciRrerkw_1DwdgQzS';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export let currentUser = null;

const ADMIN_EMAILS = ['genaiacademy123@gmail.com'];
export function isAdmin() {
  return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}

// ==========================================
// 2. UI ELEMENTS (only exist on tools.html)
// ==========================================
const profileWidget    = document.getElementById('user-profile-widget');
const loginBtnWrapper  = document.getElementById('login-btn-wrapper');
const userAvatarBtn    = document.getElementById('user-avatar-btn');
const userDropdown     = document.getElementById('user-dropdown');
const userAvatarImg    = document.getElementById('user-avatar-img');
const userAvatarInitials = document.getElementById('user-avatar-initials');
const userDisplayName  = document.getElementById('user-display-name');
const userAdminBadge   = document.getElementById('user-admin-badge');
const dropdownEmail    = document.getElementById('dropdown-email');
const dropdownName     = document.getElementById('dropdown-name');
const dropdownAdminTag = document.getElementById('dropdown-admin-tag');

// Toggle dropdown open/close
if (userAvatarBtn && userDropdown) {
  userAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });
}
document.addEventListener('click', (e) => {
  if (userDropdown && !userAvatarBtn?.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.style.display = 'none';
  }
});

// ==========================================
// 3. UPDATE UI BASED ON AUTH STATE
// ==========================================
function updateProfileUI(user) {
  if (profileWidget) {
    // tools.html — use the fancy profile widget
    if (user) {
      profileWidget.style.display = 'flex';
      if (loginBtnWrapper) loginBtnWrapper.style.display = 'none';

      const name   = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
      const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      const email  = user.email;
      const admin  = ADMIN_EMAILS.includes(email);

      if (avatar && userAvatarImg) {
        userAvatarImg.src = avatar;
        userAvatarImg.style.display = 'block';
        if (userAvatarInitials) userAvatarInitials.style.display = 'none';
      } else if (userAvatarInitials) {
        userAvatarInitials.textContent = name.charAt(0).toUpperCase();
        userAvatarInitials.style.display = 'flex';
        if (userAvatarImg) userAvatarImg.style.display = 'none';
      }

      if (userDisplayName) userDisplayName.textContent = name;
      if (userAdminBadge)  userAdminBadge.style.display  = admin ? 'block' : 'none';
      if (dropdownEmail)   dropdownEmail.textContent   = email;
      if (dropdownName)    dropdownName.textContent    = name;
      if (dropdownAdminTag) dropdownAdminTag.style.display = admin ? 'inline-block' : 'none';
    } else {
      profileWidget.style.display = 'none';
      if (loginBtnWrapper) loginBtnWrapper.style.display = 'flex';
      if (userDropdown) userDropdown.style.display = 'none';
    }
  }

  // Other pages (index.html) — fallback: just change button text
  document.querySelectorAll('#auth-btn-mobile, .genai-simple-auth-btn').forEach(btn => {
    if (btn) btn.innerText = user ? 'Logout' : 'Login';
  });
}

// ==========================================
// 4. LOGIN / LOGOUT ACTION
// ==========================================
export async function handleLoginLogout() {
  console.log("handleLoginLogout triggered. Current user:", currentUser);
  try {
    if (currentUser) {
      console.log("Signing out...");
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      console.log("Sign out successful.");
    } else {
      const redirectTarget = window.location.href.split('#')[0];
      console.log("Initiating Google OAuth signInWithOAuth to redirect to:", redirectTarget);
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTarget
        }
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error("Auth action failed:", err);
    alert("Authentication failed: " + (err.message || err));
  }
}

// ==========================================
// 5. WIRE UP ALL BUTTONS ON EVERY PAGE
// ==========================================
// #auth-btn        → logout button inside profile dropdown (tools.html)
//                  → plain login link on index.html
// #auth-btn-login  → login button shown when logged out (tools.html)
// #auth-btn-mobile → mobile menu login/logout (all pages)
console.log("Wiring up auth button event listeners...");
document.querySelectorAll('#auth-btn, #auth-btn-login, #auth-btn-mobile').forEach(btn => {
  if (btn) {
    console.log("Bound click handler to button ID:", btn.id);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("Auth button clicked:", btn.id);
      handleLoginLogout();
    });
  }
});

// ==========================================
// 6. LISTEN TO AUTH STATE CHANGES
// ==========================================
supabaseClient.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  updateProfileUI(currentUser);
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: currentUser } }));
});
