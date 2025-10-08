import { NextRequest } from 'next/server';

// This is a placeholder route for WebSocket documentation
// The actual WebSocket server is initialized in the custom server
export async function GET(request: NextRequest) {
  return Response.json({
    message: 'WebSocket endpoint',
    path: '/ws',
    info: 'Connect using ws://localhost:5000/ws?userId=USER_ID&jobId=JOB_ID'
  });
}