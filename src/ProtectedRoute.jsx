import { Navigate, Outlet, useLocation } from "react-router-dom";

// Gawing pare-pareho ang pangalan ng role
export const normalizeRole = (role) => {
  const r = String(role || "").toLowerCase().trim();
  if (r === "co_associate" || r === "co-associate") return "co";
  return r;
};

// Saan ipapadala ang user kapag mali ang role niya sa pinuntahang page.
export const ROLE_HOME = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  co: "/co/dashboard",
  customer: "/customer/dashboard",
  rider: "/rider/home",
};

export default function ProtectedRoute({ allowedRoles, loginPath = "/login" }) {
  const location = useLocation();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  // 1) Hindi naka-login -> ibalik sa login page ng role na iyon
  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // 2) Naka-login pero mali ang role -> ibalik sa sarili niyang page
  if (allowedRoles && allowedRoles.length > 0) {
    const role = normalizeRole(user.role);
    const allowed = allowedRoles.map(normalizeRole);

    if (!allowed.includes(role)) {
      return <Navigate to={ROLE_HOME[role] || loginPath} replace />;
    }
  }

  // 3) Okay -> ipakita ang page
  return <Outlet />;
}
