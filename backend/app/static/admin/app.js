// ========== API CONFIGURATION ==========
const API_BASE_URL = "/admin";

// ========== STATE MANAGEMENT ==========
const state = {
  currentPage: "dashboard",
  currentNurse: null,
  nurses: [],
  interviews: [],
  hospitals: [],
  positions: [],
  auditLogs: [],
  dashboardStats: {},
};

// ========== UTILITY FUNCTIONS ==========
// SECURITY: XSS Protection - Sanitize all user-generated content
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  toastMessage.textContent = message;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, duration);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status) {
  const statusMap = {
    PENDING: "badge-warning",
    SCHEDULED: "badge-info",
    PASSED: "badge-success",
    FAILED: "badge-danger",
    ON_HOLD: "badge-warning",
    ACTIVE: "badge-success",
    COMPLETED: "badge-info",
    TERMINATED: "badge-danger",
  };

  // SECURITY: Sanitize status before rendering
  const safeStatus = escapeHtml(status);
  const badgeClass = statusMap[status] || "badge-info";
  return `<span class="badge ${badgeClass}">${safeStatus.replace("_", " ")}</span>`;
}

function showConfirmDialog(title, message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  const titleEl = document.getElementById("confirmTitle");
  const messageEl = document.getElementById("confirmMessage");
  const okBtn = document.getElementById("confirmOkBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");

  titleEl.textContent = title;
  messageEl.textContent = message;
  modal.classList.add("active");

  okBtn.onclick = () => {
    modal.classList.remove("active");
    onConfirm();
  };

  cancelBtn.onclick = () => {
    modal.classList.remove("active");
  };
}

// ========== API FUNCTIONS ==========
// SECURITY: Authentication with JWT tokens
async function apiCall(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("admin_token");

  // Redirect to login if no token (except for login endpoint)
  if (!token && endpoint !== "/auth/login") {
    // Simplified login check - in real app, might need a dedicated login page
    const loginUrl = "/admin-portal"; // The admin portal serves the frontend
    if (window.location.pathname !== loginUrl) {
      window.location.href = loginUrl;
    }
    throw new Error("Not authenticated");
    throw new Error("Not authenticated");
  }

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Add authorization header if token exists
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // SECURITY: Handle session expiration
    if (response.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin-portal";
      throw new Error("Session expired");
      throw new Error("Session expired");
    }

    if (!response.ok) {
      // SECURITY: Don't expose backend details in error messages
      console.error("API Error:", response.status, response.statusText);
      throw new Error("An error occurred. Please try again.");
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    // SECURITY: Generic error message to user
    showToast("An error occurred. Please try again.", 5000);
    throw error;
  }
}

// SECURITY: Logout function to clear session
function logout() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_token");
  window.location.href = "/admin-portal";
}

// ========== DATA LOADING FUNCTIONS ==========
async function loadDashboardStats() {
  try {
    state.dashboardStats = await apiCall("/dashboard/stats");
  } catch (error) {
    console.error("Failed to load dashboard stats");
  }
}

async function loadNurses() {
  try {
    state.nurses = await apiCall("/nurses");
  } catch (error) {
    console.error("Failed to load nurses");
  }
}

async function loadInterviews() {
  try {
    state.interviews = await apiCall("/interviews");
  } catch (error) {
    console.error("Failed to load interviews");
  }
}

async function loadHospitals() {
  try {
    state.hospitals = await apiCall("/hospitals");
  } catch (error) {
    console.error("Failed to load hospitals");
  }
}

async function loadPositions() {
  try {
    state.positions = await apiCall("/positions");
  } catch (error) {
    console.error("Failed to load positions");
  }
}

async function loadAuditLogs() {
  try {
    state.auditLogs = await apiCall("/audit-logs");
  } catch (error) {
    console.error("Failed to load audit logs");
  }
}

