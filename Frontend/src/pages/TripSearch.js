// import React, { useEffect, useState } from "react";
// import { useLocation, Link } from "react-router-dom";
// import api from "../api";

// function TripSearch() {
//   const [trips, setTrips] = useState([]);
//   const location = useLocation();

//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     const source = params.get("source");
//     const destination = params.get("destination");
//     const date = params.get("date");
//     const time = params.get("time");

//     const fetchTrips = async () => {
//       try {
//         const res = await api.get("/trips", {
//           params: { source, destination, date, time },
//         });
//         setTrips(res.data);
//       } catch (err) {
//         console.error("Error fetching trips:", err);
//       }
//     };

//     fetchTrips();
//   }, [location.search]);

//   return (
//     <div>
//       {trips.length === 0 && <p>No trips found</p>}

//       {trips.map((t) => (
//         <div key={t.Trip_ID} className="card">
//           <h2>Available Trips</h2>
//           <p>
//             <b>{t.Source}</b> → <b>{t.Destination}</b>
//           </p>
//           <p>
//             Date: {new Date(t.TripDate).toLocaleDateString()} | Time:{" "}
//             {t.TripTime}
//           </p>
//           <p>Available Seats: {t.AvailableSeats}</p>
//           <p>Price per seat: ₹{t.PricePerSeat}</p>

//           <Link to={`/trips/${t.Trip_ID}/book`}>
//             <button>Book</button>
//           </Link>


//         </div>
//       ))}
//     </div>
//   );
// }

// export default TripSearch;
