'use client'

import * as React from 'react'
import * as DrawerPrimitive from 'vaul'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'

import { CheckIcon, CircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ----------------------------------------
DRAWER
---------------------------------------- */

export function Drawer(props) {
  return <DrawerPrimitive.Root {...props} />
}

export function DrawerTrigger(props) {
  return <DrawerPrimitive.Trigger {...props} />
}

export function DrawerPortal(props) {
  return <DrawerPrimitive.Portal {...props} />
}

export function DrawerClose(props) {
  return <DrawerPrimitive.Close {...props} />
}

export function DrawerOverlay({ className, ...props }) {
  return (
    <DrawerPrimitive.Overlay
      className={cn('fixed inset-0 bg-black/50 z-50', className)}
      {...props}
    />
  )
}

export function DrawerContent({ className, children, ...props }) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn('fixed z-50 bg-white flex flex-col', className)}
        {...props}
      >
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

/* ----------------------------------------
DROPDOWN MENU
---------------------------------------- */

export function DropdownMenu(props) {
  return <DropdownMenuPrimitive.Root {...props} />
}

export function DropdownMenuTrigger(props) {
  return <DropdownMenuPrimitive.Trigger {...props} />
}

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'bg-white border rounded-md shadow-md p-1 z-50',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn('flex items-center gap-2 px-2 py-1.5 text-sm', className)}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  children,
  checked,
  ...props
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem checked={checked} {...props}>
      <span className="mr-2">
        <CheckIcon className="w-4 h-4" />
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({ children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem {...props}>
      <span className="mr-2">
        <CircleIcon className="w-3 h-3" />
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

/* ----------------------------------------
LABEL
---------------------------------------- */

export function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  )
}

/* ----------------------------------------
PROGRESS
---------------------------------------- */

export function Progress({ className, value = 0, ...props }) {
  const safeValue = Math.min(100, Math.max(0, value))

  return (
    <ProgressPrimitive.Root
      className={cn('h-2 w-full bg-gray-200 rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-black transition-all"
        style={{
          transform: `translateX(-${100 - safeValue}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  )
}

/* ----------------------------------------
RADIO GROUP
---------------------------------------- */

export function RadioGroup(props) {
  return (
    <RadioGroupPrimitive.Root className="grid gap-3" {...props} />
  )
}

export function RadioGroupItem({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'h-4 w-4 rounded-full border flex items-center justify-center',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator>
        <CircleIcon className="h-2 w-2" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}