import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Download } from 'lucide-react';
import { Progress } from './ui/progress';

export function PlansAndBilling() {
  const plans = [
    {
      name: 'Starter',
      price: 15,
      features: ['500 URLs/day', '5K keywords', '1 service account', 'Email support'],
      current: false
    },
    {
      name: 'Pro',
      price: 45,
      features: ['2K URLs/day', '15K keywords', '5 service accounts', 'Priority support', 'API access'],
      current: true
    },
    {
      name: 'Enterprise',
      price: 199,
      features: ['Unlimited URLs', 'Unlimited keywords', 'Unlimited accounts', '24/7 support', 'SLA'],
      current: false
    }
  ];

  const invoices = [
    { id: 'INV-2025-003', date: 'Jan 11, 2025', amount: 45.00 },
    { id: 'INV-2024-002', date: 'Dec 11, 2024', amount: 45.00 },
    { id: 'INV-2024-001', date: 'Nov 11, 2024', amount: 45.00 }
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2 bg-blue-600">Current Plan</Badge>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription className="text-gray-700">$45/month • Next billing Feb 11, 2025</CardDescription>
            </div>
            <Button variant="outline" className="bg-white">Manage</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Daily URLs</p>
              <p className="text-2xl text-gray-900 mb-2">156<span className="text-sm text-gray-500">/2K</span></p>
              <Progress value={7.8} className="h-1.5" />
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Keywords</p>
              <p className="text-2xl text-gray-900 mb-2">3.4K<span className="text-sm text-gray-500">/15K</span></p>
              <Progress value={22.8} className="h-1.5" />
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">API Keys</p>
              <p className="text-2xl text-gray-900 mb-2">3<span className="text-sm text-gray-500">/5</span></p>
              <Progress value={60} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="text-gray-900 mb-4">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.current ? 'border-blue-300' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl text-gray-900">${plan.price}</span>
                  <span className="text-sm text-gray-600">/mo</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={plan.current ? 'w-full bg-blue-600 hover:bg-blue-700' : 'w-full'}
                  variant={plan.current ? 'default' : 'outline'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm text-gray-900">{invoice.id}</p>
                      <p className="text-xs text-gray-500">{invoice.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">Paid</Badge>
                      <span className="text-sm text-gray-900 min-w-[60px] text-right">${invoice.amount.toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-8">
                  <div className="w-10 h-7 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-white text-[10px]">VISA</span>
                  </div>
                </div>
                <p className="text-white text-sm mb-1">•••• •••• •••• 4242</p>
                <p className="text-xs text-white/70">Expires 12/2027</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">Update</Button>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>Referral</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-700 mb-3">Get 1 month free per referral</p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Share link</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
