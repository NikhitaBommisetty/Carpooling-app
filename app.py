import os
from flask import Flask, request, jsonify
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, get_jwt
)
import mysql.connector
from datetime import date, datetime, timedelta
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Secret key for JWT authentication
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
if not app.config['JWT_SECRET_KEY']:
    raise ValueError("JWT_SECRET_KEY is not set in environment or .env")

# -----------------------
# MySQL Connection
# -----------------------
db = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)
if not all([os.getenv("DB_USER"), os.getenv("DB_PASSWORD"), os.getenv("DB_NAME")]):
    raise ValueError("Database credentials must be set in environment or .env")

cursor = db.cursor(dictionary=True)

# -----------------------
# Helpers
# -----------------------
def update_completed_trips():
    """Mark trips as completed if the date is in the past."""
    today = date.today()
    completed_id = get_status_id("Completed")
    cursor.execute(
        "UPDATE Trip SET Status_ID = %s WHERE TripDate < %s AND Status_ID != %s",
        (completed_id, today, completed_id)
    )
    db.commit()

def cancel_expired_bookings():
    now = datetime.now()
    cursor.execute("""
        SELECT Booking_ID, Trip_ID, SeatsBooked 
        FROM Booking 
        WHERE Status = 'pending' AND ExpiresAt IS NOT NULL AND ExpiresAt < %s
    """, (now,))
    expired = cursor.fetchall()

    open_id = get_status_id("Open")
    full_id = get_status_id("Full")

    for b in expired:
        cursor.execute("UPDATE Booking SET Status = 'cancelled' WHERE Booking_ID = %s", (b["Booking_ID"],))
        cursor.execute("UPDATE Trip SET AvailableSeats = AvailableSeats + %s WHERE Trip_ID = %s",
                       (b["SeatsBooked"], b["Trip_ID"]))
        cursor.execute("UPDATE Trip SET Status_ID = %s WHERE Trip_ID = %s AND Status_ID = %s",
                       (open_id, b["Trip_ID"], full_id))

    if expired:
        db.commit()



def get_status_id(status_name):
    """Fetch Status_ID by name from TripStatus"""
    cursor.execute("SELECT Status_ID FROM TripStatus WHERE Status_Name = %s", (status_name,))
    result = cursor.fetchone()
    return result["Status_ID"] if result else None

# Role-based guard
def role_required(required_role):
    """Decorator to enforce role-based access (1=Driver, 2=Rider)"""
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            user_id = int(get_jwt_identity())  # now only user_id
            claims = get_jwt()
            role_id = int(claims["role_id"])

            if role_id != required_role:
                return jsonify({"msg": f"Access denied: only role {required_role} allowed"}), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper

# -----------------------
# Background Scheduler
# -----------------------
scheduler = BackgroundScheduler()
scheduler.add_job(cancel_expired_bookings, "interval", seconds=10) 
scheduler.start()

# -----------------------
# Routes
# -----------------------
@app.route("/")
def home():
    return " RideSharing Backend with Driver/Rider Dashboards is running!"

# -----------------------
# User Registration
# -----------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    try:

        sql_user = """INSERT INTO User (Name, PhoneNo, Email, Password, Role_ID) 
                      VALUES (%s, %s, %s, %s, %s)"""
        values_user = (
            data["name"],
            data.get("phone", "0000000000"),
            data["email"],
            data["password"],
            data["role_id"]
        )
        cursor.execute(sql_user, values_user)
        user_id = cursor.lastrowid

        if data["role_id"] == 1:  # Driver
            sql_license = """INSERT INTO DriverLicense (User_ID, LicenseNo, IssueDate, ExpiryDate)
                             VALUES (%s, %s, %s, %s)"""
            values_license = (
                user_id,
                data["license_no"],
                data.get("issue_date"),
                data.get("expiry_date")
            )
            cursor.execute(sql_license, values_license)

        elif data["role_id"] == 2:  # Rider
            sql_contact = """INSERT INTO EmergencyContact (User_ID, ContactName, ContactPhone)
                             VALUES (%s, %s, %s)"""
            values_contact = (
                user_id,
                data["emergency_name"],
                data["emergency_phone"]
            )
            cursor.execute(sql_contact, values_contact)

        db.commit()
        return jsonify({"msg": "User registered successfully", "user_id": user_id}), 201

    except mysql.connector.Error as err:
        print("❌ Registration Error:", err)  
        return jsonify({"msg": f"Registration failed: {err}"}), 400


