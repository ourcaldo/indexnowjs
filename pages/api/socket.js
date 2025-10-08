import { Server } from 'socket.io'
import { supabaseAdmin } from '../../lib/database/supabase'
import { SecureServiceRoleHelpers, SecureServiceRoleWrapper } from '../../lib/services/security/SecureServiceRoleWrapper'
import { SocketIOBroadcaster } from '../../lib/core/socketio-broadcaster'

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('WebSocket server is already running')
  } else {
    console.log('Initializing WebSocket server with Socket.io')
    
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      // Force WebSocket-only transport, completely disable polling
      transports: ['websocket'],
      // Disable all polling-related features
      upgrade: false,
      allowUpgrades: false,
      rememberUpgrade: false,
      // WebSocket-specific settings
      pingTimeout: 60000,
      pingInterval: 25000,
      // Enhanced CORS for WebSocket
      cors: {
        origin: ["http://localhost:8081", "http://localhost:5000", "https://indexnow.studio"],
        methods: ["GET", "POST"],
        credentials: true
      },
      // Disable HTTP long-polling fallback
      allowEIO3: false
    })
    
    res.socket.server.io = io
    
    // Connect the broadcaster to this Socket.IO instance
    const broadcaster = SocketIOBroadcaster.getInstance()
    broadcaster.setIO(io)
    
    // Also set it globally for background worker access
    global.socketIo = io

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token
        const userId = socket.handshake.auth.userId || socket.handshake.query.userId

        if (!token || !userId) {
          return next(new Error('Authentication failed: Missing token or userId'))
        }

        // Verify JWT token with Supabase using secure wrapper
        const authContext = {
          userId: 'system',
          operation: 'websocket_auth_verification',
          reason: 'WebSocket middleware verifying user authentication token',
          source: 'socket.js',
          metadata: {
            socketId: socket.id,
            hasToken: !!token,
            userAgent: socket.handshake.headers['user-agent'] || 'unknown'
          },
          ipAddress: socket.handshake.address || 'unknown'
        }

        const user = await SecureServiceRoleWrapper.executeSecureOperation(
          authContext,
          {
            table: 'auth.users',
            operationType: 'select',
            columns: ['id', 'email'],
            whereConditions: { token: token }
          },
          async () => {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
            if (error || !user) {
              throw new Error(error?.message || 'Invalid token')
            }
            return user
          }
        )
        
        if (!user || user.id !== userId) {
          return next(new Error('Authentication failed: Invalid token'))
        }

        // Verify user exists in our user profiles table using secure service role
        try {
          const operationContext = {
            userId: userId,
            operation: 'websocket_authentication',
            reason: 'Verify user profile exists for WebSocket authentication',
            source: 'socket.js middleware',
            metadata: {
              socketId: socket.id,
              userAgent: socket.handshake.headers['user-agent'] || 'unknown'
            },
            ipAddress: socket.handshake.address || 'unknown'
          }

          const profiles = await SecureServiceRoleHelpers.secureSelect(
            operationContext,
            'indb_auth_user_profiles',
            ['id'],
            { user_id: userId }
          )

          if (!profiles || profiles.length === 0) {
            return next(new Error('Authentication failed: User profile not found'))
          }
        } catch (profileError) {
          return next(new Error('Authentication failed: Profile verification error'))
        }

        socket.userId = userId
        socket.user = user
        next()
      } catch (authError) {
        next(new Error('Authentication failed'))
      }
    })

    // Set up connection handling
    io.on('connection', (socket) => {
      console.log(`✅ Socket.io client connected: ${socket.id} (user: ${socket.userId})`)
      
      // Send connection confirmation
      socket.emit('connection', {
        message: 'Connected to IndexNow Studio WebSocket',
        clientId: socket.id
      })

      // Handle job subscription
      socket.on('subscribe_job', (data) => {
        const jobRoom = `job-${data.jobId}`
        
        // Only subscribe if not already subscribed to this job
        if (socket.currentJobId !== data.jobId) {
          // Unsubscribe from previous job if any
          if (socket.currentJobId) {
            socket.leave(`job-${socket.currentJobId}`)
          }
          
          socket.join(jobRoom)
          socket.currentJobId = data.jobId
          console.log(`📡 Client ${socket.id} subscribed to job: ${data.jobId}`)
          socket.emit('subscribed', { jobId: data.jobId })
        }
        // If already subscribed, just send confirmation without logging
        else {
          socket.emit('subscribed', { jobId: data.jobId })
        }
      })
      
      // Handle job unsubscription
      socket.on('unsubscribe_job', (data) => {
        const targetJobId = data.jobId || socket.currentJobId
        if (targetJobId) {
          const jobRoom = `job-${targetJobId}`
          socket.leave(jobRoom)
          console.log(`📡 Client ${socket.id} unsubscribed from job: ${targetJobId}`)
          if (socket.currentJobId === targetJobId) {
            socket.currentJobId = null
          }
          socket.emit('unsubscribed', { jobId: targetJobId })
        }
      })

      // Handle ping
      socket.on('ping', () => {
        socket.emit('pong')
      })

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`❌ Socket.io client disconnected: ${socket.id} (reason: ${reason})`)
      })
    })

    // Store the io instance globally for other parts of the app to use
    global.socketIo = io
    console.log('✅ WebSocket server initialized successfully')
  }
  res.end()
}

export default SocketHandler