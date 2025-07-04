# Video Platform Frontend

A React-based frontend for the video upload and streaming platform with user authentication and video management.

## Features

- **User Authentication**: Login/signup with JWT tokens
- **Video Upload**: Upload videos with progress tracking
- **Video Dashboard**: View and manage all uploaded videos
- **Real-time Status**: Track video encoding progress
- **Video Streaming**: Stream completed videos
- **Responsive Design**: Works on desktop and mobile devices

## Pages

### 1. Video Dashboard (`/videos`)
The main page where users can view all their uploaded videos.

**Features:**
- View all uploaded videos with status indicators
- Filter videos by status (uploaded, processing, completed, failed)
- Pagination for large video collections
- Real-time progress tracking for encoding videos
- Convert uploaded videos to HLS format
- Stream completed videos
- Refresh status for processing videos

**Video Status Types:**
- 📤 **Uploaded**: Video uploaded but not yet converted
- 🔄 **Processing**: Video is being converted to HLS
- ✅ **Completed**: Video ready for streaming
- ❌ **Failed**: Video conversion failed

### 2. Upload Video (`/upload`)
Upload new videos to the platform.

**Features:**
- Drag and drop or click to select video files
- Automatic redirect to video dashboard after upload
- Progress feedback and error handling

### 3. Host (`/host`)
Host video streaming sessions.

### 4. Viewer (`/viewer`)
Watch video streams.

## Navigation

The platform includes a responsive navigation bar with:
- **My Videos**: Link to video dashboard
- **Upload Video**: Link to upload page
- **Host**: Link to hosting page
- **Viewer**: Link to viewer page
- **User Menu**: Shows username and logout option

## API Integration

The frontend integrates with the backend API endpoints:

- `GET /api/upload/videos` - Get user's videos
- `POST /api/upload/video` - Upload new video
- `POST /api/upload/convert-to-hls/:videoId` - Convert video to HLS
- `GET /api/upload/streaming/:videoId` - Get streaming URLs
- `GET /api/upload/status/:videoId` - Get encoding status

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure API:**
   Update `src/config.js` with your backend API URL:
   ```javascript
   export const API_CONFIG = {
     url: 'http://your-backend-url:3000'
   };
   ```

3. **Start Development Server:**
   ```bash
   npm start
   ```

4. **Access the Application:**
   Open `http://localhost:3000` in your browser

## Usage Flow

1. **Register/Login**: Create an account or login with existing credentials
2. **Upload Video**: Go to Upload page and select a video file
3. **Monitor Progress**: Check the Video Dashboard to see upload and encoding status
4. **Convert to HLS**: Click "Convert to HLS" for uploaded videos
5. **Stream Video**: Click "Stream Video" for completed videos

## Styling

The application uses Tailwind CSS for styling with a clean, modern design:
- Responsive grid layouts
- Status badges with color coding
- Progress bars for encoding status
- Hover effects and transitions
- Mobile-friendly navigation

## Error Handling

The application includes comprehensive error handling:
- Network request errors
- File upload errors
- Authentication errors
- User-friendly error messages
- Automatic retry mechanisms

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Project Structure
```
src/
├── components/
│   ├── VideoDashboard.js    # Main video management page
│   ├── VideoUpload.js       # Video upload component
│   ├── Navigation.js        # Navigation bar
│   ├── Login.js            # Login form
│   ├── Signup.js           # Signup form
│   └── ProtectedRoute.js   # Route protection
├── context/
│   └── AuthContext.js      # Authentication context
├── config.js               # API configuration
└── App.js                  # Main application component
```

### Key Components

**VideoDashboard**: Main component for video management
- Fetches and displays user's videos
- Handles filtering and pagination
- Manages video conversion and streaming

**Navigation**: Responsive navigation bar
- Links to all major pages
- User authentication status
- Mobile menu support

**VideoUpload**: Video upload functionality
- File selection and validation
- Upload progress tracking
- Success/error feedback 