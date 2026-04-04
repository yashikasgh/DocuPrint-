# AI Event Document Generator

## 🎓 Academic Details
- **Course:** Natural Language Processing (NLP)
- **Class:** Semester VI (Third Year Engineering)
- **College:** Pillai College of Engineering — [pce.ac.in](https://www.pce.ac.in/)

---

## 📌 Overview
An AI-powered event document generator that automatically creates:
- 📄 **Event Proposals** – AI-written formal letters generated via Google Gemini
- 📊 **Post-Event Reports** – Comprehensive narrative reports via Mistral AI
- 💰 **Budget Documents** – Budget estimation, analysis & PDF reports
- 🗒️ **Attendance Sheets** – Parse CSV/Excel rosters and export styled PDFs
- 🎨 **Event Flyers** – AI-generated flyer concepts via OpenAI

---

## 🎯 Objective
To significantly reduce documentation time for events by automating the creation of various event-related documents — complete with theme-based formatting, automated budget and timeline estimation, and post-event analytics compilation.

---

## 🧠 Technologies Used

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| Radix UI | Accessible headless components |
| Framer Motion | Animations & transitions |
| React Query (TanStack) | Data fetching & caching |
| Recharts | Charts & analytics visualisation |
| React Hook Form + Zod | Form management & validation |
| React Router DOM | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| Multer | File upload handling (CSV/Excel) |
| pdf-lib | PDF generation (proposals, reports, attendance) |
| xlsx | Parsing Excel/CSV attendance files |
| dotenv | Environment variable management |
| CORS | Cross-origin request handling |

### AI / APIs
| Service | Purpose |
|---|---|
| Google Gemini (`@google/generative-ai`) | Proposal narrative generation |
| Mistral AI (via fetch) | Post-event report generation |
| OpenAI (via fetch) | Flyer concept generation |

---

## ⚙️ Installation

> **Prerequisites:** Node.js >= 18.x and npm >= 9.x
> 
> 📋 All project dependencies are listed in [`requirements.txt`](./requirements.txt) for reference.
> Since this is a Node.js project, installation is handled entirely via `npm install` (reads `package.json`).

```bash
# 1. Clone the repository
git clone <repo-link>
cd Event_generator

# 2. Install all dependencies (frontend + backend)
npm install

# 3. Set up environment variables
# Create a .env.local file in the root directory:
cp .env.example .env.local   # or create manually
```

### 🔑 Environment Variables (`.env.local`)
```env
GEMINI_API_KEY=<your-google-gemini-api-key>      # For proposal generation
MISTRAL_API_KEY=<your-mistral-api-key>           # For report narrative generation
OPENAI_API_KEY=<your-openai-api-key>             # For flyer concept generation (optional)
PORT=8787                                         # Backend port (default: 8787)
```

> All API keys are optional — the system falls back to template-based generation when keys are absent.

---

## ▶️ Usage

Run the frontend and backend in **two separate terminals** from the project root:

**Terminal 1 – Frontend (Vite dev server):**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 – Backend (Express API):**
```bash
npm run server
# Runs on http://localhost:8787
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
Event_generator/
├── src/                  # React frontend source
│   └── ...               # Pages, components, hooks
├── backend/
│   ├── server.js         # Express server entry point
│   ├── app.js            # Route definitions
│   ├── config.js         # Environment config
│   ├── utils.js          # PDF utilities & helpers
│   └── services/
│       ├── ai.js          # Gemini & Mistral AI calls
│       ├── documents.js   # Proposal & report PDF builders
│       ├── attendance.js  # Attendance parsing & PDF export
│       ├── attendanceStore.js
│       ├── budgetStore.js
│       ├── flyers.js      # Flyer concept generation
│       └── planning.js    # Budget analysis & timeline tools
├── requirements.txt      # Full dependency reference
├── package.json          # npm dependencies & scripts
└── .env.local            # API keys (not committed)
```

---

## 📈 Results
- Successfully generates professional PDF proposals, reports, and attendance sheets
- AI fallback system ensures documents are always generated (even without API keys)
- Budget analysis with Gemini-powered insights and historical trend estimation

---

## 🎥 Demo Video
YouTube link here

---

## 👥 Team Members
- Name 1
- Name 2
- Name 3

---

## 📌 GitHub Contributions
- Name 1 – Contribution
- Name 2 – Contribution
- Name 3 – Contribution

---

## 📚 References
- [Google Generative AI (Gemini)](https://ai.google.dev/)
- [Mistral AI API](https://docs.mistral.ai/)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [Radix UI](https://www.radix-ui.com/)
- [Pillai College of Engineering](https://www.pce.ac.in/)
