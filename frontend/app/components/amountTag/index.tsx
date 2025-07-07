import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  title: string
  amount: string | undefined
  infoDetail?: string
  titleClassName?: string
  amountClassName?: string
  showInstaIcon?: boolean
  isLoading?: boolean
}

const AmountTag: React.FC<Props> = ({
  title,
  amount,
  infoDetail,
  titleClassName,
  amountClassName,
  showInstaIcon = false,
  isLoading = false,
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-1">
        <p className={cn('text-[14px]', titleClassName)}>{title}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Image
                src="/icons/info.svg"
                alt="info"
                className="w-4 h-4 cursor-pointer"
                width={20}
                height={20}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#0D0D0D] z-50 max-w-[280px] border-[2px] border-white12">
              <p>
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry. Lorem Ipsum has been the industry's standard dummy
                text ever since the 1500 &nbsp;{' '}
                <a
                  href="https://www.lipsum.com/"
                  target="_blank"
                  className="text-[#aeabab] underline"
                >
                  Learn more
                </a>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-1">
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            <p className={cn('text-[14px]', amountClassName)}>{amount}</p>
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
          </>
        )}
      </div>
    </div>
  )
}

export default AmountTag
