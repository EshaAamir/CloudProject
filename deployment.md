
**Deployment — Full AWS Manual Guide (Postgres)**

This file contains an explicit, step-by-step manual deployment guide for the project using AWS services. It covers:
- Amazon S3 (public + private file storage)
- Amazon RDS (PostgreSQL)
- Backend deployment on EC2 using Docker / Docker Compose
- Frontend deployment on Elastic Beanstalk (upload build zip)
- VPC, subnets, Security Groups, IAM roles, HTTPS (ACM + Load Balancer)
- Troubleshooting and hardening best-practices

Use this guide as the authoritative manual-runbook for your Cloud Computing final project. Replace placeholder values (like `<ACCOUNT_ID>`, `<BUCKET_NAME>`, `<RDS_ENDPOINT>`, `<YOUR_DOMAIN>`, `<EC2_IP>`) with your real values.

**Table Of Contents**
- **Prerequisites**
- **1. Amazon S3 — public + private access**
- **2. Amazon RDS — PostgreSQL**
- **3. Backend — EC2 + Docker (production)**
- **4. Frontend — Elastic Beanstalk (React build upload)**
- **5. Network, Security & HTTPS (VPC, Subnets, SGs, IAM, ACM)**
- **6. Troubleshooting & Common Errors**
- **Appendix: Useful snippets and policies**

**Prerequisites**:
- AWS account with permission to create S3, EC2, RDS, IAM, Elastic Beanstalk, VPC, ELB, and ACM resources.
- Local tools: `node`/`npm`, `git`, `ssh` client (OpenSSH), PowerShell on Windows, `psql` (Postgres client) for local DB checks, and optionally AWS CLI configured with credentials.
- Project repo locally. Backend `env.example` is at `backend/env.example`. DB initialization SQL is `backend/database-init.sql`.
- EC2 key pair (downloaded `.pem`) for SSH.

**1. Amazon S3 — public + private access (step-by-step)**

Goal: Create an S3 bucket that supports both private storage (secure uploads used by backend) and public assets (optionally served publicly). Provide IAM and bucket policy examples, CORS, folder structure, and guidance how backend stores and serves file URLs.

Steps:
- Step 1 — Create the bucket
  - Console: Services → S3 → Create bucket
  - **Bucket name**: choose a globally unique name, e.g. `cloudproject-uploads-yourinitials`
  - **Region**: pick the same AWS Region as RDS and EC2 (reduce network egress)
  - Under **Object Ownership** choose **ACLs disabled and Bucket owner enforced** (recommended). If you require ACLs enable them explicitly and document reason.
  - Leave **Block all public access** ON for now (recommended). We will add a public prefix policy for public assets.
  - Enable **Default encryption** (SSE-S3 or SSE-KMS) for at-rest encryption.

- Step 2 — Create folder structure
  - Use prefixes (logical folders): e.g. `private/` for private uploads, `public/` for files you want to serve publicly, and `tmp/` for temporary upload parts.
  - Example object keys:
    - `private/user-uploads/<userId>/file-uuid.ext`
    - `public/assets/<path>`

- Step 3 — CORS configuration (for browser direct uploads)
  - Console: Bucket → Permissions → CORS configuration
  - Example CORS JSON:
    ```json
    [
      {
        "AllowedOrigins": ["https://<YOUR_FRONTEND_DOMAIN>", "http://localhost:5173"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3000
      }
    ]
    ```

