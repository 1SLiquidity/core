import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Props = {
  text: string
  onClick?: () => void
  error?: boolean
  disabled?: boolean
  theme?:
    | 'gradient'
    | 'primary'
    | 'secondary'
    | 'white'
    | 'black'
    | 'success'
    | 'destructive'
  loading?: boolean
  className?: string
}

const Button: React.FC<Props> = ({
  text,
  onClick,
  error,
  disabled,
  theme,
  loading,
  className,
}) => {
  console.log('error', error)

  return (
    <button
      onClick={onClick}
      disabled={error || disabled}
      className={cn(
        `min-w-[130px] w-full p-2 h-10 rounded-[12px] flex items-center justify-center uppercase ${
          error
            ? 'text-primaryRed border-error border-[2px] bg-opacity-[23%]'
            : disabled
            ? 'bg-gray text-white opacity-50 cursor-not-allowed bg-opacity-[23%]'
            : theme == 'gradient'
            ? 'bg-primaryGradient text-black bg-opacity-[23%]'
            : theme == 'destructive'
            ? 'bg-red-700 text-red-200 hover:bg-red-600'
            : 'bg-secondary text-primary'
        } ${
          loading
            ? 'cursor-not-allowed bg-[#0d0d0d] opacity-100 border-[2px] border-white12'
            : ''
        }`,
        className
      )}
    >
      {`${error ? (!!text ? text : 'Something went wrong') : text}`}
      {loading && <Loader2 className="ml-2 w-4 h-4 animate-spin" />}
    </button>
  )
}

export default Button
