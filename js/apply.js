/* ============================================
   Apply Page Logic - AL-Mokadam Educational Agency
   ============================================ */

let selectedUniversity = null;
let currentStep = 1;
const PROGRAM_ORDER = ['Bachelor', 'Foundation', 'Diploma', 'Masters', 'Other'];

function normalizeLevel(level) {
    if (!level) return 'Other';
    const val = level.toLowerCase();
    if (val.startsWith('bachelor')) return 'Bachelor';
    if (val.startsWith('foundation')) return 'Foundation';
    if (val.startsWith('diploma')) return 'Diploma';
    if (val.startsWith('master')) return 'Masters';
    return 'Other';
}

function formatProgrammeLabel(course) {
    const level = normalizeLevel(course.level);
    const name = (course.name || '').trim();
    if (!name) return level;
    const lower = name.toLowerCase();
    if (lower.startsWith(level.toLowerCase())) {
        return name;
    }
    return `${level} of ${name}`;
}

async function loadProgrammes() {
    const select = document.getElementById('studentProgramme');
    if (!select || typeof getCourses !== 'function') return;
    try {
        const courses = await getCourses();
        const grouped = {};
        courses.forEach(c => {
            const lvl = normalizeLevel(c.level);
            if (!grouped[lvl]) grouped[lvl] = [];
            grouped[lvl].push(c);
        });
        PROGRAM_ORDER.forEach(level => {
            const list = grouped[level] || [];
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            list.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id || course.name || '';
                option.textContent = formatProgrammeLabel(course);
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading programmes:', error);
    }
}

function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
}

function clearInput(id) {
    const input = document.getElementById(id);
    if (input) input.value = '';
}

function updateFileLabel(labelId, input) {
    const label = document.getElementById(labelId);
    if (!label) return;
    const name = input?.files?.[0]?.name || 'No file selected';
    label.textContent = name;
}

function validatePhone() {
    const code = document.getElementById('studentPhoneCode')?.value || '';
    const phone = document.getElementById('studentPhone')?.value || '';
    const digits = phone.replace(/\D/g, '');
    if (!digits) return true;
    if (digits.length < 7 || digits.length > 15) {
        showWarning(`Please enter a valid contact number (${code}).`);
        return false;
    }
    return true;
}

function sanitizePhone(input) {
    if (!input) return;
    input.value = input.value.replace(/\D/g, '');
}

function slugify(value) {
    return (value || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'unknown';
}

async function loadUniversity() {
    const uniId = getQueryParam('uni') || getQueryParam('id');
    const headerEl = document.getElementById('applyHeader');
    if (!uniId || typeof getDocument !== 'function') {
        if (headerEl) headerEl.classList.remove('loading');
        return;
    }
    try {
        const uni = await getDocument('universities', uniId);
        if (!uni) {
            if (headerEl) headerEl.classList.remove('loading');
            return;
        }
        selectedUniversity = uni;
        const nameEl = document.getElementById('applyUniversityName');
        const subtitleEl = document.getElementById('applySubtitle');
        const logoEl = document.getElementById('applyLogo');
        const breadcrumbEl = document.getElementById('breadcrumbUniversity');
        if (nameEl) nameEl.textContent = `Apply to ${uni.name}`;
        if (subtitleEl) subtitleEl.textContent = `Complete the form to begin your admission process with ${uni.name}.`;
        if (breadcrumbEl) breadcrumbEl.textContent = uni.shortCode || uni.name;
        if (logoEl) {
            if (uni.logo) {
                const logoPath = uni.logo.startsWith('../') || uni.logo.startsWith('http') ? uni.logo : '../' + uni.logo;
                logoEl.innerHTML = `<img src="${logoPath}" alt="${uni.name}">`;
            } else {
                const initials = uni.shortCode || (uni.name || '').split(' ').map(w => w[0]).slice(0, 3).join('').toUpperCase();
                logoEl.innerHTML = `<span>${initials || 'UNI'}</span>`;
            }
        }
    } catch (error) {
        console.error('Error loading university:', error);
    } finally {
        if (headerEl) headerEl.classList.remove('loading');
    }
}

async function uploadIfPresent(file, path) {
    if (!file) return null;
    if (typeof uploadFileToStorage !== 'function') {
        throw new Error('Storage is not initialized.');
    }
    return uploadFileToStorage(file, path);
}

async function submitApplication() {
    const consent = document.getElementById('consentCheck');
    if (!consent?.checked) {
        showWarning('Please agree to the terms & conditions before submitting.');
        return;
    }
    if (!validatePhone()) return;

    const programmeSelect = document.getElementById('studentProgramme');
    const student = {
        name: document.getElementById('studentName').value.trim(),
        nationality: document.getElementById('studentNationality').value,
        email: document.getElementById('studentEmail').value.trim(),
        country: document.getElementById('studentCountry').value,
        phone: document.getElementById('studentPhone').value.trim(),
        phoneCode: document.getElementById('studentPhoneCode').value,
        city: document.getElementById('studentCity').value.trim(),
        programmeId: programmeSelect?.value || '',
        programme: programmeSelect?.options?.[programmeSelect.selectedIndex]?.text || ''
    };

    const guardian = {
        name: document.getElementById('guardianName').value.trim(),
        email: document.getElementById('guardianEmail').value.trim(),
        phone: document.getElementById('guardianPhone').value.trim(),
        phoneCode: document.getElementById('guardianPhoneCode').value,
        country: document.getElementById('guardianCountry').value
    };

    const files = {
        highSchool: document.getElementById('docHighSchool').files[0] || null,
        photo: document.getElementById('docPhoto').files[0] || null,
        passport: document.getElementById('docPassport').files[0] || null,
        additional: document.getElementById('docAdditional').files[0] || null
    };

    const today = new Date().toISOString().slice(0, 10);
    const studentSlug = slugify(student.name);
    const uniSlug = slugify(selectedUniversity?.name || selectedUniversity?.shortCode || 'unknown-university');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const applicationRef = db.collection('applications').doc();
    const applicationId = applicationRef.id;
    const basePath = `applications/${applicationId}-${studentSlug}-${uniSlug}-${today}/${timestamp}`;

    try {
        showSubmitOverlay();
        const presentFiles = Object.values(files).filter(Boolean).length;
        const totalSteps = presentFiles + 1; // files + Firestore write
        let completed = 0;
        const nextProgress = () => {
            completed += 1;
            const percent = Math.min(95, Math.round((completed / totalSteps) * 100));
            updateSubmitProgress(percent);
        };

        const uploaded = {
            highSchool: await uploadIfPresent(files.highSchool, `${basePath}/high-school-${files.highSchool?.name || 'file'}`),
            photo: await uploadIfPresent(files.photo, `${basePath}/photo-${files.photo?.name || 'file'}`),
            passport: await uploadIfPresent(files.passport, `${basePath}/passport-${files.passport?.name || 'file'}`),
            additional: await uploadIfPresent(files.additional, `${basePath}/additional-${files.additional?.name || 'file'}`)
        };
        if (files.highSchool) nextProgress();
        if (files.photo) nextProgress();
        if (files.passport) nextProgress();
        if (files.additional) nextProgress();

        const application = {
            id: applicationId,
            universityId: selectedUniversity?.id || null,
            universityName: selectedUniversity?.name || null,
            student,
            guardian,
            documents: uploaded,
            storageFolder: basePath,
            status: 'new',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await applicationRef.set(application);
        nextProgress();
        updateSubmitProgress(100);
        clearWarning();
        showSubmitSuccess();
    } catch (error) {
        console.error('Submission error:', error);
        showWarning('There was an error submitting your application. Please try again.');
        hideSubmitOverlay();
    }
}

function setStep(step) {
    currentStep = step;
    document.querySelectorAll('.form-step').forEach(section => {
        section.classList.toggle('active', parseInt(section.dataset.step, 10) === step);
    });
    document.querySelectorAll('.step').forEach(node => {
        node.classList.toggle('active', parseInt(node.dataset.step, 10) === step);
    });

    const backBtn = document.getElementById('backBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (backBtn) backBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.style.display = step === 3 ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = step === 3 ? 'inline-flex' : 'none';
}

function nextStep() {
    if (!validateCurrentStep()) return;
    if (currentStep < 3) setStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) setStep(currentStep - 1);
}

function validateCurrentStep() {
    clearWarning();
    let requiredIds = [];
    if (currentStep === 1) {
        requiredIds = [
            'studentName',
            'studentNationality',
            'studentEmail',
            'studentCountry',
            'studentPhone',
            'studentCity',
            'studentProgramme'
        ];
    } else if (currentStep === 2) {
        requiredIds = [
            'guardianName',
            'guardianEmail',
            'guardianPhone',
            'guardianCountry'
        ];
    }
    for (const id of requiredIds) {
        const el = document.getElementById(id);
        if (!el || !el.value || el.value.trim() === '') {
            el?.focus?.();
            showWarning('Please complete all required fields before continuing.');
            return false;
        }
    }
    if (currentStep === 1 && !validatePhone()) return false;
    return true;
}

function showWarning(message) {
    const warning = document.getElementById('formWarning');
    if (!warning) return;
    warning.textContent = message;
    warning.style.display = 'block';
}

function clearWarning() {
    const warning = document.getElementById('formWarning');
    if (!warning) return;
    warning.textContent = '';
    warning.style.display = 'none';
}

function showSubmitOverlay() {
    const overlay = document.getElementById('submitOverlay');
    const bar = document.getElementById('submitProgress');
    const title = document.getElementById('submitTitle');
    const message = document.getElementById('submitMessage');
    const percent = document.getElementById('submitPercent');
    const icon = document.getElementById('submitIcon');
    const actions = document.getElementById('submitActions');
    if (overlay) overlay.style.display = 'flex';
    if (bar) bar.style.width = '5%';
    if (title) title.textContent = 'Submitting your application';
    if (message) message.textContent = 'Please do not close this tab while we upload your documents.';
    if (percent) percent.textContent = '0% completed';
    if (icon) icon.style.display = 'none';
    if (actions) actions.style.display = 'none';
}

function updateSubmitProgress(percent) {
    const bar = document.getElementById('submitProgress');
    const label = document.getElementById('submitPercent');
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}% completed`;
}

function hideSubmitOverlay() {
    const overlay = document.getElementById('submitOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showSubmitSuccess() {
    const title = document.getElementById('submitTitle');
    const message = document.getElementById('submitMessage');
    const icon = document.getElementById('submitIcon');
    const actions = document.getElementById('submitActions');
    if (title) title.textContent = 'Thank you!';
    if (message) message.textContent = 'Your details have been successfully submitted. Our team will contact you soon.';
    if (icon) icon.style.display = 'flex';
    if (actions) actions.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
    loadUniversity();
    loadProgrammes();
    setStep(1);
});
