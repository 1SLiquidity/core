'use client'
import { NAV_LINKS } from '@/app/lib/constants'
import { useSidebar } from '@/app/lib/context/sidebarContext'
import { useAppKit } from '@reown/appkit/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import Button from '../button'
import Searchbar from '../searchbar'
import WalletButton from '../walletButton'
import MobileNavigation from './mobileNavigation'

type Props = {
  isBack?: boolean
  onBack?: () => void
}

const Navbar: React.FC<Props> = ({ isBack, onBack }) => {
  const { isConnected, address } = useAccount()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const { showWalletDetailsSidebar, showGlobalStreamSidebar } = useSidebar()
  const [searchValue, setSearchValue] = useState('')
  const { open } = useAppKit()
  const handleConnectWallet = () => {
    open()
  }

  return (
    <div className="px-5 py-4 w-full flex gap-6 md:gap-0 justify-between relative">
      <div
        onClick={() => setIsMobileNavOpen(true)}
        className="md:hidden absolute cursor-pointer top-6 -left-2 w-6 h-6 rounded-[6px] flex items-center justify-center border-primary border-[2px]"
      >
        <Image
          src="/icons/arrow-down-white.svg"
          alt="menu"
          className="w-2 h-2 -rotate-90"
          width={20}
          height={20}
        />
      </div>

      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => {
          setIsMobileNavOpen(false)
        }}
      />

      {/* logo section with nav links */}
      <div className="flex gap-[18px] w-fit h-fit">
        <Link
          href={''}
          className="w-10 h-10 bg-white rounded-[12px] flex items-center justify-center"
        >
          <Image
            src="/assets/logo-1s.png"
            alt="logo"
            className="w-fit h-fit"
            width={40}
            height={40}
          />
        </Link>

        {/* navlinks */}
        {isBack ? (
          <div
            className="flex gap-1 text-white72 cursor-pointer items-center"
            onClick={onBack}
          >
            <Image
              src={'/icons/right-arrow.svg'}
              alt="back"
              className="w-2.5 rotate-180"
              width={1000}
              height={1000}
            />
            <p>Back</p>
          </div>
        ) : (
          <div className="w-fit h-10 border-[2px] border-primary px-[6px] py-[3px] rounded-[12px] hidden md:flex gap-[6px]">
            {NAV_LINKS.map((link) => (
              <a
                key={link.title}
                href={link.href}
                className={`flex gap-[6px] items-center py-[10px] px-[9px] rounded-[8px] ${
                  (
                    link.href === '/'
                      ? pathname === link.href
                      : pathname.startsWith(link.href) && pathname !== '/'
                  )
                    ? ' bg-primaryGradient text-black'
                    : ''
                }`}
              >
                <Image
                  src={`${
                    (
                      link.href === '/'
                        ? pathname === link.href
                        : pathname.startsWith(link.href) && pathname !== '/'
                    )
                      ? `/icons/${link.href}-black.svg`
                      : link.icon
                  }`}
                  alt={link.title}
                  className="w-fit h-fit"
                  width={20}
                  height={20}
                />
                <span>{link.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* searchbar */}
      <div className="w-full lg:flex hidden absolute -z-10 justify-center items-center h-fit">
        <div
          className={`
          md:flex hidden items-center h-10 mx-2 w-full md:max-w-[200px] lg:max-w-[340px]`}
        >
          <Searchbar
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
            setValue={(e: any) => setSearchValue(e)}
          />
        </div>
      </div>

      <div
        className={`
          md:flex hidden lg:hidden items-center h-10 mx-2 w-full md:max-w-[200px] lg:max-w-[340px]`}
      >
        <Searchbar
          onChange={(e) => setSearchValue(e.target.value)}
          value={searchValue}
          setValue={(e: any) => setSearchValue(e)}
        />
      </div>

      {/* live button and connect button */}
      <div className="flex gap-[10px]">
        <div
          onClick={() => {
            showGlobalStreamSidebar(true)
          }}
          className="relative cursor-pointer w-12 h-10 rounded-[12px] flex items-center justify-center border-primary border-[2px]"
        >
          <Image
            src="/icons/live-statistics.svg"
            alt="logo"
            className="w-6 h-6"
            width={40}
            height={40}
          />
          <div className="absolute w-[24px] h-[12px] bg-primaryRed -bottom-1.5 text-xs font-semibold uppercase flex items-center justify-center rounded-[2px]">
            LIVE
          </div>
        </div>

        {/* connect button */}
        {!isConnected ? (
          <>
            <Button text="Connect" onClick={handleConnectWallet} />
          </>
        ) : (
          <WalletButton
            address={address || ''}
            onClick={() => showWalletDetailsSidebar(true)}
          />
        )}
      </div>
    </div>
  )
}

export default Navbar
