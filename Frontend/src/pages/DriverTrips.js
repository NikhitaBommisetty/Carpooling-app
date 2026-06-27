import React, { useEffect, useState, useCallback } from "react";
import api from "../api";

function DriverTrips() {
  const [trips, setTrips] = useState([]);
  const [message, setMessage] = useState(null);
  const token = localStorage.getItem("token");

  // ✅ Stable fetchTrips function with useCallback
  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get("/driver/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips(res.data);
    } catch (err) {
      console.error("Error fetching driver trips:", err);
    }
  }, [token]);

  // ✅ Run on mount & whenever token changes
  useEffect(() => {
    if (token) fetchTrips();
  }, [fetchTrips,token]);

  // ✅ Cancel trip (idempotent)
  const cancelTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to cancel this trip?")) return;
    try {
      const res = await api.put(
        `/driver/trips/${tripId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ text: res.data.msg || "Trip cancelled successfully", type: 'success' });

      // 🔄 Refresh trips after cancellation
      await fetchTrips();
    } catch (err) {
      console.error("Error cancelling trip:", err);
      setMessage({ text: "Failed to cancel trip", type: 'error' });
    }
  };

  return (
    <div>
      <h2>My Trips</h2>
      {trips.length === 0 && <p>No trips found</p>}

      {trips.map((trip) => (
        <div key={trip.Trip_ID} className="card">
          <p>
            <b>Trip:</b> {trip.Source} → {trip.Destination}
          </p>
          <p>
            <b>Date:</b> {trip.TripDate} at {trip.TripTime}
          </p>
          <p>
            <b>Seats:</b> {trip.AvailableSeats}
          </p>
          <p>
            <b>Price/Seat:</b> ₹{trip.PricePerSeat}
          </p>
          <p>
            <b>Status:</b> {trip.Status_Name}
          </p>

          {/* ✅ Cancel only if trip is active */}
          {trip.Status_Name === "Open" || trip.Status_Name === "Full" ? (
            <button onClick={() => cancelTrip(trip.Trip_ID)}>
              Cancel Trip
            </button>
          ) : (
            <button disabled>{trip.Status_Name}</button>
          )}
        </div>
      ))}
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default DriverTrips;
