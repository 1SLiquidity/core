'use client'

import { useEffect, useState, useRef } from 'react'
import { useAnimation } from 'framer-motion'
import { motion, Variants, useMotionValue, animate } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Navbar from '../navbar'
import { FireIcon } from '../home/SELSection/HotPair/fire-icon'
import PairsTable from './pairs-table'
import TopPairsCarousel from './top-pairs-carousel'
import VolumeSection from './VolumeSection'
import WinSection from './WinSection'
import { HeroBgImage } from './hotpairs-icons'
import Button from '../button'
import { allPairs, hotPairs } from './pairs-data'

const HotPairs = () => {
  const router = useRouter()
  const [volumeAmount, setVolumeAmount] = useState(0)
  const [invaliVolumeAmount, setInvaliVolumeAmount] = useState(false)
  const [isFetchingReserves, setIsFetchingReserves] = useState(false)
  const [savingsAmount, setSavingsAmount] = useState(0)
  const [invaliSavingsAmount, setInvaliSavingsAmount] = useState(false)
  const [winAmount, setWinAmount] = useState(0)
  const [invaliWinAmount, setInvaliWinAmount] = useState(false)
  const [topHotPairs, setTopHotPairs] = useState(hotPairs)
  const [activeHotPair, setActiveHotPair] = useState<any>(null)
  const [filteredPairsData, setFilteredPairsData] = useState<any[]>([])
  const [volumeActive, setVolumeActive] = useState(true)
  const [winActive, setWinActive] = useState(true)
  const [winLoading, setWinLoading] = useState(false)
  const [volumeLoading, setVolumeLoading] = useState(false)

  const controls = useAnimation()

  // Dynamic height for icons area (from top to cards section)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const [iconsHeight, setIconsHeight] = useState<number>(0)

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !cardsRef.current) return
      const containerTop = containerRef.current.getBoundingClientRect().top
      const cardsTop = cardsRef.current.getBoundingClientRect().top
      const h = Math.max(0, Math.floor(cardsTop - containerTop))
      setIconsHeight(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    controls.start('visible')
  }, [controls])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0,
      },
    },
  }

  const handleActiveHotPair = (pair: any) => {
    setActiveHotPair(pair)
    setVolumeAmount(pair.vol)
    setWinAmount(pair.win)
    setSavingsAmount(pair.save)
    setVolumeActive(true)
    setWinActive(true)

    // Here we'll filter the pairs data based on the active hot pair first token address only

    const filteredPairs = allPairs.filter(
      (p: any) => p.token1Address === pair.token1Address
    )
    setFilteredPairsData(filteredPairs)
  }

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (delayOffset: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        ease: 'easeOut',
        delay: 0.15 + delayOffset,
      },
    }),
  }

  const handleSwitchTokens = () => {
    const newPair = {
      ...activeHotPair,
      icon1: activeHotPair.icon2,
      icon2: activeHotPair.icon1,
      token1Address: activeHotPair.token2Address,
      token2Address: activeHotPair.token1Address,
      token1Symbol: activeHotPair.token2Symbol,
      token2Symbol: activeHotPair.token1Symbol,
    }

    setActiveHotPair(newPair)
  }

  const handleVolumeAmountChange = (amount: number) => {
    setVolumeAmount(amount)
    setWinLoading(true)
    setVolumeLoading(false)

    // After one seond set volume loading to false
    setTimeout(() => {
      setWinLoading(false)
    }, 1000)
  }

  const handleWinAmountChange = (amount: number) => {
    setWinAmount(amount)
    setWinLoading(false)
    setVolumeLoading(true)

    // After one seond set volume loading to false
    setTimeout(() => {
      setVolumeLoading(false)
    }, 1000)
  }

  const handleMainStreamClick = () => {
    if (activeHotPair) {
      // Navigate to swaps page with active token pair as query parameters
      const searchParams = new URLSearchParams({
        from: activeHotPair.token1Symbol,
        to: activeHotPair.token2Symbol,
      })

      router.push(`/swaps?${searchParams.toString()}`)
    }
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />

        <HeroBgImage className="absolute -top-28 right-0 w-full h-full object-cover" />
        <div
          ref={containerRef}
          className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-6xl"
        >
          <div className="flex flex-col items-center justify-center gap-2 md:gap-4 md:max-w-6xl w-full mx-auto mb-10 sm:mb-16">
            <motion.div
              className="flex items-center gap-2"
              initial="hidden"
              animate={controls}
              variants={titleVariants}
            >
              <FireIcon
                className="transition-all duration-300 w-12 h-12"
                isActive={true}
              />
              <h1
                className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent text-center"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #00FF85 0%, #00CCFF 100%)',
                }}
              >
                Hot Pairs
              </h1>
            </motion.div>
            <div>
              <motion.h2
                className="text-3xl md:text-5xl font-bold text-white text-center"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                Execute the Hottest High Market Cap / Low Liquidity Trades.
              </motion.h2>
              <motion.h2
                className="text-3xl md:text-5xl font-bold text-white text-center"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                Stream with One Click
              </motion.h2>
            </div>
          </div>

          {/* Cards section */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0.2}
          >
            <TopPairsCarousel
              topHotPairs={topHotPairs}
              activeHotPair={activeHotPair}
              setActiveHotPair={handleActiveHotPair}
            />
          </motion.div>

          <motion.div
            ref={cardsRef}
            className="flex flex-col items-center gap-8 mt-24 md:mt-32"
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0}
          >
            <div className="flex justify-center items-center gap-6">
              <div className="w-full md:max-w-[25rem] md:min-w-[25rem]">
                <VolumeSection
                  amount={savingsAmount}
                  setAmount={handleVolumeAmountChange}
                  isLoading={volumeLoading}
                  inValidAmount={false}
                  pair={activeHotPair}
                  switchTokens={handleSwitchTokens}
                  clearActiveTokenPair={() => {
                    setActiveHotPair(null)
                    setFilteredPairsData([])
                    setVolumeAmount(0)
                    setWinAmount(0)
                    setSavingsAmount(0)
                    setVolumeActive(false)
                    setWinActive(false)
                  }}
                  active={volumeActive}
                  handleActive={() => {
                    setVolumeActive(true)
                    setWinActive(false)
                  }}
                  disabled={!activeHotPair}
                />
              </div>
              <div className="w-full md:max-w-[25rem] md:min-w-[25rem]">
                <WinSection
                  amount={winAmount}
                  setAmount={handleWinAmountChange}
                  isLoading={winLoading}
                  inValidAmount={false}
                  active={winActive}
                  handleActive={() => {
                    setVolumeActive(false)
                    setWinActive(true)
                  }}
                  disabled={!activeHotPair}
                />
              </div>
            </div>
            <Button
              text="STREAM NOW"
              className="h-12 max-w-14 text-[#40f798]"
              disabled={!activeHotPair}
              onClick={handleMainStreamClick}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            animate={controls}
            variants={sectionVariants}
            custom={0.4}
            className="mt-24 md:mt-36"
          >
            <PairsTable pairsData={filteredPairsData} />
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default HotPairs
