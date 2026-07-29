'use client'

import * as React from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'
import { GripVerticalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ----------------------------------------
PANEL GROUP
---------------------------------------- */

export function ResizablePanelGroup({ className, ...props }) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
        className
      )}
      {...props}
    />
  )
}

/* ----------------------------------------
PANEL
---------------------------------------- */

export function ResizablePanel(props) {
  return (
    <ResizablePrimitive.Panel
      data-slot="resizable-panel"
      {...props}
    />
  )
}

/* ----------------------------------------
HANDLE
---------------------------------------- */

export function ResizableHandle({
  className,
  withHandle,
  ...props
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px items-center justify-center bg-border',
        'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="flex h-4 w-3 items-center justify-center rounded border bg-white">
          <GripVerticalIcon className="h-2.5 w-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  )
}