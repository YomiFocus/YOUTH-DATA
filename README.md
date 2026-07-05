# Electronic Registration Portal with Duplicate Prevention

A full-stack, production-ready Electronic Registration System built using **React (Vite) + TypeScript + Tailwind CSS** on the frontend, and **Express (Node.js)** on the backend. This system is designed with strict relational constraints and advanced client/server validations to prevent duplicate registrations using full name, email address, or phone number.

---

## 📌 Features

### Client Portal (Registration Form)
- **Multi-Step Form Layout**: Interactive progress indicator with validation checks at each step.
- **Strict Duplicate Protection**: Form checks duplicates before registration and maps detailed warnings.
- **File Upload**: Built-in passport photograph validation and preview.
- **Custom Visual CAPTCHA**: Secure server-side validation against bots without external third-party keys.
- **Robust Field Rules**: Custom validation for email format and standard Nigerian phone numbers (`080`, `081`, `090`, `091`, etc.).

### Admin Dashboard (Secured)
- **Interactive KPI Cards**: Statistics for Total Registrations, Registrations Today, This Week, and This Month.
- **Registrations Manager**: Search by Name, Email, or Phone, and filter by creation dates.
- **Editable Records**: Safely edit or delete registration entries directly in the table.
- **Export Formats**: Multi-format exports including CSV, JSON, and layout optimization for browser printing.
- **Email Dispatch logs**: A custom debug panel to inspect outbound registration confirmation emails.

---

## 🛠️ Security Measures

1. **SQL Injection immunity**: Data resides in structured relational schemas and parameters.
2. **XSS Protection**: A recursive input sanitizer strips all HTML tags and JavaScript injectors from all incoming request payloads.
3. **CSRF Protection**: Cookie-synchronized double-submit tokens validated via custom request headers.
4. **Rate Limiting**: Custom window-based IP tracking prevents bot flooding and brute force attempts.
5. **Data Normalization**: Cleans telephone structures and normalizes emails/names to prevent spoofing with capitals or international prefixes.

---

## 📂 Project Structure

```text
├── data/
│   └── db.json               # Local atomic database file
├── src/
│   ├── components/           # Modular visual components
│   │   ├── RegistrationForm.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── CaptchaChallenge.tsx
│   ├── server/
│   │   └── db.ts             # Relational Database abstraction
│   ├── App.tsx               # Main SPA router and view layout
│   ├── index.css             # Tailwind styling and typography
│   ├── main.tsx              # React mounting entrypoint
│   └── types.ts              # Global TypeScript interfaces
├── server.ts                 # Main Express Backend
├── schema.sql                # Production PostgreSQL / MySQL schema
├── package.json              # Script runners and dependencies
└── vite.config.ts            # Vite asset pipeline configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ 
- **NPM** v9+

### 2. Installation
Clone the repository and install all node packages:
```bash
npm install
```

### 3. Running in Development
Start the full-stack server using the integrated development command:
```bash
npm run dev
```
The application will boot at `http://localhost:3000`.

### 4. Compiling the Application
Compile Vite static assets and bundle the Express backend with esbuild:
```bash
npm run build
```

### 5. Running in Production
Launch the bundled CommonJS application:
```bash
npm run start
```

---

## 🔑 Administrative Credentials

The system seeds a default admin account on first boot.
- **Username**: `admin`
- **Password**: `AdminPassword123!`

---

## 🧪 Testing Procedures

### Step 1: Normal Registration
- Complete the form with unique details.
- Fill out the visual CAPTCHA.
- Verify that a success card appears, details are listed, and the mock outgoing email appears in the server logs.

### Step 2: Test Name Duplicate Rule (Rule 1)
- Attempt to register a second person with the exact same name (e.g., `John David`).
- Ensure the system halts registration and displays:
  `"This name has already been used for registration."`

### Step 3: Test Email Duplicate Rule (Rule 2)
- Attempt to register with a different name but the same email address (case-insensitive, e.g. `JOHN@email.com` vs `john@email.com`).
- Ensure the system halts registration and displays:
  `"This email address already exists."`

### Step 4: Test Phone Duplicate Rule (Rule 3)
- Attempt to register with the same phone number under varying formats (e.g., `08031234567` vs `+2348031234567`).
- Ensure the normalizer blocks registration and displays:
  `"This phone number has already been used."`
