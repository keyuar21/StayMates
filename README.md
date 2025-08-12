## StayMates - Where Every Stay Feels Like Home
A modern, full-featured roommate and accommodation finding platform built with Node.js, Express, and PostgreSQL, now featuring a complete DevOps pipeline for continuous integration and deployment.**

## 🚀 DevOps & CI/CD Pipeline

This project implements a robust CI/CD pipeline to automate testing and deployment, ensuring code quality and rapid delivery of new features.

### DevOps Flow Diagram
<img width="1888" height="984" alt="Screenshot 2025-08-12 at 5 38 51 PM" src="https://github.com/user-attachments/assets/a55f607b-1522-435a-bd46-704cde8ec8cf" />
<!-- Replace with the actual path to your diagram -->

### CI/CD Workflow Explained
The pipeline follows these stages:

1. **Development & Code Commit** 👨‍💻
   - Developers work on new features in a dedicated `min` branch.
   - Once development is complete, the code is pushed to the `min` branch in the GitHub repository.

2. **Automated Testing (GitHub Actions)** ✅
   - A push to the `min` branch automatically triggers a GitHub Actions workflow.
   - This workflow runs a series of automated tests to validate code quality and functionality.
   - If tests pass, the code is automatically merged into the `main` branch.
   - If tests fail, the pipeline stops, and the developer is notified to fix the issues.

3. **Build & Deployment (Jenkins)** 🏗️
   - A webhook triggers a Jenkins pipeline as soon as a commit is pushed to the `main` branch.
   - The Jenkins server, running on an AWS EC2 instance, pulls the latest code from the `main` branch.
   - Jenkins then builds a new Docker image of the application.

4. **Container Registry (AWS ECR)** 📦
   - The newly built Docker image is tagged and pushed to AWS Elastic Container Registry (ECR) for storage and versioning.

5. **Production Deployment (Kubernetes)** 🚢
   - Jenkins updates the Kubernetes deployment configuration (`k8deployment.yml`) with the new image tag.
   - The Kubernetes (Kind) cluster, also running on EC2, pulls the latest image from AWS ECR.
   - A rolling update strategy is used to deploy the new version with zero downtime, ensuring the application remains available to users.

![Visit the webiste  https://staymates-3.onrender.com/ ]

## 🌟 Features

### Core Features
- **User Authentication & Authorization**
  - Secure signup/login with email verification
  - JWT-based session management
  - Password encryption with bcrypt

- **Profile Management**
  - Comprehensive user profiles with preferences
  - Profile picture upload and management
  - Social media integration

- **Property Listing & Management**
  - Host properties with multiple images
  - Detailed property descriptions and amenities
  - Location-based search with maps integration
  - Rent management (daily, weekly, monthly)

- **Roommate Matching**
  - Smart matching based on preferences
  - Friend request system
  - Interest management for properties

- **Communication**
  - Real-time messaging system
  - Notification system
  - Email notifications

### Technical Features
- **Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Dark mode support
  - Progressive Web App (PWA) ready

- **Security**
  - Input validation and sanitization
  - Rate limiting
  - CORS protection
  - Helmet.js security headers

- **Performance**
  - Image optimization
  - Caching with Redis
  - Database query optimization

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Nodemailer** - Email service


### Frontend
- **EJS** - Template engine
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Client-side functionality
- **Bootstrap** - UI components (legacy support)

### DevOps & Tools
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and load balancer
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Nodemon** - Development server
- **Prometheus & Grafana** – Monitoring and metrics

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v13 or higher)
- [Redis](https://redis.io/) (optional, for caching)
- [Git](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/staymates.git
cd staymates
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=staymates
DB_USER=your_db_user
DB_PASSWORD=your_db_password
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 4. Database Setup
```bash
# Create database
createdb staymates

# Run migrations (if you have migration files)
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 5. Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🐳 Docker Setup

### Development with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Production Deployment
```bash
# Build production image
docker build -t staymates:latest .

# Run with production environment
docker run -d \
  --name staymates-prod \
  -p 3000:3000 \
  --env-file .env.production \
  staymates:latest
```

## 📁 Project Structure

```
staymates/
├── config/
│   └── db.js                 # Database configuration
├── models/
│   └── User.js              # User model
├── views/                   # EJS templates
│   ├── create_profile.ejs
│   ├── explore.ejs
│   ├── host.ejs
│   ├── login.ejs
│   └── new.ejs
├── public/                  # Static assets
│   ├── css/
│   ├── images/
│   └── js/
├── uploads/                 # User uploaded files
├── logs/                    # Application logs
├── database/
│   └── init.sql            # Database initialization
├── nginx/
│   └── nginx.conf          # Nginx configuration
├── .env                    # Environment variables
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── package.json           # Dependencies and scripts
├── server.js              # Main application file
└── README.md              # Project documentation
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm start           # Start production server

# Building
npm run build       # Build CSS and assets

# Testing
npm test           # Run tests
npm run test:watch # Run tests in watch mode

# Code Quality
npm run lint       # Lint code
npm run lint:fix   # Fix linting issues
npm run format     # Format code with Prettier

# Database
npm run db:migrate # Run database migrations
npm run db:seed    # Seed database with sample data

# Docker
npm run docker:dev  # Start development with Docker
npm run docker:prod # Start production with Docker
```

## 📞 Support

For support, email support@staymates.com or create an issue in this repository.

---

**Made with ❤️ by the Keyur Bhelonde **
