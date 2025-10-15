// DOM Elements
const imagesGrid = document.getElementById('imagesGrid');
const folderFilter = document.getElementById('folderFilter');
const filterSection = document.getElementById('filterSection');
const toast = document.getElementById('toast');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const closeModal = document.querySelector('.close');
const liveIndicator = document.getElementById('liveIndicator');

// State
let folders = [];
let allImages = [];
let filteredImages = [];
let selectedFolder = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Test server connectivity first
    await testServerConnection();
    loadActiveFolders();
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
    // Modal events
    closeModal.addEventListener('click', closeImageModal);
    window.addEventListener('click', (e) => {
        if (e.target === imageModal) closeImageModal();
    });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImageModal();
    });
    
    // Filter events
    folderFilter.addEventListener('change', (e) => {
        selectedFolder = e.target.value;
        filterAndRenderImages();
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

// Load active folders from server
async function loadActiveFolders() {
    try {
        // Only show loading on initial load, not on auto-refresh
        if (folders.length === 0) {
            imagesGrid.innerHTML = '<div class="loading">Loading images...</div>';
        }
        
        const newFolders = await apiCall('/api/folders/active');
        
        // Check if folders have changed
        if (JSON.stringify(folders) !== JSON.stringify(newFolders)) {
            const wasEmpty = folders.length === 0;
            const oldImageCount = allImages.length;
            
            folders = newFolders;
            processImagesFromFolders();
            updateFolderFilter();
            filterAndRenderImages();
            
            // Show notification when content is updated (except on initial load)
            if (!wasEmpty) {
                const newImageCount = allImages.length;
                if (newImageCount > oldImageCount) {
                    showToast(`${newImageCount - oldImageCount} new image(s) available!`, 'success');
                } else if (newImageCount < oldImageCount) {
                    showToast('Some images were removed by admin', 'info');
                } else {
                    showToast('Gallery updated!', 'info');
                }
            }
        }
        
        // Update live indicator
        updateLiveIndicator('connected');
        
    } catch (error) {
        if (folders.length === 0) {
            imagesGrid.innerHTML = '<div class="empty-state">Failed to load images</div>';
        }
        updateLiveIndicator('error');
    }
}

// Process images from all active folders
function processImagesFromFolders() {
    allImages = [];
    
    folders.forEach(folder => {
        folder.images.forEach(imagePath => {
            allImages.push({
                path: imagePath,
                folderName: folder.name,
                filename: imagePath.split('/').pop()
            });
        });
    });
}

// Update folder filter dropdown
function updateFolderFilter() {
    folderFilter.innerHTML = '<option value="all">All Folders</option>';
    
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.name;
        option.textContent = `${folder.name} (${folder.imageCount} images)`;
        folderFilter.appendChild(option);
    });
    
    // Show/hide filter section based on number of folders
    filterSection.style.display = folders.length > 1 ? 'block' : 'none';
}

// Filter and render images
function filterAndRenderImages() {
    if (selectedFolder === 'all') {
        filteredImages = [...allImages];
    } else {
        filteredImages = allImages.filter(image => image.folderName === selectedFolder);
    }
    
    renderImages();
}

// UI Update Functions
function renderImages() {
    if (allImages.length === 0) {
        imagesGrid.innerHTML = `
            <div class="empty-state">
                <div style="margin-bottom: 1rem;">�️</div>
                <h3>No images are currently available</h3>
                <p>Images will appear here automatically when the administrator activates folders with images.</p>
                <small style="color: #718096;">This page updates automatically every 5 seconds.</small>
            </div>
        `;
        return;
    }
    
    if (filteredImages.length === 0) {
        imagesGrid.innerHTML = `
            <div class="empty-state">
                <div style="margin-bottom: 1rem;">🔍</div>
                <h3>No images in selected folder</h3>
                <p>Try selecting "All Folders" or choose a different folder.</p>
            </div>
        `;
        return;
    }
    
    // Add smooth transition effect
    imagesGrid.style.opacity = '0.7';
    
    setTimeout(() => {
        imagesGrid.innerHTML = '';
        
        filteredImages.forEach(image => {
            const imageCard = createImageCard(image);
            imagesGrid.appendChild(imageCard);
        });
        
        imagesGrid.style.opacity = '1';
    }, 150);
}

function createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    card.innerHTML = `
        <div class="image-container">
            <img src="${image.path}" alt="${image.filename}" class="gallery-image" 
                 onclick="openImageModal('${image.path}', '${image.folderName}', '${image.filename}')">
            <div class="image-overlay">
                <div class="image-info">
                    <div class="image-filename">${escapeHtml(image.filename)}</div>
                    <div class="image-folder">📁 ${escapeHtml(image.folderName)}</div>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Modal Functions
function openImageModal(imagePath, folderName, filename) {
    modalImage.src = imagePath;
    modalCaption.innerHTML = `
        <strong>${escapeHtml(filename || 'Image')}</strong><br>
        <small>from ${escapeHtml(folderName)} folder</small>
    `;
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

// Update live indicator status
function updateLiveIndicator(status) {
    if (!liveIndicator) return;
    
    const dot = liveIndicator.querySelector('.live-dot');
    const text = liveIndicator.querySelector('.live-text');
    
    switch (status) {
        case 'connected':
            dot.style.background = '#48bb78';
            text.textContent = 'Live Updates';
            break;
        case 'updating':
            dot.style.background = '#ed8936';
            text.textContent = 'Updating...';
            break;
        case 'error':
            dot.style.background = '#e53e3e';
            text.textContent = 'Connection Error';
            break;
    }
}

// Global functions for HTML onclick handlers
window.openImageModal = openImageModal;

// Auto-refresh every 5 seconds to get updated folder list for real-time updates
setInterval(() => {
    loadActiveFolders();
}, 5000);

// Also add visibility change listener to refresh when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadActiveFolders();
    }
});