# -----------------------
# User Login
# -----------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    sql = "SELECT * FROM User WHERE Email = %s AND Password = %s"
    cursor.execute(sql, (data["email"], data["password"]))
    user = cursor.fetchone()
    if user:
        token = create_access_token(
            identity=str(user["User_ID"]),  # must be string
            additional_claims={"role_id": (user["Role_ID"])}
        )
        return jsonify({
            "msg": "Login successful",
            "token": token,
            "role_id": user["Role_ID"]
        })
    return jsonify({"msg": "Invalid credentials"}), 401

# -----------------------
# Trips
# -----------------------
# Get available trips with source/destination filters
@app.route("/trips", methods=["GET"])
def get_trips():
    update_completed_trips()
    cancel_expired_bookings()

    source = request.args.get("source")
    destination = request.args.get("destination")

    sql = """SELECT t.*, ts.Status_Name 
             FROM Trip t 
             JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
             WHERE ts.Status_Name NOT IN ('Cancelled', 'Completed')"""
    params = []
    if source and destination:
        sql += " AND t.Source = %s AND t.Destination = %s"
        params = [source, destination]

    cursor.execute(sql, params)
    trips = cursor.fetchall()

    for trip in trips:
        trip["TripDate"] = str(trip["TripDate"]) if trip["TripDate"] else None
        trip["TripTime"] = str(trip["TripTime"]) if trip["TripTime"] else None

    
    return jsonify(trips)

