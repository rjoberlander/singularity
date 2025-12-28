import { useState, useEffect, useCallback, useRef } from 'react'

interface UseUnsavedChangesOptions {
  onBeforeUnload?: (e: BeforeUnloadEvent) => void
  warningMessage?: string
}

interface ChangeTracker {
  [key: string]: any
}

export function useUnsavedChanges(options: UseUnsavedChangesOptions = {}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isNavigationBlocked, setIsNavigationBlocked] = useState(false)
  const originalValues = useRef<ChangeTracker>({})
  const currentValues = useRef<ChangeTracker>({})
  
  const warningMessage = options.warningMessage || 'You have unsaved changes that will be lost if you continue.'

  // Track changes for specific fields
  const trackChanges = useCallback((fieldName: string, value: any, originalValue?: any) => {
    // Set original value if provided and not already set
    if (originalValue !== undefined && !(fieldName in originalValues.current)) {
      originalValues.current[fieldName] = originalValue
    }
    
    // Update current value
    currentValues.current[fieldName] = value
    
    // Check if any field has changes
    const hasChanges = Object.keys(currentValues.current).some(key => {
      const original = originalValues.current[key]
      const current = currentValues.current[key]
      
      // Handle arrays (like issue records)
      if (Array.isArray(original) && Array.isArray(current)) {
        return JSON.stringify(original) !== JSON.stringify(current)
      }
      
      // Handle objects
      if (typeof original === 'object' && typeof current === 'object' && original !== null && current !== null) {
        return JSON.stringify(original) !== JSON.stringify(current)
      }
      
      // Handle primitives
      return original !== current
    })
    
    setHasUnsavedChanges(hasChanges)
  }, [])

  // Reset all tracking
  const resetChanges = useCallback(() => {
    originalValues.current = {}
    currentValues.current = {}
    setHasUnsavedChanges(false)
    setIsNavigationBlocked(false)
  }, [])

  // Initialize tracking for multiple fields
  const initializeTracking = useCallback((initialValues: ChangeTracker) => {
    originalValues.current = { ...initialValues }
    currentValues.current = { ...initialValues }
    setHasUnsavedChanges(false)
  }, [])

  // Manually set unsaved changes state
  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges)
  }, [])

  // Get current values for saving
  const getCurrentValues = useCallback(() => {
    return { ...currentValues.current }
  }, [])

  // Update original values after successful save
  const updateOriginalValues = useCallback(() => {
    originalValues.current = { ...currentValues.current }
    setHasUnsavedChanges(false)
  }, [])

  // Block navigation when editing
  const blockNavigation = useCallback((block: boolean) => {
    setIsNavigationBlocked(block)
  }, [])

  // Handle browser navigation (refresh, back button, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isNavigationBlocked) {
        e.preventDefault()
        e.returnValue = warningMessage
        if (options.onBeforeUnload) {
          options.onBeforeUnload(e)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isNavigationBlocked, warningMessage, options])

  return {
    hasUnsavedChanges,
    isNavigationBlocked,
    trackChanges,
    resetChanges,
    initializeTracking,
    setUnsavedChanges,
    getCurrentValues,
    updateOriginalValues,
    blockNavigation,
    warningMessage
  }
}