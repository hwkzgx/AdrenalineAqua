import { Navigate, Outlet } from "react-router-dom";
import { normalizeRole, ROLE_HOME } from "./ProtectedRoute";

// Para sa login / register pages.
// Kapag naka-login na ang user, hindi na niya mapupuntahan ang mga ito;
// ipapadala siya sa sarili niyang home page.
export default function PublicOnlyRoute() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (user) {
    const role = normalizeRole(user.role);
    const home = ROLE_HOME[role];
    if (home) return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
