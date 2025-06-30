# Video Sync App with Authentication

This is a full-stack video synchronization application with user authentication, built using Node.js, Express, Socket.IO, React, MongoDB, and JWT.

## Features

### Authentication
- ✅ User registration and login
- ✅ JWT token-based authentication
- ✅ Protected routes
- ✅ User profile management
- ✅ Secure password hashing with bcrypt

### Video Synchronization
- ✅ Host and viewers join a room via URL (e.g., `?roomId=abc123`)
- ✅ Host's play, pause, and seek actions are synced to all viewers
- ✅ Video is streamed from a public S3 URL using HLS
- ✅ Real-time synchronization using Socket.IO
- ✅ Multiple rooms support

### User Interface
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ User authentication forms with validation
- ✅ Protected routes with loading states
- ✅ User information display
- ✅ Logout functionality

---

## Backend Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Installation
```bash
cd backend
npm install
```

### Environment Configuration
1. Copy the environment example file:
```bash
cp env.example .env
```

2. Update the `.env` file with your configuration:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/video-sync-app

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=4000

# JWT Expiration (in seconds)
JWT_EXPIRES_IN=7d
```

### Run Backend
```bash
npm start
```

The backend will be available at `http://localhost:4000`

---

## Frontend Setup

### Installation
```bash
cd frontend
npm install
```

### Run Frontend
```bash
npm start
```

The frontend will be available at `http://localhost:5000`

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Health Check
- `GET /` - Basic health check
- `GET /api/health` - API health check with database status

---

## Usage

### 1. User Registration/Login
1. Visit `http://localhost:5000`
2. You'll be redirected to login if not authenticated
3. Create a new account or login with existing credentials

### 2. Host a Video Session
1. After login, you'll be taken to the host view
2. A unique room ID is automatically generated
3. Share the viewer link with others
4. Control video playback (play, pause, seek)

### 3. Join as Viewer
1. Click the shared link from the host
2. Click "Start Watching"
3. Video automatically syncs with host's playback

---

## Database Schema

### User Model
```javascript
{
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  avatar: String (optional),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 12
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Input Validation**: Server-side validation using express-validator
- **CORS**: Configured for cross-origin requests
- **Error Handling**: Comprehensive error handling and logging

---

## File Structure

```
poc-sync/
├── backend/
│   ├── models/
│   │   └── User.js              # User model with validation
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── utils/
│   │   └── jwt.js               # JWT utility functions
│   ├── env.example              # Environment variables template
│   ├── index.js                 # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js         # Login component
│   │   │   ├── Signup.js        # Signup component
│   │   │   └── ProtectedRoute.js # Route protection
│   │   ├── context/
│   │   │   └── AuthContext.js   # Authentication context
│   │   ├── Host.js              # Host view
│   │   ├── Viewer.js            # Viewer view
│   │   ├── App.js               # Main app with routing
│   │   ├── config.js            # Configuration
│   │   └── index.js             # App entry point
│   └── package.json
└── README.md
```

---

## Notes

- No media upload functionality included
- Only host can control playback; viewers are always synced
- Video URL is hardcoded in the frontend for demo purposes
- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- MongoDB connection is required for the app to function

---

## Production Considerations

1. **Environment Variables**: Use strong, unique JWT secrets
2. **Database**: Use a production MongoDB instance
3. **HTTPS**: Enable HTTPS in production
4. **CORS**: Configure CORS for your specific domains
5. **Rate Limiting**: Add rate limiting for authentication endpoints
6. **Logging**: Implement proper logging and monitoring
7. **Error Handling**: Add more comprehensive error handling 