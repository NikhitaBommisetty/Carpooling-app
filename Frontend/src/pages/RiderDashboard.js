import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function RiderDashboard() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    try {
      const res = await api.get("/trips", {
        params: { source, destination },
      });
      // filter on date & time if provided
      let filtered = res.data;
      if (date) filtered = filtered.filter((t) => t.TripDate === date);
      if (time) filtered = filtered.filter((t) => t.TripTime >= time);
      setTrips(filtered);
    } catch (err) {
      console.error("Error fetching trips:", err);
    }
  };

  const handleBook = (tripId) => {
    navigate(`/trips/book/${tripId}`);
  };

  return (
    <div>
      <div className="card">
        <h2>Search Trips</h2>
        <input
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <input
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {/* Search results */}
      {trips.length > 0 && (
        <div className="card">
          <h3>Available Trips</h3>
          {trips.map((t) => (
            <div key={t.Trip_ID} className="card">
              <p>
                <b>{t.Source}</b> → <b>{t.Destination}</b>
              </p>
              <p>
                Date: {t.TripDate}, Time: {t.TripTime}
              </p>
              <p>Available Seats: {t.AvailableSeats}</p> {/* ✅ shows available */}
              <p>Price per seat: ₹{t.PricePerSeat}</p>
              <button onClick={() => handleBook(t.Trip_ID)}>Book</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RiderDashboard;
