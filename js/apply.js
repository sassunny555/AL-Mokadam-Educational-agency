/* ============================================
   Apply Page Logic - AL-Mokadam Educational Agency
   ============================================ */

let selectedUniversity = null;
let currentStep = 1;

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

async function loadUniversity() {
    const uniId = getQueryParam('uni') || getQueryParam('id');
    if (!uniId || typeof getDocument !== 'function') return;
    try {
        const uni = await getDocument('universities', uniId);
        if (!uni) return;
        selectedUniversity = uni;
        const nameEl = document.getElementById('applyUniversityName');
        const logoEl = document.getElementById('applyLogo');
        if (nameEl) nameEl.textContent = `Apply to ${uni.name}`;
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
        alert('Please agree to the terms & conditions before submitting.');
        return;
    }

    const student = {
        name: document.getElementById('studentName').value.trim(),
        nationality: document.getElementById('studentNationality').value,
        email: document.getElementById('studentEmail').value.trim(),
        country: document.getElementById('studentCountry').value,
        phone: document.getElementById('studentPhone').value.trim(),
        city: document.getElementById('studentCity').value.trim(),
        programme: document.getElementById('studentProgramme').value
    };

    const guardian = {
        name: document.getElementById('guardianName').value.trim(),
        email: document.getElementById('guardianEmail').value.trim(),
        phone: document.getElementById('guardianPhone').value.trim(),
        country: document.getElementById('guardianCountry').value
    };

    const files = {
        highSchool: document.getElementById('docHighSchool').files[0] || null,
        photo: document.getElementById('docPhoto').files[0] || null,
        passport: document.getElementById('docPassport').files[0] || null,
        additional: document.getElementById('docAdditional').files[0] || null
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basePath = `applications/${selectedUniversity?.id || 'general'}/${timestamp}`;

    try {
        const uploaded = {
            highSchool: await uploadIfPresent(files.highSchool, `${basePath}/high-school-${files.highSchool?.name || 'file'}`),
            photo: await uploadIfPresent(files.photo, `${basePath}/photo-${files.photo?.name || 'file'}`),
            passport: await uploadIfPresent(files.passport, `${basePath}/passport-${files.passport?.name || 'file'}`),
            additional: await uploadIfPresent(files.additional, `${basePath}/additional-${files.additional?.name || 'file'}`)
        };

        const application = {
            universityId: selectedUniversity?.id || null,
            universityName: selectedUniversity?.name || null,
            student,
            guardian,
            documents: uploaded,
            status: 'new',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await addDocument('applications', application);
        alert('Application submitted successfully! Our team will contact you soon.');
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Submission error:', error);
        alert('There was an error submitting your application. Please try again.');
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
    if (currentStep < 3) setStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) setStep(currentStep - 1);
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initFirebase === 'function') {
        initFirebase();
    }
    loadUniversity();
    setStep(1);
});
