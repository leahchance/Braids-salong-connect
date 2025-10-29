const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const bookingRoutes = require('./routes/bookings');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/braids-salong', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'stylist', 'admin'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stylistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  city: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Use routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);

// BUG 1: Security vulnerability - No input validation and SQL injection-like NoSQL injection possible
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // VULNERABLE: Direct query without sanitization
    const user = await User.findOne({ email: email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // FIXED: Use environment variable for JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      role: role || 'customer'
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// FIXED: Atomic booking creation to prevent race conditions
app.post('/api/bookings', async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { customerId, stylistId, serviceType, date, duration, price, city } = req.body;

    // Proper date validation
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime()) || bookingDate <= new Date()) {
      return res.status(400).json({ message: 'Invalid booking date' });
    }
    
    const endTime = new Date(bookingDate.getTime() + duration * 60000);

    // Use transaction to ensure atomicity
    const result = await session.withTransaction(async () => {
      // Check for conflicts within the transaction
      const conflictingBookings = await Booking.find({
        stylistId: stylistId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            // Existing booking starts before new booking ends and ends after new booking starts
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
      return booking;
    });

    await session.commitTransaction();
    res.status(201).json({ message: 'Booking created successfully', booking: result });
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

// Get bookings for a user
app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({
      $or: [{ customerId: userId }, { stylistId: userId }]
    }).populate('customerId stylistId', 'name email phone');

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available stylists
app.get('/api/stylists/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const stylists = await User.find({ role: 'stylist' });
    res.json(stylists);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update booking status
app.patch('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking updated successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;