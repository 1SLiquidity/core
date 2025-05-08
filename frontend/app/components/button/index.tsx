type Props = {
  text: string
  onClick?: () => void
  error?: boolean
  disabled?: boolean
  theme?: 'gradient' | 'primary' | 'secondary' | 'white' | 'black' | 'success'
}

const Button: React.FC<Props> = ({ text, onClick, error, disabled, theme }) => {
  console.log('error', error)

  return (
    <button
      onClick={onClick}
      disabled={error || disabled}
      className={`min-w-[130px] w-full p-2 h-10 bg-opacity-[23%] rounded-[12px] flex items-center justify-center uppercase ${
        error
          ? 'text-primaryRed border-error border-[2px]'
          : disabled
          ? 'bg-gray text-white opacity-50 cursor-not-allowed'
          : theme == 'gradient'
          ? 'bg-primaryGradient text-black'
          : 'bg-secondary text-primary'
      }`}
    >
      {`${error ? 'Error Also Here' : text}`}
    </button>
  )
}

export default Button
