# ShaqoHub — Teacher-School Connection App

A mobile-first web application that connects teachers and lecturers with schools and universities in Mogadishu, Somalia.

## Features

### For Teachers & Lecturers
- **Profile Creation**: Create detailed professional profiles with education, experience, and qualifications
- **Job Browsing**: Search and filter job postings from schools and universities
- **Job Applications**: Apply to teaching positions with one click
- **Application Tracking**: Monitor application status in real-time

### For Schools & Universities
- **Institution Profiles**: Showcase school/university information, location, and contact details
- **Job Posting**: Create and manage job listings with detailed requirements
- **Application Management**: Review applications, accept/reject candidates
- **Subscription Plans**: Access premium features through Dahabshil payment integration

### User Roles
1. **School Teacher** — For primary and secondary school educators
2. **University Lecturer** — For higher education academic staff
3. **School** — For primary and secondary educational institutions
4. **University** — For higher education institutions

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS (mobile-first design)
- **Backend/Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (email/password)
- **Routing**: React Router

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run the Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

This produces a `dist/` folder with static files that can be deployed to any web host (Vercel, Netlify, GitHub Pages, etc.)

## Building an Android APK

This app is a **Progressive Web App (PWA)** — it runs in any browser, including on Android phones. To package it as an installable Android APK, use one of these approaches:

### Option 1: Capacitor (Recommended)
```bash
npm install @capacitor/core @capacitor/android
npx cap init ShaqoHub com.shaqohub.app
npm run build
npx cap add android
npx cap copy
npx cap open android
```
Then build the APK from Android Studio (Build > Build APK).

### Option 2: PWABuilder
1. Deploy the app to a public URL (e.g., Vercel, Netlify)
2. Go to [pwabuilder.com](https://www.pwabuilder.com)
3. Enter your deployed URL
4. Download the generated Android package

### Option 3: TWA (Trusted Web Activity)
1. Deploy the app to a public URL
2. Use [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap):
```bash
npx @bubblewrap/cli init --manifest=https://your-domain.com/manifest.json
npx @bubblewrap/cli build
```

## Project Structure

```
ShaqoHub/
├── src/
│   ├── components/      # Reusable UI components (BottomNav, Logo, Feedback)
│   ├── context/         # Auth context provider
│   ├── lib/             # Supabase client and types
│   ├── screens/         # App screens (Auth, Jobs, Profile, etc.)
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles + Tailwind
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

## Database Schema

The app uses Supabase with three tables:

- **profiles** — Extends auth.users with role and profile data
- **jobs** — Teaching job postings created by schools/universities
- **applications** — Job applications submitted by teachers/lecturers

All tables have Row Level Security (RLS) enabled with owner-scoped policies.

## Payment Integration (Dahabshil)

The subscription flow is currently simulated. For production, integrate with the actual Dahabshil payment API using a Supabase Edge Function to proxy the payment request securely.

## License

Proprietary — All rights reserved.
