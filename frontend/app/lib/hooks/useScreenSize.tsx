import { useEffect } from 'react'

import { useState } from 'react'

// Custom hook for screen size detection
export const useScreenSize = () => {
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  )

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) {
        setScreenType('mobile')
      } else if (width >= 640 && width < 768) {
        setScreenType('tablet')
      } else {
        setScreenType('desktop')
      }
    }

    // Initial check
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile: screenType === 'mobile',
    isTablet: screenType === 'tablet',
    isDesktop: screenType === 'desktop',
    screenType,
  }
}
