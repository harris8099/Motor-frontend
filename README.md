# Smart Motor Frontend

React + Vite dashboard for monitoring smart motor devices, viewing telemetry, managing devices, and triggering on-demand AI analysis through the backend API.

## Features

- Device list with search, add, bulk add, and status controls
- Per-device dashboard for overview, power, temperature, vibration, faults, terminal, and settings
- Light and dark theme toggle
- Responsive telemetry gauges, charts, and prediction panels
- Backend-driven AI insights page that can show ML predictions and Gemini commentary

## Tech Stack

- React 19
- Vite 8
- React Router
- Chart.js / react-chartjs-2
- Lucide React

## Environment

Create a local `.env` file in this folder:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_API_KEY=your_backend_api_key
```

`VITE_API_URL` should point to the FastAPI backend.

## Install

```powershell
npm install
```

## Run

Development:

```powershell
npm run dev
```

Production build:

```powershell
npm run build
```

Preview build:

```powershell
npm run preview
```

## App Structure

- `src/pages/Home.jsx`
  Device list and device management
- `src/pages/DeviceLayout.jsx`
  Shared navigation shell for each device
- `src/pages/Overview.jsx`
  Gauges, quick metrics, chart, and AI summary
- `src/pages/AIPage.jsx`
  Prediction history and on-demand AI analysis trigger
- `src/api.js`
  Frontend API wrapper for backend endpoints

## Notes

- The frontend does not call Gemini directly.
- Gemini is called only from the backend.
- If Gemini quota is exhausted, the AI page still renders and shows the backend message.