# Create a new trip (Driver only)
@app.route("/trips", methods=["POST"])
@role_required(1)   
def create_trip():
    data = request.get_json()
    current_user_id = int(get_jwt_identity())  # user_id only

    # Ensure the vehicle belongs to this driver
    cursor.execute("SELECT Vehicle_ID FROM Vehicle WHERE Vehicle_ID = %s AND Driver_ID = %s",
                   (data["vehicle_id"], current_user_id))
    vehicle = cursor.fetchone()
    if not vehicle:
        return jsonify({"msg": "Unauthorized or invalid vehicle"}), 403

    status_id = get_status_id("Open")
    sql = """INSERT INTO Trip 
            (Source, Destination, TripDate, TripTime, Vehicle_ID, AvailableSeats, PricePerSeat, Status_ID) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
    values = (
        data["source"],
        data["destination"],
        data["date"],
        data["time"],
        data["vehicle_id"],
        data["available_seats"],
        data["price"],
        status_id
    )

    cursor.execute(sql, values)
    db.commit()
    return jsonify({"msg": "Trip created successfully", "trip_id": cursor.lastrowid}), 201

# Get a Single Trip
@app.route("/trips/<int:trip_id>", methods=["GET"])
def get_trip(trip_id):
    update_completed_trips()
    cancel_expired_bookings()

    sql = """SELECT t.*, ts.Status_Name 
             FROM Trip t 
             JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
             WHERE t.Trip_ID = %s 
               AND ts.Status_Name NOT IN ('Cancelled', 'Completed')"""
    cursor.execute(sql, (trip_id,))
    trip = cursor.fetchone()

    if not trip:
        return jsonify({"msg": "Trip not found or unavailable"}), 404

    trip["TripDate"] = str(trip["TripDate"]) if trip["TripDate"] else None
    trip["TripTime"] = str(trip["TripTime"]) if trip["TripTime"] else None


    return jsonify(trip), 200

# Driver - My Trips
@app.route("/driver/trips", methods=["GET"])
@role_required(1)  # Driver only
def driver_trips():
    driver_id = int(get_jwt_identity())

    cursor.execute("""
        SELECT t.*, ts.Status_Name
        FROM Trip t
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
        WHERE v.Driver_ID = %s
        ORDER BY t.TripDate DESC, t.TripTime DESC
    """, (driver_id,))
    trips = cursor.fetchall()

    for trip in trips:
        trip["TripDate"] = str(trip["TripDate"]) if trip["TripDate"] else None
        trip["TripTime"] = str(trip["TripTime"]) if trip["TripTime"] else None


    return jsonify(trips)

# -----------------------
# Bookings
# -----------------------
# Book a Trip (Rider only)
@app.route("/bookings", methods=["POST"])
@role_required(2)   # Rider only
def book_trip():
    cancel_expired_bookings()

    data = request.get_json()
    rider_id = int(get_jwt_identity())
    trip_id = data["trip_id"]
    seats_requested = data["seats"]

    cursor.execute("SELECT AvailableSeats FROM Trip WHERE Trip_ID = %s", (trip_id,))
    trip = cursor.fetchone()
    if not trip:
        return jsonify({"msg": "Trip not found"}), 404

    if trip["AvailableSeats"] < seats_requested:
        return jsonify({"msg": "Not enough seats available"}), 400

    # Insert booking as 'pending'
    cursor.execute(
        "INSERT INTO Booking (Trip_ID, Rider_ID, SeatsBooked, Status, ExpiresAt) VALUES (%s, %s, %s, %s, %s)",
        (trip_id, rider_id, seats_requested, "pending", datetime.now() + timedelta(seconds=30))
    )
    booking_id = cursor.lastrowid

    # Lock seats immediately
    cursor.execute("UPDATE Trip SET AvailableSeats = AvailableSeats - %s WHERE Trip_ID = %s",
                   (seats_requested, trip_id))

    cursor.execute("SELECT AvailableSeats FROM Trip WHERE Trip_ID = %s", (trip_id,))
    updated_trip = cursor.fetchone()
    if updated_trip and updated_trip["AvailableSeats"] == 0:
        full_id = get_status_id("Full")
        cursor.execute("UPDATE Trip SET Status_ID = %s WHERE Trip_ID = %s", (full_id, trip_id))

    db.commit()
    return jsonify({"msg": "Booking created (pending payment)", "booking_id": booking_id}), 201

# Rider - My Bookings
@app.route("/rider/bookings", methods=["GET"])
@role_required(2)
def rider_bookings():
    update_completed_trips()
    cancel_expired_bookings()

    rider_id = int(get_jwt_identity())
    sql = """SELECT b.Booking_ID, b.SeatsBooked, b.Status, 
                    t.Source, t.Destination, t.TripDate, t.TripTime, 
                    t.PricePerSeat, t.AvailableSeats, ts.Status_Name
             FROM Booking b
             JOIN Trip t ON b.Trip_ID = t.Trip_ID
             JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
             WHERE b.Rider_ID = %s"""
    cursor.execute(sql, (rider_id,))
    bookings = cursor.fetchall()

    for b in bookings:
        b["TripDate"] = str(b["TripDate"]) if b["TripDate"] else None
        b["TripTime"] = str(b["TripTime"]) if b["TripTime"] else None


    return jsonify(bookings)

# Driver - View Bookings for their Trips
@app.route("/driver/bookings", methods=["GET"])
@role_required(1)
def driver_bookings():
    driver_id = int(get_jwt_identity())
    sql = """
        SELECT b.Booking_ID, b.SeatsBooked, b.Status, b.BookingDate, b.BookingTime,
               u.Name AS RiderName, u.PhoneNo AS RiderPhone,
               t.Source, t.Destination, t.TripDate, t.TripTime, t.AvailableSeats
        FROM Booking b
        JOIN Trip t ON b.Trip_ID = t.Trip_ID
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        JOIN User u ON b.Rider_ID = u.User_ID
        WHERE v.Driver_ID = %s
        ORDER BY b.BookingDate DESC, b.BookingTime DESC
    """
    cursor.execute(sql, (driver_id,))
    bookings = cursor.fetchall()

    for b in bookings:
        b["BookingDate"] = str(b["BookingDate"]) if b["BookingDate"] else None
        b["BookingTime"] = str(b["BookingTime"]) if b["BookingTime"] else None
        b["TripDate"] = str(b["TripDate"]) if b["TripDate"] else None
        b["TripTime"] = str(b["TripTime"]) if b["TripTime"] else None


    return jsonify(bookings)

# -----------------------
# Booking Cancellation
# -----------------------
# Rider - Cancel Booking
@app.route("/rider/bookings/<int:booking_id>/cancel", methods=["PUT"])
@role_required(2)
def cancel_rider_booking(booking_id):
    rider_id = int(get_jwt_identity())

    # 1️⃣ Verify booking belongs to this rider and not already cancelled
    cursor.execute("""
        SELECT b.Booking_ID, b.Trip_ID, b.SeatsBooked
        FROM Booking b
        WHERE b.Booking_ID = %s AND b.Rider_ID = %s AND b.Status != 'cancelled'
    """, (booking_id, rider_id))
    booking = cursor.fetchone()

    if not booking:
        return jsonify({"msg": "Booking not found or already cancelled"}), 404

    trip_id = booking["Trip_ID"]
    seats_booked = booking["SeatsBooked"]

    # 2️⃣ Cancel booking
    cursor.execute("""
        UPDATE Booking 
        SET Status = 'cancelled' 
        WHERE Booking_ID = %s
    """, (booking_id,))

    # 3️⃣ Refund payment if it was completed
    cursor.execute("""
        UPDATE Payment 
        SET Status = 'Refunded' 
        WHERE Booking_ID = %s AND Status = 'Completed'
    """, (booking_id,))

    # 4️⃣ Restore seats
    cursor.execute("""
        UPDATE Trip 
        SET AvailableSeats = AvailableSeats + %s 
        WHERE Trip_ID = %s
    """, (seats_booked, trip_id))

    # 5️⃣ Reopen trip if it was Full but now has available seats
    cursor.execute("""
        UPDATE Trip 
        SET Status_ID = (
            SELECT Status_ID FROM TripStatus WHERE Status_Name = 'Open'
        )
        WHERE Trip_ID = %s
          AND AvailableSeats > 0
          AND Status_ID = (
              SELECT Status_ID FROM TripStatus WHERE Status_Name = 'Full'
          )
    """, (trip_id,))

    # 6️⃣ Commit all changes
    db.commit()

    return jsonify({
        "msg": "Booking cancelled successfully, seats restored, payment refunded, and trip reopened if seats available."
    }), 200


# Driver - Cancel Booking for their Trip
@app.route("/driver/bookings/<int:booking_id>/cancel", methods=["PUT"])
@role_required(1)

def cancel_driver_booking(booking_id):
    driver_id = int(get_jwt_identity())

    cursor.execute("""
        SELECT b.Booking_ID, b.Trip_ID, b.SeatsBooked
        FROM Booking b 
        JOIN Trip t ON b.Trip_ID = t.Trip_ID
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        WHERE b.Booking_ID = %s AND v.Driver_ID = %s AND b.Status != 'cancelled'
    """, (booking_id, driver_id))
    booking = cursor.fetchone()

    if not booking:
        return jsonify({"msg": "Booking not found or unauthorized"}), 404

    # Cancel booking
    cursor.execute("UPDATE Booking SET Status = 'cancelled' WHERE Booking_ID = %s", (booking_id,))

    # Restore seats
    cursor.execute("UPDATE Trip SET AvailableSeats = AvailableSeats + %s WHERE Trip_ID = %s",
                   (booking["SeatsBooked"], booking["Trip_ID"]))

    # Refund payment only if completed
    cursor.execute("""
        UPDATE Payment SET Status = 'Refunded' 
        WHERE Booking_ID = %s AND Status = 'Completed'
    """, (booking_id,))

    db.commit()
    return jsonify({"msg": "Booking cancelled by driver, seats restored and payment refunded"}), 200

# Driver - Cancel Trip
@app.route("/driver/trips/<int:trip_id>/cancel", methods=["PUT"])
@role_required(1)  # Driver only
def cancel_driver_trip(trip_id):
    driver_id = int(get_jwt_identity())

    # Verify trip belongs to this driver
    cursor.execute("""
        SELECT t.Trip_ID
        FROM Trip t
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        WHERE t.Trip_ID = %s AND v.Driver_ID = %s
    """, (trip_id, driver_id))
    trip = cursor.fetchone()

    if not trip:
        return jsonify({"msg": "Trip not found or unauthorized"}), 404

    # Cancel all bookings for this trip
    cursor.execute("""
        UPDATE Booking 
        SET Status = 'cancelled' 
        WHERE Trip_ID = %s AND Status != 'cancelled'
    """, (trip_id,))

    # Refund payments
    cursor.execute("""
        UPDATE Payment 
        SET Status = 'Refunded' 
        WHERE Booking_ID IN (
            SELECT Booking_ID FROM Booking WHERE Trip_ID = %s
        ) AND Status = 'Completed'
    """, (trip_id,))

    # Cancel the trip itself
    cancelled_id = get_status_id("Cancelled")
    cursor.execute("UPDATE Trip SET Status_ID = %s WHERE Trip_ID = %s", (cancelled_id, trip_id))

    db.commit()
    return jsonify({"msg": "Trip cancelled successfully, all bookings refunded"}), 200

# -----------------------
# Vehicle Management
# -----------------------
# Add Vehicle
@app.route("/vehicles", methods=["POST"])
@role_required(1)
def add_vehicle():
    data = request.get_json()
    driver_id = int(get_jwt_identity())

    with db.cursor(dictionary=True) as cur:
        sql = """INSERT INTO Vehicle (Driver_ID, Model, Type, Color, Capacity)
                 VALUES (%s, %s, %s, %s, %s)"""
        values = (driver_id, data["model"], data["type"], data["color"], data["capacity"])
        cur.execute(sql, values)
        db.commit()

        # ✅ Fetch all updated vehicles immediately
        cur.execute("SELECT * FROM Vehicle WHERE Driver_ID = %s", (driver_id,))
        vehicles_raw = cur.fetchall()

        # ✅ ADD THIS FORMATTING LOGIC
        vehicles_fixed = []
        for v in vehicles_raw:
            vehicles_fixed.append({
                "Vehicle_ID": v.get("Vehicle_ID"),
                "Model": v.get("Model") or "",
                "Type": v.get("Type") or "",
                "Color": v.get("Color") or "",
                "Capacity": v.get("Capacity") or 0
            })

    # ✅ Return the formatted list
    return jsonify({
        "msg": "Vehicle added successfully!",
        "vehicles": vehicles_fixed  
    }), 201


# Get Driver's Vehicles
@app.route("/vehicles", methods=["GET"])
@role_required(1)
def get_vehicles():
    driver_id = int(get_jwt_identity())

    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT Vehicle_ID, Model, Type, Color, Capacity FROM Vehicle WHERE Driver_ID = %s", (driver_id,))
        vehicles = cur.fetchall()

    # Ensure keys are consistent
    vehicles_fixed = []
    for v in vehicles:
        vehicles_fixed.append({
            "Vehicle_ID": v.get("Vehicle_ID"),
            "Model": v.get("Model") or "",
            "Type": v.get("Type") or "",
            "Color": v.get("Color") or "",
            "Capacity": v.get("Capacity") or 0
        })

    return jsonify(vehicles_fixed)



# Driver Stats
@app.route("/driver/stats", methods=["GET"])
@role_required(1)
def driver_stats():
    update_completed_trips()
    cancel_expired_bookings()

    driver_id = int(get_jwt_identity())

    # Earnings (only from completed payments)
    cursor.execute("""
        SELECT COALESCE(SUM(p.Amount), 0) as earnings
        FROM Payment p
        JOIN Booking b ON p.Booking_ID = b.Booking_ID
        JOIN Trip t ON b.Trip_ID = t.Trip_ID
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        WHERE v.Driver_ID = %s AND p.Status = 'Completed'
    """, (driver_id,))
    earnings = cursor.fetchone()["earnings"]

    # Total trips ( all trips, not just Open/Full)
    cursor.execute("""
        SELECT COUNT(*) as total_trips 
        FROM Trip t
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
        WHERE v.Driver_ID = %s
        AND ts.Status_Name NOT IN ('Cancelled')
    """, (driver_id,))
    total_trips = cursor.fetchone()["total_trips"]


    # Today’s trips (exclude Cancelled/Completed)
    cursor.execute("""
        SELECT t.*, ts.Status_Name
        FROM Trip t
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
        WHERE v.Driver_ID = %s AND t.TripDate = %s
        AND ts.Status_Name NOT IN ('Cancelled', 'Completed')
    """, (driver_id, date.today()))
    todays_trips = cursor.fetchall()
    for t in todays_trips:
        t["TripDate"] = str(t["TripDate"]) if t["TripDate"] else None
        t["TripTime"] = str(t["TripTime"]) if t["TripTime"] else None

    # Upcoming trips (exclude Cancelled/Completed)
    cursor.execute("""
        SELECT t.*, ts.Status_Name
        FROM Trip t
        JOIN Vehicle v ON t.Vehicle_ID = v.Vehicle_ID
        JOIN TripStatus ts ON t.Status_ID = ts.Status_ID
        WHERE v.Driver_ID = %s AND t.TripDate > %s
        AND ts.Status_Name NOT IN ('Cancelled', 'Completed')
    """, (driver_id, date.today()))
    upcoming = cursor.fetchall()
    for u in upcoming:
        u["TripDate"] = str(u["TripDate"]) if u["TripDate"] else None
        u["TripTime"] = str(u["TripTime"]) if u["TripTime"] else None

    return jsonify({
        "earnings": earnings,
        "total_trips": total_trips,
        "todays_trips": todays_trips,
        "upcoming_trips": upcoming
    })


# -----------------------
# Payments
# -----------------------
# Make Payment for a Booking (Rider only)
@app.route("/payments", methods=["POST"])
@role_required(2)
def make_payment():
    cancel_expired_bookings()

    data = request.get_json()
    booking_id = data["booking_id"]
    amount = data["amount"]

    # Ensure booking is still pending
    cursor.execute("SELECT Status FROM Booking WHERE Booking_ID = %s", (booking_id,))
    booking = cursor.fetchone()
    if not booking or booking["Status"] != "pending":
        return jsonify({"msg": "Invalid or already processed booking"}), 400

    # Insert payment
    sql = """INSERT INTO Payment (Booking_ID, Amount, Status, PaymentMode) 
             VALUES (%s, %s, %s, %s)"""
    values = (booking_id, amount, "Completed", data.get("mode", "UPI"))
    cursor.execute(sql, values)

    # Confirm booking
    cursor.execute("UPDATE Booking SET Status = 'confirmed', ExpiresAt = NULL WHERE Booking_ID = %s", (booking_id,))

    db.commit()
    return jsonify({"msg": "Payment successful, booking confirmed"}), 201

# -----------------------
# Run App
# -----------------------
if __name__ == "__main__":
    app.run(debug=True)