// ========== PAGE RENDERING FUNCTIONS ==========
function renderDashboardPage() {
  const stats = state.dashboardStats;

  return `
        <div class="page-header">
            <h1 class="page-title">Dashboard Overview</h1>
            <p class="page-subtitle">Healthcare Workforce Management System</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Registered Nurses</div>
                <div class="stat-value">${stats.total_registered_nurses || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Pending KYC</div>
                <div class="stat-value">${stats.pending_kyc || 0}</div>
                <div class="stat-change negative">Requires Review</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">KYC Approved</div>
                <div class="stat-value">${stats.kyc_approved || 0}</div>
                <div class="stat-change positive">Verified</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Interviews Today</div>
                <div class="stat-value">${stats.interviews_scheduled_today || 0}</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Awaiting Allocation</div>
                <div class="stat-value">${stats.nurses_awaiting_allocation || 0}</div>
                <div class="stat-change negative">Passed Interview</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Active Nurses</div>
                <div class="stat-value">${stats.active_nurses || 0}</div>
                <div class="stat-change positive">Currently Working</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Recent Activity</h2>
            </div>
            <div class="card-body">
                <p class="text-center" style="color: var(--color-text-secondary); padding: 2rem;">
                    Activity feed will show recent admin actions and nurse updates
                </p>
            </div>
        </div>
    `;
}

