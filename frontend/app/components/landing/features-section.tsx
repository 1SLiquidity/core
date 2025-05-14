'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'
import { Wallet, Blocks, Headset, Shield } from 'lucide-react'

const FeaturesSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, {
    amount: 0.3,
    once: false, // This will make animations trigger every time the section comes into view
  })
  const controls = useAnimation()

  // Move animation control logic to useEffect
  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  // Animation variants
  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  }

  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2,
        ease: 'easeOut',
      },
    },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: delay,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
      },
    }),
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  }

  const iconVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  }

  // Feature cards data
  const features = [
    {
      icon: <Wallet size={24} />,
      title: 'A NEW WALLET STANDARD',
      description:
        'DECASWAP is the first interface to use multi-factor wallets. Connect your wallet easily and securely.',
      delay: 0.3,
    },
    {
      icon: <Blocks size={24} />,
      title: 'FULL FUNCTIONALITY',
      description:
        'A single unified interface allows you to swap assets across different blockchains smoothly.',
      delay: 0.4,
    },
    {
      icon: <Headset size={24} />,
      title: 'CUSTOMER SERVICE',
      description:
        'Unsure of decentralised swaps? Have questions? A 24-7 community will help you.',
      delay: 0.5,
    },
    {
      icon: <Shield size={24} />,
      title: 'SAFE AND SECURE',
      description: 'Your funds are safe in your wallet.',
      delay: 0.6,
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative py-20 overflow-hidden min-h-screen flex flex-col justify-center"
    >
      <div className="max-w-6xl mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-6 text-white"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          THE EXCHANGE OF THE FUTURE
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-16"
          initial="hidden"
          animate={controls}
          variants={subtitleVariants}
        >
          Integrating robust security with versatile functionality across
          multiple platforms, DECASWAP streamlines swaps, savers and more,
          enhancing accessibility for everyone.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-neutral-950 border border-neutral-800 rounded-lg p-6 pt-8 pb-12 text-left"
              initial="hidden"
              animate={controls}
              variants={cardVariants}
              custom={feature.delay}
              whileHover="hover"
            >
              <div className="flex items-start">
                <motion.div
                  className="mr-4 p-2 bg-black border border-teal-500 rounded-md text-teal-500"
                  initial="hidden"
                  animate={controls}
                  variants={iconVariants}
                >
                  {feature.icon}
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
