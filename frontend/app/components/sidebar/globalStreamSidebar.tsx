import Image from 'next/image'
import { useState, useEffect } from 'react'
import Sidebar from '.'
import StreamDetails from '../streamDetails'
import SwapStream from '../swapStream'
import { MOCK_STREAMS } from '@/app/lib/constants/streams'
import { Stream } from '@/app/lib/types/stream'

type GlobalStreamSidebarProps = {
  isOpen: boolean
  onClose: () => void
  initialStream?: Stream
}

const GlobalStreamSidebar: React.FC<GlobalStreamSidebarProps> = ({
  isOpen,
  onClose,
  initialStream,
}) => {
  const [isStreamSelected, setIsStreamSelected] = useState(false)
  const [selectedStream, setSelectedStream] = useState<Stream | null>(
    initialStream || null
  )

  // Update selectedStream when initialStream changes
  useEffect(() => {
    if (initialStream) {
      setSelectedStream(initialStream)
      setIsStreamSelected(true)
    }
  }, [initialStream])

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      {/* close icon */}
      <div
        onClick={onClose}
        className="bg-[#232624] cursor-pointer rounded-full p-2 absolute top-6 -left-[0.7rem] z-50"
      >
        <Image
          src={'/icons/close.svg'}
          alt="close"
          className="w-2"
          width={1000}
          height={1000}
          onClick={onClose}
        />
      </div>

      {/* main content */}
      <div className="relative max-h-[90vh] overflow-hidden overflow-y-auto scroll-hidden">
        {selectedStream ? (
          <>
            <StreamDetails
              onBack={() => setSelectedStream(null)}
              selectedStream={selectedStream}
              walletAddress="GY68234nasmd234asfKT21"
            />
          </>
        ) : (
          <>
            <div className="flex justify-between gap-2 h-full sticky bg-black top-0 py-6 px-4 z-40">
              <>
                <div className="flex gap-3 items-center">
                  <div className="relative cursor-pointer w-10 h-10 rounded-full flex items-center justify-center border-primary border-[2px]">
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
                  <p className="text-white text-[20px]">Global Stream</p>
                </div>
              </>
            </div>

            <div className="pb-6 mt-4">
              <div className="p-4 rounded-[15px] bg-white005">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col leading-tight gap-0.5 items-start">
                    <p className="text-white">Scheduled</p>
                    <p className="text-[20px]">99</p>
                    <p className="text-white52 text-[14px]">$99,999,922.39</p>
                  </div>
                  <div className="flex flex-col leading-tight gap-0.5 items-start">
                    <p className="text-white">Ongoing</p>
                    <p className="text-[20px]">99</p>
                    <p className="text-white52 text-[14px]">$99,999,922.39</p>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[20px] pb-3.5">Global Streams</p>

                <div className="flex flex-col gap-2">
                  {MOCK_STREAMS.map((stream, index) => (
                    <SwapStream
                      key={index}
                      onClick={() => {
                        setIsStreamSelected(true)
                        setSelectedStream(stream)
                      }}
                      stream={stream}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  )
}

export default GlobalStreamSidebar
