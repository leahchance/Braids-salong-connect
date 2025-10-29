const express = require('express');
const mongoose = require('mongoose');
const { sanitizeInput } = require('../utils/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Salon Schema
const salonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  services: [{ type: String }],
  rating: { type: Number, default: 0 },
  priceRange: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }],
  availability: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  }
});

const Salon = mongoose.model('Salon', salonSchema);

// Get salons by city with pagination
router.get('/', async (req, res) => {
  try {
    const { city, page = 1, limit = 10, service, minRating } = req.query;
    
    // Build query with proper sanitization
    let query = {};
    
    if (city) {
      // Fixed: Sanitize input to prevent NoSQL injection
      query.city = sanitizeInput(city);
    }
    
    if (service) {
      query.services = { $in: [service] };
    }
    
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { rating: -1, name: 1 }
    };

    const salons = await Salon.find(query)
      .select('name city services rating priceRange address phone')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Salon.countDocuments(query);

    res.json({
      salons,
      totalPages: Math.ceil(total / options.limit),
      currentPage: options.page,
      total
    });
  } catch (error) {
    console.error('Error fetching salons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get salon by ID
router.get('/:id', async (req, res) => {
  try {
    const salonId = req.params.id;
    
    // BUG: No input validation for ObjectId format
    const salon = await Salon.findById(salonId);
    
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    res.json(salon);
  } catch (error) {
    console.error('Error fetching salon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new salon (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      city,
      services,
      priceRange,
      address,
      phone,
      email,
      description,
      availability
    } = req.body;

    // Basic validation
    if (!name || !city || !priceRange || !address || !phone || !email) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const salon = new Salon({
      name: sanitizeInput(name),
      city: sanitizeInput(city),
      services: services || [],
      priceRange,
      address: sanitizeInput(address),
      phone: sanitizeInput(phone),
      email: sanitizeInput(email),
      description: sanitizeInput(description),
      availability: availability || {}
    });

    await salon.save();

    res.status(201).json({
      message: 'Salon created successfully',
      salon: {
        id: salon._id,
        name: salon.name,
        city: salon.city,
        services: salon.services
      }
    });
  } catch (error) {
    console.error('Error creating salon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;