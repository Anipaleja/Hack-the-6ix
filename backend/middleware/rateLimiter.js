const rateLimit = require('express-rate-limit');

// Create a rate limiter function
const createRateLimiter = (maxRequests = 10, windowMinutes = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
    max: maxRequests, // Limit each IP to maxRequests requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: windowMinutes
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: `Too many requests. Limit: ${maxRequests} requests per ${windowMinutes} minutes.`,
        retryAfter: windowMinutes * 60 // seconds
      });
    },
    skip: (req) => {
      // Skip rate limiting for admin users (if implemented)
      return req.user && req.user.role === 'admin';
    }
  });
};

// Export the rate limiter function
module.exports = createRateLimiter;
