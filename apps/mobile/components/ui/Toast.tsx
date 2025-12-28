import React, { useState, useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Info, AlertTriangle, MessageCircle, Bell, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NOTIFICATION_DURATIONS } from '../../constants/notificationDurations';
import type { UserNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { chatApi } from '../../services/chatApi';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  userName?: string;
  userAvatar?: string;
  channelName?: string; // Channel name to display after username (e.g., "@ general")
  hideIcon?: boolean; // Hide the icon (useful when message has emoji)
  channelId?: string; // Channel/DM ID to navigate to when clicked
}

/**
 * Get default duration based on toast type
 */
function getDefaultDuration(type: 'success' | 'error' | 'warning' | 'info'): number {
  switch (type) {
    case 'error':
      return NOTIFICATION_DURATIONS.CRITICAL; // 30 minutes for errors (testing/debugging)
    case 'warning':
      return NOTIFICATION_DURATIONS.HIGH; // 15 seconds for warnings
    case 'info':
      return NOTIFICATION_DURATIONS.MEDIUM; // 8 seconds for info
    case 'success':
    default:
      return NOTIFICATION_DURATIONS.LOW; // 5 seconds for success
  }
}

/**
 * SecureToastImage Component
 * Handles loading images from private storage using signed URLs
 *
 * CRITICAL: This component is REQUIRED for displaying images in toast notifications.
 * DO NOT replace with a regular <img> tag - Supabase storage URLs require authentication.
 *
 * This component:
 * 1. Calls chatApi.getFileSignedUrl() to get authenticated access
 * 2. Fetches the image as a blob
 * 3. Creates an object URL for display
 * 4. Properly cleans up object URLs on unmount
 * 5. Shows loading spinner while fetching
 * 6. Shows error state if loading fails
 */