- Step 4 — Public access for `public/` prefix (bucket policy)
  - Keep bucket-wide **Block public access** ON. Instead, add a policy that allows `s3:GetObject` for `public/*` objects (best-effort). Alternatively, copy public objects to a different bucket configured for static website hosting.
  - Example minimal bucket policy to allow public read for `public/*`:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowPublicReadForPublicFolder",
          "Effect": "Allow",
          "Principal": "*",
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::<BUCKET_NAME>/public/*"
        }
      ]
    }
    ```
  - Note: If your account blocks public ACLs or public policies, you may need to enable public access for that bucket explicitly—review your organization's policy.

- Step 5 — IAM role for backend (least privilege)
  - Create IAM role `EC2_Backend_S3_Access` (type: EC2 service role) and attach an inline policy limited to your bucket and useful actions.
  - Example policy (replace `<BUCKET_NAME>` and optionally, restrict by prefix):
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject"
          ],
          "Resource": [
            "arn:aws:s3:::<BUCKET_NAME>/private/*",
            "arn:aws:s3:::<BUCKET_NAME>/public/*"
          ]
        },
        {
          "Effect": "Allow",
          "Action": ["s3:ListBucket"],
          "Resource": ["arn:aws:s3:::<BUCKET_NAME>"]
        }
      ]
    }
    ```

- Step 6 — Backend storage strategy
  - Private uploads: backend uploads objects under `private/user-uploads/<userId>/...` and keeps the S3 object key in Postgres (table column `file_key`). The backend returns a signed URL for downloads using `s3.getSignedUrl('getObject', ...)` (SDK) when the item is requested.
  - Public assets: backend writes to `public/...` prefix and constructs public URLs with `https://<BUCKET_NAME>.s3.<REGION>.amazonaws.com/public/<object_key>` (or CloudFront URL if using CDN).
  - Store both `file_key` (S3 key) and `public` boolean in DB. Example DB columns: `id, user_id, file_key, file_name, is_public, created_at`.

**2. Amazon RDS — PostgreSQL (step-by-step)**

Goal: Create a secure Amazon RDS PostgreSQL instance and initialize schema from `backend/database-init.sql`.

Steps:
- Step 1 — Create DB subnet group (if not existing)
  - Console: VPC → Subnet Groups (RDS) → Create DB subnet group
  - Add at least two private subnets in different AZs for high availability.

- Step 2 — Create RDS PostgreSQL instance
  - Console: Services → RDS → Databases → Create database
  - Engine: **PostgreSQL** (choose a supported minor version compatible with your client; e.g., 15.x or 14.x)
  - Template: **Production** (or Free tier if eligible)
  - DB instance identifier: `cloudproject-db`
  - Credentials: master username (e.g., `postgres`), create a strong password
  - DB instance class: choose `db.t3.micro` for testing, `db.t3.small` or larger for production
  - Storage: General Purpose (gp3) with appropriate size (20GB+ recommended)
  - Connectivity:
    - **Virtual private cloud (VPC)**: choose the VPC where you will launch EC2
    - **Subnet group**: choose the DB subnet group created earlier
    - **Publicly accessible**: **No** (recommended). If set to `No`, ensure EC2 in same VPC can reach it.
    - **VPC security group(s)**: attach/create `SG-db` (see SG section) that allows inbound from backend SG on port 5432

- Step 3 — Security Group for RDS (`SG-db`)
  - Create Security Group: Services → EC2 → Security Groups → Create security group
  - Inbound rule: Type `PostgreSQL` (TCP 5432), Source: the backend EC2 security group (use security group ID, e.g. `sg-0123abcd`)
  - Outbound: allow as needed (default allow all is fine for RDS)

- Step 4 — Finalize and create DB
  - Click Create. Wait until status becomes `Available`.
  - Record the **endpoint** (hostname) and **port** (usually 5432)

- Step 5 — Create database and run schema
  - By default RDS creates the master user and a default DB. Create your app DB name if needed (e.g., `cloudassignment`):
    - From EC2 with `psql` client (recommended):
      ```bash
      sudo apt-get update -y && sudo apt-get install -y postgresql-client
      PGPASSWORD='<DB_MASTER_PASSWORD>' psql -h <RDS_ENDPOINT> -U <MASTER_USER> -c "CREATE DATABASE cloudassignment;"
      PGPASSWORD='<DB_MASTER_PASSWORD>' psql -h <RDS_ENDPOINT> -U <MASTER_USER> -d cloudassignment -f database-init.sql
      ```
    - Or use the RDS Query Editor in the Console (requires IAM/permissions)

- Step 6 — Configure environment variables
  - Set the following in your backend `.env` (or use Secrets Manager / Parameter Store):
    - `DB_HOST=<RDS_ENDPOINT>`
    - `DB_PORT=5432`
    - `DB_NAME=cloudassignment` (or your chosen DB)
    - `DB_USER=<DB_USERNAME>`
    - `DB_PASS=<DB_PASSWORD>`

**3. Backend — EC2 + Docker (detailed)**

Goal: Deploy backend onto EC2 in production mode using Docker (or Docker Compose), connect to RDS and S3.

Steps:
- Step 1 — Prepare an EC2 instance
  - Console: Services → EC2 → Instances → Launch instances
  - AMI: choose **Ubuntu LTS** or **Amazon Linux 2**
  - Instance type: `t3.small` (or `t3.micro` for trial)
  - Network: choose same VPC + private/public subnets as configured
  - IAM role: attach `EC2_Backend_S3_Access` role (created earlier) so instance has S3 permissions without embedding keys
  - Storage: 20 GB+ EBS
  - Security group: attach `SG-backend` (see SG section) — allow SSH from your IP, HTTP/HTTPS from internet (if exposing), and allow outbound to RDS

- Step 2 — Install Docker (& Docker Compose) on EC2
  - SSH into EC2 from PowerShell (Windows):
    ```powershell
    ssh -i C:\path\to\your-key.pem ubuntu@<EC2_PUBLIC_IP>
    ```
  - Install Docker (Ubuntu example):
    ```bash
    sudo apt update -y
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
    # Log out and back in or use: newgrp docker
    ```

- Step 3 — Dockerfile explanation (the project `backend/Dockerfile`)
  - The project `Dockerfile` uses Node 18-alpine, installs production dependencies (`npm ci --only=production`), copies app code, exposes port `3000`, and runs `npm start`.
  - Healthcheck points at `/health` which should return 200 if app is healthy.

- Step 4 — Transfer code or use Git/ECR
  - Option A — Clone repo directly on EC2:
    ```bash
    git clone https://github.com/<your-repo>.git app
    cd app/backend
    ```
  - Option B — Build locally and push Docker image to ECR (recommended for reproducible builds):
    - Create ECR repo, authenticate (`aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com`), tag and push image. Then `docker pull` on EC2.

- Step 5 — Configure environment variables on EC2
  - Create `backend/.env` on EC2 with values from `backend/env.example`. Prefer using Parameter Store or Secrets Manager and inject environment variables at runtime.
  - Example `.env` (replace placeholders):
    ```env
    PORT=3000
    NODE_ENV=production
    JWT_SECRET=<strong-secret>
    DB_HOST=<RDS_ENDPOINT>
    DB_USER=postgres
    DB_PASS=<DB_PASSWORD>
    DB_NAME=cloudassignment
    DB_PORT=5432
    AWS_REGION=<region>
    S3_BUCKET_NAME=<BUCKET_NAME>
    FRONTEND_URL=https://<YOUR_FRONTEND_DOMAIN>
    ```

- Step 6 — Build and run Docker container (production)
  - From `backend/` on EC2:
    ```bash
    docker build -t cloud-backend .
    docker run -d --name cloud-backend -p 3000:3000 --env-file .env --restart unless-stopped cloud-backend
    ```
  - If using `docker-compose.yml` add a `docker-compose.yml` with a `web` service mapping port `3000` and `env_file: .env`, then run:
    ```bash
    docker compose up -d --build
    ```

- Step 7 — Attach IAM role (if not done earlier)
  - If you didn't attach the role at launch, stop the instance, attach the role (`Actions → Security → Modify IAM role`), then start instance. Using IAM role avoids storing AWS access keys on the instance.

- Step 8 — Configure reverse proxy / load balancing (recommended)
  - For production, put an Application Load Balancer (ALB) or Nginx in front of the Docker container to serve traffic on ports 80/443 and forward to 3000.
  - If using ALB, register EC2 target on port 3000, configure health checks using `/health`.

**4. Frontend — Elastic Beanstalk (detailed)**

Goal: Deploy the React `build/` output to Elastic Beanstalk as a Node static server or Docker app.

Steps:
- Step 1 — Build production frontend locally
  - From `frontend/` on your machine:
    ```powershell
    $env:VITE_API_URL = 'https://api.<YOUR_DOMAIN>/api'
    npm ci
    npm run build
    ```

- Step 2 — Prepare zip for EB
  - Elastic Beanstalk expects a runnable application root. Easiest options:
    - Option A (Node static server): create a small `package.json` and `server.js` that serves `build/` using `express` or `serve`. Zip the entire Node app root including `node_modules` (or include `package.json` and allow EB to run `npm install`).
    - Option B (Docker): create a Dockerfile that uses `nginx` or `node` to serve static files and upload the Docker source as the application version.

  - Minimal `server.js` example (Node):
    ```javascript
    const express = require('express');
    const path = require('path');
    const app = express();
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('Frontend listening on', port));
    ```

- Step 3 — Create an Elastic Beanstalk application & environment
  - Console: Services → Elastic Beanstalk → Applications → Create application
  - Platform: Node.js (if using Node static server) or Docker
  - Upload the zip (`frontend-build.zip`) as the application version and deploy

- Step 4 — Environment variables and config
  - If you need runtime environment variables in EB navigate to Configuration → Software → Environment properties and add variables like `REACT_APP_API_URL` or other keys. Note: Vite-built values are baked at build time — prefer setting `VITE_API_URL` at build.

- Step 5 — Domain and SSL
  - Configure Route 53 to point your domain to EB environment (CNAME). For HTTPS, it's recommended to put an ALB in front or use EB's load balancer with ACM certificate. Create certificate in ACM in the same region and attach to load balancer.

- Step 6 — Verify
  - Visit the EB environment URL or your domain. Confirm the UI loads and that API requests reach your backend.

**5. Network, Security & HTTPS (VPC, Subnets, SGs, IAM, ACM)**

Network setup (recommended minimal design):
- VPC: single VPC with public and private subnets across 2 AZs.
- Public subnets: place NAT gateways, load balancers, and bastion host (if required).
- Private subnets: place EC2 backend instances and RDS DB subnets (DB subnet group uses private subnets)

Security Groups (IDs are examples):
- `SG-frontend` (ELB/EB): inbound 80/443 from 0.0.0.0/0; outbound to `SG-backend` on port 3000
- `SG-backend` (EC2): inbound 22 from your IP; inbound 3000 from `SG-frontend`; outbound 5432 to `SG-db`
- `SG-db` (RDS): inbound 5432 from `SG-backend`; outbound default allow

IAM least-privilege recommendations:
- Use instance profiles for EC2 with a role limited to the S3 bucket and (optionally) Secrets Manager access.
- Do not store `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in your repo or `.env` files on instances.
- If you use ECR, give the necessary `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer` to the CI or builder principal only.

HTTPS and ACM:
- Use AWS Certificate Manager (ACM) to request a public certificate for `api.<your-domain>` and `www.<your-domain>` or root domain. Validate via DNS in Route 53.
- Attach ACM cert to the ALB in front of your EB environment or to the load balancer in front of EC2.

Hardening best-practices:
- Keep RDS `Publicly accessible` = No and only allow connections from backend SG.
- Rotate secrets and use AWS Secrets Manager or Parameter Store with encryption.
- Enable CloudWatch logs and set a retention policy. Configure log shipping for ECS or EC2.
- Enable automatic minor version upgrades for RDS (test in staging first).
- Configure MFA for IAM users and use IAM roles for services.

**6. Troubleshooting & Common Errors**

- CORS errors (frontend -> backend)
  - Symptoms: Browser console shows CORS blocked errors when the frontend tries to call API
  - Checks:
    - Verify backend includes `Access-Control-Allow-Origin: https://<frontend-domain>` (or `*` for testing)
    - Check `FRONTEND_URL` and CORS middleware configuration in `backend/middleware` (see `backend/middleware/auth.js` or other middleware)
    - If frontend built with a different `VITE_API_URL`, rebuild the frontend

- S3 permissions (403/AccessDenied)
  - Symptoms: uploads fail with 403 or `AccessDenied`
  - Checks:
    - Confirm EC2 instance has the correct IAM role attached
    - Confirm bucket policy allows the role to `s3:PutObject` on the correct prefix
    - If using pre-signed URLs, verify the backend signs URLs with correct region and bucket

- Database connection failures
  - Symptoms: Backend logs show `ECONNREFUSED` or `timeout` connecting to DB
  - Checks:
    - Verify `DB_HOST` is correct (RDS endpoint) and `DB_PORT`=5432
    - Ensure RDS `SG-db` allows inbound from `SG-backend` (security group ID, not IP)
    - If RDS is private, ensure EC2 is in same VPC or use a bastion / VPN
    - From EC2 test connection:
      ```bash
      PGPASSWORD='<DB_PASSWORD>' psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME>
      ```

- Elastic Beanstalk deployment issues
  - Symptoms: EB environment fails health checks or App not reachable
  - Checks:
    - Verify EB health logs: EB Console → Logs → Request logs
    - Ensure the platform start command serves the React `build/` (or Dockerfile is correct)
    - Check environment variables and that the frontend build is pointing to the correct API URL

- Docker container crashes on startup
  - Symptoms: Container exits with non-zero code
  - Checks:
    - Run `docker logs <container>` to inspect runtime exceptions
    - Ensure `.env` has required variables like `DB_HOST` and `JWT_SECRET`
    - Confirm Node dependencies are installed in production image (Dockerfile uses `npm ci --only=production`)

**Appendix — Useful commands & snippets**

- Build and archive frontend (PowerShell):
  ```powershell
  cd frontend
  $env:VITE_API_URL = 'https://api.<your-domain>/api'
  npm ci
  npm run build
  Compress-Archive -Path build\* -DestinationPath frontend-build.zip -Force
  ```

- EC2: install Docker (Ubuntu):
  ```bash
  sudo apt update -y
  sudo apt install -y docker.io docker-compose
  sudo systemctl enable --now docker
  ```

- Run backend container (EC2):
  ```bash
  cd backend
  docker build -t cloud-backend .
  docker run -d --name cloud-backend -p 3000:3000 --env-file .env --restart unless-stopped cloud-backend
  ```

- Initialize Postgres DB and schema (from EC2):
  ```bash
  sudo apt install -y postgresql-client
  PGPASSWORD='<DB_MASTER_PASSWORD>' psql -h <RDS_ENDPOINT> -U <MASTER_USER> -c "CREATE DATABASE cloudassignment;"
  PGPASSWORD='<DB_MASTER_PASSWORD>' psql -h <RDS_ENDPOINT> -U <MASTER_USER> -d cloudassignment -f database-init.sql
  ```

- Example IAM policy for S3 access (attach to EC2 role):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::<BUCKET_NAME>",
          "arn:aws:s3:::<BUCKET_NAME>/*"
        ]
      }
    ]
  }
  ```

---

If you want, I can now:
- generate the exact IAM policy JSON with your account ID and bucket name filled in, or
- create an EB-friendly `package.json` + `server.js` wrapper in `frontend/` and add a small Dockerfile to make EB upload easy, or
- draft a `docker-compose.yml` for production that runs the app and a tiny `nginx` proxy.

File: `deployment.md` — updated in the repository root with full instructions.

