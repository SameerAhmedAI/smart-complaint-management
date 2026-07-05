# 🎨 CaseTrack - Frontend Application

This is the React client interface for the **CaseTrack - Smart Complaint Management System**. It is built on React 19, powered by Vite, and styled with Tailwind CSS v4.

---

## 🚀 Key Features

- **Authentication Guarding:** Role-based access controls using global `AuthContext` and router middleware to prevent unauthorized visits.
- **Dynamic Dashboards:**
  - **Complainant Portal:** Submit complaints using an interactive, real-time checked form. View histories, filter by status, and receive immediate toast alerts on action results.
  - **Staff Resolver Panel:** View assigned complaints, drill down into customer history, update ticket status, and leave resolution comments.
  - **Admin Control Terminal:** Oversee all tickets, run staff assignments, view detailed graphs, toggle accounts, and register additional administrators.
- **Dynamic Charts:** Integration with Recharts to visualize statistics:
  - Complaint categories breakdown.
  - Ticket distribution by priority (High, Medium, Low).
  - Status ratios (Pending vs Resolved vs In Progress).
  - Recent trends/ticket volumes.
- **In-App Notification Feed:** Real-time feedback indicators (represented by the bell icon) showing recent updates, status changes, and staff assignments.
- **Auto-Logout Interceptor:** If the backend rejects a query with a `401 Unauthorized` (due to JWT expiration), Axios interceptors automatically flush local storage and send the user back to the login page.

---

## 🛠️ Tech Stack & Dependencies

- **React v19.2.6**
- **Vite v8.0.12**
- **Tailwind CSS v4.3.0** (with `@tailwindcss/vite` plugin for build optimizations)
- **React Router DOM v7.17.0** (Routing & Role-guards)
- **Axios v1.17.0** (HTTP Requests & Middleware Interceptors)
- **Recharts v3.8.1** (Dashboard Analytics)
- **React Hot Toast v2.6.0** (Notifications popup UI)

---

## 📂 Source Code Structure

- `/src/components/`: Reusable interface components.
  - [ComplaintForm.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/components/ComplaintForm.jsx): Interface for submitting tickets.
  - [Navbar.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/components/Navbar.jsx): Responsive header with conditional links based on auth role.
  - [NotificationBell.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/components/NotificationBell.jsx): Toast alert reader and manager.
  - [ProtectedRoute.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/components/ProtectedRoute.jsx): Verifies roles before allowing path access.
- `/src/context/`: State Engines.
  - [AuthContext.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/context/AuthContext.jsx): Stores active session token and user profile details.
- `/src/pages/`: Main application routing targets.
  - [Login.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/Login.jsx) & [Register.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/Register.jsx): Account registration and entry flow.
  - [UserDashboard.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/UserDashboard.jsx): View own history & lodge new cases.
  - [StaffPanel.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/StaffPanel.jsx): Action console for staff resolvers.
  - [AdminDashboard.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/AdminDashboard.jsx): Central database analysis, assignments, and user profiles.
  - [NotFound.jsx](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/pages/NotFound.jsx): Custom 404 handler.
- `/src/utils/`: Shared utilities.
  - [api.js](file:///c:/Users/ZA/Desktop/CaseTrack/frontend/src/utils/api.js): Global Axios wrapper.

---

## 🏃 Local Development Launch

### Installation
Make sure you have installed packages inside the `backend` directory first and launched the backend database connection.

Then, execute the following commands in the `frontend` folder:
```bash
# Install NPM dependencies
npm install
```

### Starting the Development Server
```bash
npm run dev
```
By default, the client is deployed on [http://localhost:5173](http://localhost:5173).

### Building for Production
To generate optimization bundles under the `/dist` output folder:
```bash
npm run build
```

To preview the built site locally:
```bash
npm run preview
```
