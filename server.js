require("dotenv").config()
const express = require("express")
const cors = require("cors")
const connectDB = require("./config/db")
const authRoutes = require("./routes/auth")
const tripRoutes = require("./routes/trips")
const bookingRoutes = require("./routes/booking")
const app = express()

// Connect to database
connectDB()

// Middleware
app.use(cors()) // Enable CORS for all origins
app.use(express.json()) // Body parser for JSON data

// Routes
app.use("/api/auth", require("./routes/auth.js"))
app.use("/api/trips", require("./routes/trips.js"))
app.use("/api/bookings", require("./routes/booking.js"))
app.use("/api/restaurants", require("./routes/restaurants.js"))
app.use("/api/rentals", require("./routes/rentals.js"))
app.use("/api/activities", require("./routes/activities.js"))
app.use("/api/stays", require("./routes/stays.js"))
app.use("/api/payments", require("./routes/payments.js"))
app.use("/api/destination", require("./routes/destination.js"))
app.use("/api/review", require("./routes/review.js"))
app.use("/api/images", require("./routes/images.js"))
// Admin route - serve admin page
app.get("/admin", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TravelMate Admin</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      <script src="https://unpkg.com/recharts@2.8.0/umd/Recharts.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        // Admin React component will be loaded here
        // For now, redirect to the React app
        window.location.href = '/';
      </script>
    </body>
    </html>
  `)
})


// Basic route for testing
app.get("/", (req, res) => {
  res.send("TravelExplorer Backend API is running!")
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
