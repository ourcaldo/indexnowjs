import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface SettingToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between space-x-4">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        data-testid={`toggle-${id}`}
      />
    </div>
  )
}