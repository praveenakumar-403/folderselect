// DOM Elements
const folderNameInput = document.getElementById('folderNameInput');
const createFolderBtn = document.getElementById('createFolderBtn');
const uploadForm = document.getElementById('uploadForm');
const folderSelect = document.getElementById('folderSelect');
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const foldersGrid = document.getElementById('foldersGrid');
const toast = document.getElementById('toast');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.querySelector('.close');

// State
let folders = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Test server connectivity first
    await testServerConnection();
    loadFolders();
    setupEventListeners();
});

// Test server connection
async function testServerConnection() {
    try {
        console.log('Testing server connection...');
        const response = await fetch('/api/health');
        if (response.ok) {
            const data = await response.json();
            console.log('Server connection successful:', data);
        } else {
            throw new Error(`Server responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Server connection failed:', error);
        showToast('Warning: Cannot connect to server. Please refresh the page.', 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    // Create folder
    createFolderBtn.addEventListener('click', createFolder);
    folderNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });
    
    // Upload form
    uploadForm.addEventListener('submit', uploadImages);
    
    // File input change
    imageInput.addEventListener('change', updateFileInfo);
    
    // Modal events
    closeModal.addEventListener('click', closeImageModal);
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModal();
    });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImageModal();
    });
}

// API Functions
async function apiCall(url, options = {}) {
    try {
        console.log('Making API call to:', url, 'with options:', options);
        
        const response = await fetch(url, options);
        
        // Check if response is ok first
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            } catch (parseError) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        return data;
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Provide more specific error messages
        let userMessage;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            userMessage = 'Cannot connect to server. Please check if the server is running.';
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'Network error: Unable to reach the server. Please check your connection.';
        } else {
            userMessage = error.message || 'An unexpected error occurred';
        }
        
        showToast(userMessage, 'error');
        throw error;
    }
}

// Load folders from server
async function loadFolders() {
    try {
        foldersGrid.innerHTML = '<div class="loading">Loading folders...</div>';
        folders = await apiCall('/api/folders');
        updateFolderSelect();
        renderFolders();
    } catch (error) {
        foldersGrid.innerHTML = '<div class="empty-state">Failed to load folders</div>';
    }
}

// Create new folder
async function createFolder() {
    const folderName = folderNameInput.value.trim();
    
    if (!folderName) {
        showToast('Please enter a folder name', 'error');
        return;
    }
    
    if (folderName.length > 50) {
        showToast('Folder name is too long (max 50 characters)', 'error');
        return;
    }
    
    try {
        createFolderBtn.disabled = true;
        createFolderBtn.textContent = 'Creating...';
        
        await apiCall('/api/folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ folderName })
        });
        
        showToast('Folder created successfully!', 'success');
        folderNameInput.value = '';
        await loadFolders();
        
    } catch (error) {
        // Error already handled by apiCall
    } finally {
        createFolderBtn.disabled = false;
        createFolderBtn.textContent = 'Create Folder';
    }
}

// Upload images
async function uploadImages(e) {
    e.preventDefault();
    
    const selectedFolder = folderSelect.value;
    const files = imageInput.files;
    
    if (!selectedFolder) {
        showToast('Please select a folder', 'error');
        return;
    }
    
    if (files.length === 0) {
        showToast('Please select images to upload', 'error');
        return;
    }
    
    // Validate file types and sizes
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            showToast(`${file.name} is not an image file`, 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            showToast(`${file.name} is too large (max 10MB)`, 'error');
            return;
        }
    }
    
    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        showProgress(true);
        
        const formData = new FormData();
        formData.append('folderName', selectedFolder);
        
        for (let file of files) {
            formData.append('images', file);
        }
        
        // Simulate progress (since we can't track real progress easily with fetch)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            updateProgress(progress, `Uploading ${files.length} image(s)...`);
        }, 200);
        
        const result = await apiCall('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        updateProgress(100, 'Upload complete!');
        
        showToast(`Successfully uploaded ${result.files.length} image(s)!`, 'success');
        
        // Reset form
        uploadForm.reset();
        updateFileInfo();
        
        // Reload folders to show new images
        await loadFolders();
        
    } catch (error) {
        // Error already handled by apiCall
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Images';
        setTimeout(() => showProgress(false), 1000);
    }
}

// Delete folder
async function deleteFolder(folderName) {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}" and all its images?`)) {
        return;
    }
    
    try {
        await apiCall(`/api/folders/${encodeURIComponent(folderName)}`, {
            method: 'DELETE'
        });
        
        showToast('Folder deleted successfully!', 'success');
        await loadFolders();
        
    } catch (error) {
        // Error already handled by apiCall
    }
}

// UI Update Functions
function updateFolderSelect() {
    folderSelect.innerHTML = '<option value="">Choose a folder...</option>';
    
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.name;
        option.textContent = `${folder.name} (${folder.imageCount} images)`;
        folderSelect.appendChild(option);
    });
}