function renderKYCPage() {
  const pendingNurses = state.nurses.filter((n) => !n.is_verified);

  return `
        <div class="page-header">
            <h1 class="page-title">KYC Verification</h1>
            <p class="page-subtitle">Review and verify nurse documents</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Pending Verifications (${pendingNurses.length})</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nurse Name</th>
                                <th>Registration Number</th>
                                <th>Specialization</th>
                                <th>Submitted Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              pendingNurses.length === 0
                                ? `
                                <tr>
                                    <td colspan="6" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No pending KYC verifications
                                    </td>
                                </tr>
                            `
                                : pendingNurses
                                    .map(
                                      (nurse) => `
                                <tr>
                                    <td><strong>${escapeHtml(nurse.full_name)}</strong></td>
                                    <td>${escapeHtml(nurse.registration_number)}</td>
                                    <td>${escapeHtml(nurse.specialization || "N/A")}</td>
                                    <td>${formatDate(nurse.created_at)}</td>
                                    <td>${nurse.rejection_reason ? getStatusBadge("FAILED") : getStatusBadge("PENDING")}</td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="openKYCPanel('${escapeHtml(nurse.id)}')">
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            `,
                                    )
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderInterviewsPage() {
  return `
        <div class="page-header">
            <h1 class="page-title">Interview Management</h1>
            <p class="page-subtitle">Schedule and manage nurse interviews</p>
        </div>
        
        <div style="margin-bottom: var(--spacing-xl);">
            <button class="btn btn-primary" onclick="openInterviewModal()">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Schedule New Interview
            </button>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Scheduled Interviews (${state.interviews.length})</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nurse Name</th>
                                <th>Interviewer</th>
                                <th>Date & Time</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Result</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              state.interviews.length === 0
                                ? `
                                <tr>
                                    <td colspan="7" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No interviews scheduled
                                    </td>
                                </tr>
                            `
                                : state.interviews
                                    .map((interview) => {
                                      const nurse = state.nurses.find(
                                        (n) => n.id === interview.nurse_id,
                                      );
                                      return `
                                    <tr>
                                        <td><strong>${nurse ? escapeHtml(nurse.full_name) : "Unknown"}</strong></td>
                                        <td>${escapeHtml(interview.interviewer_name)}</td>
                                        <td>${formatDateTime(interview.interview_date)}</td>
                                        <td>${escapeHtml(interview.location)}</td>
                                        <td>${getStatusBadge(interview.status)}</td>
                                        <td>${interview.result ? getStatusBadge(interview.result) : "-"}</td>
                                        <td>
                                            ${
                                              interview.status === "SCHEDULED"
                                                ? `
                                                <button class="btn btn-sm btn-success" onclick="markInterviewResult('${interview.id}', 'PASSED')">Pass</button>
                                                <button class="btn btn-sm btn-danger" onclick="markInterviewResult('${interview.id}', 'FAILED')">Fail</button>
                                            `
                                                : "-"
                                            }
                                        </td>
                                    </tr>
                                `;
                                    })
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderAllocationPage() {
  const eligibleNurses = state.nurses.filter(
    (n) => n.interview_status === "PASSED" && !n.position_id,
  );

  return `
        <div class="page-header">
            <h1 class="page-title">Position Allocation</h1>
            <p class="page-subtitle">Assign nurses to hospital positions</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Eligible Nurses (${eligibleNurses.length})</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nurse Name</th>
                                <th>Registration Number</th>
                                <th>Specialization</th>
                                <th>Experience</th>
                                <th>Location Preference</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              eligibleNurses.length === 0
                                ? `
                                <tr>
                                    <td colspan="6" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No eligible nurses for allocation
                                    </td>
                                </tr>
                            `
                                : eligibleNurses
                                    .map(
                                      (nurse) => `
                                <tr>
                                    <td><strong>${escapeHtml(nurse.full_name)}</strong></td>
                                    <td>${escapeHtml(nurse.registration_number)}</td>
                                    <td>${escapeHtml(nurse.specialization || "General")}</td>
                                    <td>${escapeHtml(String(nurse.experience_years || 0))} years</td>
                                    <td>${escapeHtml(nurse.location_preference || "Any")}</td>
                                    <td>
                                        <button class="btn btn-primary btn-sm" onclick="openPositionModal('${escapeHtml(nurse.id)}')">
                                            Assign Position
                                        </button>
                                    </td>
                                </tr>
                            `,
                                    )
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderActiveNursesPage() {
  const activeNurses = state.nurses.filter((n) => n.position_id);

  return `
        <div class="page-header">
            <h1 class="page-title">Active Nurses</h1>
            <p class="page-subtitle">Currently working nurses</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Active Nurses (${activeNurses.length})</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nurse Name</th>
                                <th>Registration Number</th>
                                <th>Assigned Hospital</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              activeNurses.length === 0
                                ? `
                                <tr>
                                    <td colspan="6" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No active nurses
                                    </td>
                                </tr>
                            `
                                : activeNurses
                                    .map((nurse) => {
                                      const position = state.positions.find(
                                        (p) => p.id === nurse.position_id,
                                      );
                                      const hospital = position
                                        ? state.hospitals.find(
                                            (h) =>
                                              h.id === position.hospital_id,
                                          )
                                        : null;
                                      return `
                                    <tr>
                                        <td><strong>${escapeHtml(nurse.full_name)}</strong></td>
                                        <td>${escapeHtml(nurse.registration_number)}</td>
                                        <td>${hospital ? escapeHtml(hospital.name) : "N/A"}</td>
                                        <td>${position ? escapeHtml(position.position_type) : "N/A"}</td>
                                        <td>${getStatusBadge("ACTIVE")}</td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary">View Profile</button>
                                        </td>
                                    </tr>
                                `;
                                    })
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderHospitalsPage() {
  return `
        <div class="page-header">
            <h1 class="page-title">Hospital Management</h1>
            <p class="page-subtitle">Manage hospital information</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Hospitals (${state.hospitals.length})</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Hospital Name</th>
                                <th>Location</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Contact</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              state.hospitals.length === 0
                                ? `
                                <tr>
                                    <td colspan="6" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No hospitals registered
                                    </td>
                                </tr>
                            `
                                : state.hospitals
                                    .map(
                                      (hospital) => `
                                <tr>
                                    <td><strong>${escapeHtml(hospital.name)}</strong></td>
                                    <td>${escapeHtml(hospital.location)}</td>
                                    <td>${escapeHtml(hospital.city)}</td>
                                    <td>${escapeHtml(hospital.state)}</td>
                                    <td>${escapeHtml(hospital.contact_phone || "N/A")}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary">Edit</button>
                                    </td>
                                </tr>
                            `,
                                    )
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderAuditPage() {
  return `
        <div class="page-header">
            <h1 class="page-title">Audit Logs</h1>
            <p class="page-subtitle">Track all administrative actions</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Recent Actions</h2>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Nurse Affected</th>
                                <th>Status Change</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                              state.auditLogs.length === 0
                                ? `
                                <tr>
                                    <td colspan="5" class="text-center" style="padding: 2rem; color: var(--color-text-secondary);">
                                        No audit logs available
                                    </td>
                                </tr>
                            `
                                : state.auditLogs
                                    .map((log) => {
                                      const nurse = log.nurse_id
                                        ? state.nurses.find(
                                            (n) => n.id === log.nurse_id,
                                          )
                                        : null;
                                      return `
                                    <tr>
                                        <td>${formatDateTime(log.timestamp)}</td>
                                        <td><strong>${escapeHtml(log.action_type.replace(/_/g, " "))}</strong></td>
                                        <td>${nurse ? escapeHtml(nurse.full_name) : "N/A"}</td>
                                        <td>${log.previous_status ? `${escapeHtml(log.previous_status)} → ${escapeHtml(log.new_status)}` : "-"}</td>
                                        <td>${escapeHtml(log.details || "-")}</td>
                                    </tr>
                                `;
                                    })
                                    .join("")
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ========== PAGE NAVIGATION ==========
async function navigateToPage(pageName) {
  state.currentPage = pageName;

  // Update active nav item
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.page === pageName) {
      item.classList.add("active");
    }
  });

  // Load data if needed
  if (pageName === "dashboard") {
    await loadDashboardStats();
  } else if (pageName === "kyc") {
    await loadNurses();
  } else if (pageName === "interviews") {
    await loadNurses();
    await loadInterviews();
  } else if (pageName === "allocation") {
    await loadNurses();
    await loadHospitals();
  } else if (pageName === "active-nurses") {
    await loadNurses();
    await loadPositions();
    await loadHospitals();
  } else if (pageName === "hospitals") {
    await loadHospitals();
  } else if (pageName === "audit") {
    await loadNurses();
    await loadAuditLogs();
  }

  // Render page
  const pageContent = document.getElementById("pageContent");
  let html = "";

  switch (pageName) {
    case "dashboard":
      html = renderDashboardPage();
      break;
    case "kyc":
      html = renderKYCPage();
      break;
    case "interviews":
      html = renderInterviewsPage();
      break;
    case "allocation":
      html = renderAllocationPage();
      break;
    case "active-nurses":
      html = renderActiveNursesPage();
      break;
    case "hospitals":
      html = renderHospitalsPage();
      break;
    case "audit":
      html = renderAuditPage();
      break;
    default:
      html = "<p>Page not found</p>";
  }

  pageContent.innerHTML = html;
}

