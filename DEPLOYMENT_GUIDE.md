# 🛡️ Nexora Fraud Predictor - Pro-Tier Deployment Guide

This document provides the high-precision steps required to deploy the full-stack Nexora system using modern DevOps infrastructure.

## 1. Frontend (GitHub Pages)
The project is already configured for **Automated Deployment** to GitHub Pages using the included GitHub Actions workflow.

### Setup Instructions:
1.  **Push to GitHub**: Once you push the latest changes, go to your repository on GitHub.
2.  **Enable Actions**: Go to **Settings** -> **Actions** -> **General** and ensure "Read and write permissions" are enabled.
3.  **Secrets Configuration**: 
    *   Go to **Settings** -> **Secrets and variables** -> **Actions**.
    *   Add a **New repository secret** named `NEXT_PUBLIC_API_URL`.
    *   Value: The URL of your backend (e.g., `https://nexora-api.onrender.com/api`).
4.  **Wait for Build**: GitHub will automatically build and deploy the frontend to a new `gh-pages` branch.
5.  **Final Page Setup**: Go to **Settings** -> **Pages** and set the source to the `gh-pages` branch.

## 2. Backend (Render / Railway / VPS)
The backend requires a Node.js runtime. GitHub Pages is static and cannot host the `server.js` process.

### Deploying the Backend to Render (Recommended):
1.  Connect your GitHub repository to [Render.com](https://render.com).
2.  Create a new **Web Service**.
3.  Set the **Root Directory** to `backend`.
4.  **Build Command**: `npm install`
5.  **Start Command**: `node server.js`
6.  **Environment Variables**: Add your `JWT_SECRET` and `MONGODB_URI` here.

## 3. Database (MongoDB Atlas)
1.  Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Get your Connection String.
3.  Add it to your Backend Environment Variables as `MONGODB_URI`.

---

**Note**: By following this decoupled architecture, you ensure **Technical Dominance** and **Real-time Performance** that exceeds the limitations of basic static hosting.
