<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

## e-Sumbong Mo — San Mateo (QA & API Testing)

**Project:** e-Sumbong Mo: A Web-Based and Mobile Citizen Reporting Platform for Public Safety Hazards 
**Author:** Katelyn Laurin H. Urbano (BSIT - INF245)

---

## How to Run Locally

1. Open the project folder in VS Code and open the terminal (`Ctrl + ~`).
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps

(If Windows PowerShell blocks npm, use npm.cmd install --legacy-peer-deps and npm.cmd run dev.)
3. Start the server:

Bash
   npm run dev

Local Server URL:
   Plaintext
   http://localhost:3000

Postman Login Verification
Method: POST

URL: http://localhost:3000/api/auth/login

Body (raw → JSON):

1. Valid Login (200 OK)
   JSON
      {
      "email": "katelyn.urbano@gmail.com",
      "password": "citizen2026"
      }
2. Invalid Password (401 Unauthorized / 400 Bad Request)
   JSON
      {
      "email": "katelyn.urbano@gmail.com",
      "password": "wrongpassword123"
      }