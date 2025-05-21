import { formatWalletAddress } from '@/app/lib/helper';
import Image from 'next/image';

type Props = {
  onClick?: () => void;
  address: string;
};

const WalletButton: React.FC<Props> = ({ onClick, address }) => {
  return (
    <div
      onClick={onClick}
      className="min-w-12 w-fit h-10 gap-2 rounded-[12px] p-2 flex items-center justify-center border-primary border-[2px] cursor-pointer hover:border-success hover:bg-successGradient"
    >
      <div className="relative h-fit">
        <Image
          src={'/icons/token.svg'}
          alt="coin"
          className="w-6 h-6"
          width={1000}
          height={1000}
        />
        <Image
          src="/icons/token-icon.svg"
          alt="token symbol"
          className="w-3 h-3 absolute bottom-0 right-0"
          width={20}
          height={20}
        />
      </div>
      <p>{formatWalletAddress(address)}</p>
    </div>
  );
};

export default WalletButton;
