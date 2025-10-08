'use client'

import { Building2, Clock, FileText } from 'lucide-react'

interface BankTransferPaymentProps {
  gateway: any
}

export default function BankTransferPayment({ gateway }: BankTransferPaymentProps) {
  if (!gateway.configuration?.bank_name) return null

  return (
    <div className="ml-8 mt-4">
      <div className="p-4 bg-secondary rounded-lg border border-border">
        <div className="flex items-center mb-3">
          <Building2 className="h-5 w-5 text-muted-foreground mr-2" />
          <span className="font-medium text-foreground">Bank Transfer Details</span>
        </div>
        
        <div className="text-sm space-y-3">
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <span className="font-medium text-foreground">Bank:</span>
                <span className="ml-2 text-muted-foreground">{gateway.configuration.bank_name}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Account Name:</span>
                <span className="ml-2 text-muted-foreground">{gateway.configuration.account_name}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Account Number:</span>
                <span className="ml-2 font-mono text-foreground bg-secondary px-2 py-1 rounded">
                  {gateway.configuration.account_number}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Processing time: 1-2 business days
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Payment proof upload required after transfer
            </div>
          </div>

          <div className="bg-warning/10 rounded-lg p-3 mt-3">
            <div className="text-xs text-foreground">
              <span className="font-medium text-warning">Important Instructions:</span>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Transfer the exact amount shown in your order summary</li>
                <li>• Use the order ID as transfer reference</li>
                <li>• Upload payment proof immediately after transfer</li>
                <li>• Account activation will be processed within 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}