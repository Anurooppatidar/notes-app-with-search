## Notes App with Search

A full-stack notes application built with:
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Search**: MongoDB text index on `title` and `content`

Notes are persisted in MongoDB and can be created, edited, deleted, and searched.

---

### Features

- Create / edit / delete notes
- Full-text search (server-side) using MongoDB `$text`
- Debounced search input in the UI
- UI reflects MongoDB connection status

---

### Prerequisites

- Node.js
- A running **MongoDB Atlas** cluster (recommended) or a valid remote MongoDB connection string

---

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root and set:

   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-host>/?appName=Cluster0"
   ```

   Notes:
   - Use your real Atlas credentials.
   - If your password contains special characters (like `@`), URL-encode them (for example `@` -> `%40`).

---

### Run (Development)

The app runs as a single server:
- **Frontend UI**: `http://localhost:3000`
- **API** under: `http://localhost:3000/api/...`

Run:

```bash
npm run dev
```

---

### API Reference

Base URL: `http://localhost:3000/api`

1. **Check DB status**

   - `GET /status`

   Response:
   ```json
   { "status": "connected" | "disconnected", "message": "..." }
   ```

2. **List notes (optionally search)**

   - `GET /notes`
   - Optional query:
     - `search`: searches across `title` and `content`

   Example:
   - `GET /notes?search=meeting`

3. **Create a note**

   - `POST /notes`
   - Body:
   ```json
   { "title": "My title", "content": "My content" }
   ```

4. **Get a single note**

   - `GET /notes/:id`

5. **Update a note**

   - `PUT /notes/:id`
   - Body:
   ```json
   { "title": "New title", "content": "New content" }
   ```

6. **Delete a note**

   - `DELETE /notes/:id`

---

### MongoDB Notes / Troubleshooting

- If you see authentication errors, double-check your Atlas username/password.
- If you see connection errors, ensure your Atlas network access allows your IP address.
  - The server logs mention whitelisting in Atlas for connecting successfully.

---

### Project Structure ###


- `server.ts`: Express server + Mongoose model + REST API + Vite dev middleware
- `src/main.tsx`: React entry
- `src/App.tsx`: Main UI and client-side logic (CRUD + search)
- `src/index.css`: Tailwind setup + small global styling

By Anuroop Patidar
