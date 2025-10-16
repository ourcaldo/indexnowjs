import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';

export function AccountSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline" size="sm">Change photo</Button>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG. Max 2MB</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" defaultValue="Aldo Dwi Krisfen" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="aldodikris@gmail.com" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" placeholder="Optional" />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700">Save changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="current">Current password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button variant="outline">Update password</Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage email preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Marketing emails', desc: 'News, updates, and tips' },
                { label: 'Account activity', desc: 'Login alerts and changes' },
                { label: 'Indexing updates', desc: 'Job completion notifications' },
                { label: 'Weekly reports', desc: 'Summary of account activity' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="space-y-0.5">
                    <Label>{item.label}</Label>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 2} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-900">Active</span>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500">Member since</p>
              <p className="text-sm text-gray-900 mt-1">January 2025</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500">Last login</p>
              <p className="text-sm text-gray-900 mt-1">2 hours ago</p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Two-factor auth</p>
                <p className="text-xs text-gray-500">Enabled</p>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">Permanently delete your account and data</p>
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
