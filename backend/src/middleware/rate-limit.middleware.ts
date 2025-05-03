import rateLimit from 'express-rate-limit'

// Login attempts rate limiter
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // maximum 5 attempts
  message: {
    message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // maximum 60 requests per minute
  message: {
    message: 'Terlalu banyak request, silakan coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
})