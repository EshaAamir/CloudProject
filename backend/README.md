# Backend Service - Cloud Computing Assignment

A Node.js/Express backend service with user authentication, Notes CRUD operations, and S3 file uploads.

## Features

- ✅ User Authentication (Register/Login with JWT)
- ✅ CRUD Operations for Notes
- ✅ Secure File Uploads to Amazon S3
- ✅ MySQL Database using Sequelize ORM
- ✅ Docker Support for EC2 Deployment

## Technology Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: MySQL (Amazon RDS)
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer + AWS SDK v3
- **Password Hashing**: bcryptjs

## Prerequisites

- Node.js 18+ installed
- MySQL database (Amazon RDS)
- AWS Account with S3 bucket created
- AWS IAM credentials with S3 access

## Local Development Setup

1. **Clone the repository and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - Database credentials (RDS endpoint)
   - AWS S3 bucket name and credentials
   - JWT secret
   - Frontend URL for CORS

4. **Start the server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Notes (Protected - requires JWT token)
- `POST /api/notes` - Create a new note
- `GET /api/notes` - Get all notes for authenticated user
- `GET /api/notes/:id` - Get a specific note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

### File Upload (Protected - requires JWT token)
- `POST /api/upload` - Upload file to S3 (multipart/form-data, field name: `file`)

### Health Check
- `GET /health` - Server health check

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Create Note (with JWT token)
```bash
POST /api/notes
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "My First Note",
  "content": "This is the content of my note",
  "imageUrl": "https://example.com/image.jpg"
}
```

### Upload File (with JWT token)
```bash
POST /api/upload
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <file>
```

## AWS Deployment on EC2

### Step 1: Prepare EC2 Instance

1. Launch an EC2 instance (Ubuntu 22.04 LTS recommended)
2. Configure Security Group:
   - Inbound: Port 22 (SSH), Port 3000 (HTTP)
   - Outbound: All traffic
3. Attach IAM Role with permissions:
   - `AmazonS3FullAccess` (or custom policy for your bucket)
   - `AmazonRDSFullAccess` (or custom policy for your RDS instance)

### Step 2: Install Docker on EC2

```bash
# Update system
sudo apt update

# Install Docker
sudo apt install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional)
sudo usermod -aG docker $USER
```

### Step 3: Deploy Backend

1. **Clone repository on EC2**
   ```bash
   git clone <your-repo-url>
   cd CLOUDAssignment/backend
   ```

2. **Create .env file**
   ```bash
   nano .env
   ```
   Add all required environment variables.

3. **Build and run Docker container**
   ```bash
   # Build image
   docker build -t backend-app .

   # Run container
   docker run -d \
     --name backend \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     backend-app
   ```

4. **Verify deployment**
   ```bash
   # Check container status
   docker ps

   # Check logs
   docker logs backend

   # Test health endpoint
   curl http://localhost:3000/health
   ```

### Step 4: Configure Security Groups

Ensure your EC2 Security Group allows:
- Port 3000 from your frontend's IP/Elastic Beanstalk
- Port 22 for SSH access

### Step 5: Set Up HTTPS (Optional but Recommended)

1. Use AWS Application Load Balancer (ALB)
2. Request SSL certificate via AWS Certificate Manager (ACM)
3. Configure ALB to forward traffic to EC2 instance on port 3000
4. Update Security Group to allow traffic from ALB

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key` |
| `DB_HOST` | RDS endpoint | `your-db.region.rds.amazonaws.com` |
| `DB_USER` | Database username | `admin` |
| `DB_PASS` | Database password | `your-password` |
| `DB_NAME` | Database name | `cloudassignment` |
| `DB_PORT` | Database port | `3306` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | `my-bucket-name` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `...` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-frontend.elasticbeanstalk.com` |

## Database Schema

### Users Table
- `id` (INT, Primary Key, Auto Increment)
- `username` (VARCHAR(50), Unique)
- `email` (VARCHAR(100), Unique)
- `password` (VARCHAR(255), Hashed)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Notes Table
- `id` (INT, Primary Key, Auto Increment)
- `title` (VARCHAR(200))
- `content` (TEXT)
- `userId` (INT, Foreign Key -> Users.id)
- `imageUrl` (VARCHAR(500))
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

## Troubleshooting

### Database Connection Issues
- Verify RDS endpoint and credentials
- Check Security Group allows EC2 to access RDS (port 3306)
- Ensure database exists and user has proper permissions

### S3 Upload Issues
- Verify IAM role/permissions for S3 access
- Check bucket name and region
- Ensure bucket policy allows public-read (if using public URLs)

### CORS Issues
- Verify `FRONTEND_URL` matches your frontend deployment URL
- Check browser console for CORS errors

## License

ISC

