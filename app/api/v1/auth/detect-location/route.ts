import { NextRequest } from 'next/server'
import { getRequestInfo } from '@/lib/utils/ip-device-utils'
import { publicApiWrapper, formatSuccess } from '@/lib/core/api-response-middleware'

export const GET = publicApiWrapper(async (request: NextRequest) => {
  try {
    const requestInfo = await getRequestInfo(request)
    
    return formatSuccess({
      ip: requestInfo.ipAddress,
      country: requestInfo.locationData?.country || null,
      region: requestInfo.locationData?.region || null,
      city: requestInfo.locationData?.city || null,
    })
  } catch (error) {
    return formatSuccess({
      ip: null,
      country: null,
      countryCode: null,
      region: null,
      city: null,
    })
  }
})
