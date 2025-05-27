import Image from 'next/image'
import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  title: string
  amount?: string | null
  infoDetail?: string
  error?: boolean
  isLoading?: boolean
}

const AmountTag: React.FC<Props> = ({
  title,
  amount,
  infoDetail,
  error,
  isLoading = false,
}) => {
  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex gap-1.5 items-center">
        {error && (
          <Image
            src="/icons/warning.svg"
            alt="error"
            className="w-5"
            width={20}
            height={20}
          />
        )}
        <p className={`${error ? 'text-primaryRed' : ''}`}>{title}</p>
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
      <div className={`${error ? 'text-primaryRed' : ''}`}>
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
