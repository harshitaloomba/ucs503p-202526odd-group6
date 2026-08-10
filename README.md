# 🚀 HireReady

> A full-stack placement preparation platform for DSA, Aptitude, Online Assessments, Company-Wise Practice, and Competitive Programming.

## 🌐 Live Demo

- **Live:** https://ucs503p-202526odd-group6.vercel.app
- **GitHub:** https://github.com/harshitaloomba/HireReady

## ✨ Features

- 💻 **DSA Practice** — Practice problems by difficulty, topic, and company.
- 🏢 **Company-Wise Preparation** — Practice company-specific coding questions.
- 🧠 **Aptitude Practice** — Topic and subtopic-wise aptitude preparation.
- 📝 **Online Assessments** — Timed Aptitude + DSA mock assessments.
- 📊 **Progress Dashboard** — Track problems solved, streaks, activity, and progress.
- 📚 **Study Plans** — Follow structured preparation roadmaps.
- 🏆 **Contest Tracker** — Track LeetCode, CodeChef, and Codeforces contests.
- 🔗 **LeetCode Integration** — Synchronize LeetCode solving activity.
- 🧩 **Chrome Extension** — Track LeetCode submissions during assessments.
- 👨‍💼 **Admin Dashboard** — Manage users, questions, study plans, contests, and analytics.

## 📝 Online Assessment

| Section | Questions | Duration |
|---------|----------:|----------:|
| Aptitude | 25 | 30 min |
| DSA | 4 | 90 min |
| **Total** | **29** | **2 hrs** |

**DSA Difficulty:** 1 Easy + 2 Medium + 1 Hard

## 🛠️ Tech Stack

### Frontend

React.js, Vite, Redux Toolkit, React Router, Axios, Tailwind CSS

### Backend

Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs

### Chrome Extension

JavaScript, Chrome Extension Manifest V3, LeetCode GraphQL API

## 🏗️ Architecture

```text
React + Vite Frontend
        │
        │ REST API
        ▼
Node.js + Express Backend
        │
        ▼
MongoDB + Mongoose

Chrome Extension
        │
        ▼
     LeetCode
        │
        ▼
HireReady Backend
```

## 📁 Project Structure

```text
HireReady/
├── backend/
│   └── src/
│       ├── controller/
│       ├── models/
│       ├── routes/
│       ├── middlewares/
│       ├── utils/
│       └── db/
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── app/
│       ├── api/
│       └── services/
│
├── extension/
│   ├── content.js
│   └── manifest.json
│
└── README.md
```

## ⚙️ Setup

### 1. Clone Repository

```bash
git clone https://github.com/harshitaloomba/HireReady.git
cd HireReady
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Create a `.env` file:

```env
PORT=8000
MONGO_URI=your_mongodb_uri
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=your_access_token_expiry
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=your_refresh_token_expiry
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Configure the frontend environment variables using `.env.example`.

### 4. Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

## 🔐 Security

- JWT authentication
- bcrypt password hashing
- Protected API routes
- Role-based authorization
- Admin middleware
- Environment-based secrets

## 👩‍💻 Author

**Harshita Loomba**

B.Tech Student | Full-Stack Developer | AI/ML Enthusiast

- GitHub: https://github.com/harshitaloomba
- Project: https://github.com/harshitaloomba/HireReady

---

⭐ If you find HireReady useful, consider starring the repository.
