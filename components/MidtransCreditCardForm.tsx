'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreditCardFormData {
  card_number: string
  expiry_month: string
  expiry_year: string
  cvv: string
  cardholder_name: string
}

interface MidtransCreditCardFormProps {
  onSubmit: (cardData: CreditCardFormData) => Promise<void>
  loading?: boolean
  disabled?: boolean
  onCardDataChange?: (cardData: CreditCardFormData, isValid: boolean) => void
}

export default function MidtransCreditCardForm({ 
  onSubmit, 
  loading = false, 
  disabled = false,
  onCardDataChange 
}: MidtransCreditCardFormProps) {
  const [cardData, setCardData] = useState<CreditCardFormData>({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    cardholder_name: ''
  })

  const [errors, setErrors] = useState<Partial<CreditCardFormData>>({})

  // Format card number with spaces every 4 digits
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = cleaned.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return match
    }
  }

  const handleInputChange = (field: keyof CreditCardFormData, value: string) => {
    let formattedValue = value

    if (field === 'card_number') {
      formattedValue = formatCardNumber(value)
    }
    
    const newCardData = { ...cardData, [field]: formattedValue }
    setCardData(newCardData)

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Notify parent component of card data changes
    if (onCardDataChange) {
      const isValid = validateCardData(newCardData)
      onCardDataChange(newCardData, isValid)
    }
  }

  const validateCardData = (data: CreditCardFormData) => {
    const newErrors: Partial<CreditCardFormData> = {}

    // Card number validation
    const cardNumber = data.card_number.replace(/\s+/g, '')
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.card_number = 'Please enter a valid card number'
    }

    // Expiry month validation
    const month = parseInt(data.expiry_month)
    if (!data.expiry_month || month < 1 || month > 12) {
      newErrors.expiry_month = 'Valid month required'
    }

    // Expiry year validation
    const currentYear = new Date().getFullYear()
    const year = parseInt(data.expiry_year)
    if (!data.expiry_year || year < currentYear || year > currentYear + 20) {
      newErrors.expiry_year = 'Valid year required'
    }

    // CVV validation
    if (!data.cvv || data.cvv.length < 3 || data.cvv.length > 4) {
      newErrors.cvv = 'Valid CVV required'
    }

    // Cardholder name validation
    if (!data.cardholder_name.trim()) {
      newErrors.cardholder_name = 'Cardholder name required'
    }

    return Object.keys(newErrors).length === 0
  }

  const validateForm = () => {
    const newErrors: Partial<CreditCardFormData> = {}

    // Card number validation
    const cardNumber = cardData.card_number.replace(/\s+/g, '')
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.card_number = 'Please enter a valid card number'
    }

    // Expiry month validation
    const month = parseInt(cardData.expiry_month)
    if (!cardData.expiry_month || month < 1 || month > 12) {
      newErrors.expiry_month = 'Valid month required'
    }

    // Expiry year validation
    const currentYear = new Date().getFullYear()
    const year = parseInt(cardData.expiry_year)
    if (!cardData.expiry_year || year < currentYear || year > currentYear + 20) {
      newErrors.expiry_year = 'Valid year required'
    }

    // CVV validation
    if (!cardData.cvv || cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      newErrors.cvv = 'Valid CVV required'
    }

    // Cardholder name validation
    if (!cardData.cardholder_name.trim()) {
      newErrors.cardholder_name = 'Cardholder name required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Expose validation and submit for parent component
  const handleExternalSubmit = async () => {
    if (!validateForm()) {
      return false
    }
    
    try {
      await onSubmit(cardData)
      return true
    } catch (error) {
      // Credit card submission error handled by parent component
      return false
    }
  }

  // Expose handleExternalSubmit to parent
  React.useEffect(() => {
    if (window && typeof window === 'object') {
      // @ts-ignore
      window.midtransSubmitCard = handleExternalSubmit
    }
  }, [cardData])

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="card_number" className="text-foreground font-medium">
          Card Number
        </Label>
        <Input
          id="card_number"
          type="text"
          placeholder="1234 5678 9012 3456"
          value={cardData.card_number}
          onChange={(e) => handleInputChange('card_number', e.target.value)}
          className={`border-border focus:border-accent ${
            errors.card_number ? 'border-destructive' : ''
          }`}
          disabled={disabled}
          maxLength={19}
        />
        {errors.card_number && (
          <p className="text-sm text-destructive">{errors.card_number}</p>
        )}
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry_month" className="text-foreground font-medium">
            Month
          </Label>
          <Input
            id="expiry_month"
            type="text"
            placeholder="MM"
            value={cardData.expiry_month}
            onChange={(e) => handleInputChange('expiry_month', e.target.value)}
            className={`border-border focus:border-accent ${
              errors.expiry_month ? 'border-destructive' : ''
            }`}
            disabled={disabled}
            maxLength={2}
          />
          {errors.expiry_month && (
            <p className="text-sm text-destructive">{errors.expiry_month}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry_year" className="text-foreground font-medium">
            Year
          </Label>
          <Input
            id="expiry_year"
            type="text"
            placeholder="YYYY"
            value={cardData.expiry_year}
            onChange={(e) => handleInputChange('expiry_year', e.target.value)}
            className={`border-border focus:border-accent ${
              errors.expiry_year ? 'border-destructive' : ''
            }`}
            disabled={disabled}
            maxLength={4}
          />
          {errors.expiry_year && (
            <p className="text-sm text-destructive">{errors.expiry_year}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvv" className="text-foreground font-medium">
            CVV
          </Label>
          <Input
            id="cvv"
            type="text"
            placeholder="123"
            value={cardData.cvv}
            onChange={(e) => handleInputChange('cvv', e.target.value)}
            className={`border-border focus:border-accent ${
              errors.cvv ? 'border-destructive' : ''
            }`}
            disabled={disabled}
            maxLength={4}
          />
          {errors.cvv && (
            <p className="text-sm text-destructive">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardholder_name" className="text-foreground font-medium">
          Cardholder Name
        </Label>
        <Input
          id="cardholder_name"
          type="text"
          placeholder="Enter name as shown on card"
          value={cardData.cardholder_name}
          onChange={(e) => handleInputChange('cardholder_name', e.target.value)}
          className={`border-border focus:border-accent ${
            errors.cardholder_name ? 'border-destructive' : ''
          }`}
          disabled={disabled}
        />
        {errors.cardholder_name && (
          <p className="text-sm text-destructive">{errors.cardholder_name}</p>
        )}
      </div>

    </div>
  )
}