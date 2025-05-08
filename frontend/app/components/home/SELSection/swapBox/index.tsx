import Image from 'next/image';
import { useState } from 'react';

type Props = {
  active: boolean;
};

const SwapBox: React.FC<Props> = ({ active = false }) => {
  return (
    <div className="w-16 h-16 overflow-hidden flex gap-4 p-2 group">
      <div
        className={`w-full h-full rounded-[4px] flex justify-center bg-white12 items-center p-1 group-hover:bg-gradient-to-r from-[#071310] to-[#062118]
          `}
      >
        <Image
          src={'/icons/swap-arrows.svg'}
          alt="swap"
          className="-rotate-45 w-5 group-hover:hidden block"
          width={1000}
          height={1000}
        />
        <Image
          src={'/icons/swap-arrows-green.svg'}
          alt="swap"
          className="-rotate-45 w-5 group-hover:block hidden"
          width={1000}
          height={1000}
        />
      </div>
    </div>
  );
};

export default SwapBox;
