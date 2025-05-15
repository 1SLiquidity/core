import Image from 'next/image'
import Popover from '../popover'

const AmountTag: React.FC<{
  title: string
  amount: string
  infoDetail: string
  error?: boolean
}> = ({ title, amount, infoDetail, error }) => {
  return (
    <div className="w-full flex justify-between gap-1 text-[14px]">
      <div className="flex gap-1 items-center">
        <p className={`${error ? 'text-primaryRed' : 'text-white'}`}>{title}</p>
        <Popover content={infoDetail} error={error}>
          {
            <Image
              src={error ? '/icons/info-red.svg' : '/icons/info.svg'}
              alt="info"
              className="w-4 cursor-pointer"
              width={20}
              height={20}
            />
          }
        </Popover>
      </div>

      {/* amount string */}
      <div className="flex gap-1 justify-end text-right">
        <p className={`${error ? 'text-primaryRed' : 'text-white'}`}>
          {amount}
        </p>
        {error && (
          <Image
            src="/icons/warning.svg"
            alt="swap"
            className="w-5"
            width={20}
            height={20}
          />
        )}
      </div>
    </div>
  )
}

export default AmountTag
