import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import RegisterDriver from "./pages/RegisterDriver";
import RegisterRider from "./pages/RegisterRider";
import DriverDashboard from "./pages/DriverDashboard";
import RiderDashboard from "./pages/RiderDashboard";
import TripSearch from "./pages/TripSearch";
import TripBooking from "./pages/TripBooking";
import CreateTrip from "./pages/CreateTrip";
import MyBookings from "./pages/MyBookings";
import Navbar from "./components/Navbar";
import DriverBookings from "./pages/DriverBookings";
import DriverTrips from "./pages/DriverTrips";  // ✅ new import

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register-driver" element={<RegisterDriver />} />
          <Route path="/register-rider" element={<RegisterRider />} />
          <Route path="/driver/dashboard" element={<DriverDashboard />} />
          <Route path="/rider/dashboard" element={<RiderDashboard />} />
          <Route path="/trips/search" element={<TripSearch />} />
          <Route path="/trips/book/:id" element={<TripBooking />} />
          <Route path="/driver/create-trip" element={<CreateTrip />} />
          <Route path="/rider/bookings" element={<MyBookings />} />
          <Route path="/driver/bookings" element={<DriverBookings />} />
          <Route path="/driver/trips" element={<DriverTrips />} /> {/* ✅ new route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
