import { useEffect, useRef, useState } from 'react';
import { authService, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/database';
import io, { Socket } from 'socket.io-client';
import { WEBSOCKET_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints';

interface SocketMessage {
  type: string;
  jobId?: string;
  status?: string;
  progress?: {
    total_urls: number;
    processed_urls: number;
    successful_urls: number;
    failed_urls: number;
    progress_percentage: number;
  };
  current_url?: string;
  error_message?: string;
  completedAt?: string;
  [key: string]: any;
}

interface UseSocketIOOptions {
  jobId?: string;
  onJobUpdate?: (message: SocketMessage) => void;
  onJobCompleted?: (message: SocketMessage) => void;
  onJobProgress?: (message: SocketMessage) => void;
}

// Singleton WebSocket connection manager to prevent multiple connections
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<Socket> | null = null;
  private subscribers = new Set<string>();
  private lastUserId: string | null = null;
  private isInitialized = false;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  async getConnection(userId: string, token: string): Promise<Socket> {
    // If we already have a valid connection for the same user, return it immediately
    if (this.socket && this.socket.connected && this.lastUserId === userId) {
      return this.socket;
    }

    // If user changed, disconnect old connection
    if (this.socket && this.lastUserId && this.lastUserId !== userId) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }

    // If we're already connecting for this user, wait for the existing connection attempt
    if (this.connectionPromise && this.lastUserId === userId) {
      return this.connectionPromise;
    }

    // Create new connection promise
    this.lastUserId = userId;
    this.connectionPromise = this.createConnection(userId, token);
    return this.connectionPromise;
  }

  private async createConnection(userId: string, token: string): Promise<Socket> {
    // Cleanup existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    
    // Create Socket.io connection with WebSocket-only transport - NO POLLING
    const socket = io({
      path: WEBSOCKET_ENDPOINTS.SOCKETIO,
      // CRITICAL: Force WebSocket-only transport to eliminate polling
      transports: ['websocket'],
      // Disable all polling-related features
      upgrade: false,
      rememberUpgrade: false,
      // Connection settings
      timeout: 20000,
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // IMPORTANT: Do NOT force new connection to reuse existing ones
      forceNew: false,
      // Authentication
      auth: {
        token,
        userId
      },
      query: {
        token,
        userId
      }
    });

    this.socket = socket;

    // Setup connection handlers
    socket.on('connect', () => {
      this.isConnecting = false;
    });

    socket.on('disconnect', (reason: string) => {
      this.isConnecting = false;
      this.connectionPromise = null;
      
      // Don't immediately reconnect if it was a deliberate disconnect
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        this.socket = null;
      }
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket.io connection error:', error);
      this.isConnecting = false;
      this.connectionPromise = null;
    });

    // Wait for connection to establish
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 20000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        this.connectionPromise = null;
        resolve(socket);
      });

      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        this.connectionPromise = null;
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.connectionPromise = null;
      this.subscribers.clear();
    }
  }

  addSubscriber(id: string) {
    this.subscribers.add(id);
  }

  hasSubscriber(id: string): boolean {
    return this.subscribers.has(id);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  setInitialized(value: boolean): void {
    this.isInitialized = value;
  }

  removeSubscriber(id: string) {
    this.subscribers.delete(id);
    
    // Keep connection alive if there are any subscribers, disconnect after delay if none
    if (this.subscribers.size === 0) {
      setTimeout(() => {
        if (this.subscribers.size === 0 && this.socket) {
          this.disconnect();
        }
      }, 5000);
    }
  }
}

