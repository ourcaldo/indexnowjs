import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SettingInputProps {
  id: string
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  readOnly?: boolean
  description?: string
  className?: string
}

export function SettingInput({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  description,
  className
}: SettingInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          'bg-background border-border text-foreground',
          readOnly && 'bg-muted text-muted-foreground cursor-not-allowed',
          className
        )}
        data-testid={`input-${id}`}
      />
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}