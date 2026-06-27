import React, { useEffect, useState } from "react";
import api from "../api";

function DriverBookings() {
  const [bookings, setBookings] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/driver/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookings(res.data);
      } catch (err) {
        console.error("Error fetching driver bookings:", err);
      }
    };

    fetchBookings();
  }, [token]);

  return (
    <div>
      <h2>My Riders’ Bookings</h2>
      {bookings.length === 0 && <p>No bookings found</p>}

      {bookings.map((b) => (
        <div key={b.Booking_ID} className="card">
          <p>
            <b>Rider:</b> {b.RiderName} ({b.RiderPhone})
          </p>
          <p>
            <b>phnno:</b> {b.RiderPhone}
          </p>
          <p>
            <b>Trip:</b> {b.Source} → {b.Destination}
          </p>
          <p>
            <b>Date:</b> {b.TripDate} at {b.TripTime}
          </p>
          <p>
            <b>Seats Booked:</b> {b.SeatsBooked}
          </p>
          <p>
            <b>Available Seats:</b> {b.AvailableSeats}
          </p>
          <p>
            <b>Status:</b> {b.Status}
          </p>
          {/* ❌ Cancel button removed */}
        </div>
      ))}
    </div>
  );
}

export default DriverBookings;
