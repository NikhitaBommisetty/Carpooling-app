import React, { useEffect, useState } from "react";
import api from "../api";

function DriverDashboard() {
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/driver/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    if (token) fetchStats();
  }, [token]);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h2>Driver Dashboard</h2>

      <div className="card">
        <p>
          <b>Total Earnings:</b> ₹{stats.earnings}
        </p>
        <p>
          <b>Total Trips:</b> {stats.total_trips}
        </p>
      </div>

      <div className="card">
        <h3>Today’s Trips</h3>
        {stats.todays_trips.length === 0 && <p>No trips today</p>}
        {stats.todays_trips.map((t) => (
          <div key={t.Trip_ID} className="trip">
            <p>
              {t.Source} → {t.Destination} at {t.TripTime}
            </p>
            <p>Available Seats: {t.AvailableSeats}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Upcoming Trips</h3>
        {stats.upcoming_trips.length === 0 && <p>No upcoming trips</p>}
        {stats.upcoming_trips.map((t) => (
          <div key={t.Trip_ID} className="trip">
            <p>
              {t.Source} → {t.Destination} on {t.TripDate}
            </p>
            <p>Available Seats: {t.AvailableSeats}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DriverDashboard;
