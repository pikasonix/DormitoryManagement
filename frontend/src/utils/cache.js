const cache = new Map()

export const memoize = (key, callback, ttl = 5 * 60 * 1000) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.value
  }
  
  const value = callback()
  cache.set(key, { value, timestamp: Date.now() })
  return value
} 