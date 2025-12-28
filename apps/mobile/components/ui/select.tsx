import * as React from "react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, value, ...props }, ref) => {
    // Extract only SelectItem children (option elements) from children
    // Filter out SelectTrigger, SelectValue, and unwrap SelectContent
    let options: React.ReactNode[] = [];

    React.Children.forEach(children, (child: any) => {
      if (!child) return;

      // Skip SelectTrigger and SelectValue
      if (child?.type?.displayName === 'SelectTrigger' || child?.type?.displayName === 'SelectValue') {
        return;
      }

      // If it's SelectContent, extract its children
      if (child?.type?.displayName === 'SelectContent') {
        const contentChildren = React.Children.toArray(child.props.children);
        options = options.concat(contentChildren);
      }
      // Keep SelectItem and option elements
      else if (child?.type?.displayName === 'SelectItem' || child?.type === 'option') {
        options.push(child);
      }
    });

    return (
      <select
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${className || ''}`}
        ref={ref}
        value={value}
        onChange={(e) => {
          if (onValueChange) {
            onValueChange(e.target.value)
          }
          props.onChange?.(e)
        }}
        {...props}
      >
        {options}
      </select>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-background placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={className}
      {...props}
    >
      {placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, children, ...props }, ref) => {
  return (
    <option
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </option>
  )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
