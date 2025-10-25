# Nginx Permissions Policy Configuration for Payment Feature

## Issue
Browser console shows:
```
[Violation] Potential permissions policy violation: payment is not allowed in this document.
```

This occurs because the Payment Request API is blocked by the browser's Permissions Policy.

## Fix for Nginx

Add the following to your nginx configuration:

### Option 1: Allow payment from same origin (Recommended)
```nginx
# In your server block
add_header Permissions-Policy "payment=(self)";
```

### Option 2: Allow payment from any origin (Less secure)
```nginx
# In your server block
add_header Permissions-Policy "payment=(*)";
```

### Complete Example Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Enable payment feature for this domain
    add_header Permissions-Policy "payment=(self)";

    # Your other configurations...
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### If Using Multiple Features
```nginx
# Combine multiple permissions
add_header Permissions-Policy "payment=(self); geolocation=(self); camera=()";
```

## Testing the Fix

1. Apply the nginx configuration
2. Reload nginx: `sudo nginx -s reload`
3. Clear browser cache
4. Test the payment flow
5. Check browser console - the violation should be gone

## Important Notes

- The payment feature permission is required for Midtrans 3DS iframe to work properly
- Without this permission, the 3DS authentication popup may fail silently
- This is a server-side configuration and cannot be fixed from the application code