export function useSocketIO(options: UseSocketIOOptions = {}) {
  const { jobId, onJobUpdate, onJobCompleted, onJobProgress } = options;
  const [user, setUser] = useState<AuthUser | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const hookId = useRef(typeof window !== 'undefined' ? Math.random().toString(36).substr(2, 9) : 'ssr-hook');
  const socketManager = SocketManager.getInstance();

  // Get current user once
  useEffect(() => {
    let isMounted = true;

    const getCurrentUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      if (isMounted) {
        setUser(authUser);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Single effect for socket connection management
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const currentHookId = hookId.current;
    let currentSubscribedJobId: string | null = null;

    const connectSocket = async () => {
      try {
        // Get current JWT token for authentication
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          console.error('No valid session for Socket.io connection');
          return;
        }

        // Initialize Socket.io endpoint to ensure server is running (only once globally)
        if (!(socketManager as any).isInitialized) {
          await fetch(WEBSOCKET_ENDPOINTS.SOCKET_INIT, {
            credentials: 'include' // Essential for cross-subdomain authentication
          });
          (socketManager as any).isInitialized = true;
        }

        // Register this hook as a subscriber (avoid duplicates)
        if (!socketManager.hasSubscriber(currentHookId)) {
          socketManager.addSubscriber(currentHookId);
        }

        // Get shared socket connection (singleton pattern)
        const socket = await socketManager.getConnection(user.id, session.access_token);
        
        if (!isMounted) return;

        socketRef.current = socket;
        setIsConnected(socket.connected);

        // Setup event handlers for this specific hook instance
        const handleConnect = () => {
          if (isMounted) {
            setIsConnected(true);
            
            // Subscribe to specific job if provided and not already subscribed
            if (jobId && currentSubscribedJobId !== jobId) {
              // Unsubscribe from previous job if any
              if (currentSubscribedJobId) {
                socket.emit('unsubscribe_job', { jobId: currentSubscribedJobId });
              }
              
              socket.emit('subscribe_job', { jobId });
              currentSubscribedJobId = jobId;
            }
          }
        };

        const handleDisconnect = () => {
          if (isMounted) {
            setIsConnected(false);
          }
        };

        const handleJobUpdate = (message: SocketMessage) => {
          if (isMounted) {
            setLastMessage({ ...message, type: 'job_update' });
          }
        };

        const handleJobProgress = (message: SocketMessage) => {
          if (isMounted) {
            setLastMessage({ ...message, type: 'job_progress' });
          }
        };

        const handleJobCompleted = (message: SocketMessage) => {
          if (isMounted) {
            setLastMessage({ ...message, type: 'job_completed' });
          }
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('job_update', handleJobUpdate);
        socket.on('job_progress', handleJobProgress);
        socket.on('job_completed', handleJobCompleted);

        // If already connected, trigger connect handler
        if (socket.connected) {
          handleConnect();
        }

        // Cleanup function
        return () => {
          // Unsubscribe from current job before cleanup
          if (currentSubscribedJobId) {
            socket.emit('unsubscribe_job', { jobId: currentSubscribedJobId });
            currentSubscribedJobId = null;
          }
          
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('job_update', handleJobUpdate);
          socket.off('job_progress', handleJobProgress);
          socket.off('job_completed', handleJobCompleted);
        };

      } catch (error) {
        console.error('Failed to connect Socket.io:', error);
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      // Unregister this hook as a subscriber
      socketManager.removeSubscriber(currentHookId);
    };
  }, [user?.id, jobId]); // Removed callback dependencies to prevent re-subscription

  // Separate effect to handle callback changes without re-subscription
  useEffect(() => {
    if (socketRef.current && lastMessage) {
      // Handle callback invocations based on message type
      if (lastMessage.type === 'job_update' && onJobUpdate) {
        onJobUpdate(lastMessage);
      } else if (lastMessage.type === 'job_progress' && onJobProgress) {
        onJobProgress(lastMessage);
      } else if (lastMessage.type === 'job_completed' && onJobCompleted) {
        onJobCompleted(lastMessage);
      }
    }
  }, [lastMessage, onJobUpdate, onJobProgress, onJobCompleted]);

  // Send message to Socket.io
  const sendMessage = (event: string, data: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  };

  // Subscribe to a specific job
  const subscribeToJob = (newJobId: string) => {
    sendMessage('subscribe_job', { jobId: newJobId });
  };

  // Unsubscribe from job updates
  const unsubscribeFromJob = () => {
    sendMessage('unsubscribe_job', {});
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribeToJob,
    unsubscribeFromJob
  };
}