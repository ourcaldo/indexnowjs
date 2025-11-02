#!/usr/bin/env tsx

/**
 * Paddle Environment Variables Diagnostic Script
 * 
 * This script checks if Paddle environment variables are properly configured.
 * Run with: npx tsx scripts/debug-paddle-env.ts
 */

const requiredVars = {
  'PADDLE_API_KEY': {
    type: 'server',
    description: 'Paddle API Key for server-side operations',
    example: 'pdl_sdbx_apikey_...'
  },
  'PADDLE_WEBHOOK_SECRET': {
    type: 'server',
    description: 'Paddle Webhook Secret for signature verification',
    example: 'ntfset_...'
  },
  'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN': {
    type: 'client',
    description: 'Paddle Client Token for frontend (safe to expose)',
    example: 'test_...'
  },
  'NEXT_PUBLIC_PADDLE_ENV': {
    type: 'client',
    description: 'Paddle Environment (sandbox | production)',
    example: 'sandbox'
  }
}

console.log('\n🔍 Paddle Environment Variables Diagnostic\n')
console.log('=' .repeat(60))

let allPresent = true
let hasClientTokens = true

Object.entries(requiredVars).forEach(([varName, info]) => {
  const value = process.env[varName]
  const isPresent = !!value
  
  if (!isPresent) {
    allPresent = false
    if (varName.startsWith('NEXT_PUBLIC_')) {
      hasClientTokens = false
    }
  }

  const status = isPresent ? '✅' : '❌'
  const displayValue = isPresent
    ? (info.type === 'server' ? `${value!.substring(0, 12)}...` : value)
    : 'NOT SET'

  console.log(`\n${status} ${varName}`)
  console.log(`   Type: ${info.type}`)
  console.log(`   Description: ${info.description}`)
  console.log(`   Value: ${displayValue}`)
  
  if (!isPresent) {
    console.log(`   Example: ${info.example}`)
  }
})

console.log('\n' + '='.repeat(60))

if (allPresent) {
  console.log('\n✅ SUCCESS: All Paddle environment variables are configured!')
} else {
  console.log('\n❌ ERROR: Some Paddle environment variables are missing!')
  
  if (!hasClientTokens) {
    console.log('\n⚠️  CRITICAL: Client-side Paddle variables are missing!')
    console.log('   This will cause the "Unable to proceed" error in checkout.')
    console.log('   The PaddleProvider needs NEXT_PUBLIC_PADDLE_CLIENT_TOKEN to initialize.')
  }
  
  console.log('\n📝 FIX:')
  console.log('   1. Check your .env.local file (takes precedence over .env)')
  console.log('   2. Add missing Paddle variables to .env.local:')
  console.log('')
  console.log('   # Paddle Payment Gateway')
  console.log('   PADDLE_API_KEY=pdl_sdbx_apikey_...')
  console.log('   PADDLE_WEBHOOK_SECRET=ntfset_...')
  console.log('   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_...')
  console.log('   NEXT_PUBLIC_PADDLE_ENV=sandbox')
  console.log('')
  console.log('   3. Restart your development server')
  
  process.exit(1)
}

console.log('')
