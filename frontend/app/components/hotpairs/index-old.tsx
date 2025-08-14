// 'use client'

// import { useEffect, useState, useRef } from 'react'
// import { useAnimation } from 'framer-motion'
// import { motion, Variants, useMotionValue, animate } from 'framer-motion'
// import Navbar from '../navbar'
// import { FireIcon } from '../home/SELSection/HotPair/fire-icon'
// import PairsTable from './pairs-table'
// import TopPairsCarousel from './top-pairs-carousel'
// import VolumeSection from './VolumeSection'
// import SavingsSection from './SavingsSection'
// import WinSection from './WinSection'
// import {
//   HeroBgImage,
//   UsdcIcon,
//   UsdtIcon,
//   WethIcon,
//   BnbIcon,
// } from './hotpairs-icons'

// type Pair = { id: number; label: string; A: any; B: any }

// const PAIRS: Pair[] = [
//   { id: 1, label: 'USDC-USDT', A: UsdcIcon, B: UsdtIcon },
//   { id: 2, label: 'USDT-WETH', A: UsdtIcon, B: WethIcon },
//   { id: 3, label: 'WETH-USDC', A: WethIcon, B: UsdcIcon },
//   { id: 4, label: 'USDT-BNB', A: UsdtIcon, B: BnbIcon },
//   // repeat to create a fuller cloud
//   { id: 5, label: 'USDC-USDT', A: UsdcIcon, B: UsdtIcon },
//   { id: 6, label: 'USDT-WETH', A: UsdtIcon, B: WethIcon },
//   { id: 7, label: 'WETH-USDC', A: WethIcon, B: UsdcIcon },
//   { id: 8, label: 'USDT-BNB', A: UsdtIcon, B: BnbIcon },
// ]

// const FloatingPair = ({
//   pair,
//   wrapperHeight,
//   leftPercent,
//   anchorPercent,
//   startDown,
// }: {
//   pair: Pair
//   wrapperHeight?: number
//   leftPercent: number // 0..100
//   anchorPercent: number // 0..1
//   startDown: boolean
// }) => {
//   const [paused, setPaused] = useState(false)
//   const pausedRef = useRef(false)
//   const [hovered, setHovered] = useState(false)

//   // Fixed small vertical oscillation around anchor, resumes from current position
//   const y = useMotionValue(0)
//   const [ay, setAy] = useState<ReturnType<typeof animate> | null>(null)
//   const [amplitude] = useState(() => Math.random() * 24 + 16) // 16–40px (up)
//   const [baseDuration] = useState(() => Math.random() * 4 + 4) // 4–8s full swing

//   // Compute downward allowance to avoid touching the cards edge
//   const computeDownAmp = () => {
//     if (!wrapperHeight || wrapperHeight <= 0) return amplitude
//     const bottomPadding = 96 // extra gap to avoid touching the cut edge
//     const iconHalf = 40 // approximate icon half size + blur/shadow
//     const anchorPx = wrapperHeight * Math.max(0, Math.min(1, anchorPercent))
//     const maxDown = wrapperHeight - bottomPadding - iconHalf - anchorPx
//     // Soften downward travel a bit to keep a comfortable margin
//     return Math.max(0, Math.min(amplitude * 0.7, maxDown))
//   }

//   const loopDrift = () => {
//     const downAmp = computeDownAmp()
//     const current = y.get()
//     const nextUp = -amplitude
//     const nextDown = downAmp
//     // If no room downward, always go up
//     const target = downAmp <= 0 ? nextUp : current >= 0 ? nextUp : nextDown
//     const distance = Math.max(1, Math.abs(target - current))
//     const fullSpan = Math.max(1, amplitude + downAmp)
//     const ratio = Math.min(1, distance / fullSpan)
//     const duration = Math.max(0.18, baseDuration * ratio)

//     const anim = animate(y, target, {
//       duration,
//       ease: 'easeInOut',
//       onComplete: () => {
//         if (!pausedRef.current) loopDrift()
//       },
//     })
//     setAy(anim)
//   }

//   const startDrift = () => {
//     pausedRef.current = false
//     loopDrift()
//   }

//   const stopDrift = () => {
//     pausedRef.current = true
//     ay?.stop()
//   }

//   useEffect(() => {
//     // seed direction so top row moves down first, bottom row up first
//     y.set(startDown ? -1 : 1)
//     startDrift()
//     return () => stopDrift()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   const A = pair.A
//   const B = pair.B

//   return (
//     <motion.div
//       className="absolute will-change-transform pointer-events-auto"
//       style={{
//         top: `${anchorPercent * 100}%`,
//         left: `${leftPercent}%`,
//         y,
//         zIndex: hovered ? 30 : 1,
//         filter: paused ? 'blur(0px)' : 'blur(6px)',
//         transition: 'filter 0.25s ease',
//       }}
//       onMouseEnter={() => {
//         setHovered(true)
//         setPaused(true)
//         stopDrift()
//       }}
//       onMouseLeave={() => {
//         setHovered(false)
//         setPaused(false)
//         startDrift()
//       }}
//       onClick={() => {
//         // eslint-disable-next-line no-console
//         console.log('pair:', pair.label)
//       }}
//     >
//       <div className="flex items-center transition-all duration-300 group cursor-pointer">
//         <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 border-[#827a7a33] bg-black/30 overflow-hidden z-10">
//           <A className="w-full h-full" />
//         </div>
//         <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 bg-black/30 overflow-hidden">
//           <B className="w-full h-full" />
//         </div>
//       </div>
//     </motion.div>
//   )
// }

