import Image from 'next/image'
import Modal from '.'
import { useState, useEffect } from 'react'
import SearchbarWithIcon from '../searchbarWithIcon'
import { TOKENS } from '@/app/lib/constants'
import useDebounce from '@/app/lib/hooks/useDebounce'
import { useModal } from '@/app/lib/context/modalContext'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useToast } from '@/app/lib/context/toastProvider'

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
  '42161': 'Arbitrum One',
  '137': 'Polygon',
  '56': 'BNB Chain',
  // Add more chains as needed
}

type SelectTokenModalProps = {
  isOpen: boolean
  onClose: () => void
}

const SelectTokenModal: React.FC<SelectTokenModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearchValue = useDebounce(searchValue, 300)
  const {
    currentInputField,
    setSelectedTokenFrom,
    setSelectedTokenTo,
    selectedTokenFrom,
    selectedTokenTo,
  } = useModal()
  const { address } = useAppKitAccount()
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]
  const chainName = CHAIN_NAMES[chainId] || 'Unknown Chain'

  // Use token list from our enhanced hook that fetches from CoinGecko API with caching
  const {
    tokens: availableTokens,
    isLoading,
    error,
    refetch,
    platform,
  } = useTokenList()

  const { addToast } = useToast()

  // Default to hardcoded tokens if API tokens aren't available yet
  const displayTokens: TOKENS_TYPE[] =
    availableTokens.length > 0
      ? availableTokens
      : TOKENS.map((token) => ({
          ...token,
          token_address: '', // Add missing token_address property
          decimals: 18,
          balance: '0',
          possible_spam: false,
          usd_price: 0,
          status: token.status || 'increase', // Make sure status is not undefined
          statusAmount: token.statusAmount || 0, // Make sure statusAmount is not undefined
        }))

  // Function to handle token selection
  const handleSelectToken = (token: TOKENS_TYPE) => {
    // Check if this token is already selected in the other field
    if (
      currentInputField === 'from' &&
      selectedTokenTo &&
      token.token_address === selectedTokenTo.token_address
    ) {
      // Token is already selected in the "to" field - don't allow selection
      console.log('Cannot select the same token in both fields')
      // Show a toast notification
      addToast(
        <div className="flex items-center">
          <div className="mr-2 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>Cannot select the same token in both fields</div>
        </div>
      )
      return
    } else if (
      currentInputField === 'to' &&
      selectedTokenFrom &&
      token.token_address === selectedTokenFrom.token_address
    ) {
      // Token is already selected in the "from" field - don't allow selection
      console.log('Cannot select the same token in both fields')
      // Show a toast notification
      addToast(
        <div className="flex items-center">
          <div className="mr-2 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>Cannot select the same token in both fields</div>
        </div>
      )
      return
    }

    // Proceed with normal token selection
    if (currentInputField === 'from') {
      setSelectedTokenFrom(token)
    } else if (currentInputField === 'to') {
      setSelectedTokenTo(token)
    }
    onClose()
  }

  // Filter tokens based on search and make sure we don't show the already selected token in the other field
  const getFilteredTokens = () => {
    let filteredTokens = displayTokens

    // Apply search filter if search value exists
    if (debouncedSearchValue) {
      const searchLower = debouncedSearchValue.toLowerCase()
      filteredTokens = filteredTokens.filter(
        (token) =>
          token.name.toLowerCase().includes(searchLower) ||
          token.symbol.toLowerCase().includes(searchLower) ||
          token.token_address.toLowerCase() === searchLower
      )
    }

    // Don't show the token already selected in the other input
    if (currentInputField === 'from' && selectedTokenTo) {
      filteredTokens = filteredTokens.filter(
        (token) => token.token_address !== selectedTokenTo.token_address
      )
    } else if (currentInputField === 'to' && selectedTokenFrom) {
      filteredTokens = filteredTokens.filter(
        (token) => token.token_address !== selectedTokenFrom.token_address
      )
    }

    return filteredTokens
  }

  // Get popular tokens based on market cap
  const getPopularTokens = () => {
    // First, find WETH in the displayTokens array
    const weth = displayTokens.find(
      (token) => token.symbol.toLowerCase() === 'weth'
    )

    // Get other popular tokens
    const otherPopularTokens = displayTokens.filter(
      (token) =>
        token.popular &&
        token.symbol.toLowerCase() !== 'weth' &&
        token.symbol.toLowerCase() !== 'steth'
    )

    // Combine WETH with other popular tokens, ensuring WETH is first if it exists
    const popularTokens = weth
      ? [weth, ...otherPopularTokens]
      : otherPopularTokens

    // Only return up to 5 popular tokens
    return popularTokens.slice(0, 5)
  }

  // Handle image loading errors
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    e.currentTarget.src = '/icons/default-token.svg'
  }

  // Check if a token should be disabled (already selected in the other field)
  const isTokenDisabled = (token: TOKENS_TYPE) => {
    if (currentInputField === 'from' && selectedTokenTo) {
      return token.token_address === selectedTokenTo.token_address
    } else if (currentInputField === 'to' && selectedTokenFrom) {
      return token.token_address === selectedTokenFrom.token_address
    }
    return false
  }

  console.log('availableTokens', availableTokens)

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-7 h-full">
        <div className="flex justify-between gap-2 h-full">
          <div className="text-xl font-medium">Select Token</div>
          <Image
            src={'/icons/close.svg'}
            alt="close"
            className="w-3 cursor-pointer"
            width={1000}
            height={1000}
            onClick={onClose}
          />
        </div>

        {/* Network information */}
        <div className="mt-2 mb-4 flex items-center">
          <div className="text-sm text-white px-2 py-1 bg-neutral-800 rounded-full flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
            {chainName}
          </div>
        </div>

        {/* searchbar */}
        <div className="my-4">
          <SearchbarWithIcon
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
            setValue={(e: any) => setSearchValue(e)}
            placeholder="Search by name, symbol, or address"
          />
        </div>

        {/* Error message and retry button */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 rounded-lg border border-red-600/30">
            <p className="text-red-400 text-sm mb-2">
              There was an error loading the token list for {chainName}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm bg-red-600/30 hover:bg-red-600/50 px-3 py-1 rounded-md text-white"
            >
              Retry
            </button>
          </div>
        )}

        {searchValue && <p className="text-[20px] text-white">Results</p>}
        {debouncedSearchValue.length > 0 ? (
          <>
            <div className="flex flex-col gap-1 my-[13px] h-[30vh] overflow-y-auto scrollbar-hide">
              {getFilteredTokens().length === 0 ? (
                <div className="text-center p-4 text-white">
                  No tokens found matching "{debouncedSearchValue}" on{' '}
                  {chainName}
                </div>
              ) : (
                getFilteredTokens().map((token, ind) => {
                  const disabled = isTokenDisabled(token)
                  return (
                    <div
                      key={ind}
                      onClick={() => !disabled && handleSelectToken(token)}
                      className={`w-full flex items-center min-h-[62px] ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                          : 'hover:bg-neutral-800 cursor-pointer'
                      } px-[13px] gap-[12px] rounded-[15px] transition-colors`}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={token.icon}
                          alt={token.name}
                          className={`w-[40px] h-[40px] rounded-full ${
                            disabled ? 'grayscale' : ''
                          }`}
                          width={40}
                          height={40}
                          onError={handleImageError}
                        />
                        {disabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                            <span className="text-xs text-white">Selected</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[18px] p-0 leading-tight">
                          {token.name}
                        </p>
                        <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                          {token.symbol}
                        </p>
                      </div>
                      {token.usd_price > 0 && (
                        <div className="text-right">
                          <p className="text-[14px] text-white">
                            $
                            {token.usd_price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })}
                          </p>
                          <p
                            className={`text-[12px] ${
                              token.status === 'increase'
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {token.status === 'increase' ? '+' : '-'}
                            {token.statusAmount.toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <></>
        )}

        {!(searchValue.length > 0) && (
          <div className="h-full">
            <p className="text-[20px] text-white">
              Popular Tokens on {chainName}
            </p>

            <div className="flex gap-1 my-[13px] overflow-x-auto scrollbar-hide">
              {getPopularTokens().map((token, ind) => {
                const disabled = isTokenDisabled(token)
                return (
                  <div
                    key={ind}
                    onClick={() => !disabled && handleSelectToken(token)}
                    className={`min-w-[64px] flex flex-col justify-center items-center w-fit h-[72px] ${
                      disabled
                        ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                        : 'bg-white005 hover:bg-neutral-900 cursor-pointer'
                    } px-[13px] gap-[6px] border-[2px] border-primary rounded-[15px] transition-colors`}
                  >
                    <div className="relative mt-1">
                      <Image
                        src={token.icon}
                        alt={token.name}
                        className={`w-[24px] h-[24px] rounded-full ${
                          disabled ? 'grayscale' : ''
                        }`}
                        width={24}
                        height={24}
                        onError={handleImageError}
                      />
                      {disabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                          <span className="text-[8px] text-white">
                            Selected
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="">{token.symbol}</p>
                  </div>
                )
              })}
            </div>

            <p className="text-[20px] text-white">All Tokens on {chainName}</p>

            <div className="flex flex-col gap-1 my-[13px] scrollbar-hide h-[30vh] overflow-y-auto pb-5">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : getFilteredTokens().length === 0 ? (
                <div className="text-center p-4 text-white">
                  No tokens found on {chainName}
                </div>
              ) : (
                getFilteredTokens().map((token, ind) => {
                  const disabled = isTokenDisabled(token)
                  return (
                    <div
                      key={ind}
                      onClick={() => !disabled && handleSelectToken(token)}
                      className={`w-full flex items-center min-h-[62px] ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                          : 'hover:bg-neutral-900 cursor-pointer'
                      } px-[13px] gap-[12px] rounded-[15px] transition-colors`}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={token.icon}
                          alt={token.name}
                          className={`w-[40px] h-[40px] rounded-full ${
                            disabled ? 'grayscale' : ''
                          }`}
                          width={40}
                          height={40}
                          onError={handleImageError}
                        />
                        {disabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                            <span className="text-xs text-white">Selected</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[18px] p-0 leading-tight">
                          {token.name}
                        </p>
                        <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                          {token.symbol}
                        </p>
                      </div>
                      {token.usd_price > 0 && (
                        <div className="text-right">
                          <p className="text-[14px] text-white">
                            $
                            {token.usd_price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })}
                          </p>
                          <p
                            className={`text-[12px] ${
                              token.status === 'increase'
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {token.status === 'increase' ? '+' : '-'}
                            {token.statusAmount.toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default SelectTokenModal
