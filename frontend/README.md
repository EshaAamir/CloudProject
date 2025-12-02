# Frontend Application - Cloud Computing Assignment

A React-based frontend application for managing notes with authentication and file uploads.

## Features

- ✅ User Authentication (Login/Register)
- ✅ Notes CRUD Operations
- ✅ File Upload to S3
- ✅ Protected Routes
- ✅ Responsive Design

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: Plain CSS

## Prerequisites

- Node.js 18+ installed
- Backend API running (see backend README)

## Local Development Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Application will run on `http://localhost:5173`

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

## AWS Deployment on Elastic Beanstalk

### Option 1: Deploy using Docker (Recommended)

1. **Build Docker image**
   ```bash
   docker build -t frontend-app .
   ```

2. **Test locally**
   ```bash
   docker run -p 8080:80 frontend-app
   ```

3. **Create Elastic Beanstalk Application**
   - Go to AWS Elastic Beanstalk Console
   - Create new application
   - Choose "Docker" platform
   - Upload Docker image or use Dockerfile

### Option 2: Deploy Static Build (Alternative)

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Create `Procfile`** (for Elastic Beanstalk)
   ```
   web: npm install -g serve && serve -s dist -l 8080
   ```

   Or use nginx configuration (see nginx.conf)

3. **Create Elastic Beanstalk Application**
   - Choose "Node.js" platform
   - Upload your application (including dist folder)
   - Configure environment variables

### Step-by-Step Elastic Beanstalk Deployment

1. **Prepare Application**
   ```bash
   # Build the application
   npm run build
   ```

2. **Create Deployment Package**
   ```bash
   # Create a zip file with necessary files
   zip -r frontend-deploy.zip dist/ package.json Procfile .ebextensions/
   ```

3. **Deploy to Elastic Beanstalk**
   - Go to AWS Elastic Beanstalk Console
   - Click "Create Application"
   - Application name: `cloud-assignment-frontend`
   - Platform: Node.js or Docker
   - Upload your deployment package
   - Configure environment variables:
     - `VITE_API_URL`: Your backend API URL (e.g., `http://your-ec2-ip:3000/api`)

4. **Configure Environment**
   - Set environment variables in Elastic Beanstalk configuration
   - Update CORS settings on backend to allow Elastic Beanstalk URL

5. **Access Your Application**
   - Elastic Beanstalk will provide a URL like: `http://your-app.region.elasticbeanstalk.com`

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` or `https://your-backend.com/api` |

### Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── utils/          # Utility functions (API, auth)
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css      # Global styles
├── public/             # Static assets
├── dist/               # Production build (generated)
├── Dockerfile          # Docker configuration
├── nginx.conf          # Nginx configuration
├── package.json        # Dependencies
└── vite.config.js      # Vite configuration
```

## Pages

- `/login` - User login
- `/register` - User registration
- `/notes` - List all notes (protected)
- `/notes/new` - Create new note (protected)
- `/notes/:id/edit` - Edit note (protected)
- `/upload` - Upload file to S3 (protected)

## API Integration

The frontend communicates with the backend through REST APIs:

- Authentication: `/api/auth/login`, `/api/auth/register`
- Notes: `/api/notes` (GET, POST, PUT, DELETE)
- Upload: `/api/upload` (POST)

All API requests include JWT token in Authorization header for protected routes.

## Troubleshooting

### CORS Issues
- Ensure backend CORS is configured to allow your frontend URL
- Check `FRONTEND_URL` environment variable in backend

### API Connection Issues
- Verify `VITE_API_URL` is set correctly
- Check backend is running and accessible
- Verify network connectivity

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## License

ISC

