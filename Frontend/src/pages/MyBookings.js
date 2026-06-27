import React, { useEffect, useState } from "react";
import api from "../api";

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/rider/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookings(res.data);
      } catch (err) {
        console.error("Error fetching rider bookings:", err);
      }
    };

    fetchBookings();
  }, [token]); // ✅ no ESLint warning

  const cancelBooking = async (id) => {
    try {
      await api.put(
        `/rider/bookings/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ text: "Booking cancelled", type: 'success' });

      // 🔄 refresh after cancel
      const updated = await api.get("/rider/bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(updated.data);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setMessage({ text: "Failed to cancel booking", type: 'error' });
    }
  };

  return (
    <div>
      <h2>My Bookings</h2>
      {bookings.length === 0 && <p>No bookings</p>}

      {bookings.map((b) => (
        <div key={b.Booking_ID} className="card">
          <p>
            {b.Source} → {b.Destination}
          </p>
          <p>
            Date: {b.TripDate}, Time: {b.TripTime}
          </p>
          <p>Seats: {b.SeatsBooked}</p>
          <p>Status: {b.Status}</p>

          {b.Status !== "cancelled" && (
            <button onClick={() => cancelBooking(b.Booking_ID)}>
              Cancel
            </button>
          )}
        </div>
      ))}
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default MyBookings;