const SecureToastImage: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        console.log('🖼️ [ToastImage] Attempting to load image:', imageUrl);

        // Get signed URL
        const signedUrl = await chatApi.getFileSignedUrl(imageUrl);
        console.log('✅ [ToastImage] Got signed URL:', signedUrl);

        // Fetch image as blob
        const response = await fetch(signedUrl);
        console.log('📥 [ToastImage] Fetch response status:', response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log('✅ [ToastImage] Got blob, size:', blob.size, 'type:', blob.type);

        objectUrl = URL.createObjectURL(blob);
        console.log('✅ [ToastImage] Created object URL:', objectUrl);

        if (mounted) {
          setBlobUrl(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ [ToastImage] Failed to load toast image:', err);
        console.error('❌ [ToastImage] Image URL was:', imageUrl);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    // Cleanup function to revoke object URL when component unmounts
    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12 w-12 bg-gray-100 rounded border border-gray-300">
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center justify-center h-12 w-12 bg-gray-100 rounded border border-gray-300">
        <p className="text-xs text-gray-500">Failed</p>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt="Attachment"
      className="h-12 w-auto rounded border border-gray-300 object-cover cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => {
        // Open image in new tab when clicked
        window.open(imageUrl, '_blank');
      }}
    />
  );
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration,
  onClose,
  userName,
  userAvatar,
  channelName,
  hideIcon = false,
  channelId
}) => {
  const navigate = useNavigate();
  const toastDuration = duration ?? getDefaultDuration(type);
  const [isVisible, setIsVisible] = useState(true);

  // Handle click on toast - navigate to channel/DM
  const handleToastClick = () => {
    if (channelId) {
      console.log('🔔 Toast clicked, navigating to channel:', channelId);
      navigate(`/chat/${channelId}`);
      // Close the toast after navigation
      setIsVisible(false);
      setTimeout(onClose, 300);
    }
  };

  // Extract image URLs from message
  const parseMessageForImages = (text: string): { text: string; imageUrl?: string } => {
    // First check for markdown image syntax: ![alt](url)
    const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/;
    const markdownMatch = text.match(markdownImagePattern);

    if (markdownMatch) {
      const imageUrl = markdownMatch[2];
      // Remove the entire markdown image syntax from text
      const cleanedText = text.replace(markdownMatch[0], '').trim();
      return { text: cleanedText, imageUrl };
    }

    // Match common image URL patterns - greedy to capture full URL
    const imageUrlPattern = /(https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|webp|svg))/i;
    const urlMatch = text.match(imageUrlPattern);

    if (urlMatch) {
      const imageUrl = urlMatch[1];
      // Remove the URL from the text
      const cleanedText = text.replace(imageUrl, '').trim();
      return { text: cleanedText, imageUrl };
    }

    // Also check for Supabase storage URLs (might not have file extension)
    // Match full URL including any path after /storage/
    const supabasePattern = /(https?:\/\/[^\s)]*supabase[^\s)]*\/storage\/v1\/object\/public\/[^\s)]+)/i;
    const supabaseMatch = text.match(supabasePattern);

    if (supabaseMatch) {
      const imageUrl = supabaseMatch[1];
      const cleanedText = text.replace(imageUrl, '').trim();
      return { text: cleanedText, imageUrl };
    }

    return { text };
  };

  const { text: displayText, imageUrl } = parseMessageForImages(message);

  // Track remaining time for the toast - pause when tab is hidden
  const remainingTimeRef = React.useRef(toastDuration);
  const startTimeRef = React.useRef(Date.now());
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTimer = () => {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow fade out animation
      }, remainingTimeRef.current);
    };

    const pauseTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        // Calculate how much time was remaining
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer();
      } else {
        // Only restart if there's time remaining
        if (remainingTimeRef.current > 0) {
          startTimer();
        }
      }
    };

    // Start the timer initially
    startTimer();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toastDuration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'info':
      default:
        // Use MessageCircle with vibrant rainbow gradient for chat notifications when userName is provided
        if (userName) {
          return (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF0080" />
                  <stop offset="20%" stopColor="#FF8C00" />
                  <stop offset="40%" stopColor="#FFD700" />
                  <stop offset="60%" stopColor="#00FF00" />
                  <stop offset="80%" stopColor="#00BFFF" />
                  <stop offset="100%" stopColor="#8A2BE2" />
                </linearGradient>
              </defs>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="url(#rainbow-gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none" />
            </svg>
          );
        }
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`
      max-w-sm w-full transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div
        className={`
          border rounded-lg shadow-lg
          ${getColors()}
          ${channelId ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
        `}
        onClick={handleToastClick}
      >
        {/* Header row: Icon, User info, Notify label, Close button */}
        <div className="flex items-center p-2 pb-1">
          {/* Icon on the left */}
          {!hideIcon && (
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
          )}

          {/* User info */}
          {userName && userAvatar && (
            <div className={`${hideIcon ? '' : 'ml-2'} flex items-center flex-1 min-w-0`}>
              <img
                src={userAvatar}
                alt={userName}
                className="h-5 w-5 rounded-full mr-2 flex-shrink-0"
              />
              <p className="text-sm font-semibold truncate">
                {userName}
                {channelName && (
                  <span className="text-gray-500 font-normal ml-1">
                    @ {channelName}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Spacer if no user info */}
          {!(userName && userAvatar) && (
            <div className="flex-1"></div>
          )}

          {/* Notify label with toast/bread icon */}
          <div className="flex items-center ml-2 flex-shrink-0 gap-0.5">
            {/* Toast/Bread slice icon - wider with mushroom-shaped top */}
            <svg className="h-4 w-7 text-gray-600" viewBox="0 0 28 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer toast outline - wide mushroom top, straight sides */}
              <path d="M 4 9 C 4 5, 6 2, 9 2 L 19 2 C 22 2, 24 5, 24 9 L 24 20 C 24 21.5, 23 22, 21.5 22 L 6.5 22 C 5 22, 4 21.5, 4 20 Z"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"/>
              {/* Inner crust line - wider mushroom curve */}
              <path d="M 6.5 9 C 6.5 6, 8 4, 14 4 C 20 4, 21.5 6, 21.5 9"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"/>
              {/* Shine marks (diagonal lines) */}
              <line x1="11" y1="11" x2="12.5" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="15.5" y1="13" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-xs text-gray-500 mr-2">Notify</span>
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent navigation when clicking close button
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message row - full width underneath */}
        <div className="px-2 pb-2">
          <p className="text-sm font-medium break-words">
            {displayText}
          </p>
          {/* Display small image thumbnail if found in message */}
          {imageUrl && (
            <div className="mt-1.5">
              <SecureToastImage imageUrl={imageUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  userName?: string;
  userAvatar?: string;
  channelName?: string;
  hideIcon?: boolean;
  channelId?: string;
  messageId?: string; // For chat message toasts - used to dedupe across tabs
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const TOAST_STORAGE_KEY = 'active_message_toasts';

  const removeToast = (id: string) => {
    console.log('[Toast Cross-Tab] Removing toast:', id);
    setToasts(prev => prev.filter(toast => toast.id !== id));

    // Remove from localStorage to notify other tabs (store FULL toast data, not just IDs)
    const activeToasts: ToastMessage[] = JSON.parse(localStorage.getItem(TOAST_STORAGE_KEY) || '[]');
    const updatedToasts = activeToasts.filter((toast) => toast.id !== id);
    localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(updatedToasts));
    console.log('[Toast Cross-Tab] Updated localStorage, active toasts:', updatedToasts.length);
  };

  // Global toast function - always show toasts (DND feature removed)
  // messageId is used for chat notifications to dedupe across tabs (same message = same toast)
  window.showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration?: number, userName?: string, userAvatar?: string, channelName?: string, hideIcon?: boolean, channelId?: string, messageId?: string) => {
    // Use messageId as toast ID if provided (for deduplication), otherwise generate unique ID
    const id = messageId || (Date.now().toString() + Math.random().toString(36).substring(2, 9));

    // Check if toast with this ID already exists (prevents duplicates across tabs)
    const activeToasts: ToastMessage[] = JSON.parse(localStorage.getItem(TOAST_STORAGE_KEY) || '[]');
    if (activeToasts.some(t => t.id === id)) {
      console.log('[Toast Cross-Tab] Skipping duplicate toast:', id);
      return;
    }

    const newToast: ToastMessage = { id, message, type, duration, userName, userAvatar, channelName, hideIcon, channelId, messageId };

    console.log('[Toast Cross-Tab] Creating new toast:', id);
    setToasts(prev => {
      // Also check local state for duplicates
      if (prev.some(t => t.id === id)) {
        console.log('[Toast Cross-Tab] Toast already exists locally:', id);
        return prev;
      }
      return [...prev, newToast];
    });

    // Store FULL toast data in localStorage to broadcast to other tabs
    activeToasts.push(newToast);
    localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(activeToasts));
    console.log('[Toast Cross-Tab] Toast broadcasted to all tabs:', id);
  };

  const clearAllToasts = () => {
    console.log('[Toast Cross-Tab] Clearing all toasts');
    setToasts([]);
    // Clear localStorage to notify other tabs
    localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify([]));
  };

  // Listen for localStorage changes from other tabs (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TOAST_STORAGE_KEY) {
        const newActiveToasts: ToastMessage[] = JSON.parse(event.newValue || '[]');
        const oldActiveToasts: ToastMessage[] = JSON.parse(event.oldValue || '[]');

        console.log('[Toast Cross-Tab] Storage event detected:', {
          oldCount: oldActiveToasts.length,
          newCount: newActiveToasts.length
        });

        // Find which toasts were ADDED (exist in new but not in old)
        const addedToasts = newActiveToasts.filter(
          (newToast) => !oldActiveToasts.find((oldToast) => oldToast.id === newToast.id)
        );

        if (addedToasts.length > 0) {
          console.log('[Toast Cross-Tab] Other tab added toasts:', addedToasts.map(t => t.id));
          // Add these toasts to current tab (avoid duplicates)
          setToasts(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const toastsToAdd = addedToasts.filter(t => !existingIds.has(t.id));
            return [...prev, ...toastsToAdd];
          });
        }

        // Find which toasts were REMOVED (exist in old but not in new)
        const removedToasts = oldActiveToasts.filter(
          (oldToast) => !newActiveToasts.find((newToast) => newToast.id === oldToast.id)
        );

        if (removedToasts.length > 0) {
          console.log('[Toast Cross-Tab] Other tab removed toasts:', removedToasts.map(t => t.id));
          // Remove these toasts from current tab
          setToasts(prev => prev.filter(toast => !removedToasts.find(removed => removed.id === toast.id)));
        }

        // If all toasts were cleared
        if (newActiveToasts.length === 0 && oldActiveToasts.length > 0) {
          console.log('[Toast Cross-Tab] Other tab cleared all toasts');
          setToasts([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    console.log('[Toast Cross-Tab] Storage listener registered');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      console.log('[Toast Cross-Tab] Storage listener removed');
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50 pointer-events-none">
      {toasts.length > 1 && (
        <div className="pointer-events-auto flex justify-end mb-2">
          <button
            onClick={clearAllToasts}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md shadow-lg transition-colors duration-150"
          >
            Clear All Notifications
          </button>
        </div>
      )}
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            userName={toast.userName}
            userAvatar={toast.userAvatar}
            channelName={toast.channelName}
            hideIcon={toast.hideIcon}
            channelId={toast.channelId}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number, userName?: string, userAvatar?: string, channelName?: string, hideIcon?: boolean, channelId?: string, messageId?: string) => void;
    closeToastByMessageId?: (messageId: string) => void;
  }
}