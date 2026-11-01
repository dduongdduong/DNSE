import { api, enc } from './api-client.js';

const form = document.getElementById('onboarding-form');
const nameInput = document.getElementById('student-name');
const uniSelect = document.getElementById('university-select');
const majorSelect = document.getElementById('major-select');
const submitBtn = document.getElementById('btn-start-journey');

// Chuyên ngành được tải từ SQL Server theo trường đã chọn
uniSelect.addEventListener('change', async function(e) {
    const selectedUni = e.target.value;
    
    majorSelect.innerHTML = '<option value="" disabled selected>Chọn chuyên ngành của bạn...</option>';
    majorSelect.disabled = true;
    
    if (selectedUni) {
        try {
            const majors = await api.get(`/universities/${enc(selectedUni)}/majors`);

            // Người dùng có thể đổi trường trong lúc đang tải
            if (uniSelect.value !== selectedUni) return;

            majors.forEach(major => {
                const option = document.createElement('option');
                option.value = major.code;
                option.textContent = major.name;
                majorSelect.appendChild(option);
            });
            majorSelect.disabled = false;
        } catch (err) {
            console.error('Lỗi tải chuyên ngành:', err);
            majorSelect.innerHTML = '';
            const errOption = document.createElement('option');
            errOption.value = '';
            errOption.disabled = true;
            errOption.selected = true;
            errOption.textContent = err.message;
            majorSelect.appendChild(errOption);
        }
    }
    
    validateForm();
});

function validateForm() {
    const isNameValid = nameInput.value.trim().length > 0;
    const isUniValid = uniSelect.value !== "";
    const isMajorValid = majorSelect.value !== "";

    if (isNameValid && isUniValid && isMajorValid) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

nameInput.addEventListener('input', validateForm);
majorSelect.addEventListener('change', validateForm);

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const originalLabel = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Đang thiết lập...';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    try {
        const user = await api.post('/users', {
            name: nameInput.value.trim(),
            university: uniSelect.value,
            majorCode: majorSelect.value
        });

        localStorage.setItem('dnse_user', JSON.stringify({ ...user, onboardingCompleted: true }));
        window.location.href = 'index.html';
    } catch (err) {
        alert(err.message);
        submitBtn.innerHTML = originalLabel;
        submitBtn.style.opacity = '';
        submitBtn.disabled = false;
    }
});
