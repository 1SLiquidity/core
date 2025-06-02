import Image from 'next/image'
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  title: string
  amount?: string | null
  infoDetail?: string
  error?: boolean
  isLoading?: boolean
  titleClassName?: string
  amountClassName?: string
  showInstaIcon?: boolean
}

const AmountTag: React.FC<Props> = ({
  title,
  amount,
  infoDetail,
  error,
  isLoading = false,
  titleClassName,
  amountClassName,
  showInstaIcon = false,
}) => {
  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex gap-1.5 items-center">
        {showInstaIcon && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
          >
            <path
              d="M13 2L6 14H11V22L18 10H13V2Z"
              fill="#40f798"
              fillOpacity="0.72"
            />
          </svg>
        )}
        {error && (
          <Image
            src="/icons/warning.svg"
            alt="error"
            className="w-5"
            width={20}
            height={20}
          />
        )}
        <p className={`${error ? 'text-primaryRed' : titleClassName}`}>
          {title}
        </p>
        {infoDetail && (
          <Image
            src="/icons/info.svg"
            alt="info"
            className="w-5"
            width={20}
            height={20}
          />
        )}
      </div>
      <div className={`${error ? 'text-primaryRed' : amountClassName}`}>
        {isLoading ? (
          <Skeleton className="h-4 w-24 bg-white/10" />
        ) : amount ? (
          amount
        ) : (
          'Calculating...'
        )}
      </div>
    </div>
  )
}

export default AmountTag
