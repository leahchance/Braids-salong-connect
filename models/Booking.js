const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  stylistId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  serviceType: { 
    type: String, 
    required: true,
    enum: [
      'box_braids',
      'cornrows', 
      'twists',
      'dreadlocks',
      'hair_cut',
      'beard_trim',
      'hair_wash',
      'styling'
    ]
  },
  date: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number, 
    required: true,
    min: 30, // minimum 30 minutes
    max: 480 // maximum 8 hours
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  city: { 
    type: String, 
    required: true 
  },
  address: {
    type: String,
    required: false
  },
  notes: {
    type: String,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 1000
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
bookingSchema.index({ stylistId: 1, date: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ city: 1, status: 1 });

// Update the updatedAt field before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);