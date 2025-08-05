const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

// POST /payments - Process a payment (mock)
router.post('/', async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    // Simulate payment processing
    const transactionId = 'TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    // Update booking with payment details
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          'paymentDetails.paymentMethod': paymentMethod,
          'paymentDetails.transactionId': transactionId,
          'paymentDetails.paymentStatus': 'Paid',
        }
      },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, transactionId, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; 