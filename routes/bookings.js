const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { validateObjectId } = require('../utils/validation');

const router = express.Router();

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  salonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', required: true },
  service: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending' 
  },
  notes: { type: String },
  duration: { type: Number, default: 60 }, // in minutes
  price: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Create booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { salonId, service, date, time, notes, duration, price } = req.body;
    const userId = req.user._id;

    // Validation
    if (!salonId || !service || !date || !time) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Validate ObjectId
    const salonIdValidation = validateObjectId(salonId);
    if (!salonIdValidation.isValid) {
      return res.status(400).json({ error: salonIdValidation.error });
    }

    // Check if salon exists
    const Salon = mongoose.model('Salon');
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    // Check for conflicting bookings
    const existingBooking = await Booking.findOne({
      salonId,
      date: new Date(date),
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBooking) {
      return res.status(409).json({ 
        error: 'Time slot already booked',
        conflictingBooking: existingBooking._id
      });
    }

    // Create booking
    const booking = new Booking({
      userId,
      salonId,
      service,
      date: new Date(date),
      time,
      notes,
      duration: duration || 60,
      price
    });

    await booking.save();

    // Populate salon details for response
    await booking.populate('salonId', 'name city address phone');

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        salon: booking.salonId.name,
        city: booking.salonId.city,
        service: booking.service,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        notes: booking.notes,
        duration: booking.duration,
        price: booking.price
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user bookings with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    let query = { userId };
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1, createdAt: -1 }
    };

    // Fixed: Proper pagination implementation
    const bookings = await Booking.find(query)
      .populate('salonId', 'name city address phone')
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      total,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      limit: options.limit
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user._id;

    // Validate ObjectId
    const bookingIdValidation = validateObjectId(bookingId);
    if (!bookingIdValidation.isValid) {
      return res.status(400).json({ error: bookingIdValidation.error });
    }

    const booking = await Booking.findOne({ _id: bookingId, userId })
      .populate('salonId', 'name city address phone email');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user._id;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, userId },
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('salonId', 'name city');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      message: 'Booking status updated successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        salon: booking.salonId.name,
        service: booking.service,
        date: booking.date,
        time: booking.time
      }
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel booking
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user._id;

    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, userId },
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    ).populate('salonId', 'name city');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        salon: booking.salonId.name,
        service: booking.service
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;