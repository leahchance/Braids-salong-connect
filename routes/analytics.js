const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// FIXED: Efficient stylist statistics using aggregation
router.get('/stylist/:stylistId/stats', authenticateToken, async (req, res) => {
  try {
    const { stylistId } = req.params;

    // Use MongoDB aggregation for efficient statistics calculation
    const stats = await Booking.aggregate([
      {
        $match: {
          stylistId: new mongoose.Types.ObjectId(stylistId)
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['completed']] },
                '$price',
                0
              ]
            }
          },
          avgRating: { 
            $avg: { 
              $cond: [
                { $ne: ['$rating', null] },
                '$rating',
                null
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          statusBreakdown: {
            $push: {
              status: '$_id',
              count: '$count'
            }
          },
          totalBookings: { $sum: '$count' },
          totalRevenue: { $sum: '$totalRevenue' },
          avgRating: { $avg: '$avgRating' }
        }
      }
    ]);

    // Get upcoming bookings count efficiently
    const upcomingBookings = await Booking.countDocuments({
      stylistId,
      date: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] }
    });

    const result = stats[0] || {
      statusBreakdown: [],
      totalBookings: 0,
      totalRevenue: 0,
      avgRating: 0
    };

    result.upcomingBookings = upcomingBookings;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Efficient city-based booking statistics
router.get('/city/:city/stats', authenticateToken, async (req, res) => {
  try {
    const { city } = req.params;

    const stats = await Booking.aggregate([
      {
        $match: {
          city: city,
          createdAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          bookings: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [
                { $eq: ['$status', 'completed'] },
                '$price',
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;