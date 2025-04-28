import rateLimit from 'express-rate-limit'

// Rate limit untuk login attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // maksimal 5 percobaan
  message: {
    message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Rate limit untuk API secara umum
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60, // maksimal 60 request per menit
  message: {
    message: 'Terlalu banyak request, silakan coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false
}) 