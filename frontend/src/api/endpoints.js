import api from './axiosInstance';

// ─── Auth ───────────────────────────────────
export const loginUser        = (data) => api.post('/auth/login', data);
export const resetPassword    = (data) => api.post('/auth/reset-password', data);
export const sendOtp          = ()     => api.post('/auth/send-otp');
export const changePassword   = (data) => api.post('/auth/change-password', data);

// ─── Nurse ──────────────────────────────────
export const registerNurse       = (data) => api.post('/nurses/register', data);
export const getNurseProfile     = ()     => api.get('/nurses/me');
export const unlockWorkingShift  = (data) => api.post('/nurses/unlock', data);
export const getShiftInfo        = ()     => api.get('/nurses/shift-info');

// ─── Documents ──────────────────────────────
export const getMyDocuments  = ()         => api.get('/documents/my-documents');
export const uploadDocument  = (formData) =>
  api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// ─── Notifications ──────────────────────────
export const getMyNotifications   = ()   => api.get('/notifications/my-notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);

// ─── Admin: Nurses ──────────────────────────
export const listNurses        = ()         => api.get('/admin/nurses');
export const verifyNurse       = (id)       => api.post(`/admin/nurses/${id}/verify`);
export const rejectNurse       = (id, data) => api.post(`/admin/nurses/${id}/reject`, data);
export const requestReupload   = (id, data) => api.post(`/admin/nurses/${id}/request-reupload`, data);
export const getNurseDocuments    = (id)            => api.get(`/admin/nurses/${id}/documents`);
export const getDocumentSignedUrl = (nurseId, docId) => api.get(`/admin/nurses/${nurseId}/documents/${docId}/view`);

// ─── Admin: Interview Sessions ──────────────
export const createInterviewSession  = (data)           => api.post('/admin/interviews/sessions', data);
export const getInterviewSessions    = ()               => api.get('/admin/interviews/sessions');
export const assignNursesToInterview = (data)           => api.post('/admin/interviews/assign', data);
export const submitInterviewResult   = (nurseId, data)  => api.post(`/admin/interviews/${nurseId}/result`, data);

// ─── Admin: Shifts ──────────────────────────
export const createShiftAssignment = (nurseId, data) => api.post(`/admin/nurses/${nurseId}/shifts`, data);
export const getNurseShifts        = (nurseId)       => api.get(`/admin/nurses/${nurseId}/shifts`);

// ─── Admin: Export ──────────────────────────
export const exportNursesCSV = (filter = 'all') =>
  api.get(`/admin/nurses/export?filter=${filter}`, { responseType: 'blob' });

// ─── Admin: Results CSV Upload ───────────────
export const uploadInterviewResults = (formData) =>
  api.post('/admin/interviews/upload-results', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ─── Admin: Venues ───────────────────────────
export const getVenues      = ()       => api.get('/admin/venues');
export const uploadVenueCsv = (formData) => api.post('/admin/venues/upload', formData);

// ─── Admin: System ID Generation ─────────────
export const getSystemIdCandidates = ()        => api.get('/admin/system-id/candidates');
export const sendCareIdEmail       = (nurseId) => api.post(`/admin/care-id/send/${nurseId}`);
export const sendCareIdBulk        = (data)    => api.post('/admin/care-id/send-bulk', data);
export const resetCareIdLockout    = (nurseId) => api.post(`/admin/care-id/reset-lockout/${nurseId}`);

// ─── Admin: Task Assignment ──────────────────
export const getActiveNurses = (spec = '', search = '') =>
  api.get(`/admin/nurses/active?specialization=${spec}&search=${search}`);
export const assignTask      = (data)          => api.post('/admin/tasks/assign', data);
export const getAdminTasks   = (filters = {})  => {
  const q = new URLSearchParams(filters).toString();
  return api.get(`/admin/tasks${q ? '?' + q : ''}`);
};

// ─── Nurse: Task Acknowledge ─────────────────
export const acknowledgeTask = (taskId) => api.put(`/nurses/tasks/${taskId}/acknowledge`);

// ─── Hospital Admin ──────────────────────────
export const getHospitalAdminStats = ()              => api.get('/hospital-admin/stats');
export const getHospitalNurses     = (spec='', search='') =>
  api.get(`/hospital-admin/nurses?specialization=${spec}&search=${search}`);
export const assignHospitalTask    = (data)          => api.post('/hospital-admin/tasks/assign', data);
export const getHospitalTasks      = (filters = {})  => {
  const q = new URLSearchParams(filters).toString();
  return api.get(`/hospital-admin/tasks${q ? '?' + q : ''}`);
};
export const createDeptHead     = (data)   => api.post('/hospital-admin/dept-heads/create', data);
export const listDeptHeads      = ()       => api.get('/hospital-admin/dept-heads');

// ─── Super Admin: Hospital Admin Management ──
export const createHospitalAdmin      = (data) => api.post('/admin/hospital-admins/create', data);
export const listHospitalAdmins       = ()     => api.get('/admin/hospital-admins');
export const toggleHospitalAdminActive = (id, data = {})  => api.post(`/admin/hospital-admins/${id}/toggle-active`, data);

// ─── Dept Head ───────────────────────────────
export const getDeptStats     = ()              => api.get('/dept/stats');
export const getDeptNurses    = (search = '')   => api.get(`/dept/nurses?search=${search}`);
export const assignDeptTask   = (data)          => api.post('/dept/tasks/assign', data);
export const getDeptTasks     = (filters = {})  => {
  const q = new URLSearchParams(filters).toString();
  return api.get(`/dept/tasks${q ? '?' + q : ''}`);
};

// ─── Nurse: Duty Export ──────────────────────
export const exportTasksPDF  = () => api.get('/nurses/export/tasks?format=pdf',  { responseType: 'blob' });
export const exportTasksDOCX = () => api.get('/nurses/export/tasks?format=docx', { responseType: 'blob' });
