import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CheckoutForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  description: string
  payment_method: string
}

interface CheckoutFormProps {
  form: CheckoutForm
  setForm: React.Dispatch<React.SetStateAction<CheckoutForm>>
}

export const CheckoutFormComponent = ({ form, setForm }: CheckoutFormProps) => {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Personal & Billing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-foreground border-b border-border pb-2">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-sm font-medium text-foreground">
                First Name *
              </Label>
              <Input
                id="first_name"
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                className="mt-1"
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name" className="text-sm font-medium text-foreground">
                Last Name
              </Label>
              <Input
                id="last_name"
                type="text"
                value={form.last_name}
                onChange={(e) => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                className="mt-1"
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-foreground border-b border-border pb-2">
            Billing Address
          </h3>
          <div>
            <Label htmlFor="address" className="text-sm font-medium text-foreground">
              Street Address
            </Label>
            <Input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1"
              placeholder="Enter your street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm font-medium text-foreground">
                City
              </Label>
              <Input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1"
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-sm font-medium text-foreground">
                State/Province
              </Label>
              <Input
                id="state"
                type="text"
                value={form.state}
                onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                className="mt-1"
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="zip_code" className="text-sm font-medium text-foreground">
                ZIP Code
              </Label>
              <Input
                id="zip_code"
                type="text"
                value={form.zip_code}
                onChange={(e) => setForm(prev => ({ ...prev, zip_code: e.target.value }))}
                className="mt-1"
                placeholder="ZIP"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="country" className="text-sm font-medium text-foreground">
              Country
            </Label>
            <Select 
              value={form.country} 
              onValueChange={(value) => setForm(prev => ({ ...prev, country: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Indonesia">Indonesia</SelectItem>
                <SelectItem value="Malaysia">Malaysia</SelectItem>
                <SelectItem value="Singapore">Singapore</SelectItem>
                <SelectItem value="Thailand">Thailand</SelectItem>
                <SelectItem value="Philippines">Philippines</SelectItem>
                <SelectItem value="Vietnam">Vietnam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}