'use client'
import React from 'react'
import { cn } from './Tooltip'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[]
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "appearance-none bg-bg-surface border border-border text-text-primary rounded px-3 py-1.5 pr-8 focus:outline-none focus:border-accent transition-colors duration-150 cursor-pointer text-sm",
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-bg-surface">
          {opt.label}
        </option>
      ))}
    </select>
  )
}
