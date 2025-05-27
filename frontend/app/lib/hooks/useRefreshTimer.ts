import { useEffect, useRef, useState } from 'react'

interface UseRefreshTimerProps {
  duration: number
  onRefresh: () => void
  isActive: boolean
  sellAmount: number
  isCalculating: boolean
}

export const useRefreshTimer = ({
  duration,
  onRefresh,
  isActive,
  sellAmount,
  isCalculating,
}: UseRefreshTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [timerActive, setTimerActive] = useState(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const prevSellAmountRef = useRef(sellAmount)
  const isRefreshingRef = useRef(false)

  // Set timer active state based on conditions
  useEffect(() => {
    if (isActive) {
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [isActive])

  // Handle timer countdown and refresh
  useEffect(() => {
    if (!isActive || isRefreshingRef.current) {
      return
    }

    const startTimer = () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }

      setTimeRemaining(duration)

      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          // If we're calculating and timer hits zero, just stay at zero
          // without triggering a refresh
          if (prev === 0 && isCalculating) {
            return 0
          }

          // Only trigger refresh at zero if we're not calculating
          if (prev === 0) {
            if (!isCalculating && !isRefreshingRef.current) {
              isRefreshingRef.current = true
              onRefresh()
              // Reset after refresh is done
              setTimeout(() => {
                isRefreshingRef.current = false
                if (!isCalculating) {
                  setTimeRemaining(duration)
                }
              }, 100)
            }
            return 0
          }

          // If we're calculating, pause the countdown
          if (isCalculating) {
            return prev
          }

          return prev - 1
        })
      }, 1000)
    }

    startTimer()

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [duration, onRefresh, isActive, isCalculating])

  // Handle sell amount changes
  useEffect(() => {
    if (
      sellAmount !== prevSellAmountRef.current &&
      isActive &&
      !isCalculating &&
      !isRefreshingRef.current
    ) {
      prevSellAmountRef.current = sellAmount
      setTimeRemaining(duration)
    }
  }, [sellAmount, duration, isActive, isCalculating])

  const resetTimer = () => {
    if (!isRefreshingRef.current && !isCalculating) {
      setTimeRemaining(duration)
      onRefresh()
    }
  }

  return {
    timeRemaining,
    timerActive,
    resetTimer,
  }
}
