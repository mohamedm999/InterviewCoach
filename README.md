# InterviewCoach

**AI-powered interview preparation platform**

InterviewCoach is a full-stack web application that leverages AI to help users prepare for job interviews. Built with a modern monorepo architecture using Turborepo, it provides real-time coaching, question generation, and personalized feedback.

## 🏗️ Architecture

This is a monorepo managed with **Turborepo** containing:

- **apps/api** - NestJS backend API with WebSocket support
- **apps/web** - Next.js frontend application
- **packages/shared** - Shared types and utilities between apps

## 🚀 Tech Stack

### Backend (API)
- **NestJS** - Progressive Node.js framework
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Database
- **Passport.js** - Authentication (JWT)
- **Socket.IO** - Real-time WebSocket communication
- **OpenAI** - AI-powered coaching
- **nodemailer/mailtrap** - Email services
- **pdfmake** - PDF generation
- **Sentry** - Error tracking and performance monitoring

### Frontend (Web)
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **Framer Motion** - Animations
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Socket.IO Client** - Real-time communication
- **Recharts** - Data visualization
- **Sentry** - Error tracking

### DevOps
- **Docker & Docker Compose** - Containerization
- **Turborepo** - Monorepo build system
- **Jest** - Testing framework

## 📋 Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (optional, for containerized deployment)
- PostgreSQL 15+ (if running without Docker)

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd InterviewCoach
```

### 2. Environment Setup

Run the environment setup script:

```bash
# Windows
npm run setup:env

# Linux/Mac
npm run setup:env
```

Or manually copy the example env file:

```bash
cp .env.compose.example .env
```

### 3. Installation

```bash
npm install
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed the database (optional)
npm run db:seed
```

## 🏃 Development

### Run All Applications

Start both API and Web in development mode:

```bash
npm run dev
```

### Run Specific Applications

```bash
# Run only the API
npm run dev:api

# Run only the Web
npm run dev:web
```

## 📦 Building

### Build All

```bash
npm run build
```

### Build Specific Applications

```bash
# Build API
npm run build:api

# Build Web
npm run build:web
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in band (sequential)
npm run test:runInBand

# Run API tests only
npm run test:api

# Run Web tests only
npm run test:web

# Run E2E tests
npm run test:e2e
```

## 🐳 Docker Deployment

### Start All Services

```bash
npm run docker:up
```

### Stop All Services

```bash
npm run docker:down
```

### View Logs

```bash
npm run docker:logs
```

### Restart Services

```bash
npm run docker:restart
```

### Access Applications

- **Web**: http://localhost:3001
- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5433

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps |
| `npm run start` | Start all apps in production mode |
| `npm run lint` | Run linter on all apps |
| `npm run lint:fix` | Fix linting issues |
| `npm run test` | Run tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run clean` | Clean build artifacts |
| `npm run clean:all` | Clean all node_modules and caches |

## 🗂️ Project Structure

```
InterviewCoach/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── test/
│   │   └── Dockerfile
│   └── web/              # Next.js frontend
│       ├── src/
│       ├── public/
│       └── Dockerfile
├── packages/
│   └── shared/           # Shared code
├── scripts/
│   ├── setup-env.sh      # Environment setup (Unix)
│   └── setup-env.ps1     # Environment setup (Windows)
├── tests/                # E2E tests
├── docker-compose.yml    # Docker configuration
├── turbo.json           # Turborepo configuration
└── package.json         # Root package.json
```

## 🔐 Environment Variables

Key environment variables (see `.env.compose.example` for full list):

### Database
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name

### Authentication
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret

### AI/LLM
- `LLM_COACHING_ENABLED` - Enable/disable AI coaching
- `LLM_PROVIDER` - AI provider (e.g., openrouter)
- `LLM_MODEL` - AI model to use
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENROUTER_BASE_URL` - OpenRouter base URL

### Email
- `MAIL_HOST` - SMTP host
- `MAIL_PORT` - SMTP port
- `MAIL_USER` - SMTP username
- `MAIL_PASSWORD` - SMTP password
- `MAIL_FROM` - Sender email address

### Monitoring
- `SENTRY_DSN` - Sentry DSN for backend
- `SENTRY_AUTH_TOKEN` - Sentry auth token for frontend
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project

## 🔒 Security Features

- JWT-based authentication with access/refresh tokens
- Password hashing with Argon2/bcrypt
- XSS protection
- Helmet.js security headers
- Rate limiting with @nestjs/throttler
- CORS configuration
- Input validation with class-validator

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

**InterviewCoach** - Empowering your interview success with AI 🚀
