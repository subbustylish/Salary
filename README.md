# Z&T Salary Dashboard

Production-ready Attendance, Working Hours & Dynamic Payroll Management System built for Z&T Group with 6-day work week shift tracking, Cloud Firestore real-time persistence, and role-based access control.

---

## 🚀 Quick Deployment Guide

### Step 1: Push to GitHub

From your local machine / terminal in this project directory:

```bash
# Initialize git if not already initialized
git init

# Add all files
git add .

# Create initial commit
git commit -m "Production release: Z&T Salary Dashboard"

# Rename default branch to main
git branch -M main

# Add your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# Push to GitHub
git push -u origin main
```

---

### Step 2: Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/) and sign in.
2. Click **"Add new site"** &rarr; **"Import an existing project"**.
3. Connect your **GitHub** account and select this repository.
4. Netlify will automatically detect the settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **"Deploy site"**.
6. Once deployed, Netlify will generate your live production URL (e.g. `https://your-site-name.netlify.app`), which you can share directly with your employees.

---

## 👥 Default Accounts

Employees and admins can sign in using their **Username**, **Employee ID**, or **Email**:

| Name | Role | Employee ID | Username | Email |
| :--- | :--- | :--- | :--- | :--- |
| **Subburaj** | Administrator | `ZT-EMP-1111` | `admin` | `subburaj@zealluxe.com` |
| **Meena** | Employee | `ZT-EMP-001` | `meena` | `meena@zealluxe.com` |
| **Mahalakshmi** | Employee | `ZT-EMP-002` | `maha` | `mahalakshmi@zealluxe.com` |

*(Passwords configured in the dashboard apply as set).*

---

## 🛠️ Architecture & Features

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Database**: Cloud Firestore (Real-time subscriptions on attendance, users, holidays, exceptions, settings)
- **Routing**: Single Page Application (SPA) with Netlify rewrite rules configured in `netlify.toml` and `public/_redirects`
- **6-Day Work Week**: Monday–Saturday shift tracking with automated holiday and Sunday exclusion
- **Real-Time Accuracy**: Live working hours counter, manual punch adjustment modal for admins, instant WhatsApp & Email management alerts
