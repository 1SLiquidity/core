import Image from 'next/image'

const TokenBar: React.FC<{ sellToken: string; buyToken: string }> = ({
  sellToken,
  buyToken,
}) => {
  const getTokenImagePath = (token: string) =>
    `/tokens/${token.toLowerCase()}.svg`

  return (
    <div className="flex items-center justify-center relative">
      {/* Sell Token */}
      <div className="flex items-center justify-center">
        <div className="bg-green-300 rounded-full p-0.5">
          <Image
            src={getTokenImagePath(sellToken)}
            alt={sellToken}
            width={40}
            height={40}
            className="border-[1.5px] border-black w-[30px] rounded-full"
          />
        </div>
      </div>

      {/* Connector Line */}
      <div className="flex-auto border-t-2 border-green-200 relative">
        <div className="bg-gray rounded-full p-0.5 absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Image
            src={'/assets/logo.svg'}
            alt={sellToken}
            width={40}
            height={40}
            className="border-[1.5px] border-black w-[28px] h-[28px] rounded-full"
          />
        </div>
      </div>

      {/* Buy Token */}
      <div className="flex items-center justify-center">
        <div className="bg-blue-300 rounded-full p-0.5">
          <Image
            src={getTokenImagePath(buyToken)}
            alt={buyToken}
            width={40}
            height={40}
            className="border-[1.5px] border-black w-[30px] rounded-full"
          />
        </div>
      </div>
    </div>
  )
}

export default TokenBar
