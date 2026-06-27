import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function CreateTrip() {
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicle, setVehicle] = useState({
    model: "",
    type: "",
    color: "",
    capacity: "",
  });

  const [trip, setTrip] = useState({
    source: "",
    destination: "",
    date: "",
    time: "",
    available_seats: "",
    price: "",
    vehicle_id: "",
  });

  const [message, setMessage] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // ==============================
  // Fetch Existing Vehicles (with filtering)
  // ==============================
  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get(`/vehicles?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Filter out vehicles with missing or invalid fields
      const validVehicles = (res.data || []).filter(
        (v) =>
          v.Vehicle_ID &&
          v.Model?.trim() &&
          v.Type?.trim() &&
          v.Color?.trim() &&
          v.Capacity
      );
      setVehicles(validVehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchVehicles();
  }, [token, fetchVehicles]);

  // ==============================
  // Add New Vehicle (with validation)
  // ==============================
  const handleAddVehicle = async (e) => {
    e.preventDefault();

    const newVehicle = {
      model: vehicle.model.trim(),
      type: vehicle.type.trim(),
      color: vehicle.color.trim(),
      capacity: Number(vehicle.capacity) || 1,
    };

    if (!newVehicle.model || !newVehicle.type || !newVehicle.color) {
      setMessage({ text: "❌ Please fill all vehicle details", type: "error" });
      return;
    }

    try {
      const res = await api.post("/vehicles", newVehicle, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ text: "✅ Vehicle added successfully!", type: "success" });
      setVehicle({ model: "", type: "", color: "", capacity: "" });
      setShowAddVehicle(false);

      // ✅ Fetch vehicles again after short delay to reflect the new one
      setTimeout(fetchVehicles, 300);

      // ✅ Auto-select newly added vehicle
      const addedVehicle = res.data;
      if (addedVehicle?.Vehicle_ID) {
        setTrip((prev) => ({ ...prev, vehicle_id: addedVehicle.Vehicle_ID }));
      }
    } catch (err) {
      console.error("Vehicle creation error:", err);
      setMessage({
        text: err.response?.data?.msg || "❌ Failed to add vehicle",
        type: "error",
      });
    }
  };

  // ==============================
  // Create Trip (with validation)
  // ==============================
  const handleTrip = async (e) => {
    e.preventDefault();

    if (
      !trip.source ||
      !trip.destination ||
      !trip.date ||
      !trip.time ||
      !trip.vehicle_id
    ) {
      setMessage({ text: "❌ Please fill all trip details", type: "error" });
      return;
    }

    try {
      const payload = {
        ...trip,
        available_seats: Number(trip.available_seats),
        price: Number(trip.price),
        vehicle_id: Number(trip.vehicle_id),
      };

      await api.post("/trips", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ text: "✅ Trip created successfully!", type: "success" });
      setTimeout(() => navigate("/driver/dashboard"), 2000);
    } catch (err) {
      console.error("Trip creation error:", err);
      setMessage({
        text: err.response?.data?.msg || "❌ Failed to create trip",
        type: "error",
      });
    }
  };

  return (
    <div className="flex gap-6 p-4">
      {/* ================= TRIP FORM (LEFT) ================= */}
      <div className="card w-2/3 p-4">
        <h2 className="text-xl font-semibold mb-3">Create Trip</h2>
        <form onSubmit={handleTrip}>
          <input
            placeholder="Source"
            value={trip.source}
            onChange={(e) => setTrip({ ...trip, source: e.target.value })}
            required
          />
          <input
            placeholder="Destination"
            value={trip.destination}
            onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
            required
          />
          <input
            type="date"
            value={trip.date}
            onChange={(e) => setTrip({ ...trip, date: e.target.value })}
            required
          />
          <input
            type="time"
            value={trip.time}
            onChange={(e) => setTrip({ ...trip, time: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Available Seats"
            value={trip.available_seats}
            onChange={(e) =>
              setTrip({
                ...trip,
                available_seats:
                  e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            required
          />
          <input
            type="number"
            placeholder="Price per Seat"
            value={trip.price}
            onChange={(e) =>
              setTrip({
                ...trip,
                price: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            required
          />

          {/* Vehicle Dropdown */}
          <select
            value={trip.vehicle_id}
            onChange={(e) => setTrip({ ...trip, vehicle_id: e.target.value })}
            required
          >
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => (
              <option key={v.Vehicle_ID} value={v.Vehicle_ID}>
                {v.Model} ({v.Type}) - {v.Color} [{v.Capacity} seats]
              </option>
            ))}
          </select>

          <button type="submit" style={{ marginTop: "10px" }}>
            Create Trip
          </button>
        </form>
      </div>

      {/* ================= VEHICLE SIDE PANEL (RIGHT) ================= */}
      <div className="card w-1/3 p-4">
        <h2 className="text-lg font-semibold mb-2">My Vehicles</h2>

        {vehicles.length === 0 && <p>No vehicles added yet.</p>}
        <ul>
          {vehicles.map((v) => (
            <li key={v.Vehicle_ID}>
              {v.Model} ({v.Type}) - {v.Color} [{v.Capacity} seats]
            </li>
          ))}
        </ul>

        <button
          style={{ marginTop: "10px" }}
          onClick={() => setShowAddVehicle(!showAddVehicle)}
        >
          {showAddVehicle ? "Cancel" : "Add Vehicle"}
        </button>

        {showAddVehicle && (
          <form onSubmit={handleAddVehicle} className="mt-3">
            <input
              placeholder="Model"
              value={vehicle.model}
              onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
              required
            />
            <input
              placeholder="Type"
              value={vehicle.type}
              onChange={(e) => setVehicle({ ...vehicle, type: e.target.value })}
              required
            />
            <input
              placeholder="Color"
              value={vehicle.color}
              onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Capacity"
              value={vehicle.capacity}
              onChange={(e) =>
                setVehicle({
                  ...vehicle,
                  capacity:
                    e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              required
            />
            <button type="submit">Save Vehicle</button>
          </form>
        )}
      </div>

      {/* ================= MESSAGE ================= */}
      {message && (
        <div
          className={`message ${message.type} mt-3`}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            backgroundColor:
              message.type === "success" ? "#c8f7c5" : "#f7c5c5",
            padding: "10px 15px",
            borderRadius: "8px",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

export default CreateTrip;
