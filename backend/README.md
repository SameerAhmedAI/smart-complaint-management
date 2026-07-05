# ⚙️ CaseTrack - Backend API Service

This is the Node.js Express server backend for the **CaseTrack - Smart Complaint Management System**. It manages authentication, tickets storage/query, real-time in-app notifications, and integrates email services as well as automated category/priority classifications.

---

## 🚀 Key Features

- **Database Automation:** Automatic tables setup on startup using PostgreSQL (`pg`). Integrates automated key camelization for database records output matching.
- **AI Classification Engine:** Uses Google Gemini API (`@google/generative-ai`) to extract features from tickets:
  - Subject/Topic Categories (e.g. IT, Finance, HR, Facilities, Academic).
  - Priority levels (High, Medium, Low).
  - Suggested department routing.
  - Sentiment analysis (positive, neutral, negative).
  - Short summary generation.
  - *Fallback:* A fast, keyword-based regex classifier kicks in automatically if API keys are missing or limits are exceeded, ensuring zero service disruptions.
- **Email Notifications:** Automatic Nodemailer-based triggers:
  - Submit confirmation to complainants.
  - Allocation alerts to staff members.
  - Resolution notifications upon status completion.
- **In-App Alert Logger:** Writes status and routing alterations to the notifications table to power the client-side notifications drawer.
- **Global & Auth Rate Limiting:** Global endpoints are limited to 200 queries per 15 minutes, while registration/login attempts are restricted to 50 requests per 15 minutes to mitigate brute-force entries.
- **Security Enhancements:** Helmet middleware configurations for securing HTTP response headers, CORS origins whitelisting, and strict SQL parameterization.

---

## 🛠️ API Technologies & Packages

- **Node.js** & **Express.js**
- **pg** (PostgreSQL Connection Pooling)
- **jsonwebtoken** (JWT creation and signature checking)
- **bcryptjs** (Safe salt hashing of user credentials)
- **@google/generative-ai** (AI analyzer connection client)
- **nodemailer** (SMTP sender)
- **helmet** (Security headers)
- **express-rate-limit** (Traffic limiting)

---

## 📂 Source Code Structure

- `/config/db.js`: PostgreSQL connection credentials pool, automatic table schema queries, and camel-case JSON transformation helpers.
- `/controllers/`: Core endpoint processing scripts:
  - `authController.js`: Account registers, logins, JWT signing, user directory lookups.
  - `complaintController.js`: Complaint submission pipelines, AI categorization, admin assignments, resolver modifications, deletion.
  - `dashboardController.js`: SQL aggregations (counts by status, counts by priority, category timelines) for Recharts analytics.
  - `notificationController.js`: Reading/marking notifications.
- `/middleware/auth.js`: Implements the `protect` interceptor (extracts/decodes JWT) and the `authorize` role gating middleware.
- `/routes/`: Express endpoint mappings.
- `/utils/`:
  - `emailService.js`: Email dispatch logic and layout templates.
  - `geminiAI.js`: AI classification client and regex keywords parser.

---

## 🏃 Local Setup & Run

### 1. Install Packages
Run the following in the `backend` folder:
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Fill in the parameters (refer to the root [README.md](file:///c:/Users/ZA/Desktop/CaseTrack/README.md) for variable definitions).

### 3. Database Execution
Ensure PostgreSQL is active. Run the development environment:
```bash
npm run dev
```
The server binds to port `5000` (or your config's `PORT` value). All table schemas populate automatically on connection success.
