import React from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <nav>
      <div><Link to="/">RideSharing</Link></div>
      <div>
        {!token && <Link to="/login">Login</Link>}
        {!token && <Link to="/register-driver">Driver Register</Link>}
        {!token && <Link to="/register-rider">Rider Register</Link>}

        {role === "1" && <Link to="/driver/dashboard">Dashboard</Link>}
        {role === "1" && <Link to="/driver/create-trip">Create Trip</Link>}
        {role === "1" && <Link to="/driver/trips">My Trips</Link>}
        {role === "1" && <Link to="/driver/bookings">Rider Bookings</Link>}

        {role === "2" && <Link to="/rider/dashboard">Dashboard</Link>}
        {role === "2" && <Link to="/rider/bookings">My Bookings</Link>}

        {token && <button onClick={handleLogout}>Logout</button>}
      </div>
    </nav>
  );
}

export default Navbar;
