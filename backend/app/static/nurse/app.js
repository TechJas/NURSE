// ========== CONFIGURATION ==========
const API_BASE_URL = ""; // Current origin

// ========== UTILS ==========
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    toastMsg.textContent = message;
    toast.className = `toast active ${type}`;
    setTimeout(() => toast.classList.remove("active"), 3000);
}

function logout() {
    localStorage.removeItem("nurse_token");
    window.location.href = "/login";
}

// ========== AUTH LOGIC ==========
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("nurse_token", data.access_token);
                window.location.href = "/dashboard";
            } else {
                showToast(data.detail || "Login failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
    };
}

// ========== REGISTRATION LOGIC ==========
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            full_name: document.getElementById("fullName").value,
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            age: parseInt(document.getElementById("age").value),
            registration_number: document.getElementById("regNumber").value,
            specialization: document.getElementById("specialization").value,
            password: document.getElementById("password").value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/nurses/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                showToast("Registration successful! Redirecting to login...");
                setTimeout(() => window.location.href = "/login", 2000);
            } else {
                showToast(result.detail || "Registration failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        }
    };
}

// ========== DASHBOARD LOGIC ==========
async function loadNurseProfile() {
    const token = localStorage.getItem("nurse_token");
    if (!token && window.location.pathname.includes("/dashboard")) {
        window.location.href = "/login";
        return;
    }

    // In a real app, we'd fetch profile data here
    // For now, let's assume we have a /auth/me or similar
    // Since we don't have /nurses/me, let's use the token to identify
}

function triggerUpload(type) {
    document.getElementById(`file-${type}`).click();
}

async function handleFileUpload(input, type) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", type);

    const token = localStorage.getItem("nurse_token");
    
    try {
        const res = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (res.ok) {
            showToast(`${type} uploaded successfully!`);
            input.parentElement.querySelector(".btn-upload").textContent = "Uploaded";
            input.parentElement.querySelector(".btn-upload").disabled = true;
            input.parentElement.style.opacity = "0.7";
        } else {
            const err = await res.json();
            showToast(err.detail || "Upload failed", "error");
        }
    } catch (err) {
        showToast("Network error", "error");
    }
}

if (window.location.pathname.includes("/dashboard")) {
    loadNurseProfile();
}
