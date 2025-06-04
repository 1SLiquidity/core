import Image from 'next/image'
import { motion } from 'framer-motion'
import Navbar from '../navbar'
import SELSection from '../home/SELSection'
import TradesTable from './TradesTable'

const Instasettle = () => {
  return <HeroSection />
}

export default Instasettle

function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Navbar and SELSection */}
      <Navbar />
      <div className="mt-[60px] mb-10 mx-auto relative z-10 max-w-4xl">
        <TradesTable />
      </div>

      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Image
          src="/heros/gradient-overlay.svg"
          alt="hero background"
          fill
          className="object-cover"
          priority
        />
      </div>

      <motion.div
        className="absolute bottom-[-60%] left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none z-0"
        initial={{ bottom: '-100%', opacity: 0 }}
        animate={{ bottom: '-60%', opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <Image
          src="/heros/circle.svg"
          alt="hero background"
          fill
          className="object-contain object-bottom"
          priority
        />
      </motion.div>

      <div
        className="absolute inset-0 bg-black/50"
        style={{
          WebkitMaskImage: `
            radial-gradient(circle, transparent 20%, white 80%)`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'cover',
          maskImage: `
            radial-gradient(circle, transparent 70%, white 80%)`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'cover',
        }}
      ></div>
    </div>
  )
}
