# 🚗 RideSharing Application — Project Documentation

A full-stack ride-sharing web application where **Drivers** can create trips and manage vehicles, and **Riders** can search for trips, book seats, and make payments. The system features JWT-based role authentication, automatic booking expiration, and a complete payment lifecycle.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Backend API Reference](#4-backend-api-reference)
5. [Frontend Pages & Components](#5-frontend-pages--components)
6. [Authentication Flow](#6-authentication-flow)
7. [Core Business Logic](#7-core-business-logic)
8. [Setup & Running Instructions](#8-setup--running-instructions)
9. [Known Notes & Limitations](#9-known-notes--limitations)

---

## 1. Technology Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| **Frontend**  | React 18, React Router v6, Axios                     |
| **Backend**   | Python Flask, Flask-JWT-Extended, Flask-CORS          |
| **Database**  | MySQL (`RideSharingDB`)                              |
| **Scheduler** | APScheduler (auto-cancels expired bookings every 10s) |

---

## 2. Directory Structure

```
Project_main_zip/
├── README.md                   ← You are here
├── app.py                      # Flask backend – all API routes (688 lines)
├── DatabaseSchema.sql          # MySQL table definitions (8 tables)
├── Insert_values.sql           # Seed data for roles & trip statuses
└── Frontend/
    ├── package.json            # React project configuration & dependencies
    ├── public/
    │   ├── index.html          # HTML shell template
    │   └── favicon.ico         # Browser tab icon
    └── src/
        ├── index.js            # React entry point – renders <App />
        ├── index.css           # Global stylesheet (139 lines)
        ├── App.js              # Main component – defines all routes
        ├── api.js              # Axios instance (baseURL: http://127.0.0.1:5000)
        ├── components/
        │   └── Navbar.js       # Navigation bar – shows links based on user role
        └── pages/
            ├── Home.js             # Landing page with register/login buttons
            ├── Login.js            # Email + password login form
            ├── RegisterDriver.js   # Driver registration (with license details)
            ├── RegisterRider.js    # Rider registration (with emergency contact)
            ├── DriverDashboard.js  # Driver stats: earnings, today's & upcoming trips
            ├── RiderDashboard.js   # Trip search form with results & booking
            ├── CreateTrip.js       # Create trip form + vehicle management panel
            ├── DriverTrips.js      # Driver's trip list with cancel functionality
            ├── DriverBookings.js   # Read-only view of bookings on driver's trips
            ├── MyBookings.js       # Rider's bookings list with cancel option
            ├── TripBooking.js      # Seat selection + 30-second timed payment
            └── TripSearch.js       # (Commented out – functionality moved to RiderDashboard)
```

---

## 3. Database Schema

### 3.1 Tables Overview

The database `RideSharingDB` consists of **8 tables**. The schema is defined in `DatabaseSchema.sql` and seed data is in `Insert_values.sql`.

### 3.2 Table: `Role`

Defines user roles in the system.

| Column    | Type        | Constraints              |
| --------- | ----------- | ------------------------ |
| Role_ID   | INT         | PRIMARY KEY, AUTO_INCREMENT |
| Role_Name | VARCHAR(50) | UNIQUE, NOT NULL         |

**Seed values (from `Insert_values.sql`):**

| Role_ID | Role_Name |
| ------- | --------- |
| 1       | Rider     |
| 2       | Driver    |

> ⚠️ **Important:** In the backend code (`app.py`), `role_id = 1` is treated as **Driver** and `role_id = 2` as **Rider**. The frontend sends `role_id: 1` for driver registration and `role_id: 2` for rider registration. Ensure the `INSERT` order in `Insert_values.sql` matches what the code expects, or adjust accordingly.

---

### 3.3 Table: `User`

Stores all registered users (both drivers and riders).

| Column   | Type         | Constraints                   |
| -------- | ------------ | ----------------------------- |
| User_ID  | INT          | PRIMARY KEY, AUTO_INCREMENT   |
| Name     | VARCHAR(100) | NOT NULL                      |
| PhoneNo  | VARCHAR(15)  | NOT NULL                      |
| Email    | VARCHAR(100) | UNIQUE, NOT NULL              |
| Password | VARCHAR(255) | NOT NULL (stored as plain text) |
| Role_ID  | INT          | FOREIGN KEY → Role(Role_ID)   |

---

### 3.4 Table: `DriverLicense`

Stores driving license information. Created only when a **Driver** registers.

| Column     | Type        | Constraints                 |
| ---------- | ----------- | --------------------------- |
| License_ID | INT         | PRIMARY KEY, AUTO_INCREMENT |
| User_ID    | INT         | UNIQUE, FK → User(User_ID)  |
| LicenseNo  | VARCHAR(50) | UNIQUE, NOT NULL            |
| IssueDate  | DATE        | —                           |
| ExpiryDate | DATE        | —                           |

---

### 3.5 Table: `EmergencyContact`

Stores emergency contact details. Created only when a **Rider** registers.

| Column       | Type         | Constraints                |
| ------------ | ------------ | -------------------------- |
| Contact_ID   | INT          | PRIMARY KEY, AUTO_INCREMENT |
| User_ID      | INT          | FK → User(User_ID)         |
| ContactName  | VARCHAR(100) | —                          |
| ContactPhone | VARCHAR(15)  | —                          |

---

### 3.6 Table: `Vehicle`

Stores vehicles owned by drivers.

| Column     | Type        | Constraints                |
| ---------- | ----------- | -------------------------- |
| Vehicle_ID | INT         | PRIMARY KEY, AUTO_INCREMENT |
| Driver_ID  | INT         | FK → User(User_ID)         |
| Model      | VARCHAR(50) | —                          |
| Type       | VARCHAR(50) | —                          |
| Color      | VARCHAR(30) | —                          |
| Capacity   | INT         | NOT NULL                   |

---

### 3.7 Table: `TripStatus`

Lookup table for trip statuses.

| Column      | Type        | Constraints              |
| ----------- | ----------- | ------------------------ |
| Status_ID   | INT         | PRIMARY KEY, AUTO_INCREMENT |
| Status_Name | VARCHAR(30) | UNIQUE, NOT NULL         |

**Seed values:** `Open`, `Full`, `Completed`, `Cancelled`

---

### 3.8 Table: `Trip`

Stores trip details created by drivers.

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| Trip_ID        | INT           | PRIMARY KEY, AUTO_INCREMENT     |
| Source         | VARCHAR(100)  | NOT NULL                        |
| Destination    | VARCHAR(100)  | NOT NULL                        |
| TripDate       | DATE          | NOT NULL                        |
| TripTime       | TIME          | NOT NULL                        |
| Vehicle_ID     | INT           | FK → Vehicle(Vehicle_ID), NOT NULL |
| AvailableSeats | INT           | NOT NULL                        |
| PricePerSeat   | DECIMAL(10,2) | NOT NULL                        |
| Status_ID      | INT           | FK → TripStatus(Status_ID), NOT NULL |

---

### 3.9 Table: `Booking`

Stores seat bookings made by riders.

| Column      | Type                                      | Constraints                  |
| ----------- | ----------------------------------------- | ---------------------------- |
| Booking_ID  | INT                                       | PRIMARY KEY, AUTO_INCREMENT  |
| Trip_ID     | INT                                       | FK → Trip(Trip_ID), NOT NULL |
| Rider_ID    | INT                                       | FK → User(User_ID), NOT NULL |
| SeatsBooked | INT                                       | NOT NULL                     |
| BookingDate | DATE                                      | DEFAULT CURRENT_DATE         |
| BookingTime | TIME                                      | DEFAULT CURRENT_TIME         |
| Status      | ENUM('pending', 'confirmed', 'cancelled') | DEFAULT 'pending'            |
| ExpiresAt   | DATETIME                                  | NULL (set for pending bookings) |

---

### 3.10 Table: `Payment`

Stores payment records for bookings.

| Column      | Type          | Constraints                      |
| ----------- | ------------- | -------------------------------- |
| Payment_ID  | INT           | PRIMARY KEY, AUTO_INCREMENT      |
| Booking_ID  | INT           | FK → Booking(Booking_ID), NOT NULL |
| Amount      | DECIMAL(10,2) | NOT NULL                         |
| PaymentDate | DATE          | DEFAULT CURRENT_DATE             |
| PaymentTime | TIME          | DEFAULT CURRENT_TIME             |
| Status      | VARCHAR(20)   | DEFAULT 'Pending'                |
| PaymentMode | VARCHAR(30)   | e.g., 'UPI', 'Card'             |

---

### 3.11 Entity Relationships Summary

```
Role (1) ──────────< User (many)
User (1) ──────────< Vehicle (many)         [if Driver]
User (1) ──────────1 DriverLicense          [if Driver]
User (1) ──────────< EmergencyContact       [if Rider]
Vehicle (1) ───────< Trip (many)
TripStatus (1) ────< Trip (many)
Trip (1) ──────────< Booking (many)
User (1) ──────────< Booking (many)         [as Rider]
Booking (1) ───────< Payment (many)
```

---

## 4. Backend API Reference

**File:** `app.py` (688 lines)

The Flask backend runs on `http://127.0.0.1:5000` and exposes REST API endpoints. All protected routes use JWT Bearer tokens with role-based access control.

---

### 4.1 Helper Functions

| Function                    | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `get_status_id(status_name)` | Looks up `Status_ID` from `TripStatus` table by name                     |
| `update_completed_trips()`   | Marks trips with past dates as `Completed`                               |
| `cancel_expired_bookings()`  | Cancels pending bookings past their `ExpiresAt` time; restores seats     |
| `role_required(role_id)`     | Decorator that enforces role-based access (1 = Driver, 2 = Rider)        |

---

### 4.2 Public Endpoints (No Authentication)

#### `GET /`
Health check endpoint.

**Response:** `" RideSharing Backend with Driver/Rider Dashboards is running!"`

---

#### `POST /register`
Register a new user (Driver or Rider).

**Request Body (Driver — role_id: 1):**
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "password": "mypassword",
  "role_id": 1,
  "license_no": "DL-12345",
  "issue_date": "2023-01-15",
  "expiry_date": "2033-01-15"
}
```

**Request Body (Rider — role_id: 2):**
```json
{
  "name": "Jane Doe",
  "phone": "9876543211",
  "email": "jane@example.com",
  "password": "mypassword",
  "role_id": 2,
  "emergency_name": "Mother",
  "emergency_phone": "9999999999"
}
```

**Success Response (201):**
```json
{ "msg": "User registered successfully", "user_id": 5 }
```

**Error Response (400):**
```json
{ "msg": "Registration failed: <error details>" }
```

**What it does:**
1. Inserts a row into the `User` table.
2. If `role_id == 1` (Driver): Also inserts into `DriverLicense`.
3. If `role_id == 2` (Rider): Also inserts into `EmergencyContact`.

---

#### `POST /login`
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "mypassword"
}
```

**Success Response (200):**
```json
{
  "msg": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role_id": 1
}
```

**Error Response (401):**
```json
{ "msg": "Invalid credentials" }
```

**What it does:**
1. Queries `User` table by email and password.
2. Creates a JWT token with `user_id` as identity and `role_id` in claims.
3. Returns the token and role to the frontend.

---

#### `GET /trips`
List all available (non-cancelled, non-completed) trips.

**Query Parameters (optional):**
- `source` — Filter by source location
- `destination` — Filter by destination location

**Example:** `GET /trips?source=Chennai&destination=Bangalore`

**Response (200):**
```json
[
  {
    "Trip_ID": 1,
    "Source": "Chennai",
    "Destination": "Bangalore",
    "TripDate": "2026-07-15",
    "TripTime": "08:00:00",
    "Vehicle_ID": 3,
    "AvailableSeats": 3,
    "PricePerSeat": 250.00,
    "Status_ID": 1,
    "Status_Name": "Open"
  }
]
```

**What it does:**
1. Calls `update_completed_trips()` and `cancel_expired_bookings()` first.
2. Queries trips joined with `TripStatus`, excluding `Cancelled` and `Completed`.
3. Optionally filters by source and destination.

---

#### `GET /trips/<trip_id>`
Get details of a single trip by its ID.

**Response (200):** Single trip object (same format as above).

**Error Response (404):**
```json
{ "msg": "Trip not found or unavailable" }
```

---

### 4.3 Driver Endpoints (role_id = 1, JWT Required)

All driver endpoints require the `Authorization: Bearer <token>` header and enforce `role_id = 1`.

---

#### `POST /trips`
Create a new trip.

**Request Body:**
```json
{
  "source": "Chennai",
  "destination": "Bangalore",
  "date": "2026-07-15",
  "time": "08:00",
  "vehicle_id": 3,
  "available_seats": 4,
  "price": 250
}
```

**Success Response (201):**
```json
{ "msg": "Trip created successfully", "trip_id": 12 }
```

**Error Response (403):**
```json
{ "msg": "Unauthorized or invalid vehicle" }
```

**What it does:**
1. Verifies the vehicle belongs to the logged-in driver.
2. Inserts a new trip with status `Open`.

---

#### `GET /driver/trips`
List all trips belonging to the logged-in driver.

**Response (200):** Array of trip objects with `Status_Name`, ordered by date descending.

---

#### `PUT /driver/trips/<trip_id>/cancel`
Cancel an entire trip and refund all associated bookings.

**Response (200):**
```json
{ "msg": "Trip cancelled successfully, all bookings refunded" }
```

**What it does:**
1. Verifies the trip belongs to the driver.
2. Cancels all bookings for this trip.
3. Refunds all completed payments (sets status to `Refunded`).
4. Sets the trip status to `Cancelled`.

---

#### `GET /driver/bookings`
View all bookings made on the driver's trips.

**Response (200):**
```json
[
  {
    "Booking_ID": 5,
    "RiderName": "Jane Doe",
    "RiderPhone": "9876543211",
    "Source": "Chennai",
    "Destination": "Bangalore",
    "TripDate": "2026-07-15",
    "TripTime": "08:00:00",
    "SeatsBooked": 2,
    "AvailableSeats": 2,
    "Status": "confirmed",
    "BookingDate": "2026-07-10",
    "BookingTime": "14:30:00"
  }
]
```

---

#### `PUT /driver/bookings/<booking_id>/cancel`
Cancel a specific booking on one of the driver's trips.

**Response (200):**
```json
{ "msg": "Booking cancelled by driver, seats restored and payment refunded" }
```

**What it does:**
1. Verifies the booking is on a trip that belongs to this driver.
2. Cancels the booking, restores seats, refunds payment if completed.

---

#### `GET /driver/stats`
Get dashboard statistics for the logged-in driver.

**Response (200):**
```json
{
  "earnings": 5000.00,
  "total_trips": 12,
  "todays_trips": [ { "Trip_ID": 1, "Source": "...", ... } ],
  "upcoming_trips": [ { "Trip_ID": 3, "Source": "...", ... } ]
}
```

**What it does:**
1. `earnings` — Sum of all completed payment amounts linked to this driver's trips.
2. `total_trips` — Count of non-cancelled trips.
3. `todays_trips` — Active trips for today (excludes Cancelled/Completed).
4. `upcoming_trips` — Active trips with future dates.

---

#### `POST /vehicles`
Add a new vehicle for the driver.

**Request Body:**
```json
{
  "model": "Swift Dzire",
  "type": "Sedan",
  "color": "White",
  "capacity": 4
}
```

**Success Response (201):**
```json
{
  "msg": "Vehicle added successfully!",
  "vehicles": [
    { "Vehicle_ID": 1, "Model": "Swift Dzire", "Type": "Sedan", "Color": "White", "Capacity": 4 }
  ]
}
```

---

#### `GET /vehicles`
List all vehicles belonging to the logged-in driver.

**Response (200):**
```json
[
  { "Vehicle_ID": 1, "Model": "Swift Dzire", "Type": "Sedan", "Color": "White", "Capacity": 4 }
]
```

---

### 4.4 Rider Endpoints (role_id = 2, JWT Required)

All rider endpoints require the `Authorization: Bearer <token>` header and enforce `role_id = 2`.

---

#### `POST /bookings`
Book seats on a trip. Creates a **pending** booking with a 30-second payment window.

**Request Body:**
```json
{
  "trip_id": 1,
  "seats": 2
}
```

**Success Response (201):**
```json
{ "msg": "Booking created (pending payment)", "booking_id": 7 }
```

**Error Responses:**
- `404`: `{ "msg": "Trip not found" }`
- `400`: `{ "msg": "Not enough seats available" }`

**What it does:**
1. Checks if enough seats are available.
2. Inserts a booking with `status = 'pending'` and `ExpiresAt = now + 30 seconds`.
3. Immediately reduces `AvailableSeats` on the trip (locks the seats).
4. If seats reach 0, updates trip status to `Full`.

---

#### `GET /rider/bookings`
List all bookings for the logged-in rider.

**Response (200):**
```json
[
  {
    "Booking_ID": 7,
    "Source": "Chennai",
    "Destination": "Bangalore",
    "TripDate": "2026-07-15",
    "TripTime": "08:00:00",
    "SeatsBooked": 2,
    "PricePerSeat": 250.00,
    "AvailableSeats": 2,
    "Status": "confirmed",
    "Status_Name": "Open"
  }
]
```

---

#### `PUT /rider/bookings/<booking_id>/cancel`
Cancel a booking made by the rider.

**Response (200):**
```json
{
  "msg": "Booking cancelled successfully, seats restored, payment refunded, and trip reopened if seats available."
}
```

**What it does (6 steps):**
1. Verify the booking belongs to this rider and is not already cancelled.
2. Set booking status to `cancelled`.
3. Refund payment if it was `Completed` (set to `Refunded`).
4. Restore seats on the trip (`AvailableSeats += SeatsBooked`).
5. If the trip was `Full` and now has available seats, reopen it to `Open`.
6. Commit all changes.

---

#### `POST /payments`
Complete payment for a pending booking.

**Request Body:**
```json
{
  "booking_id": 7,
  "amount": 500,
  "mode": "UPI"
}
```

**Success Response (201):**
```json
{ "msg": "Payment successful, booking confirmed" }
```

**Error Response (400):**
```json
{ "msg": "Invalid or already processed booking" }
```

**What it does:**
1. Verifies the booking is still `pending`.
2. Inserts a payment record with `Status = 'Completed'`.
3. Updates booking to `status = 'confirmed'` and clears `ExpiresAt`.

---

## 5. Frontend Pages & Components

**Framework:** React 18 with Create React App  
**Routing:** React Router v6  
**HTTP Client:** Axios (configured in `api.js` with `baseURL: http://127.0.0.1:5000`)

---

### 5.1 Route Map (defined in `App.js`)

| Route                  | Component        | Access Level |
| ---------------------- | ---------------- | ------------ |
| `/`                    | Home             | Public       |
| `/login`               | Login            | Public       |
| `/register-driver`     | RegisterDriver   | Public       |
| `/register-rider`      | RegisterRider    | Public       |
| `/driver/dashboard`    | DriverDashboard  | Driver only  |
| `/driver/create-trip`  | CreateTrip       | Driver only  |
| `/driver/trips`        | DriverTrips      | Driver only  |
| `/driver/bookings`     | DriverBookings   | Driver only  |
| `/rider/dashboard`     | RiderDashboard   | Rider only   |
| `/rider/bookings`      | MyBookings       | Rider only   |
| `/trips/book/:id`      | TripBooking      | Rider only   |
| `/trips/search`        | TripSearch       | Disabled     |

---

### 5.2 Component: Navbar (`components/Navbar.js`)

**Purpose:** Displays role-aware navigation links across the top of every page.

**Behavior:**
- **Not logged in:** Shows `Login`, `Driver Register`, `Rider Register` links.
- **Logged in as Driver (role = "1"):** Shows `Dashboard`, `Create Trip`, `My Trips`, `Rider Bookings`, and `Logout`.
- **Logged in as Rider (role = "2"):** Shows `Dashboard`, `My Bookings`, and `Logout`.

**Logout:** Clears `token` and `role` from `localStorage` and redirects to `/`.

---

### 5.3 Page: Home (`pages/Home.js`)

**Purpose:** Landing page for new visitors.

**Features:**
- Welcome message: "Welcome to RideSharing"
- Three buttons: Register as Driver, Register as Rider, Login
- Centered card layout using `center-wrapper` CSS class.

---

### 5.4 Page: Login (`pages/Login.js`)

**Purpose:** Authenticates existing users.

**Form Fields:** Email, Password.

**On Submit:**
1. Sends `POST /login` with email and password.
2. On success: Stores `token` and `role` in `localStorage`.
3. Redirects to `/driver/dashboard` (role 1) or `/rider/dashboard` (role 2).
4. On error: Shows "Invalid credentials" message.

---

### 5.5 Page: RegisterDriver (`pages/RegisterDriver.js`)

**Purpose:** Registration form for new drivers.

**Form Fields:** Name, Phone, Email, Password, License Number, Issue Date, Expiry Date.

**On Submit:**
1. Sends `POST /register` with all fields + `role_id: 1`.
2. On success: Redirects to `/login`.

---

### 5.6 Page: RegisterRider (`pages/RegisterRider.js`)

**Purpose:** Registration form for new riders.

**Form Fields:** Name, Phone, Email, Password, Emergency Contact Name, Emergency Contact Phone.

**On Submit:**
1. Sends `POST /register` with all fields + `role_id: 2`.
2. On success: Redirects to `/login`.

---

### 5.7 Page: DriverDashboard (`pages/DriverDashboard.js`)

**Purpose:** Main dashboard for drivers after login.

**API Call:** `GET /driver/stats` (with Bearer token).

**Displays:**
- **Stats Card:** Total Earnings (₹) and Total Trip count.
- **Today's Trips Card:** List of trips scheduled for today (source → destination, time, available seats). Shows "No trips today" if empty.
- **Upcoming Trips Card:** List of future trips (source → destination, date, available seats). Shows "No upcoming trips" if empty.

---

### 5.8 Page: RiderDashboard (`pages/RiderDashboard.js`)

**Purpose:** Main dashboard for riders — search and discover trips.

**Features:**
- **Search Form:** Source, Destination, Date (optional), Time (optional).
- Fetches trips from `GET /trips?source=...&destination=...`.
- Applies **client-side filtering** on date and time if provided.
- **Results:** Each trip card shows source → destination, date, time, available seats, price per seat, and a **"Book"** button.
- Clicking "Book" navigates to `/trips/book/<trip_id>`.

---

### 5.9 Page: CreateTrip (`pages/CreateTrip.js`)

**Purpose:** Allows drivers to create a new trip and manage their vehicles.

**Layout:** Two-panel design.

**Left Panel — Trip Form:**
- Fields: Source, Destination, Date, Time, Available Seats, Price per Seat, Vehicle (dropdown).
- Submits `POST /trips` with Bearer token.
- On success: Shows success message and redirects to dashboard after 2 seconds.

**Right Panel — Vehicle Management:**
- Lists existing vehicles (fetched from `GET /vehicles`).
- "Add Vehicle" toggle reveals a form: Model, Type, Color, Capacity.
- Submits `POST /vehicles` with Bearer token.
- Filters out invalid vehicles (missing model, type, or color).
- Newly added vehicle is auto-selected in the trip form dropdown.

**Toast Messages:** Success/error notifications appear as a fixed-position banner at the bottom-left.

---

### 5.10 Page: DriverTrips (`pages/DriverTrips.js`)

**Purpose:** Lists all trips created by the logged-in driver.

**API Call:** `GET /driver/trips` (with Bearer token).

**For each trip, displays:**
- Source → Destination, Date, Time, Available Seats, Price/Seat, Status.
- **Active trips** (Open or Full): "Cancel Trip" button with a confirmation dialog.
- **Inactive trips** (Completed or Cancelled): Disabled button showing the status.

**Cancel:** Sends `PUT /driver/trips/<trip_id>/cancel`, then refreshes the list.

---

### 5.11 Page: DriverBookings (`pages/DriverBookings.js`)

**Purpose:** Read-only view of all bookings made on the driver's trips.

**API Call:** `GET /driver/bookings` (with Bearer token).

**For each booking, displays:**
- Rider Name and Phone number
- Trip: Source → Destination
- Date and Time
- Seats Booked and Available Seats
- Booking Status

> Note: Cancel button was intentionally removed from this view.

---

### 5.12 Page: MyBookings (`pages/MyBookings.js`)

**Purpose:** Shows all bookings made by the logged-in rider.

**API Call:** `GET /rider/bookings` (with Bearer token).

**For each booking, displays:**
- Source → Destination, Date, Time, Seats, Status.
- Non-cancelled bookings show a **"Cancel"** button.

**Cancel:** Sends `PUT /rider/bookings/<booking_id>/cancel`, then refreshes the list.

---

### 5.13 Page: TripBooking (`pages/TripBooking.js`)

**Purpose:** Two-step booking and payment flow for riders.

**Step 1 — Book Seats:**
1. Fetches trip details from `GET /trips/<id>`.
2. Displays trip info: source → destination, date, time, available seats, price.
3. Rider selects number of seats (1 to available).
4. Shows live total: `seats × PricePerSeat`.
5. "Book Seats" button → `POST /bookings`.

**Step 2 — Make Payment (30-second countdown):**
1. A countdown timer starts from 30 seconds.
2. Rider selects payment mode: UPI or Card.
3. "Pay Now" button → `POST /payments`.
4. On success: Redirects to `/rider/bookings`.
5. **On timeout (0 seconds):** Shows alert "Booking cancelled because payment was not completed in time" and redirects to dashboard.

---

### 5.14 Page: TripSearch (`pages/TripSearch.js`)

**Status: Entirely commented out.**

This was an older URL-parameter-based trip search page. Its functionality has been fully absorbed into `RiderDashboard.js`. The file remains in the project but renders nothing and the route `/trips/search` exists in the router but is non-functional.

---

### 5.15 Styling (`index.css`)

Global styles applied across all pages:

| Class / Selector    | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `body`              | Arial font, light gray background (`#f4f6f9`)            |
| `nav`               | Blue header bar (`#1976d2`), flex layout                  |
| `nav a`, `nav button` | White text, 1.5em font size                            |
| `.container`        | 20px padding wrapper for page content                    |
| `.center-wrapper`   | Flexbox centering for login/register cards               |
| `.card`             | White card with shadow, 30px padding, 8px border-radius  |
| `button`            | Blue buttons (`#1976d2`), disabled state is gray          |
| `input`, `select`   | Full-width, 15px padding                                 |
| `.message`          | Centered notification banner                             |
| `.success`          | Green background for success messages                    |
| `.error`            | Red background for error messages                        |
| `.trip`             | Bottom border separator for trip lists                   |

---

## 6. Authentication Flow

### 6.1 Registration Flow

```
User fills form → Frontend sends POST /register → Backend inserts User + role-specific table → User redirected to /login
```

### 6.2 Login Flow

```
User enters email + password
→ Frontend sends POST /login
→ Backend queries User table
→ If match: Creates JWT token (identity=User_ID, claims={role_id})
→ Frontend stores token + role in localStorage
→ Redirects to Driver or Rider dashboard
```

### 6.3 Authenticated Requests

```
Frontend reads token from localStorage
→ Adds header: Authorization: Bearer <token>
→ Backend validates JWT, extracts user_id and role_id
→ role_required decorator checks if role matches
→ If authorized: Processes request
→ If not: Returns 403 "Access denied"
```

### 6.4 Logout

```
Frontend clears token and role from localStorage → Redirects to /
```

---

## 7. Core Business Logic

### 7.1 Booking Lifecycle

```
[New Booking] → pending (seats locked, 30s timer starts)
     │
     ├── Payment completed within 30s → confirmed (ExpiresAt cleared)
     │        │
     │        └── Rider/Driver cancels → cancelled (seats restored, payment refunded)
     │
     └── Timer expires (no payment) → cancelled (seats restored by scheduler)
```

### 7.2 Trip Status Lifecycle

```
[Created] → Open
     │
     ├── All seats booked → Full
     │        │
     │        ├── Booking cancelled → Open (seats freed)
     │        ├── Date passes → Completed
     │        └── Driver cancels → Cancelled
     │
     ├── Date passes → Completed
     └── Driver cancels → Cancelled (all bookings refunded)
```

### 7.3 Background Scheduler

The backend runs an **APScheduler** background job:

- **`cancel_expired_bookings()`** — Executes every **10 seconds**.
  - Finds all bookings where `Status = 'pending'` AND `ExpiresAt < now`.
  - For each expired booking:
    - Sets `Status = 'cancelled'`.
    - Restores `AvailableSeats` on the trip.
    - If trip was `Full`, reopens it to `Open`.

- **`update_completed_trips()`** — Called on-demand (during GET requests for trips/stats).
  - Finds all trips where `TripDate < today` AND not already `Completed`.
  - Sets their status to `Completed`.

### 7.4 Cancellation Logic

#### Rider cancels a booking (`PUT /rider/bookings/<id>/cancel`):
1. Verify booking belongs to rider and is not cancelled.
2. Cancel the booking.
3. Refund payment if completed.
4. Restore seats on the trip.
5. Reopen trip if it was Full.

#### Driver cancels a booking (`PUT /driver/bookings/<id>/cancel`):
1. Verify booking is on one of the driver's trips.
2. Cancel the booking.
3. Restore seats.
4. Refund payment if completed.

#### Driver cancels a trip (`PUT /driver/trips/<id>/cancel`):
1. Verify trip belongs to the driver.
2. Cancel ALL bookings for this trip.
3. Refund ALL completed payments.
4. Set trip status to Cancelled.

---

## 8. Setup & Running Instructions

### 8.1 Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **MySQL Server** running locally

### 8.2 Database Setup

```sql
-- Step 1: Create the database
CREATE DATABASE RideSharingDB;

-- Step 2: Run the schema file
SOURCE DatabaseSchema.sql;

-- Step 3: Insert seed data
SOURCE Insert_values.sql;
```

This creates all 8 tables and inserts:
- 2 roles: Rider, Driver
- 4 trip statuses: Open, Full, Completed, Cancelled

### 8.3 Backend Setup

```bash
# Install Python dependencies
pip install flask flask-jwt-extended flask-cors mysql-connector-python apscheduler

# ⚠️ Update MySQL credentials in app.py (lines 22-27):
#   host="localhost"
#   user="root"
#   password="YOUR_PASSWORD"
#   database="RideSharingDB"

# Start the backend server
python app.py
# → Running on http://127.0.0.1:5000
```

### 8.4 Frontend Setup

```bash
# Navigate to the Frontend directory
cd Frontend

# Install Node dependencies
npm install

# Start the development server
npm start
# → Running on http://localhost:3000
```

### 8.5 Using the Application

1. Open `http://localhost:3000` in your browser.
2. Register as a **Driver** or **Rider**.
3. Login with your credentials.
4. **Driver:** Add vehicles → Create trips → View bookings.
5. **Rider:** Search trips → Book seats → Pay within 30 seconds → View/cancel bookings.

---

## 9. Known Notes & Limitations

| #  | Item                      | Details                                                                                         |
| -- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| 1  | **Plain-text passwords**  | Passwords are stored without hashing. Use `bcrypt` or `werkzeug.security` for production.       |
| 2  | **Global DB cursor**      | A single cursor is shared across all requests — not thread-safe. Use connection pooling instead. |
| 3  | **No input validation**   | Backend trusts all client input. Add server-side validation and sanitization.                    |
| 4  | **No route guards**       | Frontend doesn't block unauthorized route access. A user can manually navigate to any URL.      |
| 5  | **TripSearch.js unused**  | Entirely commented out. The route exists but renders nothing.                                    |
| 6  | **Role ID discrepancy**   | `Insert_values.sql` inserts Rider as ID=1, Driver as ID=2, but code uses 1=Driver, 2=Rider.    |
| 7  | **30-second payment**     | Very short for production. Change `timedelta(seconds=30)` in `app.py` line 310.                 |
| 8  | **JWT secret key**        | Hardcoded as `"super-secret-key"`. Use environment variables in production.                     |
| 9  | **No HTTPS**              | Development server runs on HTTP. Use HTTPS with proper certificates in production.              |
| 10 | **No pagination**         | Trip and booking lists return all records. Add pagination for scalability.                       |

---

*Documentation generated on 2026-06-27. Covers all 4 backend files and 16 frontend files.*
