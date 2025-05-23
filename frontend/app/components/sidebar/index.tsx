import React, { useEffect } from 'react'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, children }) => {
  // useEffect(() => {
  //   if (isOpen) {
  //     document.body.style.overflow = 'hidden';
  //   } else {
  //     document.body.style.overflow = '';
  //   }

  //   return () => {
  //     document.body.style.overflow = '';
  //   };
  // }, [isOpen]);
  return (
    <div
      className={`fixed bottom-0 right-0 h-[90vh] w-[96vw] md:w-96 bg-black z-50 rounded-[13px] border-[2px] border-white14 shadow-lg transition-transform transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        onClick={onClose}
      >
        Close
      </button>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default Sidebar
