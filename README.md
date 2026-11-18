# CarePractice - Clinical Operations & Telemedicine Engine (Server API)

## Live Deployment & Repository Links
- Backend Live API Service: https://medical-server-8wom.onrender.com
- Frontend Live Application: https://medical-app-ecru.vercel.app/
- Backend Repository: https://github.com/nabilsiddik/Medical-Server
- Frontend Repository: https://github.com/nabilsiddik/Medical-App

---

## Project Overview
CarePractice Backend is a scalable clinical management, electronic medical records (EMR), appointment scheduling, and telemedicine REST API built with Node.js, Express.js 5, TypeScript, and Prisma ORM 7 backed by PostgreSQL. 

The system orchestrates multi-chamber scheduling, cryptographic digital prescription generation with verifiable QR codes, bidirectional real-time patient consultation chat via WebSockets, Google Sheets synchronized knowledge base ingestion, and financial cash-up reconciliation. Engineered for data integrity, strict role-based access control, and zero booking collision, this backend powers the core operations of modern outpatient medical chambers.

---

## Key Features & Core Modules

### Multi-Chamber Appointment & Slot Scheduling Engine
- Deterministic Slot Generator: Dynamically calculates available appointment slots per chamber based on start time, end time, consultation duration (e.g., 15, 20, or 30 minutes), and doctor breaks.
- Collision Prevention: Enforces atomic reservation logic to prevent overlapping bookings for the same chamber and time slot.
- Lifecycle Management: Complete status transition handling across PENDING, CONFIRMED, IN_CONSULTATION, COMPLETED, and CANCELLED.

### Verifiable Digital Prescriptions & PDFKit Generator
- Programmatic PDF Generation: Generates formatted clinical prescriptions using PDFKit including physician credentials, BMDC registration number, patient vitals, medications, dosage rules, duration, and clinical advice.
- Anti-Tampering QR Verification: Automatically embeds a cryptographic verification URL (`/verify-rx?code=...`) with a unique prescription token, enabling pharmacies and patients to verify authentic physician issuance.

### Real-Time Live Consultation Chat (Socket.io)
- Full-duplex WebSocket communication between patients and clinical desks.
- Session-based conversation persistence in PostgreSQL with delivery receipts.
- Live typing indicators, active presence tracking, and graceful disconnect fallbacks.

### Google Sheets AI Assistant Knowledge Base Ingestion
- Real-time ingestion engine that reads publicly accessible Google Sheets CSV endpoints.
- Parses and tokenizes medical chamber FAQs, consultation fees, chamber addresses, and visiting hours.
- Powers the practice AI assistant with structured, up-to-date data without requiring manual machine learning retraining.

### Electronic Medical Records (EMR) & Patient Directory
- Longitudinal patient health history tracking previous visits, past diagnoses, medication logs, and lab investigation reports.
- Comprehensive search and filter capabilities by patient phone, name, or MRN (Medical Record Number).

### Financial Ledger & Daily Cash-Up Accounting
- Automated invoice creation linked to appointment completion and prescribed treatments.
- Daily cash-up calculation reconciling cash, digital payments, card settlements, and pending dues.
- Exportable financial summaries for practice audit trails.

### Enterprise Security & Architecture Safeguards
- Multi-tier rate limiting: Global IP rate limiting alongside strict thresholds on authentication routes.
- HTTP security hardening via Helmet and granular CORS origin whitelisting.
- Demo Mutation Protection Guard: Middleware that automatically intercepts and restricts write or delete operations for demo accounts while preserving full read capabilities.
- Graceful shutdown handling for SIGINT and SIGTERM to prevent connection drops during deployment rollouts.

---

## System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client Layer
        WebClient[Next.js Client Application]
        ThirdParty[Pharmacies & Verification Scanners]
    end

    subgraph Security & Ingress
        Nginx[Reverse Proxy / SSL] --> Helmet[Helmet Security Headers]
        Helmet --> RateLimiter[Global & Auth Rate Limiters]
        RateLimiter --> DemoGuard[Demo Mutation Protection Guard]
        DemoGuard --> JWTAuth[JWT Authentication & RBAC]
    end

    subgraph Express Application Layer
        JWTAuth --> AppRouter[Express Module Router /api/v1]
        AppRouter --> AuthModule[Auth & User Module]
        AppRouter --> ClinicModule[Clinic & Chamber Settings]
        AppRouter --> ApptModule[Appointment & Slot Engine]
        AppRouter --> RxModule[Prescription & PDF Generator]
        AppRouter --> EMRModule[Patient Records & History]
        AppRouter --> BillingModule[Billing & Cash-Up Ledger]
        AppRouter --> ChatModule[Socket.io Real-Time Desk]
        AppRouter --> CMSModule[Clinical Blog CMS]
    end

    subgraph Data & Storage Services
        PrismaORM[Prisma ORM 7 Multi-File Schema]
        PG[(PostgreSQL Database)]
        Cloudinary[(Cloudinary Document / Image Store)]
        GSheets[Google Sheets Knowledge Engine]
        
        ApptModule --> PrismaORM
        RxModule --> PrismaORM
        RxModule --> Cloudinary
        BillingModule --> PrismaORM
        EMRModule --> PrismaORM
        ChatModule --> PrismaORM
        ClinicModule --> GSheets
        PrismaORM --> PG
    end

    WebClient --> Nginx
    ThirdParty -->|Verify QR Code| AppRouter
