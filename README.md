# 🏥 Smart Care Sense (HealthPulse)

![HealthPulse Banner](https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200&h=400)

**Smart Care Sense** is a clinical-grade, real-time health monitoring platform. It bridges the gap between wearable IoT devices and AI-driven clinical insights, wrapped in a premium, glassmorphism-inspired interface.

---

## ✨ Core Highlights

- 💓 **Live Vitals Streaming**: Real-time monitoring of Heart Rate (BPM), SpO2, Blood Pressure, and Activity.
- 📈 **Dynamic ECG Monitoring**: Live SVG-based ECG wave visualization with heartbeat synchronization.
- 🤖 **AI Health Assistant**: Personalized wellness insights powered by trending health data.
- 🎨 **Premium "HealthPulse" Design**: A custom design system built on Midnight Teal backgrounds with Oxygen Mint and Vital Coral accents.
- 🔐 **Role-Based Access**: Specialized dashboard views for **Patients**, **Doctors**, and **Administrators**.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS.
- **State & Animation**: TanStack Query (React Query), Framer Motion, Lucide Icons.
- **Backend**: Supabase (PostgreSQL, Auth, SSR, Edge Functions).
- **UI Components**: Shadcn UI with custom HSL-based design tokens.
- **Connectivity**: Web Bluetooth API (GATT/BLE) & RESTful Wi-Fi Ingestion.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/your-username/smart-care-sense.git
cd smart-care-sense
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Schema
Ensure your Supabase instance has the following tables:
- `profiles` (id, full_name, avatar_url)
- `user_roles` (user_id, role: 'admin' | 'doctor' | 'patient')

### 4. Run Development
```bash
npm run dev
```

---

## 📐 Architecture

- **`app/`**: Next.js App Router with role-based grouping `(dashboard)`.
- **`components/dashboard`**: High-performance visualization components (VitalCard, EcgStrip).
- **`lib/vitals`**: Core logic for data simulation and health metric validation.
- **`globals.css`**: Centralized design system using HSL tokens and complex CSS animations.

---
Built with ❤️ by the Smart Care Sense Team.
