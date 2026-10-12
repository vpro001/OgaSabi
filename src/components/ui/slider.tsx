import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Value when not controlled */
  defaultValue?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Label to show on the left */
  label?: string;
  /** Whether to show the value next to the slider */
  showValue?: boolean;
}

export function Slider({
  className,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = false,
  ...props
}: SliderProps) {
  const [value, setValue] = React.useState(defaultValue ?? min);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-baseline gap-2 text-sm font-medium">
          <span>{label}</span>
          {showValue && <span className="text-muted-foreground tabular-nums">{value}</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1"
          {...props}
        />
        {showValue && (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{value}</span>
        )}
      </div>
    </div>
  );
}
