# FoldSelect - Folder & Image Manager

A web application that allows users to create multiple folders and upload images to them with a clean, modern interface.

## Features

- 📁 **Create Multiple Folders**: Easily create and organize folders
- 🖼️ **Image Upload**: Upload multiple images to any folder
- 🎨 **Modern UI**: Clean, responsive design with smooth animations
- 📱 **Mobile Friendly**: Works perfectly on desktop, tablet, and mobile devices
- 🔍 **Image Preview**: Click on images to view them in full size
- 🗑️ **Delete Folders**: Remove folders and all their contents
- ✅ **File Validation**: Automatic validation for image files and size limits
- 📊 **Progress Tracking**: Real-time upload progress feedback

## Supported Image Formats

- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

## Installation & Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd /home/praveena/Projects/My/FoldSelect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:***
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## How to Use

### Creating Folders
1. Enter a folder name in the "Create New Folder" section
2. Click "Create Folder" button
3. The folder will appear in the "Your Folders" section below

### Uploading Images
1. Select a folder from the dropdown in the "Upload Images" section
2. Choose one or more image files (up to 10 files, max 10MB each)
3. Click "Upload Images"
4. Watch the progress bar and wait for completion
5. Images will appear in the selected folder

### Viewing Images
- Click on any image thumbnail to view it in full size
- Use the close button (×) or press Escape to close the modal

### Deleting Folders
- Click the "Delete" button on any folder card
- Confirm the deletion in the popup dialog
- The folder and all its images will be permanently removed

## File Structure

```
FoldSelect/
├── server.js              # Express server with API endpoints
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html        # Main HTML page
│   ├── style.css         # Styling and responsive design
│   └── script.js         # Frontend JavaScript functionality
└── uploads/              # Created automatically for storing images
    └── [folder-names]/   # User-created folders containing images
```

## API Endpoints

- `GET /` - Serve main page
- `GET /api/folders` - Get list of all folders with image counts
- `POST /api/folders` - Create a new folder
- `POST /api/upload` - Upload images to a folder
- `DELETE /api/folders/:folderName` - Delete a folder and its contents

## Technical Details

- **Backend**: Node.js with Express
- **File Upload**: Multer middleware for handling multipart/form-data
- **File System**: fs-extra for enhanced file operations
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS3 with Flexbox and Grid layouts
- **Security**: File type validation and sanitized folder names

## Configuration

### File Upload Limits
- Maximum file size: 10MB per image
- Maximum files per upload: 10 images
- Allowed extensions: .jpg, .jpeg, .png, .gif, .webp, .svg

### Server Port
- Default port: 3000
- Can be changed via PORT environment variable

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Troubleshooting

### Common Issues

1. **"Port already in use" error:**
   - Change the port in server.js or kill the process using port 3000
   
2. **Images not uploading:**
   - Check file size (max 10MB per image)
   - Verify file format is supported
   - Ensure folder is selected

3. **Folder not appearing:**
   - Refresh the page
   - Check browser console for errors

### Development Notes

- The uploads directory is created automatically
- All uploaded files are stored in `/uploads/[folder-name]/`
- Folder names are sanitized to prevent directory traversal
- Images are renamed with timestamps to avoid conflicts

## License

MIT License - feel free to use and modify for your projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Enjoy organizing your images with FoldSelect! 📁✨**
