'use client'

import DigitalCustodySection from './components/landing/digital-custody-section'
import FeaturesSection from './components/landing/features-section'
import GatewaySection from './components/landing/gateway-section'
import HeroSection from './components/shared/HeroSection'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black">
      <HeroSection />
      {/* Other Sections */}
      <div className="relative overflow-hidden bg-black z-10">
        <GatewaySection />
        <FeaturesSection />
        <DigitalCustodySection />
      </div>
    </div>
  )
}
