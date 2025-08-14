// 'use client'

// import { useEffect, useState } from 'react'
// import { useAnimation } from 'framer-motion'
// import { motion, Variants } from 'framer-motion'
// import Navbar from '../navbar'
// import { FireIcon } from '../home/SELSection/HotPair/fire-icon'
// import PairsTable from './pairs-table'
// import TopPairsCarousel from './top-pairs-carousel'
// import VolumeSection from './VolumeSection'
// import SavingsSection from './SavingsSection'
// import WinSection from './WinSection'
// import { HeroBgImage } from './hotpairs-icons'

// const HotPairs = () => {
//   const [volumeAmount, setVolumeAmount] = useState(0)
//   const [invaliVolumeAmount, setInvaliVolumeAmount] = useState(false)
//   const [isFetchingReserves, setIsFetchingReserves] = useState(false)
//   const [savingsAmount, setSavingsAmount] = useState(0)
//   const [invaliSavingsAmount, setInvaliSavingsAmount] = useState(false)
//   const [winAmount, setWinAmount] = useState(0)
//   const [invaliWinAmount, setInvaliWinAmount] = useState(false)

//   const controls = useAnimation()

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
//   return (
//     <>
//       <div className="relative min-h-screen overflow-hidden">
//         <Navbar />

//         <HeroBgImage className="absolute -top-28 right-0 w-full h-full object-cover" />
//         <div className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-6xl">
//           <div className="flex flex-col items-center justify-center gap-2 md:gap-4 md:max-w-6xl w-full mx-auto">
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
//             <div>
//               <motion.h2
//                 className="text-3xl md:text-5xl font-bold text-white text-center"
//                 initial="hidden"
//                 animate={controls}
//                 variants={titleVariants}
//               >
//                 Execute the Hottest High Market Cap / Low Liquidity Trades.
//               </motion.h2>
//               <motion.h2
//                 className="text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-white text-center"
//                 initial="hidden"
//                 animate={controls}
//                 variants={titleVariants}
//               >
//                 Stream with One Click
//               </motion.h2>
//             </div>
//           </div>

//           <TopPairsCarousel />

//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-28">
//             <VolumeSection
//               amount={volumeAmount}
//               setAmount={setVolumeAmount}
//               inValidAmount={false}
//             />
//             <WinSection
//               amount={winAmount}
//               setAmount={setWinAmount}
//               inValidAmount={false}
//             />
//             <SavingsSection
//               amount={savingsAmount}
//               setAmount={setSavingsAmount}
//               inValidAmount={false}
//             />
//           </div>

//           <PairsTable />
//         </div>
//       </div>
//     </>
//   )
// }

// export default HotPairs
