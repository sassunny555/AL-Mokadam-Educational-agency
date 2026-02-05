/* ============================================
   AL-Mokadam Admin Panel JavaScript
   With Course Picker & Category Management
   ============================================ */

// ============================================
// ADMIN SECURITY - WHITELIST CONFIGURATION
// Add your admin email(s) here
// ============================================
const ADMIN_EMAILS = [
    'admin@al-mokadam.edu',
    'sassunny555@gmail.com',
    'admin@email.com'  // Main admin account
];

// Check if user is an authorized admin
function isAuthorizedAdmin(user) {
    if (!user || !user.email) return false;
    return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Current state
let currentSection = 'dashboard';
let editingId = null;
let editingType = null;
let availableCourses = [];
let availableCategories = ['IT', 'Engineering', 'Business', 'Health Sciences', 'Arts', 'Science', 'Law', 'Education', 'Other'];
let universityCoursesTemp = []; // Temporary storage for courses being added to university

// ============================================
// Authentication
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    
    setTimeout(() => {
        if (auth) {
            auth.onAuthStateChanged(user => {
                if (user) {
                    // Check if user is authorized admin
                    if (isAuthorizedAdmin(user)) {
                        showDashboard(user);
                    } else {
                        // Unauthorized - sign out and show error
                        auth.signOut();
                        showLogin();
                        showUnauthorizedError(user.email);
                    }
                } else {
                    showLogin();
                }
            });
        }
    }, 500);
    
    setupEventListeners();
});

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleEmailLogin);
    
    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) switchSection(section);
        });
    });
    
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) settingsForm.addEventListener('submit', handleSaveSettings);
    
    const inquiryFilter = document.getElementById('inquiryFilter');
    if (inquiryFilter) inquiryFilter.addEventListener('change', () => loadInquiries());
}

async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorEl.textContent = error.message;
    }
}

async function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const errorEl = document.getElementById('loginError');
    
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        errorEl.textContent = error.message;
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        showLogin();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
}

function showUnauthorizedError(email) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.innerHTML = `<strong>Access Denied</strong><br>The email "${email}" is not authorized to access this admin panel.<br>Please contact the administrator.`;
        errorEl.style.display = 'block';
    }
}

function showDashboard(user) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'flex';
    document.getElementById('adminEmail').textContent = user.email;
    loadDashboard();
    loadAvailableCourses();
    loadCategories();
}