// ========== KYC PANEL FUNCTIONS ==========
async function openKYCPanel(nurseId) {
  const nurse = state.nurses.find((n) => n.id === nurseId);
  if (!nurse) return;

  state.currentNurse = nurse;

  // Populate nurse details
  document.getElementById("nurseName").value = nurse.full_name;
  document.getElementById("nurseRegNumber").value = nurse.registration_number;
  document.getElementById("nurseEmail").value = nurse.email;
  document.getElementById("nursePhone").value = nurse.phone;
  document.getElementById("nurseSpecialization").value =
    nurse.specialization || "N/A";

  // Load documents
  try {
    const documents = await apiCall(`/nurses/${nurseId}/documents`);
    const documentGrid = document.getElementById("documentGrid");
    documentGrid.innerHTML = documents
      .map(
        (doc) => `
            <div class="document-item">
                <div class="document-label">${doc.document_type}</div>
                <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 4px;">
                    Uploaded: ${formatDate(doc.uploaded_at)}
                </p>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Failed to load documents");
  }

  // Show panel
  document.getElementById("kycPanel").classList.add("active");
}

function closeKYCPanel() {
  document.getElementById("kycPanel").classList.remove("active");
  state.currentNurse = null;
}

async function approveKYC() {
  if (!state.currentNurse) return;

  showConfirmDialog(
    "Approve KYC",
    `Are you sure you want to approve KYC for ${state.currentNurse.full_name}? This will mark them as verified and ready for interview scheduling.`,
    async () => {
      try {
        await apiCall(`/nurses/${state.currentNurse.id}/verify`, "POST");
        showToast("KYC approved successfully!");
        closeKYCPanel();
        navigateToPage("kyc");
      } catch (error) {
        console.error("Failed to approve KYC");
      }
    },
  );
}

async function rejectKYC() {
  if (!state.currentNurse) return;

  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  try {
    await apiCall(`/nurses/${state.currentNurse.id}/reject`, "POST", {
      reason,
    });
    showToast("KYC rejected");
    closeKYCPanel();
    navigateToPage("kyc");
  } catch (error) {
    console.error("Failed to reject KYC");
  }
}

async function requestReupload() {
  if (!state.currentNurse) return;

  const documentType = prompt("Enter document type to re-upload:");
  const reason = prompt("Enter reason for re-upload:");
  if (!documentType || !reason) return;

  try {
    await apiCall(`/nurses/${state.currentNurse.id}/request-reupload`, "POST", {
      document_type: documentType,
      reason,
    });
    showToast("Re-upload request sent");
    closeKYCPanel();
  } catch (error) {
    console.error("Failed to request re-upload");
  }
}

// ========== INTERVIEW MODAL FUNCTIONS ==========
async function openInterviewModal() {
  // Load verified nurses
  const verifiedNurses = state.nurses.filter(
    (n) => n.is_verified && n.interview_status === "PENDING",
  );
  const select = document.getElementById("interviewNurseSelect");
  select.innerHTML =
    '<option value="">Choose a nurse...</option>' +
    verifiedNurses
      .map(
        (n) =>
          `<option value="${n.id}">${n.full_name} - ${n.registration_number}</option>`,
      )
      .join("");

  document.getElementById("interviewModal").classList.add("active");
}

function closeInterviewModal() {
  document.getElementById("interviewModal").classList.remove("active");
  document.getElementById("interviewForm").reset();
}

async function scheduleInterview(event) {
  event.preventDefault();

  const formData = {
    nurse_id: document.getElementById("interviewNurseSelect").value,
    interviewer_name: document.getElementById("interviewerName").value,
    interview_date: `${document.getElementById("interviewDate").value}T${document.getElementById("interviewTime").value}:00`,
    location: document.getElementById("interviewLocation").value,
    notes: document.getElementById("interviewNotes").value,
  };

  try {
    await apiCall("/interviews", "POST", formData);
    showToast("Interview scheduled successfully!");
    closeInterviewModal();
    navigateToPage("interviews");
  } catch (error) {
    console.error("Failed to schedule interview");
  }
}

async function markInterviewResult(interviewId, result) {
  showConfirmDialog(
    "Mark Interview Result",
    `Mark this interview as ${result}?`,
    async () => {
      try {
        await apiCall(`/interviews/${interviewId}/result`, "PUT", { result });
        showToast(`Interview marked as ${result}`);
        navigateToPage("interviews");
      } catch (error) {
        console.error("Failed to mark interview result");
      }
    },
  );
}

// ========== POSITION MODAL FUNCTIONS ==========
async function openPositionModal(nurseId) {
  const nurse = state.nurses.find((n) => n.id === nurseId);
  if (!nurse) return;

  document.getElementById("positionNurseId").value = nurseId;

  // Load hospitals
  const select = document.getElementById("positionHospitalSelect");
  select.innerHTML =
    '<option value="">Choose a hospital...</option>' +
    state.hospitals
      .map((h) => `<option value="${h.id}">${h.name} - ${h.city}</option>`)
      .join("");

  document.getElementById("positionModal").classList.add("active");
}

function closePositionModal() {
  document.getElementById("positionModal").classList.remove("active");
  document.getElementById("positionForm").reset();
}

async function assignPosition(event) {
  event.preventDefault();

  const formData = {
    nurse_id: document.getElementById("positionNurseId").value,
    hospital_id: document.getElementById("positionHospitalSelect").value,
    position_type: document.getElementById("positionType").value,
    salary: parseFloat(document.getElementById("positionSalary").value),
    shift: document.getElementById("positionShift").value,
    start_date: `${document.getElementById("positionStartDate").value}T00:00:00`,
  };

  try {
    await apiCall("/positions", "POST", formData);
    showToast("Position assigned successfully! Nurse activated.");
    closePositionModal();
    navigateToPage("allocation");
  } catch (error) {
    console.error("Failed to assign position");
  }
}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToPage(item.dataset.page);
    });
  });

  // KYC Panel
  document
    .getElementById("closePanelBtn")
    .addEventListener("click", closeKYCPanel);
  document
    .querySelector("#kycPanel .panel-overlay")
    .addEventListener("click", closeKYCPanel);
  document
    .getElementById("approveKycBtn")
    .addEventListener("click", approveKYC);
  document.getElementById("rejectKycBtn").addEventListener("click", rejectKYC);
  document
    .getElementById("requestReuploadBtn")
    .addEventListener("click", requestReupload);

  // Interview Modal
  document
    .getElementById("closeInterviewModal")
    .addEventListener("click", closeInterviewModal);
  document
    .getElementById("cancelInterviewBtn")
    .addEventListener("click", closeInterviewModal);
  document
    .querySelector("#interviewModal .modal-overlay")
    .addEventListener("click", closeInterviewModal);
  document
    .getElementById("interviewForm")
    .addEventListener("submit", scheduleInterview);

  // Position Modal
  document
    .getElementById("closePositionModal")
    .addEventListener("click", closePositionModal);
  document
    .getElementById("cancelPositionBtn")
    .addEventListener("click", closePositionModal);
  document
    .querySelector("#positionModal .modal-overlay")
    .addEventListener("click", closePositionModal);
  document
    .getElementById("positionForm")
    .addEventListener("submit", assignPosition);

  // Global Search
  document.getElementById("globalSearch").addEventListener("input", (e) => {
    // Implement search functionality
    console.log("Search:", e.target.value);
  });

  // Load initial page
  navigateToPage("dashboard");
});
