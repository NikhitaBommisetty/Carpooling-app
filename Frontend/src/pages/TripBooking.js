import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

function TripBooking() {
  const { id } = useParams(); // Trip_ID from URL
  const [trip, setTrip] = useState(null);
  const [seats, setSeats] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30); 
  const [mode, setMode] = useState("UPI");
  const [bookingId, setBookingId] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ✅ Fetch single trip by ID
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await api.get(`/trips/${id}`);
        setTrip(res.data);
      } catch (err) {
        console.error("Error fetching trip:", err);
      }
    };
    fetchTrip();
  }, [id]);


  // ⏱ Countdown
  useEffect(() => {
    if (!bookingId || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, bookingId]);
    // ⏱ Handle auto-cancel when time runs out
  useEffect(() => {
    if (bookingId && timeLeft === 0) {
      alert("⏰ Booking cancelled because payment was not completed in time.");
      setBookingId(null); 
      navigate("/rider/dashboard"); // or back to trips/search if you prefer
    }
  }, [timeLeft, bookingId, navigate]);


  // 1️⃣ Create booking
  const handleBooking = async () => {
    try {
      const res = await api.post(
        "/bookings",
        { trip_id: id, seats },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookingId(res.data.booking_id);
      alert("Booking created. Please complete payment within 30sec minutes.");
    } catch (err) {
      console.error("Booking error:", err);
      alert(err.response?.data?.msg || "Failed to create booking");
    }
  };

  // 2️⃣ Make payment
  const handlePayment = async () => {
    try {
      await api.post(
        "/payments",
        { booking_id: bookingId, amount: seats * trip.PricePerSeat, mode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Booking confirmed & payment successful");
      navigate("/rider/bookings");
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.response?.data?.msg || "Payment failed");
    }
  };

  if (!trip) return <p>Loading trip details...</p>;

  return (
    <div className="card">
      <h2>
        {trip.Source} → {trip.Destination}
      </h2>
      <p>
        Date: {trip.TripDate}, Time: {trip.TripTime}
      </p>
      <p>Available Seats: {trip.AvailableSeats}</p>
      <p>Price per seat: ₹{trip.PricePerSeat}</p>

      <input
        type="number"
        min="1"
        max={trip.AvailableSeats}
        value={seats}
        onChange={(e) => setSeats(parseInt(e.target.value))}
      />
      <p>Total: ₹{seats * trip.PricePerSeat}</p>

      {bookingId ? (
        <>
          <p>
            Time left to pay:{" "}
            {Math.floor(timeLeft / 60)}:
            {(timeLeft % 60).toString().padStart(2, "0")}
          </p>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
          <button onClick={handlePayment} disabled={timeLeft <= 0}>
            Pay Now
          </button>
        </>
      ) : (
        <button onClick={handleBooking}>Book Seats</button>
      )}
    </div>
  );
}

export default TripBooking;