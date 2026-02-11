const rateLimit = {};

function rateLimitMiddleware(req, res, next) {
    const ip = req.ip;
    const now = Date.now();

    if (!rateLimit[ip]) {
        rateLimit[ip] = { count: 1, resetTime: now + 60000 }; // 1 minute window
    } else {
        if (now > rateLimit[ip].resetTime) {
            rateLimit[ip] = { count: 1, resetTime: now + 60000 };
        } else {
            rateLimit[ip].count++;

            if (rateLimit[ip].count > 10) { // Max 10 requests per minute
                return res.status(429).json({
                    error: 'Too many requests. Please try again later.'
                });
            }
        }
    }

    next();
}

module.exports = rateLimitMiddleware;
