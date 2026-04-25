import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./layout/Shell";
import Login from "./pages/Login";
import Doctors from "./pages/Doctors";
import Patients from "./pages/Patients";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Appointments from "./pages/Appointments";
import Calendar from "./pages/Calendar";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import StaffPage from "./pages/StaffPage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import PatientDetailPage from "./pages/PatientDetailPage";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        
      {/* Protected routes */}
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/" element={<Navigate to="/patients" replace />} />

          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />

          <Route path="/doctors" element={<Doctors />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/calendar" element={<Calendar />} />

        
        <Route element={<RequireRole anyOf={["MANAGER", "ADMIN"]} />}>
          <Route path="/staff" element={<StaffPage />} />
        </Route>
  

        <Route element={<RequireRole anyOf={["ADMIN"]} fallbackTo="/patients" />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        
        <Route element={<RequireRole anyOf={["ADMIN"]} />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>


        {/*
        
        <Route element={<RequireRole allOf={["MANAGER", "ADMIN"]} />}>
          <Route path="/super-sensitive" element={<SensitivePage />} />
        </Route>
        */}


        </Route>
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}