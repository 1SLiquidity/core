import SELSection from '../components/home/SELSection'
import Navbar from '../components/navbar'
import Image from 'next/image'
import GatewaySection from '../components/landing/gateway-section'
import FeaturesSection from '../components/landing/features-section'
import DigitalCustodySection from '../components/landing/digital-custody-section'
// import Hero1 from '../images/hero1'

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Background Images - Positioned at top-left and bottom-right */}
      {/* <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2">
          <Image
            src="/heros/hero1.svg"
            alt="hero1 background"
            fill
            className="object-contain object-left-top"
            priority
          />
        </div>

        <div className="absolute bottom-0 right-0 w-1/2 h-1/2">
          <Image
            src="/heros/hero2.svg"
            alt="hero2 background"
            fill
            className="object-contain object-right-bottom"
            priority
          />
        </div>
      </div> */}

      <Navbar />

      <div className="mt-[110px] mb-10 mx-auto w-fit relative z-10">
        <SELSection />
      </div>

      {/* Gateway Section */}
      <GatewaySection />

      <FeaturesSection />

      <DigitalCustodySection />
    </div>
  )
}
