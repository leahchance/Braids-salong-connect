const validator = require('validator');

// Validation utilities with bugs
const validateEmail = (email) => {
  // BUG: Not using the validator library properly
  return email.includes('@') && email.includes('.');
};

const validatePassword = (password) => {
  // BUG: Weak password validation
  return password.length >= 6;
};

const validatePhone = (phone) => {
  // BUG: No proper phone validation
  return phone.length > 5;
};

const validateBookingDate = (date) => {
  const bookingDate = new Date(date);
  const now = new Date();
  
  // BUG: Not checking for valid date or reasonable future date limits
  return bookingDate > now;
};

const sanitizeInput = (input) => {
  // BUG: Inadequate sanitization
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateBookingDate,
  sanitizeInput
};