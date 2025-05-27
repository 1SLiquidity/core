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
          // Only trigger refresh exactly at 0
          if (prev === 0) {
            if (!isCalculating && !isRefreshingRef.current) {
              isRefreshingRef.current = true
              onRefresh()
              // Reset after a short delay to ensure smooth transition
              setTimeout(() => {
                isRefreshingRef.current = false
                setTimeRemaining(duration)
              }, 100)
            }
            return 0
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
    if (!isRefreshingRef.current) {
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
