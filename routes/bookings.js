const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { authenticateToken } = require('../middleware/auth');
const { validateBookingDate } = require('../utils/validation');

// FIXED: Proper pagination with input validation and limits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, city, status } = req.query;
    
    // FIXED: Input validation for pagination parameters
    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    
    // Validate and sanitize pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      pageNum = 1;
    }
    
    if (isNaN(limitNum) || limitNum < 1) {
      limitNum = 10;
    }
    
    // FIXED: Enforce maximum limit to prevent performance issues
    const MAX_LIMIT = 100;
    if (limitNum > MAX_LIMIT) {
      limitNum = MAX_LIMIT;
    }
    
    let query = {};
    
    // Input validation for filter parameters
    if (city && typeof city === 'string' && city.trim().length > 0) {
      query.city = city.trim();
    }
    
    if (status && typeof status === 'string') {
      const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    // Use aggregation for better performance with large datasets
    const [bookings, totalResult] = await Promise.all([
      Booking.find(query)
        .populate('customerId stylistId', 'name email')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(), // Use lean() for better performance
      Booking.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalResult / limitNum);

    res.json({
      bookings,
      pagination: {
        current: pageNum,
        limit: limitNum,
        total: totalPages,
        totalRecords: totalResult,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FIXED: Atomic booking creation to prevent race conditions
router.post('/', authenticateToken, async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    const { stylistId, serviceType, date, duration, price, city } = req.body;
    const customerId = req.user.userId;

    if (!validateBookingDate(date)) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }

    const bookingDate = new Date(date);
    const endTime = new Date(bookingDate.getTime() + duration * 60000);

    // Use transaction to ensure atomicity
    const result = await session.withTransaction(async () => {
      // Check for conflicts within the transaction
      const conflictingBookings = await Booking.find({
        stylistId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            // Existing booking overlaps with new booking
            date: { $lt: endTime },
            $expr: {
              $gt: [
                { $add: ['$date', { $multiply: ['$duration', 60000] }] },
                bookingDate
              ]
            }
          }
        ]
      }).session(session);

      if (conflictingBookings.length > 0) {
        throw new Error('Time slot not available');
      }

      // Create the booking atomically
      const booking = new Booking({
        customerId,
        stylistId,
        serviceType,
        date: bookingDate,
        duration,
        price,
        city,
        status: 'pending'
      });

      await booking.save({ session });
      return await booking.populate('customerId stylistId', 'name email');
    });

    await session.commitTransaction();
    res.status(201).json({ 
      message: 'Booking created successfully', 
      booking: result
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.message === 'Time slot not available') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;