// const HotPairs = () => {
//   const [volumeAmount, setVolumeAmount] = useState(0)
//   const [invaliVolumeAmount, setInvaliVolumeAmount] = useState(false)
//   const [isFetchingReserves, setIsFetchingReserves] = useState(false)
//   const [savingsAmount, setSavingsAmount] = useState(0)
//   const [invaliSavingsAmount, setInvaliSavingsAmount] = useState(false)
//   const [winAmount, setWinAmount] = useState(0)
//   const [invaliWinAmount, setInvaliWinAmount] = useState(false)

//   const controls = useAnimation()

//   // Dynamic height for icons area (from top to cards section)
//   const containerRef = useRef<HTMLDivElement | null>(null)
//   const cardsRef = useRef<HTMLDivElement | null>(null)
//   const [iconsHeight, setIconsHeight] = useState<number>(0)

//   useEffect(() => {
//     const measure = () => {
//       if (!containerRef.current || !cardsRef.current) return
//       const containerTop = containerRef.current.getBoundingClientRect().top
//       const cardsTop = cardsRef.current.getBoundingClientRect().top
//       const h = Math.max(0, Math.floor(cardsTop - containerTop))
//       setIconsHeight(h)
//     }
//     measure()
//     window.addEventListener('resize', measure)
//     return () => window.removeEventListener('resize', measure)
//   }, [])

//   useEffect(() => {
//     controls.start('visible')
//   }, [controls])

//   const titleVariants: Variants = {
//     hidden: { opacity: 0, y: 30 },
//     visible: {
//       opacity: 1,
//       y: 0,
//       transition: {
//         duration: 0.3,
//         ease: 'easeOut',
//         delay: 0,
//       },
//     },
//   }

//   const sectionVariants: Variants = {
//     hidden: { opacity: 0, y: 20 },
//     visible: (delayOffset: number = 0) => ({
//       opacity: 1,
//       y: 0,
//       transition: {
//         duration: 0.35,
//         ease: 'easeOut',
//         delay: 0.15 + delayOffset,
//       },
//     }),
//   }
//   return (
//     <>
//       <div className="relative min-h-screen overflow-hidden">
//         <Navbar />

//         <HeroBgImage className="absolute -top-28 right-0 w-full h-full object-cover" />
//         <div
//           ref={containerRef}
//           className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 w-full"
//         >
//           <div className="flex flex-col items-center justify-center gap-2 md:gap-4 md:max-w-4xl w-full mx-auto">
//             <motion.div
//               className="flex items-center gap-2"
//               initial="hidden"
//               animate={controls}
//               variants={titleVariants}
//             >
//               <FireIcon
//                 className="transition-all duration-300 w-12 h-12"
//                 isActive={true}
//               />
//               <h1
//                 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent text-center"
//                 style={{
//                   backgroundImage:
//                     'linear-gradient(90deg, #00FF85 0%, #00CCFF 100%)',
//                 }}
//               >
//                 Hot Pairs
//               </h1>
//             </motion.div>
//             <motion.h2
//               className="text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-white text-center"
//               initial="hidden"
//               animate={controls}
//               variants={titleVariants}
//             >
//               Peer-to-Peer OTC Trades. Beat Market Prices. Instantly.
//             </motion.h2>
//           </div>

//           {/* This should be div where icons will move */}
//           <div
//             className="relative overflow-hidden z-0"
//             style={{ height: iconsHeight ? `${iconsHeight}px` : undefined }}
//           >
//             <div className="absolute inset-0">
//               {PAIRS.map((pair, idx) => {
//                 const count = PAIRS.length
//                 const pad = 8 // percent side padding
//                 const left =
//                   count > 1 ? pad + (idx * (100 - pad * 2)) / (count - 1) : 50
//                 const isTop = idx % 2 === 1 // alternate: bottom then top
//                 const anchor = isTop ? 0.22 : 0.6
//                 return (
//                   <FloatingPair
//                     key={pair.id}
//                     pair={pair}
//                     wrapperHeight={iconsHeight}
//                     leftPercent={left}
//                     anchorPercent={anchor}
//                     startDown={isTop}
//                   />
//                 )
//               })}
//             </div>
//           </div>

//           {/* Cards section */}
//           <div className="w-full md:max-w-6xl mx-auto mt-10">
//             <motion.div
//               ref={cardsRef}
//               className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-28"
//               initial="hidden"
//               animate={controls}
//               variants={sectionVariants}
//               custom={0}
//             >
//               <VolumeSection
//                 amount={volumeAmount}
//                 setAmount={setVolumeAmount}
//                 inValidAmount={false}
//               />
//               <WinSection
//                 amount={winAmount}
//                 setAmount={setWinAmount}
//                 inValidAmount={false}
//               />
//               <SavingsSection
//                 amount={savingsAmount}
//                 setAmount={setSavingsAmount}
//                 inValidAmount={false}
//               />
//             </motion.div>

//             <motion.div
//               initial="hidden"
//               animate={controls}
//               variants={sectionVariants}
//               custom={0.2}
//             >
//               <TopPairsCarousel />
//             </motion.div>
//             <motion.div
//               initial="hidden"
//               animate={controls}
//               variants={sectionVariants}
//               custom={0.4}
//             >
//               <PairsTable />
//             </motion.div>
//           </div>
//         </div>
//       </div>
//     </>
//   )
// }

// export default HotPairs
