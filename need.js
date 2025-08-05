const mongoose = require("mongoose")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Import models
const Destination = require("./models/destination")
const Restaurant = require("./models/restaurant")
const Stay = require("./models/stay")
const Activity = require("./models/activity")
const Trip = require("./models/trip")
const Rental = require("./models/rental")
const Booking = require("./models/booking")
// Assuming you have a User model for booking references
// const User = require("./models/user");

// Mock User ID (replace with a real User ID from your User model if you have one)
// For now, we'll use a placeholder. In a real app, you'd create a User first.
const MOCK_USER_ID = new mongoose.Types.ObjectId() // This will generate a new unique ID each time

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("MongoDB connected for seeding...")

    // --- 1. Clear existing data ---
    console.log("Clearing existing data...")
    await Destination.deleteMany({})
    await Restaurant.deleteMany({})
    await Stay.deleteMany({})
    await Activity.deleteMany({})
    await Trip.deleteMany({})
    await Rental.deleteMany({})
    await Booking.deleteMany({})
    // If you have a User model and want to clear users too:
    // await User.deleteMany({});
    console.log("All collections cleared.")

    // --- 2. Seed Destinations ---
    console.log("Seeding Destinations...")
    const destinations = await Destination.insertMany([
      {
        name: "Paris",
        country: "France",
        city: "Paris",
        description: "The City of Love, known for its art, fashion, and cuisine.",
        images: [
          "https://source.unsplash.com/random/800x600?paris-eiffel-tower",
          "https://source.unsplash.com/random/800x600?paris-louvre",
        ],
        coordinates: { latitude: 48.8566, longitude: 2.3522 },
      },
      {
        name: "Kyoto",
        country: "Japan",
        city: "Kyoto",
        description: "Ancient capital of Japan, famous for its temples, gardens, and geishas.",
        images: [
          "https://source.unsplash.com/random/800x600?kyoto-temple",
          "https://source.unsplash.com/random/800x600?kyoto-garden",
        ],
        coordinates: { latitude: 35.0116, longitude: 135.7681 },
      },
      {
        name: "Rio de Janeiro",
        country: "Brazil",
        city: "Rio de Janeiro",
        description: "Vibrant coastal city, famous for its Carnival, beaches, and Christ the Redeemer statue.",
        images: [
          "https://source.unsplash.com/random/800x600?rio-beach",
          "https://source.unsplash.com/random/800x600?rio-christ-redeemer",
        ],
        coordinates: { latitude: -22.9068, longitude: -43.1729 },
      },
    ])
    console.log("Destinations seeded.")

    const parisId = destinations[0]._id
    const kyotoId = destinations[1]._id
    const rioId = destinations[2]._id

    // --- 3. Seed Restaurants ---
    console.log("Seeding Restaurants...")
    const restaurants = await Restaurant.insertMany([
      {
        name: "Le Jules Verne",
        location: "Eiffel Tower, Paris",
        destination: parisId, // Linked to Paris Destination
        cuisines: ["French", "Fine Dining"],
        menu: [
          { name: "Foie Gras", price: 60 },
          { name: "Lobster Bisque", price: 45 },
        ],
        images: [
          "https://source.unsplash.com/random/400x300?french-restaurant",
          "https://source.unsplash.com/random/400x300?eiffel-tower-view",
        ],
        description: "Michelin-starred restaurant with breathtaking views of Paris.",
        openingHours: "Mon-Sun: 12:00-14:00, 19:00-22:00",
        averageCost: 250,
        contactInfo: { phone: "+33 1 45 55 61 44", address: "Eiffel Tower, 75007 Paris, France" },
      },
      {
        name: "Gion Karyo",
        location: "Gion, Kyoto",
        destination: kyotoId, // Linked to Kyoto Destination
        cuisines: ["Japanese", "Kaiseki"],
        menu: [{ name: "Seasonal Kaiseki Course", price: 150 }],
        images: [
          "https://source.unsplash.com/random/400x300?japanese-restaurant",
          "https://source.unsplash.com/random/400x300?kyoto-food",
        ],
        description: "Traditional Kyoto kaiseki dining experience.",
        openingHours: "Tue-Sun: 17:30-21:00",
        averageCost: 180,
        contactInfo: { phone: "+81 75-532-0035", address: "Gion, Kyoto, Japan" },
      },
    ])
    console.log("Restaurants seeded.")

    const leJulesVerneId = restaurants[0]._id

    // --- 4. Seed Stays ---
    console.log("Seeding Stays...")
    const stays = await Stay.insertMany([
      {
        name: "Shangri-La Paris",
        type: "Hotel",
        location: "Paris",
        destination: parisId, // Linked to Paris Destination
        description: "Luxury hotel with Eiffel Tower views.",
        amenities: ["Pool", "Spa", "Gym", "Concierge"],
        rooms: [{ roomType: "Deluxe Room", price: 1200, capacity: 2, available: 10 }],
        pricing: { perNight: 1200 },
        images: [
          "https://source.unsplash.com/random/400x300?luxury-hotel-paris",
          "https://source.unsplash.com/random/400x300?hotel-room",
        ],
        policies: "Check-in 15:00, Check-out 12:00",
        availability: { from: new Date(), to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
      {
        name: "Ryokan Gion Hatanaka",
        type: "Ryokan",
        location: "Kyoto",
        destination: kyotoId, // Linked to Kyoto Destination
        description: "Traditional Japanese inn with authentic experience.",
        amenities: ["Onsen", "Garden", "Tea Ceremony"],
        rooms: [{ roomType: "Traditional Japanese Room", price: 400, capacity: 2, available: 5 }],
        pricing: { perNight: 400 },
        images: [
          "https://source.unsplash.com/random/400x300?ryokan-kyoto",
          "https://source.unsplash.com/random/400x300?japanese-room",
        ],
        policies: "Check-in 16:00, Check-out 10:00",
        availability: { from: new Date(), to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      },
    ])
    console.log("Stays seeded.")

    const shangriLaId = stays[0]._id

    // --- 5. Seed Activities ---
    console.log("Seeding Activities...")
    const activities = await Activity.insertMany([
      {
        name: "Eiffel Tower Summit Tour",
        type: "Land",
        location: "Paris",
        destination: parisId, // Linked to Paris Destination
        description: "Guided tour to the summit of the Eiffel Tower.",
        difficulty: "Easy",
        cost: 75,
        images: [
          "https://source.unsplash.com/random/400x300?eiffel-tour",
          "https://source.unsplash.com/random/400x300?paris-view",
        ],
        availableDates: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)],
        safetyInfo: "Wear comfortable shoes.",
      },
      {
        name: "Fushimi Inari Shrine Hike",
        type: "Land",
        location: "Kyoto",
        destination: kyotoId, // Linked to Kyoto Destination
        description: "Hike through the iconic torii gates of Fushimi Inari Shrine.",
        difficulty: "Moderate",
        cost: 0, // Free
        images: [
          "https://source.unsplash.com/random/400x300?fushimi-inari",
          "https://source.unsplash.com/random/400x300?torii-gates",
        ],
        availableDates: [new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)],
        safetyInfo: "Bring water and wear appropriate footwear.",
      },
    ])
    console.log("Activities seeded.")

    const eiffelTourId = activities[0]._id

    // --- 6. Seed Rentals ---
    console.log("Seeding Rentals...")
    const rentals = await Rental.insertMany([
      {
        type: "Scooter",
        brand: "Vespa",
        model: "Primavera",
        location: "Paris",
        destination: parisId, // Linked to Paris Destination
        pricing: { perHour: 20, perDay: 80 },
        availability: { from: new Date(), to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
        images: [
          "https://source.unsplash.com/random/400x300?vespa-paris",
          "https://source.unsplash.com/random/400x300?scooter-rental",
        ],
        features: ["Helmet included", "GPS"],
        description: "Explore Paris on a stylish Vespa scooter.",
      },
      {
        type: "Car",
        brand: "Toyota",
        model: "Aqua",
        location: "Kyoto",
        destination: kyotoId, // Linked to Kyoto Destination
        pricing: { perHour: 30, perDay: 120 },
        availability: { from: new Date(), to: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) },
        images: [
          "https://source.unsplash.com/random/400x300?toyota-car",
          "https://source.unsplash.com/random/400x300?rental-car",
        ],
        features: ["Automatic", "Hybrid"],
        description: "Compact and fuel-efficient car for exploring Kyoto and surrounding areas.",
      },
    ])
    console.log("Rentals seeded.")

    const vespaRentalId = rentals[0]._id

    // --- 7. Seed Trips ---
    console.log("Seeding Trips...")
    const trips = await Trip.insertMany([
      {
        title: "Romantic Paris Getaway",
        location: "Paris, France",
        destination: parisId, // Linked to Paris Destination
        duration: "4 Days, 3 Nights",
        price: 1500,
        originalPrice: 1800,
        discount: 15,
        rating: 4.8,
        image: "https://source.unsplash.com/random/800x600?romantic-paris",
        gradient: ["#FF6B35", "#F7C59F"],
        tag: "Popular",
        highlights: ["Eiffel Tower", "Louvre Museum", "Seine River Cruise"],
        category: "Relaxation",
        subCategories: ["City", "Food"],
        difficulty: "Easy",
        status: "popular",
        travelDate: "Oct 10 - Oct 13",
        type: "Package",
        provider: "Global Tours",
        passengers: 2,
      },
      {
        title: "Kyoto Cultural Immersion",
        location: "Kyoto, Japan",
        destination: kyotoId, // Linked to Kyoto Destination
        duration: "7 Days, 6 Nights",
        price: 2200,
        rating: 4.9,
        image: "https://source.unsplash.com/random/800x600?kyoto-culture",
        gradient: ["#4CAF50", "#8BC34A"],
        tag: "New",
        highlights: ["Fushimi Inari", "Arashiyama Bamboo Grove", "Geisha District"],
        category: "Cultural",
        subCategories: ["Heritage", "Nature"],
        difficulty: "Moderate",
        status: "new",
        travelDate: "Nov 5 - Nov 11",
        type: "Package",
        provider: "Zen Travel",
        passengers: 1,
      },
    ])
    console.log("Trips seeded.")

    const parisTripId = trips[0]._id

    // --- 8. Seed Bookings ---
    console.log("Seeding Bookings...")
    await Booking.insertMany([
      {
        user: MOCK_USER_ID,
        bookingType: "Trip",
        trip: parisTripId, // Linked to Paris Trip
        totalPrice: 1500,
        paymentDetails: { paymentMethod: "Credit Card", transactionId: "TRIP12345", paymentStatus: "Paid" },
        travelDate: { startDate: new Date("2025-10-10"), endDate: new Date("2025-10-13") },
        category: "Relaxation",
        travelers: 2,
        bookedAtPrice: 1500,
        specialRequests: "Honeymoon suite if possible.",
        status: "Confirmed",
      },
      {
        user: MOCK_USER_ID,
        bookingType: "Restaurant",
        restaurant: leJulesVerneId, // Linked to Le Jules Verne Restaurant
        totalPrice: 250,
        paymentDetails: { paymentMethod: "Credit Card", transactionId: "REST67890", paymentStatus: "Paid" },
        reservation: { date: new Date("2025-10-11"), time: "19:30", people: 2, table: "Window" },
        status: "Confirmed",
      },
      {
        user: MOCK_USER_ID,
        bookingType: "Activity",
        activity: eiffelTourId, // Linked to Eiffel Tower Activity
        totalPrice: 75,
        paymentDetails: { paymentMethod: "PayPal", transactionId: "ACT11223", paymentStatus: "Paid" },
        activityDetails: { date: new Date("2025-10-12"), participants: 2 },
        status: "Confirmed",
      },
      {
        user: MOCK_USER_ID,
        bookingType: "Stay",
        stay: shangriLaId, // Linked to Shangri-La Stay
        totalPrice: 3600, // 3 nights * 1200
        paymentDetails: { paymentMethod: "Credit Card", transactionId: "STAY44556", paymentStatus: "Paid" },
        stayDetails: {
          checkIn: new Date("2025-10-10"),
          checkOut: new Date("2025-10-13"),
          roomType: "Deluxe Room",
          guests: 2,
        },
        status: "Confirmed",
      },
      {
        user: MOCK_USER_ID,
        bookingType: "Rental",
        rental: vespaRentalId, // Linked to Vespa Rental
        totalPrice: 160, // 2 days * 80
        paymentDetails: { paymentMethod: "Credit Card", transactionId: "RENT77889", paymentStatus: "Paid" },
        rentalDetails: { from: new Date("2025-10-11"), to: new Date("2025-10-13"), extras: ["GPS"] },
        status: "Confirmed",
      },
    ])
    console.log("Bookings seeded.")

    console.log("Database seeding complete!")
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1) // Exit with error code
  } finally {
    await mongoose.disconnect()
    console.log("MongoDB disconnected.")
  }
}

seedData()