function renderFolders() {
    if (folders.length === 0) {
        foldersGrid.innerHTML = '<div class="empty-state">No folders yet. Create your first folder above!</div>';
        return;
    }
    
    foldersGrid.innerHTML = '';
    
    folders.forEach(folder => {
        const folderCard = createFolderCard(folder);
        foldersGrid.appendChild(folderCard);
    });
}

function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    
    const imagesPreview = folder.images.length > 0 
        ? `<div class="images-preview">
             ${folder.images.slice(0, 6).map(imagePath => 
                 `<img src="${imagePath}" alt="Image" class="image-thumbnail" 
                       onclick="openImageModal('${imagePath}', '${folder.name}')">`
             ).join('')}
             ${folder.images.length > 6 ? `<div class="more-images">+${folder.images.length - 6} more</div>` : ''}
           </div>`
        : '<div class="empty-state" style="padding: 1rem;">No images yet</div>';
    
    card.innerHTML = `
        <div class="folder-header">
            <div class="folder-name">${escapeHtml(folder.name)}</div>
            <div class="folder-controls">
                <span class="folder-status ${folder.active ? 'status-active' : 'status-inactive'}">
                    ${folder.active ? 'Active' : 'Inactive'}
                </span>
                <label class="toggle-switch" title="Toggle active/inactive">
                    <input type="checkbox" ${folder.active ? 'checked' : ''} 
                           onchange="toggleFolderStatus('${escapeHtml(folder.name)}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <button class="delete-folder-btn" onclick="deleteFolder('${escapeHtml(folder.name)}')">
                    Delete
                </button>
            </div>
        </div>
        <div class="folder-info">
            📊 ${folder.imageCount} image(s) • Status: ${folder.active ? '✅ Currently visible to users' : '❌ Hidden from users'}
            ${folder.active ? '<br><small style="color: #48bb78; font-weight: 600;">👑 This is the active folder</small>' : ''}
        </div>
        ${imagesPreview}
    `;
    
    return card;
}

function updateFileInfo() {
    const files = imageInput.files;
    const fileInfo = document.querySelector('.file-info small');
    
    if (files.length > 0) {
        const totalSize = Array.from(files).reduce((total, file) => total + file.size, 0);
        const sizeText = formatFileSize(totalSize);
        fileInfo.textContent = `${files.length} file(s) selected (${sizeText}) - Supported formats: JPG, PNG, GIF, WebP, SVG`;
    } else {
        fileInfo.textContent = 'Supported formats: JPG, PNG, GIF, WebP, SVG (Max 10MB per file, up to 10 files)';
    }
}

function showProgress(show) {
    progressSection.style.display = show ? 'block' : 'none';
    if (!show) {
        updateProgress(0, '');
    }
}

function updateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
}

// Modal Functions
function openImageModal(imagePath, folderName) {
    modalImage.src = imagePath;
    modalCaption.textContent = `Image from ${folderName} folder`;
    imageModal.style.display = 'block';
}

function closeImageModal() {
    imageModal.style.display = 'none';
    modalImage.src = '';
    modalCaption.textContent = '';
}

// Toast Notifications
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Toggle folder active status
async function toggleFolderStatus(folderName, isActive) {
    try {
        const result = await apiCall(`/api/folders/${encodeURIComponent(folderName)}/toggle`, {
            method: 'PATCH'
        });
        
        // Show more detailed success message
        console.log('Toggle response:', result);
        if (result.previousActive) {
            showToast(`✅ Switched: "${result.previousActive}" → "${folderName}"`, 'success');
        } else {
            showToast(result.message, 'success');
        }
        
        // Wait a moment then refresh to ensure server has processed the change
        setTimeout(async () => {
            await loadFolders();
        }, 100);
        
    } catch (error) {
        // Error already handled by apiCall
        // Reload folders to reset the toggle state
        await loadFolders();
    }
}

// Global functions for HTML onclick handlers
window.deleteFolder = deleteFolder;
window.openImageModal = openImageModal;
window.toggleFolderStatus = toggleFolderStatus;