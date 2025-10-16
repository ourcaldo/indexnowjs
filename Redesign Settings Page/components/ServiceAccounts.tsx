import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, Copy, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';

export function ServiceAccounts() {
  const [showKeys, setShowKeys] = useState<{ [key: number]: boolean }>({});

  const apiKeys = [
    {
      id: 1,
      name: 'Production API',
      key: 'sk_live_51HqJK2LkPwP8Z9K3',
      created: 'Jan 15, 2025',
      lastUsed: 'Just now',
      status: 'active'
    },
    {
      id: 2,
      name: 'Development API',
      key: 'sk_test_51HqJK2LkPwP8Z9K3',
      created: 'Jan 10, 2025',
      lastUsed: '2 hours ago',
      status: 'active'
    },
    {
      id: 3,
      name: 'Staging Environment',
      key: 'sk_test_41MpXK3LmQrS9A8L4',
      created: 'Jan 5, 2025',
      lastUsed: '5 days ago',
      status: 'inactive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 text-xl">API Keys</h2>
          <p className="text-sm text-gray-600">Manage your API keys for programmatic access</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New API key
        </Button>
      </div>

      {/* Warning */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Keep your API keys secure. Never share them publicly or commit to version control.
        </AlertDescription>
      </Alert>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((api) => (
          <Card key={api.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-gray-900">{api.name}</h3>
                    <Badge variant={api.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {api.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Created {api.created}</span>
                    <span>Last used {api.lastUsed}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <code className="flex-1 text-xs text-gray-700 font-mono">
                  {showKeys[api.id] ? api.key : '•'.repeat(24)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowKeys(prev => ({ ...prev, [api.id]: !prev[api.id] }))}
                >
                  {showKeys[api.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Example API request</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4">
              <code className="text-xs text-gray-300 block font-mono whitespace-pre">
{`curl -X POST \\
  https://api.indexnow.studio/v1 \\
  -H "Authorization: Bearer KEY" \\
  -d '{"url": "example.com"}'`}
              </code>
            </div>
            <Button variant="link" className="px-0 mt-3">View documentation →</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate Limits</CardTitle>
            <CardDescription>Current plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Per minute</span>
              <span className="text-gray-900">100</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Per day</span>
              <span className="text-gray-900">10,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Concurrent</span>
              <span className="text-gray-900">10</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
