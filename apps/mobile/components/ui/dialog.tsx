import * as React from "react"
import { X } from "lucide-react"

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

const DialogContext = React.createContext<{ onClose?: () => void }>({})

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null

  const handleClose = () => onOpenChange?.(false)

  return (
    <DialogContext.Provider value={{ onClose: handleClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={handleClose}
        />
        <div className="relative">
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )
}
Dialog.displayName = "Dialog"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { onClose } = React.useContext(DialogContext)

  return (
    <div
      ref={ref}
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-h-[90vh] overflow-y-auto ${className || ''}`}
      {...props}
    >
      {/* Close button at top-right corner */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose?.()
        }}
        type="button"
        className="absolute top-2 right-2 z-[9999] rounded-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>
      {children}
    </div>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center justify-end space-x-2 p-6 pt-0 ${className || ''}`}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100 ${className || ''}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className || ''}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
