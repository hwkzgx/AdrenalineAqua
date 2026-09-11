import { NavLink } from "react-router-dom";

export default function Sidebar({ role }) {
  return (
    <div className="sidebar">
      <img src="/logo.png" className="logo" />

      <NavLink to={`/${role}/dashboard`}>Dashboard</NavLink>


      {role === "co" && (
        <>
          <NavLink to="/co/dashboard">Sales</NavLink>
        </>
      )}

      {role === "staff" && (
        <>
          <NavLink to="/staff/dashboard">Tasks</NavLink>
        </>
      )}

      {role === "customer" && (
        <>
          <NavLink to="/customer/dashboard">Orders</NavLink>
        </>
      )}
    </div>
  );
}