```

---

## Technology Stack

| Category | Technology | Purpose |
|---|---|---|
| Runtime | Node.js (v20+) | High-performance asynchronous JavaScript execution environment |
| Framework | Express.js 5 | Robust web application framework with modern middleware pipeline |
| Language | TypeScript 5 | Strict static typing, interfaces, and compile-time correctness |
| Database ORM | Prisma ORM 7 | Multi-file modular schema, migrations, and type-safe query engine |
| Database | PostgreSQL | ACID-compliant relational data store with connection pooling |
| Database Adapter | @prisma/adapter-pg | Native pg-pool connection optimization for serverless and cloud hosting |
| Real-Time | Socket.io | Bidirectional event-driven communication for live consultation desks |
| Document Engine | PDFKit | Vector-accurate programmatic clinical prescription PDF generation |
| Cryptography & QR | qrcode, bcryptjs, crypto | Password hashing and high-density verifiable QR code synthesis |
| Security | Helmet, express-rate-limit | HTTP header protection, XSS defense, and brute-force mitigation |
| Media Storage | Cloudinary, Multer | Secure cloud asset uploads and medical document hosting |
| Validation | Zod | Runtime schema validation for request payloads and query parameters |
| Task Automation | node-cron | Scheduled tasks for slot resets, reminder dispatches, and keep-alives |

---

## REST API Specification

### Authentication & User Management (`/api/v1/auth`, `/api/v1/user`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| POST | /api/v1/auth/signup | Public | Register new patient account |
| POST | /api/v1/auth/login | Public | Authenticate user, set HTTP-only cookie, return JWT |
| POST | /api/v1/auth/refresh-token | Public | Issue new access token using refresh token |
| POST | /api/v1/auth/logout | Authenticated | Clear session tokens and cookies |
| POST | /api/v1/auth/forgot-password | Public | Dispatch password reset token |
| POST | /api/v1/auth/reset-password | Public | Reset password using valid cryptographic token |
| GET | /api/v1/user/me | Authenticated | Retrieve authenticated user profile and roles |
| PATCH | /api/v1/user/update-profile | Authenticated | Update user contact details and profile image |

### Clinic & Chamber Settings (`/api/v1/clinic`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| GET | /api/v1/clinic/settings | Public | Fetch practice branding, contact, and chamber details |
| PATCH | /api/v1/clinic/settings | Admin / Doctor | Update clinic operating parameters and logos |
| POST | /api/v1/clinic/sync-kb | Admin / Doctor | Synchronize knowledge base with external Google Sheet |
| GET | /api/v1/clinic/doctor-profile | Public | Retrieve public physician qualifications and credentials |
| PATCH | /api/v1/clinic/doctor-profile | Admin / Doctor | Update doctor bio, degrees, BMDC number, and chambers |

### Appointments & Scheduling (`/api/v1/appointment`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| GET | /api/v1/appointment/slots | Public | Calculate available slots for specific chamber and date |
| POST | /api/v1/appointment/book | Authenticated | Reserve an appointment slot with collision lock |
| GET | /api/v1/appointment/my-appointments | Patient | List authenticated patient appointment history |
| GET | /api/v1/appointment/all | Admin / Doctor | List all chamber appointments with filtering |
| PATCH | /api/v1/appointment/:id/status | Admin / Doctor | Update appointment status (CONFIRMED, COMPLETED, etc.) |

### Digital Prescriptions (`/api/v1/prescription`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| POST | /api/v1/prescription/create | Admin / Doctor | Generate digital prescription and create PDF document |
| GET | /api/v1/prescription/:id | Authenticated | Retrieve prescription details and medication list |
| GET | /api/v1/prescription/verify/:code | Public | Validate prescription authenticity via QR code token |
| GET | /api/v1/prescription/download-pdf/:id | Authenticated | Stream binary PDFKit prescription file |

### Billing & Cash-Up Ledger (`/api/v1/billing`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| GET | /api/v1/billing/invoices | Admin / Doctor | List all billing records and payment statuses |
| POST | /api/v1/billing/invoice | Admin / Doctor | Generate consultation invoice with fee breakdown |
| GET | /api/v1/billing/cash-up | Admin / Doctor | Fetch daily reconciliation summary and revenue totals |

### Real-Time Chat & AI Assistant (`/api/v1/chat`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| GET | /api/v1/chat/history/:sessionId | Authenticated | Fetch conversation history for consultation session |
| POST | /api/v1/chat/ai-query | Public | Query Google Sheet synchronized clinical knowledge base |

### Health Check & System Monitoring (`/health`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| GET | /health | Public | Server uptime, environment, and optional database ping |
| GET | /ping | Public | Lightweight keep-alive probe for cloud hosting environments |

---

## Environment Variables Configuration

Create a `.env` file in the root of the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/carepractice_db?schema=public"

# Security
SALT_ROUND=10

# Frontend Client URL (CORS origin)
CLIENT_URL=http://localhost:3000

# JWT Secrets & Expiration
JWT_ACCESS_SECRET=your_jwt_access_secret_key_minimum_32_characters
JWT_ACCESS_SECRET_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_characters
JWT_REFRESH_SECRET_EXPIRES_IN=30d
JWT_RESET_PASS_SECRET=your_jwt_reset_pass_secret_key
JWT_RESET_PASS_SECRET_EXPIRES_IN=10m

# Email Service (Nodemailer)
EMAIL_SENDER_EMAIL=your-clinic@gmail.com
EMAIL_SENDER_APP_PASS=your-google-app-password
ADMIN_EMAIL=admin@carepractice.com

# Cloudinary (Medical Document & Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Optional Integrations
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
```

