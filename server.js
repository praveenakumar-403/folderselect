const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Ensure uploads directory exists
fs.ensureDirSync('./uploads');

// Create folders.json file to store folder status if it doesn't exist
const foldersConfigPath = './folders.json';
if (!fs.existsSync(foldersConfigPath)) {
  fs.writeJsonSync(foldersConfigPath, { folders: {} });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = req.body.folderName || 'default';
    const folderPath = path.join('./uploads', folderName);
    
    // Create folder if it doesn't exist
    fs.ensureDirSync(folderPath);
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes

// Serve admin page (default)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve admin page explicitly
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve user page
app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get currently active folder
app.get('/api/folders/current-active', (req, res) => {
  try {
    const foldersConfig = getFoldersConfig();
    const activeFolders = Object.keys(foldersConfig.folders).filter(
      folder => foldersConfig.folders[folder].active
    );
    
    res.json({
      activeFolders: activeFolders,
      activeFolder: activeFolders[0] || null,
      activeCount: activeFolders.length,
      allFolders: foldersConfig.folders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting active folder:', error);
    res.status(500).json({ error: 'Failed to get active folder' });
  }
});

// Debug endpoint to check folder states
app.get('/api/debug/folders', (req, res) => {
  try {
    const foldersConfig = getFoldersConfig();
    res.json({
      config: foldersConfig,
      activeFolders: Object.keys(foldersConfig.folders).filter(f => foldersConfig.folders[f].active),
      totalFolders: Object.keys(foldersConfig.folders).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get folder config
function getFoldersConfig() {
  try {
    return fs.readJsonSync(foldersConfigPath);
  } catch (error) {
    return { folders: {} };
  }
}

// Helper function to save folder config
function saveFoldersConfig(config) {
  fs.writeJsonSync(foldersConfigPath, config);
}

// Get list of existing folders (for admin)
app.get('/api/folders', async (req, res) => {
  try {
    const uploadsDir = './uploads';
    const foldersConfig = getFoldersConfig();
    const items = await fs.readdir(uploadsDir);
    const folders = [];
    
    for (const item of items) {
      const itemPath = path.join(uploadsDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(itemPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        });
        
        // Ensure folder exists in config and get status
        if (!foldersConfig.folders[item]) {
          foldersConfig.folders[item] = { active: false, createdAt: new Date().toISOString() };
          saveFoldersConfig(foldersConfig);
        }
        
        const isActive = foldersConfig.folders[item]?.active || false;
        
        folders.push({
          name: item,
          imageCount: imageFiles.length,
          images: imageFiles.map(file => `/uploads/${item}/${file}`),
          active: isActive
        });
      }
    }
    
    res.json(folders);
  } catch (error) {
    console.error('Error reading folders:', error);
    res.status(500).json({ error: 'Failed to read folders' });
  }
});

// Get list of active folders (for users)
app.get('/api/folders/active', async (req, res) => {
  try {
    const uploadsDir = './uploads';
    const foldersConfig = getFoldersConfig();
    const items = await fs.readdir(uploadsDir);
    const folders = [];
    
    for (const item of items) {
      const itemPath = path.join(uploadsDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        // Only include active folders
        const isActive = foldersConfig.folders[item]?.active || false;
        if (!isActive) continue;
        
        const files = await fs.readdir(itemPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        });
        
        folders.push({
          name: item,
          imageCount: imageFiles.length,
          images: imageFiles.map(file => `/uploads/${item}/${file}`),
          active: true
        });
      }
    }
    
    res.json(folders);
  } catch (error) {
    console.error('Error reading active folders:', error);
    res.status(500).json({ error: 'Failed to read active folders' });
  }
});

// Create new folder
app.post('/api/folders', async (req, res) => {
  try {
    const { folderName } = req.body;
    
    if (!folderName || folderName.trim() === '') {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    // Sanitize folder name
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9-_\s]/g, '').trim();
    if (sanitizedName === '') {
      return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    const folderPath = path.join('./uploads', sanitizedName);
    
    // Check if folder already exists
    if (await fs.pathExists(folderPath)) {
      return res.status(400).json({ error: 'Folder already exists' });
    }
    
    await fs.ensureDir(folderPath);
    
    // Add folder to config as inactive by default
    const foldersConfig = getFoldersConfig();
    foldersConfig.folders[sanitizedName] = { active: false, createdAt: new Date().toISOString() };
    saveFoldersConfig(foldersConfig);
    
    res.json({ message: 'Folder created successfully', folderName: sanitizedName });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Toggle folder active status (only one folder can be active at a time)
app.patch('/api/folders/:folderName/toggle', async (req, res) => {
  try {
    const { folderName } = req.params;
    let foldersConfig = getFoldersConfig();
    
    // Ensure the folder exists in config
    if (!foldersConfig.folders[folderName]) {
      foldersConfig.folders[folderName] = { active: false, createdAt: new Date().toISOString() };
    }
    
    const currentStatus = foldersConfig.folders[folderName].active || false;
    console.log(`Toggle request for ${folderName}, current status: ${currentStatus}`);
    
    if (!currentStatus) {
      // ACTIVATING this folder
      
      // First, find which folder is currently active
      const currentlyActiveFolder = Object.keys(foldersConfig.folders).find(
        folder => foldersConfig.folders[folder].active === true
      );
      
      console.log(`Currently active folder: ${currentlyActiveFolder || 'none'}`);
      
      // FORCE deactivate ALL folders to ensure clean state
      Object.keys(foldersConfig.folders).forEach(folder => {
        foldersConfig.folders[folder].active = false;
        if (folder !== folderName) {
          foldersConfig.folders[folder].deactivatedAt = new Date().toISOString();
        }
      });
      
      // Now activate ONLY the selected folder
      foldersConfig.folders[folderName].active = true;
      foldersConfig.folders[folderName].activatedAt = new Date().toISOString();
      
      // Save the configuration
      saveFoldersConfig(foldersConfig);
      
      // Verify the save worked
      const verifyConfig = getFoldersConfig();
      const activeCount = Object.values(verifyConfig.folders).filter(f => f.active).length;
      console.log(`After activation - Active folders count: ${activeCount}, Active folder: ${folderName}`);
      
      res.json({ 
        message: currentlyActiveFolder 
          ? `Folder "${folderName}" activated. "${currentlyActiveFolder}" has been deactivated.`
          : `Folder "${folderName}" activated successfully.`,
        folderName,
        active: true,
        previousActive: currentlyActiveFolder || null,
        totalActiveFolders: activeCount
      });
      
    } else {
      // DEACTIVATING the current folder
      foldersConfig.folders[folderName].active = false;
      foldersConfig.folders[folderName].deactivatedAt = new Date().toISOString();
      saveFoldersConfig(foldersConfig);
      
      console.log(`Folder deactivated: ${folderName}`);
      
      res.json({ 
        message: `Folder "${folderName}" deactivated successfully`,
        folderName,
        active: false
      });
    }
  } catch (error) {
    console.error('Error toggling folder status:', error);
    res.status(500).json({ error: 'Failed to toggle folder status' });
  }
});

// Upload images to folder
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  try {
    const { folderName } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${folderName}/${file.filename}`,
      size: file.size
    }));
    
    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      folder: folderName
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Delete folder
app.delete('/api/folders/:folderName', async (req, res) => {
  try {
    const { folderName } = req.params;
    const folderPath = path.join('./uploads', folderName);
    
    if (await fs.pathExists(folderPath)) {
      await fs.remove(folderPath);
      res.json({ message: 'Folder deleted successfully' });
    } else {
      res.status(404).json({ error: 'Folder not found' });
    }
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});