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
                    <td>${data.image ? `<img src="${data.image}" class="table-img" alt="">` : '📚'}</td>
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
                    <td>${data.icon || '🛠️'}</td>
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

function openModal(type, id = null) {
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
    
    if (id) loadItemForEdit(type, id);
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
            <button type="button" onclick="removeFaqRow('${faqId}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">Remove</button>
        </div>
        <input type="text" class="faq-question" placeholder="Question" value="${question.replace(/"/g, '&quot;')}" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
        <textarea class="faq-answer" placeholder="Answer" rows="2" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; resize: vertical;">${answer}</textarea>
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
    const categoryOptions = availableCategories.map(cat => 
        `<option value="${cat}">${cat}</option>`
    ).join('');
    
    return `
        <form id="itemForm" onsubmit="saveItem(event)">
            <div class="form-group">
                <label>Course Name *</label>
                <input type="text" id="itemName" required placeholder="Computer Science">
            </div>
            <div class="form-row">
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
                <div class="form-group">
                    <label>Category *</label>
                    <select id="itemCategory" required>
                        ${categoryOptions}
                    </select>
                    <p class="form-hint"><a href="#" onclick="addNewCategory(); return false;">+ Add new category</a></p>
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
                    <label>Intake Months (comma-separated)</label>
                    <input type="text" id="itemIntakeMonths" placeholder="Jan, Jul, Sep">
                </div>
            </div>
            <div class="checkbox-group" style="margin-bottom: 16px;">
                <input type="checkbox" id="itemOfferLetterFree" checked>
                <label for="itemOfferLetterFree">Offer Letter is Free</label>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> FAQs</h4>
            
            <div class="form-group">
                <div id="faqEditor">
                    <p class="empty-hint" id="noFaqsHint">No FAQs added. Click button below to add.</p>
                </div>
                <button type="button" class="btn btn-outline" onclick="addFaqRow()" style="margin-top: 10px;">+ Add FAQ</button>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
            <h4 style="margin-bottom: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Courses Offered</h4>
            
            <div class="form-group">
                <div class="course-picker">
                    <div class="course-search-container">
                        <input type="text" id="courseSearchInput" placeholder="Search courses or type to create new..." oninput="filterCourses(this.value)" autocomplete="off">
                        <div class="course-suggestions" id="courseSuggestions"></div>
                    </div>
                    <div class="selected-courses" id="selectedCourses">
                        <p class="empty-hint" id="noCoursesHint">No courses added yet. Search above to add courses.</p>
                    </div>
                </div>
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
    
    container.innerHTML = universityCoursesTemp.map((c, index) => `
        <div class="selected-course-item">
            <div class="course-info-row">
                <strong>${c.name}</strong>
                <span class="course-level">${c.level}</span>
                <button type="button" class="btn-remove" onclick="removeCourse(${index})">×</button>
            </div>
            <div class="course-fields">
                <div class="mini-field">
                    <label>Fees (MYR/year)</label>
                    <input type="number" value="${c.fees}" onchange="updateCourseFees(${index}, this.value)" placeholder="25000">
                </div>
                <div class="mini-field">
                    <label>Intake</label>
                    <select onchange="updateCourseIntake(${index}, this.value)">
                        <option value="September" ${c.intake.includes('September') ? 'selected' : ''}>September</option>
                        <option value="February" ${c.intake.includes('February') ? 'selected' : ''}>February</option>
                        <option value="Both" ${c.intake.length > 1 ? 'selected' : ''}>Both</option>
                    </select>
                </div>
            </div>
        </div>
    `).join('');
}

function removeCourse(index) {
    universityCoursesTemp.splice(index, 1);
    renderSelectedCourses();
}

function updateCourseFees(index, fees) {
    universityCoursesTemp[index].fees = parseInt(fees) || 0;
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
                    <input type="text" id="itemIcon" placeholder="💬" maxlength="5">
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
                document.getElementById('itemCategory').value = doc.category || 'Other';
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
                document.getElementById('itemIntakeMonths').value = doc.intakeMonths?.join(', ') || '';
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
                            name: course ? course.name : 'Unknown Course',
                            level: course ? course.level : 'Bachelor',
                            category: course ? course.category : 'Other',
                            fees: co.fees || 0,
                            intake: co.intake || ['September']
                        };
                    });
                    renderSelectedCourses();
                }
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
            data = {
                name: document.getElementById('itemName').value,
                level: document.getElementById('itemLevel').value,
                category: document.getElementById('itemCategory').value,
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
                intake: c.intake
            }));
            
            // Parse intake months
            const intakeMonthsStr = document.getElementById('itemIntakeMonths').value;
            const intakeMonths = intakeMonthsStr ? intakeMonthsStr.split(',').map(m => m.trim()).filter(m => m) : [];
            
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