// Load courses for autocomplete
async function loadAvailableCourses() {
    try {
        const snapshot = await db.collection('courses').orderBy('name', 'asc').get();
        availableCourses = [];
        snapshot.forEach(doc => {
            availableCourses.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const doc = await db.collection('settings').doc('categories').get();
        if (doc.exists && doc.data().list) {
            availableCategories = doc.data().list;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Save categories
async function saveCategories() {
    try {
        await db.collection('settings').doc('categories').set({ list: availableCategories });
    } catch (error) {
        console.error('Error saving categories:', error);
    }
}

// ============================================
// Section Navigation
// ============================================

function switchSection(section) {
    currentSection = section;
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) item.classList.add('active');
    });
    
    const titles = {
        dashboard: 'Dashboard',
        courses: 'Courses',
        universities: 'Universities',
        team: 'Team Members',
        testimonials: 'Testimonials',
        services: 'Services',
        inquiries: 'Inquiries',
        settings: 'Settings'
    };
    document.getElementById('sectionTitle').textContent = titles[section] || section;
    
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');
    
    loadSectionData(section);
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard': loadDashboard(); break;
        case 'courses': loadCourses(); break;
        case 'universities': loadUniversitiesAdmin(); break;
        case 'team': loadTeam(); break;
        case 'testimonials': loadTestimonials(); break;
        case 'services': loadServices(); break;
        case 'inquiries': loadInquiries(); break;
        case 'settings': loadSettings(); break;
    }
}

// ============================================
// Dashboard
// ============================================

async function loadDashboard() {
    try {
        const [inquiries, courses, universities, team] = await Promise.all([
            db.collection('inquiries').where('status', '==', 'new').get(),
            db.collection('courses').get(),
            db.collection('universities').get(),
            db.collection('team').get()
        ]);
        
        document.getElementById('statInquiries').textContent = inquiries.size;
        document.getElementById('statCourses').textContent = courses.size;
        document.getElementById('statUniversities').textContent = universities.size;
        document.getElementById('statTeam').textContent = team.size;
        document.getElementById('inquiryBadge').textContent = inquiries.size;
        
        const recentSnapshot = await db.collection('inquiries').orderBy('createdAt', 'desc').limit(5).get();
        const tbody = document.querySelector('#recentInquiriesTable tbody');
        tbody.innerHTML = '';
        
        if (recentSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No inquiries yet</td></tr>';
            return;
        }
        
        recentSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.interest || 'N/A'}</td>
                    <td><span class="status status-${data.status || 'new'}">${data.status || 'new'}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============================================
// CRUD - Courses (Master List)
// ============================================

async function loadCourses() {
    try {
        const snapshot = await db.collection('courses').orderBy('name', 'asc').get();
        const tbody = document.querySelector('#coursesTable tbody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No courses yet. Click "Add Course" to create one.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${data.image ? `<img src="${data.image}" class="table-img" alt="">` : '<i class="bi bi-journal-bookmark"></i>'}</td>
                    <td><strong>${data.name || 'N/A'}</strong></td>
                    <td>${data.level || 'Bachelor'}</td>
                    <td>${data.category || 'Other'}</td>
                    <td>${data.duration || 'N/A'}</td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('course', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('courses', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ============================================
// CRUD - Universities
// ============================================

async function loadUniversitiesAdmin() {
    try {
        const snapshot = await db.collection('universities').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#universitiesTable tbody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No universities yet. Click "Add University" to create one.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const courseCount = (data.courseOfferings || []).length;
            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.shortCode || 'N/A'}</strong></td>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.ranking ? '#' + data.ranking : 'N/A'}</td>
                    <td>${courseCount} courses</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="window.open('pages/university-detail.html?id=${doc.id}', '_blank')">View</button>
                        <button class="btn-edit" onclick="editItem('university', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('universities', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading universities:', error);
    }
}

// ============================================
// Other CRUD Operations
// ============================================

async function loadTeam() {
    try {
        const snapshot = await db.collection('team').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#teamTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No team members yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${data.photoPath || 'assets/images/logo.png'}" class="table-img" alt="${data.name}"></td>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.role || 'N/A'}</td>
                    <td><span class="status status-${data.active ? 'active' : 'inactive'}">${data.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('team', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('team', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading team:', error);
    }
}

async function loadTestimonials() {
    try {
        const snapshot = await db.collection('testimonials').orderBy('createdAt', 'desc').get();
        const tbody = document.querySelector('#testimonialsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No testimonials yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${data.photoPath || 'assets/images/logo.png'}" class="table-img" alt="${data.name}"></td>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.program || 'N/A'}</td>
                    <td><span class="status status-${data.featured ? 'active' : 'inactive'}">${data.featured ? 'Featured' : 'Hidden'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('testimonial', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('testimonials', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

async function loadServices() {
    try {
        const snapshot = await db.collection('services').orderBy('order', 'asc').get();
        const tbody = document.querySelector('#servicesTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No services yet.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${renderServiceIcon(data.icon)}</td>
                    <td>${data.title || 'N/A'}</td>
                    <td>${data.order || 0}</td>
                    <td><span class="status status-${data.active ? 'active' : 'inactive'}">${data.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="editItem('service', '${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteItem('services', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function renderServiceIcon(icon) {
    if (!icon) return '<i class="bi bi-tools"></i>';
    const trimmed = icon.trim();
    if (trimmed.startsWith('<i')) return trimmed;
    if (trimmed.startsWith('bi-')) return `<i class="bi ${trimmed}"></i>`;
    if (trimmed.startsWith('bi ')) return `<i class="${trimmed}"></i>`;
    return '<i class="bi bi-tools"></i>';
}

async function loadInquiries() {
    try {
        const filter = document.getElementById('inquiryFilter').value;
        let query = db.collection('inquiries').orderBy('createdAt', 'desc');
        
        if (filter !== 'all') {
            query = db.collection('inquiries').where('status', '==', filter).orderBy('createdAt', 'desc');
        }
        
        const snapshot = await query.get();
        const tbody = document.querySelector('#inquiriesTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No inquiries found.</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
            tbody.innerHTML += `
                <tr>
                    <td>${data.name || 'N/A'}</td>
                    <td>${data.email || 'N/A'}</td>
                    <td>${data.phone || 'N/A'}</td>
                    <td>${data.country || 'N/A'}</td>
                    <td>${data.interest || 'N/A'}</td>
                    <td>
                        <select onchange="updateInquiryStatus('${doc.id}', this.value)">
                            <option value="new" ${data.status === 'new' ? 'selected' : ''}>New</option>
                            <option value="contacted" ${data.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="converted" ${data.status === 'converted' ? 'selected' : ''}>Converted</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td class="action-btns">
                        <button class="btn-view" onclick="viewInquiry('${doc.id}')">View</button>
                        <button class="btn-delete" onclick="deleteItem('inquiries', '${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading inquiries:', error);
    }
}

async function updateInquiryStatus(docId, status) {
    try {
        await updateDocument('inquiries', docId, { status });
        loadDashboard();
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function viewInquiry(docId) {
    const doc = await getDocument('inquiries', docId);
    if (doc) {
        alert(`Name: ${doc.name}\nEmail: ${doc.email}\nPhone: ${doc.phone || 'N/A'}\nCountry: ${doc.country || 'N/A'}\nInterest: ${doc.interest}\nMessage: ${doc.message || 'N/A'}`);
    }
}

// ============================================
// Settings
// ============================================

async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('site').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('settingEmail').value = data.email || '';
            document.getElementById('settingPhone').value = data.phone || '';
            document.getElementById('settingWhatsApp').value = data.whatsapp || '';
            document.getElementById('settingHours').value = data.hours || '';
            document.getElementById('settingAddress').value = data.address || '';
            document.getElementById('settingFacebook').value = data.facebook || '';
            document.getElementById('settingInstagram').value = data.instagram || '';
            document.getElementById('settingTwitter').value = data.twitter || '';
            document.getElementById('settingYouTube').value = data.youtube || '';
            document.getElementById('settingLinkedIn').value = data.linkedin || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function handleSaveSettings(e) {
    e.preventDefault();
    
    const settings = {
        email: document.getElementById('settingEmail').value,
        phone: document.getElementById('settingPhone').value,
        whatsapp: document.getElementById('settingWhatsApp').value,
        hours: document.getElementById('settingHours').value,
        address: document.getElementById('settingAddress').value,
        facebook: document.getElementById('settingFacebook').value,
        instagram: document.getElementById('settingInstagram').value,
        twitter: document.getElementById('settingTwitter').value,
        youtube: document.getElementById('settingYouTube').value,
        linkedin: document.getElementById('settingLinkedIn').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('settings').doc('site').set(settings, { merge: true });
        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings');
    }
}

// ============================================
// Modal Functions
// ============================================

// Edit item - called by Edit buttons
function editItem(type, id) {
    openModal(type, id);
}

async function openModal(type, id = null) {
    editingType = type;
    editingId = id;
    universityCoursesTemp = [];
    
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = id ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    
    let formHTML = '';
    switch(type) {
        case 'course': formHTML = getCourseForm(); break;
        case 'university': formHTML = getUniversityForm(); break;
        case 'team': formHTML = getTeamForm(); break;
        case 'testimonial': formHTML = getTestimonialForm(); break;
        case 'service': formHTML = getServiceForm(); break;
    }
    
    modalBody.innerHTML = formHTML;
    document.getElementById('modalOverlay').classList.add('active');
    
    if (id) {
        loadItemForEdit(type, id);
    } else if (type === 'university') {
        if (availableCourses.length === 0) {
            await loadAvailableCourses();
        }
        // Initialize folder picker for new university
        setTimeout(() => {
            const container = document.getElementById('coursePickerContainer');
            if (container) container.innerHTML = renderFolderPicker();
        }, 100);
    }
}

// ============================================
// FAQ Editor Functions
// ============================================

let faqCounter = 0;

function addFaqRow(question = '', answer = '') {
    const editor = document.getElementById('faqEditor');
    const hint = document.getElementById('noFaqsHint');
    if (hint) hint.style.display = 'none';
    
    const faqId = `faq_${faqCounter++}`;
    const div = document.createElement('div');
    div.className = 'faq-row';
    div.id = faqId;
    div.style.cssText = 'background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px;';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong style="font-size: 0.875rem; color: #64748b;">FAQ Item</strong>
            <div style="display: flex; gap: 8px;">
                <button type="button" onclick="toggleFaqRow('${faqId}')" style="background: #e2e8f0; color: #334155; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Minimize</button>
                <button type="button" onclick="removeFaqRow('${faqId}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Remove</button>
            </div>
        </div>
        <div class="faq-row-body">
            <input type="text" class="faq-question" placeholder="Question" value="${question.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
            <textarea class="faq-answer" placeholder="Answer" rows="2" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; resize: vertical;">${answer}</textarea>
        </div>
    `;
    editor.appendChild(div);
}

function removeFaqRow(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
    
    // Show hint if no FAQs left
    const editor = document.getElementById('faqEditor');
    if (editor.children.length === 1) { // Only the hint remains
        const hint = document.getElementById('noFaqsHint');
        if (hint) hint.style.display = 'block';
    }
}

function toggleFaqRow(id) {
    const row = document.getElementById(id);
    if (!row) return;
    row.classList.toggle('collapsed');
    const btn = row.querySelector('button[onclick^="toggleFaqRow"]');
    if (btn) {
        btn.textContent = row.classList.contains('collapsed') ? 'Expand' : 'Minimize';
    }
}

function getFaqsFromEditor() {
    const faqs = [];
    document.querySelectorAll('.faq-row').forEach(row => {
        const question = row.querySelector('.faq-question').value.trim();
        const answer = row.querySelector('.faq-answer').value.trim();
        if (question && answer) {
            faqs.push({ question, answer });
        }
    });
    return faqs;
}

function renderMonthPicker(selected = []) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const options = months.map(m => `
        <label class="month-option">
            <input type="checkbox" value="${m}" ${selected.includes(m) ? 'checked' : ''} onchange="updateMonthSummary()">
            <span>${m}</span>
        </label>
    `).join('');
    return `
        <button type="button" class="month-dropdown-toggle" onclick="toggleMonthDropdown()">
            <span id="monthSummary">Select months</span>
            <i class="bi bi-chevron-down"></i>
        </button>
        <div class="month-dropdown-menu">
            ${options}
        </div>
    `;
}

function getSelectedMonths() {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
}

function setSelectedMonths(months) {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = months.includes(cb.value);
    });
    updateMonthSummary();
}

function toggleMonthDropdown() {
    const container = document.getElementById('itemIntakeMonths');
    if (!container) return;
    container.classList.toggle('open');
}

function updateMonthSummary() {
    const selected = getSelectedMonths();
    const summary = document.getElementById('monthSummary');
    if (!summary) return;
    summary.textContent = selected.length ? selected.join(', ') : 'Select months';
}

function stepperChange(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const min = parseInt(input.min || '1', 10);
    const max = parseInt(input.max || '50', 10);
    const current = parseInt(input.value || min, 10);
    const next = Math.min(max, Math.max(min, current + delta));
    input.value = next;
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    editingId = null;
    editingType = null;
    universityCoursesTemp = [];
}

// ============================================
// Form Templates
// ============================================

function getCourseForm() {
    const folderOptions = courseFolders.map(f => 
        `<option value="${f.id}">${f.name}</option>`
    ).join('');
    
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Course Name *</label>
                <input type="text" id="itemName" required placeholder="Computer Science">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Folder *</label>
                    <select id="itemFolder" required>
                        <option value="">Select a folder...</option>
                        ${folderOptions}
                    </select>
                    <p class="form-hint" style="color: #64748b; font-size: 0.8125rem;">Create folders first in Courses section</p>
                </div>
                <div class="form-group">
                    <label>Level *</label>
                    <select id="itemLevel" required>
                        <option value="Foundation">Foundation</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Bachelor" selected>Bachelor</option>
                        <option value="Masters">Masters</option>
                        <option value="PhD">PhD</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Duration</label>
                    <input type="text" id="itemDuration" placeholder="4 years">
                </div>
                <div class="form-group">
                    <label>Credits</label>
                    <input type="text" id="itemCredits" placeholder="120 credits">
                </div>
            </div>
            <div class="form-group">
                <label>Image Path</label>
                <input type="text" id="itemImage" placeholder="assets/images/course-cs.jpg">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="itemDescription" placeholder="Course description..."></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Course</button>
            </div>
        </form>
    `;
}

function getUniversityForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Short Code *</label>
                    <input type="text" id="itemShortCode" required placeholder="UM" maxlength="10">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>University Name *</label>
                <input type="text" id="itemName" required placeholder="University of Malaya">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="itemLocation" placeholder="Kuala Lumpur">
                </div>
                <div class="form-group">
                    <label>QS Ranking</label>
                    <input type="number" id="itemRanking" placeholder="65">
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Content Sections</h4>
            
            <div class="form-group">
                <label>Intro Text (short description for header)</label>
                <textarea id="itemIntro" placeholder="Brief introduction shown at the top..." rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>About Content (detailed description, can include HTML)</label>
                <textarea id="itemAboutContent" placeholder="Full university description. You can use HTML tags for formatting..." rows="5"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Logo Image Path</label>
                    <input type="text" id="itemLogo" placeholder="assets/universities/um-logo.png">
                </div>
                <div class="form-group">
                    <label>Campus Image Path</label>
                    <input type="text" id="itemCampusImage" placeholder="assets/universities/um-campus.jpg">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>YouTube Video ID</label>
                    <input type="text" id="itemYouTube" placeholder="dQw4w9WgXcQ">
                </div>
                <div class="form-group">
                    <label>Accommodation Search Term</label>
                    <input type="text" id="itemAccommodation" placeholder="Petaling+Jaya">
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Intake & Quick Info</h4>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Next Intake Date (for countdown)</label>
                    <input type="date" id="itemNextIntake">
                </div>
                <div class="form-group">
                    <label>Intake Months</label>
                    <div class="month-dropdown" id="itemIntakeMonths">
                        ${renderMonthPicker()}
                    </div>
                </div>
            </div>
            <div class="checkbox-group" style="margin-bottom: 16px;">
                <input type="checkbox" id="itemOfferLetterFree" checked>
                <label for="itemOfferLetterFree">Offer Letter is Free</label>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Courses Offered</h4>
            
            <div class="form-group">
                <div class="course-picker" id="coursePickerContainer">
                    <!-- Folder picker rendered dynamically -->
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> FAQs</h4>
            
            <div class="form-group">
                <div id="faqEditor">
                    <p class="empty-hint" id="noFaqsHint">No FAQs added. Click button below to add.</p>
                </div>
                <button type="button" class="btn btn-outline" onclick="addFaqRow()" style="margin-top: 10px;">+ Add FAQ</button>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active (visible on website)</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save University</button>
            </div>
        </form>
    `;
}

// ============================================
// Course Picker Functions
// ============================================

function filterCourses(query) {
    const suggestionsDiv = document.getElementById('courseSuggestions');
    
    if (!query || query.length < 2) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    const queryLower = query.toLowerCase();
    const matches = availableCourses.filter(c => 
        c.name.toLowerCase().includes(queryLower) &&
        !universityCoursesTemp.some(uc => uc.courseId === c.id)
    );
    
    let html = '';
    
    if (matches.length > 0) {
        html = matches.slice(0, 5).map(c => `
            <div class="suggestion-item" onclick="selectCourse('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.level}')">
                <strong>${c.name}</strong>
                <span>${c.level} • ${c.category || 'Other'}</span>
            </div>
        `).join('');
    }
    
    // Add "Create new" option
    const exactMatch = availableCourses.some(c => c.name.toLowerCase() === queryLower);
    if (!exactMatch) {
        html += `
            <div class="suggestion-item create-new" onclick="createAndSelectCourse('${query.replace(/'/g, "\\'")}')">
                <strong>+ Create "${query}"</strong>
                <span>Add as new course in Other category</span>
            </div>
        `;
    }
    
    suggestionsDiv.innerHTML = html;
    suggestionsDiv.style.display = 'block';
}

function selectCourse(courseId, courseName, courseLevel) {
    // Hide suggestions
    document.getElementById('courseSuggestions').style.display = 'none';
    document.getElementById('courseSearchInput').value = '';
    
    // Add to temp array
    universityCoursesTemp.push({
        courseId: courseId,
        name: courseName,
        level: courseLevel,
        fees: 0,
        currency: 'MYR',
        durationYears: 3,
        intake: ['September']
    });
    
    renderSelectedCourses();
}

async function createAndSelectCourse(courseName) {
    // Create course silently in "Other" category
    try {
        const newCourse = {
            name: courseName,
            level: 'Bachelor',
            category: 'Other',
            duration: '4 years',
            description: '',
            image: ''
        };
        
        const docId = await addDocument('courses', newCourse);
        
        // Add to available courses
        availableCourses.push({ id: docId, ...newCourse });
        
        // Select it
        selectCourse(docId, courseName, 'Bachelor');
        
    } catch (error) {
        console.error('Error creating course:', error);
        alert('Error creating course');
    }
}

function renderSelectedCourses() {
    const container = document.getElementById('selectedCourses');
    const hint = document.getElementById('noCoursesHint');
    
    if (universityCoursesTemp.length === 0) {
        hint.style.display = 'block';
        container.innerHTML = '<p class="empty-hint" id="noCoursesHint">No courses added yet. Search above to add courses.</p>';
        return;
    }
    
    container.innerHTML = '';
}

function removeCourse(index) {
    universityCoursesTemp.splice(index, 1);
    renderSelectedCourses();
}

function updateCourseFees(index, fees) {
    universityCoursesTemp[index].fees = parseInt(fees) || 0;
}

function updateCourseCurrency(index, currency) {
    universityCoursesTemp[index].currency = currency;
}

function updateCourseDuration(index, years) {
    universityCoursesTemp[index].durationYears = parseInt(years) || 1;
}

function updateCourseIntake(index, intake) {
    if (intake === 'Both') {
        universityCoursesTemp[index].intake = ['September', 'February'];
    } else {
        universityCoursesTemp[index].intake = [intake];
    }
}

// ============================================
// Category Management
// ============================================

function addNewCategory() {
    const newCat = prompt('Enter new category name:');
    if (newCat && newCat.trim()) {
        const trimmed = newCat.trim();
        if (!availableCategories.includes(trimmed)) {
            availableCategories.push(trimmed);
            saveCategories();
            
            // Update dropdown
            const select = document.getElementById('itemCategory');
            const option = document.createElement('option');
            option.value = trimmed;
            option.textContent = trimmed;
            option.selected = true;
            select.appendChild(option);
        }
    }
}

// ============================================
// Other Form Templates
// ============================================

function getTeamForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="itemName" required placeholder="Dr. Ahmad Mokadam">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Role *</label>
                    <input type="text" id="itemRole" required placeholder="Founder & Lead Counselor">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Bio</label>
                <textarea id="itemBio" placeholder="Short biography..."></textarea>
            </div>
            <div class="form-group">
                <label>Photo Path</label>
                <input type="text" id="itemPhoto" placeholder="assets/images/team-ahmad.webp">
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

function getTestimonialForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Student Name *</label>
                <input type="text" id="itemName" required placeholder="Ahmed Khan">
            </div>
            <div class="form-group">
                <label>Program *</label>
                <input type="text" id="itemProgram" required placeholder="BSc Computer Science @ UTM">
            </div>
            <div class="form-group">
                <label>Testimonial Quote *</label>
                <textarea id="itemQuote" required placeholder="What the student said..."></textarea>
            </div>
            <div class="form-group">
                <label>Photo Path</label>
                <input type="text" id="itemPhoto" placeholder="assets/images/student.webp">
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemFeatured" checked>
                <label for="itemFeatured">Featured (show on homepage)</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

function getServiceForm() {
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>Icon (Emoji)</label>
                    <input type="text" id="itemIcon" placeholder="bi-chat-dots" maxlength="30">
                </div>
                <div class="form-group">
                    <label>Order</label>
                    <input type="number" id="itemOrder" value="1" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="itemTitle" required placeholder="Free Consultation">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="itemDescription" placeholder="Service description..."></textarea>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="itemActive" checked>
                <label for="itemActive">Active</label>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-cancel" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `;
}

// ============================================
// Load Item for Editing
// ============================================

async function loadItemForEdit(type, id) {
    const collectionMap = {
        course: 'courses',
        university: 'universities',
        team: 'team',
        testimonial: 'testimonials',
        service: 'services'
    };
    
    try {
        const doc = await getDocument(collectionMap[type], id);
        if (!doc) return;
        
        switch(type) {
            case 'course':
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemLevel').value = doc.level || 'Bachelor';
                document.getElementById('itemFolder').value = doc.folderId || '';
                document.getElementById('itemDuration').value = doc.duration || '';
                document.getElementById('itemCredits').value = doc.credits || '';
                document.getElementById('itemImage').value = doc.image || '';
                document.getElementById('itemDescription').value = doc.description || '';
                break;
                
            case 'university':
                document.getElementById('itemShortCode').value = doc.shortCode || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemLocation').value = doc.location || '';
                document.getElementById('itemRanking').value = doc.ranking || '';
                document.getElementById('itemIntro').value = doc.intro || '';
                document.getElementById('itemAboutContent').value = doc.aboutContent || doc.overview || '';
                document.getElementById('itemLogo').value = doc.logo || '';
                document.getElementById('itemCampusImage').value = doc.image || '';
                document.getElementById('itemYouTube').value = doc.youtubeVideo || '';
                document.getElementById('itemAccommodation').value = doc.accommodationSearch || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                
                // New fields
                if (doc.nextIntakeDate) {
                    const date = doc.nextIntakeDate.toDate ? doc.nextIntakeDate.toDate() : new Date(doc.nextIntakeDate);
                    document.getElementById('itemNextIntake').value = date.toISOString().split('T')[0];
                }
                setSelectedMonths(doc.intakeMonths || []);
                document.getElementById('itemOfferLetterFree').checked = doc.offerLetterFree !== false;
                
                // Load FAQs
                if (doc.faqs && doc.faqs.length > 0) {
                    doc.faqs.forEach(faq => addFaqRow(faq.question, faq.answer));
                }
                
                // Load course offerings
                if (doc.courseOfferings && doc.courseOfferings.length > 0) {
                    universityCoursesTemp = doc.courseOfferings.map(co => {
                        const course = availableCourses.find(c => c.id === co.courseId);
                        return {
                            courseId: co.courseId,
                            courseName: course ? course.name : 'Unknown Course',
                            level: course ? course.level : 'Bachelor',
                            category: course ? course.category : 'Other',
                            fees: co.fees || 0,
                            currency: co.currency || 'MYR',
                            durationYears: co.durationYears || 3,
                            intake: co.intake || ['September']
                        };
                    });
                }
                // Initialize folder picker
                setTimeout(() => {
                    const container = document.getElementById('coursePickerContainer');
                    if (container) container.innerHTML = renderFolderPicker();
                    setIndeterminateStates();
                }, 100);
                break;
                
            case 'team':
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemRole').value = doc.role || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemBio').value = doc.bio || '';
                document.getElementById('itemPhoto').value = doc.photoPath || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                break;
                
            case 'testimonial':
                document.getElementById('itemName').value = doc.name || '';
                document.getElementById('itemProgram').value = doc.program || '';
                document.getElementById('itemQuote').value = doc.quote || '';
                document.getElementById('itemPhoto').value = doc.photoPath || '';
                document.getElementById('itemFeatured').checked = doc.featured !== false;
                break;
                
            case 'service':
                document.getElementById('itemIcon').value = doc.icon || '';
                document.getElementById('itemOrder').value = doc.order || 1;
                document.getElementById('itemTitle').value = doc.title || '';
                document.getElementById('itemDescription').value = doc.description || '';
                document.getElementById('itemActive').checked = doc.active !== false;
                break;
        }
    } catch (error) {
        console.error('Error loading item:', error);
    }
}

// ============================================
// Save Item
// ============================================

async function saveItem(e) {
    e.preventDefault();
    
    const collectionMap = {
        course: 'courses',
        university: 'universities',
        team: 'team',
        testimonial: 'testimonials',
        service: 'services'
    };
    
    let data = {};
    
    switch(editingType) {
        case 'course':
            const folderVal = document.getElementById('itemFolder').value;
            // Get folder name as category
            const selectedFolder = courseFolders.find(f => f.id === folderVal);
            data = {
                name: document.getElementById('itemName').value,
                level: document.getElementById('itemLevel').value,
                folderId: folderVal || null,
                category: selectedFolder ? selectedFolder.name : 'Uncategorized',
                duration: document.getElementById('itemDuration').value,
                credits: document.getElementById('itemCredits').value,
                image: document.getElementById('itemImage').value,
                description: document.getElementById('itemDescription').value
            };
            break;
            
        case 'university':
            // Build course offerings from temp array
            const courseOfferings = universityCoursesTemp.map(c => ({
                courseId: c.courseId,
                fees: c.fees,
                currency: c.currency || 'MYR',
                durationYears: c.durationYears || 3,
                intake: c.intake
            }));
            
            // Parse intake months from picker
            const intakeMonths = getSelectedMonths();
            
            // Parse next intake date
            const nextIntakeDateStr = document.getElementById('itemNextIntake').value;
            const nextIntakeDate = nextIntakeDateStr ? new Date(nextIntakeDateStr) : null;
            
            data = {
                shortCode: document.getElementById('itemShortCode').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                name: document.getElementById('itemName').value,
                location: document.getElementById('itemLocation').value,
                ranking: parseInt(document.getElementById('itemRanking').value) || null,
                intro: document.getElementById('itemIntro').value,
                aboutContent: document.getElementById('itemAboutContent').value,
                logo: document.getElementById('itemLogo').value,
                image: document.getElementById('itemCampusImage').value,
                youtubeVideo: document.getElementById('itemYouTube').value,
                accommodationSearch: document.getElementById('itemAccommodation').value,
                nextIntakeDate: nextIntakeDate,
                intakeMonths: intakeMonths,
                offerLetterFree: document.getElementById('itemOfferLetterFree').checked,
                faqs: getFaqsFromEditor(),
                courseOfferings: courseOfferings,
                active: document.getElementById('itemActive').checked
            };
            break;
            
        case 'team':
            data = {
                name: document.getElementById('itemName').value,
                role: document.getElementById('itemRole').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                bio: document.getElementById('itemBio').value,
                photoPath: document.getElementById('itemPhoto').value,
                active: document.getElementById('itemActive').checked
            };
            break;
            
        case 'testimonial':
            data = {
                name: document.getElementById('itemName').value,
                program: document.getElementById('itemProgram').value,
                quote: document.getElementById('itemQuote').value,
                photoPath: document.getElementById('itemPhoto').value,
                featured: document.getElementById('itemFeatured').checked
            };
            break;
            
        case 'service':
            data = {
                icon: document.getElementById('itemIcon').value,
                order: parseInt(document.getElementById('itemOrder').value) || 1,
                title: document.getElementById('itemTitle').value,
                description: document.getElementById('itemDescription').value,
                active: document.getElementById('itemActive').checked
            };
            break;
    }
    
    try {
        if (editingId) {
            await updateDocument(collectionMap[editingType], editingId, data);
        } else {
            await addDocument(collectionMap[editingType], data);
        }
        
        closeModal();
        loadSectionData(currentSection);
        
        // Refresh courses cache
        if (editingType === 'course') {
            loadAvailableCourses();
        }
        
        alert('Saved successfully!');
    } catch (error) {
        console.error('Error saving:', error);
        alert('Error saving. Please try again.');
    }
}

// ============================================
// Delete Item
// ============================================

async function deleteItem(collection, id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        await deleteDocument(collection, id);
        loadSectionData(currentSection);
        loadDashboard();
        loadAvailableCourses();
    } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting item');
    }
}

// ============================================
// FOLDER MANAGEMENT
// ============================================

let courseFolders = [];
let draggedCourseId = null;
let openPickerFolders = new Set();

// Load folders and courses with folder tree view
async function loadCoursesWithFolders() {
    const folderTree = document.getElementById('folderTree');
    if (!folderTree) return;
    
    try {
        // Load folders
        const foldersSnap = await db.collection('courseFolders').orderBy('order', 'asc').get();
        courseFolders = [];
        foldersSnap.forEach(doc => {
            courseFolders.push({ id: doc.id, ...doc.data() });
        });
        
        // Load all courses
        const coursesSnap = await db.collection('courses').orderBy('name', 'asc').get();
        const allCourses = [];
        coursesSnap.forEach(doc => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });
        
        // Group courses by folder
        const coursesByFolder = {};
        const uncategorized = [];
        
        allCourses.forEach(course => {
            if (course.folderId && courseFolders.some(f => f.id === course.folderId)) {
                if (!coursesByFolder[course.folderId]) {
                    coursesByFolder[course.folderId] = [];
                }
                coursesByFolder[course.folderId].push(course);
            } else {
                uncategorized.push(course);
            }
        });
        
        // Render folder tree
        let html = '';
        
        // Render folders
        courseFolders.forEach(folder => {
            const courses = coursesByFolder[folder.id] || [];
            html += renderFolder(folder, courses);
        });
        
        // Render uncategorized
        if (uncategorized.length > 0 || courseFolders.length === 0) {
            html += renderUncategorizedSection(uncategorized);
        }
        
        if (html === '') {
            html = '<div class="loading-state">No courses yet. Click "+ Add Course" to create one.</div>';
        }
        
        folderTree.innerHTML = html;
        setupDragAndDrop();
        
    } catch (error) {
        console.error('Error loading courses with folders:', error);
        folderTree.innerHTML = '<div class="loading-state">Error loading courses</div>';
    }
}

function renderFolder(folder, courses) {
    const coursesHTML = courses.map(c => renderCourseRow(c)).join('');
    return `
        <div class="folder-item" data-folder-id="${folder.id}">
            <div class="folder-header" onclick="toggleFolder('${folder.id}')" 
                 ondragover="handleDragOver(event, '${folder.id}')"
                 ondragleave="handleDragLeave(event)"
                 ondrop="handleDrop(event, '${folder.id}')">
                <span class="folder-toggle">▶</span>
                <span class="folder-icon"><i class="bi bi-folder2"></i></span>
                <span class="folder-name">${folder.name}</span>
                <span class="folder-count">${courses.length}</span>
                <div class="folder-actions" onclick="event.stopPropagation()">
                    <button onclick="renameFolder('${folder.id}', '${folder.name.replace(/'/g, "\\'")}')">Rename</button>
                    <button class="btn-delete-folder" onclick="deleteFolder('${folder.id}')">Delete</button>
                </div>
            </div>
            <div class="folder-courses">
                ${coursesHTML || '<div class="empty-hint" style="padding: 16px 52px; font-size: 0.875rem;">No courses in this folder</div>'}
            </div>
        </div>
    `;
}

function renderUncategorizedSection(courses) {
    const coursesHTML = courses.map(c => renderCourseRow(c)).join('');
    return `
        <div class="uncategorized-section">
            <div class="uncategorized-header"
                 ondragover="handleDragOver(event, null)"
                 ondragleave="handleDragLeave(event)"
                 ondrop="handleDrop(event, null)">
                <span><i class="bi bi-collection"></i></span>
                <span>Uncategorized (${courses.length})</span>
            </div>
            <div class="folder-courses" style="display: block;">
                ${coursesHTML}
            </div>
        </div>
    `;
}

function renderCourseRow(course) {
    return `
        <div class="course-row" draggable="true" data-course-id="${course.id}"
             ondragstart="handleDragStart(event, '${course.id}')"
             ondragend="handleDragEnd(event)">
            <span class="course-drag-handle">⋮⋮</span>
            <div class="course-row-info">
                <strong>${course.name || 'Untitled'}</strong>
                <span>${course.level || 'Bachelor'} • ${course.category || 'Other'}</span>
            </div>
            <div class="action-btns">
                <button class="btn-edit" onclick="editItem('course', '${course.id}')">Edit</button>
                <button class="btn-delete" onclick="deleteItem('courses', '${course.id}')">Delete</button>
            </div>
        </div>
    `;
}

function toggleFolder(folderId) {
    const folderEl = document.querySelector(`.folder-item[data-folder-id="${folderId}"]`);
    if (folderEl) {
        folderEl.classList.toggle('open');
    }
}

// Folder CRUD
function openFolderModal() {
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
        createFolder(name.trim());
    }
}

async function createFolder(name) {
    try {
        const order = courseFolders.length + 1;
        await db.collection('courseFolders').add({ name, order, createdAt: new Date() });
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error creating folder:', error);
        alert('Error creating folder');
    }
}

async function renameFolder(folderId, currentName) {
    const newName = prompt('Rename folder:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
        try {
            await db.collection('courseFolders').doc(folderId).update({ name: newName.trim() });
            loadCoursesWithFolders();
        } catch (error) {
            console.error('Error renaming folder:', error);
            alert('Error renaming folder');
        }
    }
}

async function deleteFolder(folderId) {
    if (!confirm('Delete this folder? Courses will be moved to Uncategorized.')) return;
    
    try {
        // Move courses to uncategorized
        const coursesSnap = await db.collection('courses').where('folderId', '==', folderId).get();
        const batch = db.batch();
        coursesSnap.forEach(doc => {
            batch.update(doc.ref, { folderId: null });
        });
        
        // Delete folder
        batch.delete(db.collection('courseFolders').doc(folderId));
        await batch.commit();
        
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error deleting folder:', error);
        alert('Error deleting folder');
    }
}

// Drag and Drop
function setupDragAndDrop() {
    // Drag and drop is handled via inline event handlers
}

function handleDragStart(event, courseId) {
    draggedCourseId = courseId;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', courseId);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedCourseId = null;
}

function handleDragOver(event, folderId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event, folderId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const courseId = event.dataTransfer.getData('text/plain') || draggedCourseId;
    if (!courseId) return;
    
    try {
        await db.collection('courses').doc(courseId).update({ folderId: folderId });
        loadCoursesWithFolders();
    } catch (error) {
        console.error('Error moving course:', error);
        alert('Error moving course');
    }
}

// Override original loadCourses
async function loadCourses() {
    await loadCoursesWithFolders();
}

// ============================================
// FOLDER PICKER FOR UNIVERSITY FORM
// ============================================

function renderFolderPicker() {
    let html = '<div class="folder-picker" id="folderPickerContainer">';
    
    // Group available courses by folder
    const coursesByFolder = {};
    const uncategorized = [];
    
    availableCourses.forEach(course => {
        if (course.folderId) {
            if (!coursesByFolder[course.folderId]) {
                coursesByFolder[course.folderId] = [];
            }
            coursesByFolder[course.folderId].push(course);
        } else {
            uncategorized.push(course);
        }
    });
    
    // Render folders
    courseFolders.forEach(folder => {
        const courses = coursesByFolder[folder.id] || [];
        if (courses.length > 0) {
            html += renderPickerFolder(folder, courses);
        }
    });
    
    // Render uncategorized
    if (uncategorized.length > 0) {
        html += renderPickerFolder({ id: 'uncategorized', name: 'Uncategorized' }, uncategorized);
    }
    
    html += '</div>';
    html += '<div class="selected-summary" id="selectedSummary">0 courses selected</div>';
    
    return html;
}

function renderPickerFolder(folder, courses) {
    const coursesHTML = courses.map(c => {
        const isSelected = universityCoursesTemp.some(uc => uc.courseId === c.id);
        const selectedCourse = isSelected ? universityCoursesTemp.find(uc => uc.courseId === c.id) : null;
        const feesVal = selectedCourse ? selectedCourse.fees : '';
        const currencyVal = selectedCourse ? selectedCourse.currency : 'MYR';
        const durationVal = selectedCourse ? selectedCourse.durationYears : 3;
        return `
            <div class="picker-course" data-course-row="${c.id}">
                <div class="picker-course-main" onclick="togglePickerCourse('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.level}')">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-course-id="${c.id}">
                    <div class="picker-course-info">
                        <strong>${c.name}</strong>
                        <span>${c.level} • ${c.category || 'Other'}</span>
                    </div>
                </div>
                <div class="picker-course-fields ${isSelected ? '' : 'disabled'}">
                    <div class="mini-field">
                        <label>Amount / Year</label>
                        <input type="number" value="${feesVal}" placeholder="25000" ${isSelected ? '' : 'disabled'} onchange="updateCourseFeesById('${c.id}', this.value)">
                    </div>
                    <div class="mini-field">
                        <label>Currency</label>
                        <select ${isSelected ? '' : 'disabled'} onchange="updateCourseCurrencyById('${c.id}', this.value)">
                            <option value="MYR" ${currencyVal === 'MYR' ? 'selected' : ''}>MYR</option>
                            <option value="USD" ${currencyVal === 'USD' ? 'selected' : ''}>USD</option>
                            <option value="GBP" ${currencyVal === 'GBP' ? 'selected' : ''}>GBP</option>
                            <option value="EUR" ${currencyVal === 'EUR' ? 'selected' : ''}>EUR</option>
                            <option value="SAR" ${currencyVal === 'SAR' ? 'selected' : ''}>SAR</option>
                            <option value="AED" ${currencyVal === 'AED' ? 'selected' : ''}>AED</option>
                            <option value="PKR" ${currencyVal === 'PKR' ? 'selected' : ''}>PKR</option>
                            <option value="BDT" ${currencyVal === 'BDT' ? 'selected' : ''}>BDT</option>
                            <option value="NGN" ${currencyVal === 'NGN' ? 'selected' : ''}>NGN</option>
                        </select>
                    </div>
                    <div class="mini-field">
                        <label>Duration (Years)</label>
                        <input type="number" value="${durationVal}" min="1" max="10" step="1" ${isSelected ? '' : 'disabled'} onchange="updateCourseDurationById('${c.id}', this.value)">
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const allSelected = courses.every(c => universityCoursesTemp.some(uc => uc.courseId === c.id));
    const someSelected = courses.some(c => universityCoursesTemp.some(uc => uc.courseId === c.id));
    
    const isOpen = openPickerFolders.has(folder.id);
    return `
        <div class="picker-folder${isOpen ? ' open' : ''}" data-picker-folder="${folder.id}">
            <div class="picker-folder-header" onclick="togglePickerFolder('${folder.id}')">
                <input type="checkbox" 
                       ${allSelected ? 'checked' : ''} 
                       ${someSelected && !allSelected ? 'class="indeterminate"' : ''}
                       onclick="event.stopPropagation(); toggleFolderSelection('${folder.id}')"
                       data-folder-checkbox="${folder.id}">
                <span class="picker-folder-toggle">▶</span>
                <span class="picker-folder-name">${folder.name}</span>
                <span class="picker-folder-count">${courses.length} courses</span>
            </div>
            <div class="picker-courses">
                ${coursesHTML}
            </div>
        </div>
    `;
}

function togglePickerFolder(folderId) {
    const el = document.querySelector(`.picker-folder[data-picker-folder="${folderId}"]`);
    if (el) {
        el.classList.toggle('open');
        if (el.classList.contains('open')) {
            openPickerFolders.add(folderId);
        } else {
            openPickerFolders.delete(folderId);
        }
    }
}

function toggleFolderSelection(folderId) {
    const checkbox = document.querySelector(`[data-folder-checkbox="${folderId}"]`);
    const shouldSelect = checkbox.checked;
    
    // Get courses in this folder
    const folderCourses = folderId === 'uncategorized' 
        ? availableCourses.filter(c => !c.folderId)
        : availableCourses.filter(c => c.folderId === folderId);
    
    folderCourses.forEach(course => {
        const idx = universityCoursesTemp.findIndex(uc => uc.courseId === course.id);
        if (shouldSelect && idx === -1) {
            universityCoursesTemp.push({
                courseId: course.id,
                courseName: course.name,
                level: course.level,
                fees: '',
                category: course.category || 'Other',
                currency: 'MYR',
                durationYears: 3,
                intake: ['September']
            });
        } else if (!shouldSelect && idx !== -1) {
            universityCoursesTemp.splice(idx, 1);
        }
    });
    
    refreshFolderPicker();
}

function togglePickerCourse(courseId, courseName, level) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    
    if (idx !== -1) {
        universityCoursesTemp.splice(idx, 1);
    } else {
        const course = availableCourses.find(c => c.id === courseId);
        universityCoursesTemp.push({
            courseId: courseId,
            courseName: courseName,
            level: level,
            fees: '',
            category: course?.category || 'Other',
            currency: 'MYR',
            durationYears: 3,
            intake: ['September']
        });
    }
    
    refreshFolderPicker();
}

function updateCourseFeesById(courseId, fees) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp[idx].fees = parseInt(fees) || 0;
}

function updateCourseCurrencyById(courseId, currency) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp[idx].currency = currency;
}

function updateCourseDurationById(courseId, years) {
    const idx = universityCoursesTemp.findIndex(uc => uc.courseId === courseId);
    if (idx === -1) return;
    universityCoursesTemp[idx].durationYears = parseInt(years) || 1;
}

function refreshFolderPicker() {
    const container = document.querySelector('.course-picker');
    if (container) {
        container.innerHTML = renderFolderPicker();
        updateSelectedSummary();
        // Re-apply indeterminate states
        setIndeterminateStates();
    }
}

function updateSelectedSummary() {
    const summaryEl = document.getElementById('selectedSummary');
    if (summaryEl) {
        summaryEl.textContent = `${universityCoursesTemp.length} courses selected`;
    }
}

function setIndeterminateStates() {
    courseFolders.concat([{ id: 'uncategorized' }]).forEach(folder => {
        const folderCourses = folder.id === 'uncategorized'
            ? availableCourses.filter(c => !c.folderId)
            : availableCourses.filter(c => c.folderId === folder.id);
        
        if (folderCourses.length === 0) return;
        
        const selectedCount = folderCourses.filter(c => 
            universityCoursesTemp.some(uc => uc.courseId === c.id)
        ).length;
        
        const checkbox = document.querySelector(`[data-folder-checkbox="${folder.id}"]`);
        if (checkbox) {
            checkbox.indeterminate = selectedCount > 0 && selectedCount < folderCourses.length;
        }
    });
}

// Load folders when loading available courses
const originalLoadAvailableCourses = loadAvailableCourses;
loadAvailableCourses = async function() {
    await originalLoadAvailableCourses.call(this);
    
    // Also load folders
    try {
        const foldersSnap = await db.collection('courseFolders').orderBy('order', 'asc').get();
        courseFolders = [];
        foldersSnap.forEach(doc => {
            courseFolders.push({ id: doc.id, ...doc.data() });
        });
        
        // Add folderId to available courses
        const coursesSnap = await db.collection('courses').get();
        coursesSnap.forEach(doc => {
            const course = availableCourses.find(c => c.id === doc.id);
            if (course) {
                course.folderId = doc.data().folderId || null;
            }
        });
    } catch (error) {
        console.error('Error loading folders:', error);
    }
};