---

## Installation & Local Setup

### Prerequisites
- Node.js version 20.0.0 or higher
- PostgreSQL database instance
- npm (v10+) or pnpm / yarn

### Step-by-Step Setup

1. Clone the repository:
```bash
git clone https://github.com/nabilsiddik/Medical-Server.git
cd Medical-Server
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL database URL and JWT secret keys.

4. Generate Prisma Client and run database migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed Initial Data (Admin Physician, default chambers, and clinical services):
```bash
npm run prisma:seed
```

6. Start the development server:
```bash
npm run dev
```
The server will start listening at `http://localhost:5000`.

### Production Deployment Build

To compile TypeScript and execute the production server:
```bash
npm run build
npm start
```

---

## Modular Directory Architecture

```
DOCTOR_BACKEND/
|-- prisma/
|   `-- schema/                      # Prisma 7 Multi-File Schema
|       |-- appointment.prisma       # Booking slots, chambers, visits
|       |-- auth.prisma              # Sessions, passwords, OAuth
|       |-- billing.prisma           # Invoices, transactions, cash-up
|       |-- clinic.prisma            # Chamber branches, operating hours
|       |-- cms.prisma               # Clinical health articles & categories
|       |-- communication.prisma     # Chat logs, SMS, email dispatches
|       |-- emr.prisma               # Diagnoses, vitals, clinical histories
|       |-- enums.prisma             # System-wide enum contracts
|       |-- patient.prisma           # Patient demographics & records
|       |-- schema.prisma            # Datasource & generator config
|       |-- service.prisma           # Medical treatments & fee schedule
|       |-- system.prisma            # Audit logs & application state
|       `-- user.prisma              # Authentication credentials & roles
|-- src/
|   |-- app/
|   |   |-- config/                  # Environment variable validator
|   |   |-- jobs/                    # Automated background crons
|   |   |-- middlewares/             # Auth, demo guard, rate limit, error
|   |   |-- modules/
|   |   |   |-- analytics/           # Practice KPI analytics
|   |   |   |-- appointment/         # Scheduling & booking domain
|   |   |   |-- auth/                # JWT & authentication domain
|   |   |   |-- billing/             # Ledger & cash-up domain
|   |   |   |-- chat/                # Socket.io & AI knowledge base
|   |   |   |-- clinic/              # Chamber profile & settings domain
|   |   |   |-- cms/                 # Blog publication domain
|   |   |   |-- patient/             # EMR patient directory domain
|   |   |   |-- prescription/        # PDFKit prescription builder
|   |   |   |-- service/             # Clinical services catalog
|   |   |   `-- user/                # User accounts & profile domain
|   |   |-- routes/                  # Express root API routing table
|   |   |-- seed/                    # Initial database seeder
|   |   `-- utils/                   # Token helpers & response formatters
|   |-- lib/                         # Prisma singleton client instance
|   |-- app.ts                       # Express application bootstrap
|   `-- server.ts                    # HTTP & Socket.io server entrypoint
|-- .env.example                     # Environment template
|-- package.json                     # Project manifest and scripts
`-- tsconfig.json                    # TypeScript compiler configuration
```

---

## Engineering Highlights for Technical Reviewers

- Modular Schema Design: Leverages the Prisma 7 multi-file schema feature to isolate clinical data models (EMR, Billing, Appointments, CMS) into focused schema files while maintaining strict foreign key constraints and transactional integrity.
- Atomic Slot Reservation: Protects chamber booking slots against race conditions through database-level unique constraints and atomic queries, ensuring zero overlapping reservations.
- Cryptographic Prescription Verification: Employs unique URL tokens and high-density QR code synthesis to guarantee prescription authenticity and protect patient safety against unauthorized tampering.
- Resilient Production Ingress: Combines Helmet, origin-restricted CORS policies, multi-tier rate limiting, and an automated demo mutation guard that allows public interactive portfolio exploration without risking database corruption.
- Real-Time Knowledge Base Synchronization: Directly parses Google Sheets CSV data into a semantic token index, enabling medical staff to maintain real-time assistant responses without code changes or redeployments.

---

## Related Repositories
- Frontend Web Client: [CarePractice Medical Client](https://github.com/nabilsiddik/Medical-App)

---

## Author
Developed by MD. Nabil Siddik.
