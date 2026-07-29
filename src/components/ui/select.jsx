'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ----------------------------------------
SELECT ROOT
---------------------------------------- */

export function Select(props) {
  return <SelectPrimitive.Root {...props} />
}

export function SelectGroup(props) {
  return <SelectPrimitive.Group {...props} />
}

export function SelectValue(props) {
  return <SelectPrimitive.Value {...props} />
}

/* ----------------------------------------
TRIGGER
---------------------------------------- */

export function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}) {
  return (
    <SelectPrimitive.Trigger
      data-size={size}
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
        'data-[size=sm]:h-8 data-[size=default]:h-9',
        className
      )}
      {...props}
    >
      {children}

      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="h-4 w-4 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/* ----------------------------------------
CONTENT
---------------------------------------- */

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'relative z-50 max-h-96 overflow-auto rounded-md border bg-white shadow-md',
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />

        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>

        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

/* ----------------------------------------
ITEM
---------------------------------------- */

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-default items-center rounded-sm py-1.5 pl-2 pr-8 text-sm',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

/* ----------------------------------------
LABEL + SEPARATOR
---------------------------------------- */

export function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2 py-1.5 text-xs text-gray-500', className)}
      {...props}
    />
  )
}

export function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      className={cn('my-1 h-px bg-gray-200', className)}
      {...props}
    />
  )
}

/* ----------------------------------------
SCROLL BUTTONS
---------------------------------------- */

export function SelectScrollUpButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

export function SelectScrollDownButton({ className, ...props }) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}