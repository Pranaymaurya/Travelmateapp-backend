const jwt = require('jsonwebtoken');

const generateToken = (id, isAdmin) => {
  return jwt.sign({ id, isAdmin }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d', // Token will be valid for 30 days
  });
};

module.exports = generateToken;
