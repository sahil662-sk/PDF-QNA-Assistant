# 📄 PDF Q&A Assistant

An AI-powered full-stack web application that allows users to upload documents (PDFs) and ask questions in natural language. Powered by Google Gemini AI, the system processes document contents and streams back context-aware, accurate answers.

---

## 🚀 Live Demo

- **Frontend (Live Web App):** [https://pdf-qa-assistant.vercel.app](https://pdf-qa-assistant.vercel.app) *(Replace with your exact Vercel URL)*
- **Backend API:** [https://pdf-qa-backend-udoa.onrender.com](https://pdf-qa-backend-udoa.onrender.com)

> **Note:** The backend is hosted on Render's free tier. If inactive for more than 15 minutes, the server enters sleep mode. The very first request may take 30–50 seconds while the server spins up.

---

## ✨ Features

- 📑 **Instant PDF Parsing:** Upload and parse text content from multi-page PDF documents.
- 🤖 **Gemini AI Integration:** Leverages Google Gemini for contextual understanding and reasoning over document text.
- ⚡ **Real-Time Streaming Responses:** Live question answering with fast feedback.
- 🔄 **Session Reset:** Easily clear the current context and upload fresh documents.
- 🎨 **Modern Responsive UI:** Built with React, Vite, and clean modern styling for mobile and desktop screens.

---

## 🛠️ Tech Stack

### **Frontend**
- **React.js** (Vite template)
- **Axios** & Native Fetch API
- **CSS3 / Tailwind** for responsive styling
- **Hosting:** Vercel

### **Backend**
- **Node.js** & **Express.js**
- **Multer** (Multipart file uploads)
- **pdf-parse** (Extracting text from PDF streams)
- **Google Gen AI SDK** (`@google/genai` / `@google/generative-ai`)
- **CORS & Dotenv**
- **Hosting:** Render

---

## 📁 Project Structure

```text
pdf-qa-assistant/
├── client/                     # Frontend React (Vite) application
│   ├── public/
│   ├── src/
│   │   ├── App.jsx             # Main application UI and logic
│   │   ├── main.jsx            # React root mount
│   │   └── App.css
│   ├── package.json
│   └── vite.config.js
├── uploads/                    # Temporary upload cache (if applicable)
├── server.js                   # Node/Express API server
├── package.json                # Backend dependencies and scripts
├── .env.example                # Environment variables template
└── README.md
```

---

## ⚙️ Getting Started Locally

### 1. Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- A free [Google AI Studio Gemini API Key](https://aistudio.google.com/)

---

### 2. Clone the Repository

```bash
git clone https://github.com/sahil662-sk/pdf-qa-assistant.git
cd pdf-qa-assistant
```

---

### 3. Backend Setup

1. Install backend dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. Start the backend development server:
   ```bash
   node server.js
   ```
   *The backend will run on `http://localhost:5000`.*

---

### 4. Frontend Setup

1. Open a new terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. (For local testing) Point API calls in `client/src/App.jsx` to `http://localhost:5000`.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *Vite will launch the local app at `http://localhost:5173`.*

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Uploads and parses the PDF file into memory context |
| `POST` | `/api/ask` | Queries Gemini using the parsed PDF context |
| `POST` | `/api/reset` | Clears stored document state for fresh sessions |

---

## 🚢 Deployment Guide

### Backend on **Render**
1. Create a new **Web Service** and link your GitHub repository.
2. Settings:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
3. Add Environment Variable:
   - `GEMINI_API_KEY`: `<Your_Google_Gemini_Key>`

### Frontend on **Vercel**
1. Import your GitHub repository into Vercel.
2. Under Project Settings:
   - **Root Directory:** Set to `client`
   - **Framework Preset:** Vite
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
3. Hit **Deploy**.

---

## 👤 Author

- GitHub: [@sahil662-sk](https://github.com/sahil662-sk)
