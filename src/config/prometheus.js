import promClient from 'prom-client';

// Create a Registry to register metrics
const register = new promClient.Registry();

// Enable default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP Request Metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

// Database Metrics
const dbQueryDuration = new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const dbConnectionsActive = new promClient.Gauge({
    name: 'db_connections_active',
    help: 'Number of active database connections'
});

// Business Metrics
const propertiesTotal = new promClient.Gauge({
    name: 'properties_total',
    help: 'Total number of properties in the system'
});

const usersTotal = new promClient.Gauge({
    name: 'users_total',
    help: 'Total number of registered users'
});

const activeSessions = new promClient.Gauge({
    name: 'active_sessions',
    help: 'Number of active user sessions'
});

const imageUploadsTotal = new promClient.Counter({
    name: 'image_uploads_total',
    help: 'Total number of image uploads',
    labelNames: ['type'] // 'profile', 'property'
});

const friendRequestsTotal = new promClient.Counter({
    name: 'friend_requests_total',
    help: 'Total number of friend requests',
    labelNames: ['status'] // 'pending', 'accepted', 'rejected'
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(propertiesTotal);
register.registerMetric(usersTotal);
register.registerMetric(activeSessions);
register.registerMetric(imageUploadsTotal);
register.registerMetric(friendRequestsTotal);

// Middleware to track HTTP requests
export const prometheusMiddleware = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route ? req.route.path : req.path;
        
        httpRequestDurationMicroseconds
            .labels(req.method, route, res.statusCode.toString())
            .observe(duration / 1000);
            
        httpRequestTotal
            .labels(req.method, route, res.statusCode.toString())
            .inc();
    });
    
    next();
};

// Database query wrapper
export const trackDbQuery = async (queryType, table, queryFn) => {
    const start = Date.now();
    try {
        const result = await queryFn();
        const duration = Date.now() - start;
        
        dbQueryDuration
            .labels(queryType, table)
            .observe(duration / 1000);
            
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        
        dbQueryDuration
            .labels(queryType, table)
            .observe(duration / 1000);
            
        throw error;
    }
};

// Update business metrics
export const updateBusinessMetrics = async (db) => {
    try {
        // Update properties count
        const propertiesResult = await db.query('SELECT COUNT(*) as count FROM properties');
        propertiesTotal.set(parseInt(propertiesResult.rows[0].count));
        
        // Update users count
        const usersResult = await db.query('SELECT COUNT(*) as count FROM users');
        usersTotal.set(parseInt(usersResult.rows[0].count));
        
        // Update active sessions (approximate)
        const sessionsResult = await db.query('SELECT COUNT(*) as count FROM users WHERE is_verified = true');
        activeSessions.set(parseInt(sessionsResult.rows[0].count));
        
    } catch (error) {
        console.error('Error updating business metrics:', error);
    }
};

// Metrics endpoint
export const metricsEndpoint = async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
};

export default register; 