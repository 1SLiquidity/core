import Image from 'next/image'
import Modal from '.'
import { useState, useEffect, useRef } from 'react'
import SearchbarWithIcon from '../searchbarWithIcon'
import { TOKENS } from '@/app/lib/constants'
import useDebounce from '@/app/lib/hooks/useDebounce'
import { useModal } from '@/app/lib/context/modalContext'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useToast } from '@/app/lib/context/toastProvider'
import { formatWalletAddress } from '@/app/lib/helper'
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { ChevronDown } from 'lucide-react'

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
  '42161': 'Arbitrum One',
  '137': 'Polygon',
  '56': 'BNB Chain',
}

// Mapping from chain IDs to Moralis chain identifiers
const CHAIN_ID_TO_MORALIS: { [key: string]: string } = {
  '1': 'eth',
  '42161': 'arbitrum',
  '137': 'polygon',
  '56': 'bsc',
}

// Token Skeleton component for loading state
const TokenSkeleton = () => {
  return (
    <div className="w-full flex items-center min-h-[62px] px-[10px] gap-[12px] rounded-[15px] animate-pulse">
      <div className="w-[40px] h-[40px] rounded-full bg-neutral-800" />
      <div className="flex-1">
        <div className="h-[18px] w-24 bg-neutral-800 rounded mb-2" />
        <div className="h-[14px] w-16 bg-neutral-800 rounded" />
      </div>
      <div className="text-right">
        <div className="h-[14px] w-16 bg-neutral-800 rounded mb-2" />
        <div className="h-[12px] w-12 bg-neutral-800 rounded" />
      </div>
    </div>
  )
}

// Popular Token Skeleton component
const PopularTokenSkeleton = () => {
  return (
    <div className="min-w-[64px] flex flex-col justify-center items-center w-fit h-[72px] bg-white005 px-[10px] gap-[6px] border-[2px] border-primary rounded-[15px] animate-pulse">
      <div className="w-[24px] h-[24px] rounded-full bg-neutral-800 mt-1" />
      <div className="h-[14px] w-12 bg-neutral-800 rounded" />
    </div>
  )
}

type SelectTokenModalProps = {
  isOpen: boolean
  onClose: () => void
}

const SelectTokenModal: React.FC<SelectTokenModalProps> = ({
  isOpen,
  onClose,
}) => {
  console.log('SelectTokenModal rendered')

  const [searchValue, setSearchValue] = useState('')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'my'>('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
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

  console.log('Modal - Chain ID:', chainId)
  console.log('Modal - Chain Name:', chainName)

  const { addToast } = useToast()

  // Get wallet tokens for the current chain
  const { tokens: walletTokens, isLoading: isLoadingWalletTokens } =
    useWalletTokens(address, CHAIN_ID_TO_MORALIS[chainId] || 'eth')

  // Use token list from our enhanced hook that fetches from CoinGecko API with caching
  const { tokens: availableTokens, isLoading, error, refetch } = useTokenList()

  console.log('Modal - Available Tokens:', availableTokens)
  console.log('Modal - Wallet Tokens:', walletTokens)

  // useEffect(() => {
  //   console.log('Modal - Effect triggered')
  //   // Force refetch when modal opens
  //   if (isOpen) {
  //     console.log('Modal opened - Refetching tokens')
  //     refetch()
  //   }
  // }, [isOpen, refetch])

  // Default to hardcoded tokens if API tokens aren't available yet
  const displayTokens =
    availableTokens.length > 0
      ? availableTokens.map((token: TOKENS_TYPE) => {
          // Find matching wallet token to get balance
          const walletToken = walletTokens.find(
            (wt) =>
              wt.token_address.toLowerCase() ===
              token.token_address.toLowerCase()
          )

          // Convert balance to proper decimal value
          const rawBalance = walletToken ? walletToken.balance : '0'
          const balance = walletToken
            ? (parseFloat(rawBalance) / Math.pow(10, token.decimals)).toString()
            : '0'

          // Calculate USD value using the converted balance
          const usd_value = walletToken
            ? parseFloat(balance) * token.usd_price
            : 0

          if (token.symbol.toLowerCase() === 'weth') {
            console.log('WETH Debug:', {
              symbol: token.symbol,
              rawBalance,
              decimals: token.decimals,
              balance,
              usd_price: token.usd_price,
              usd_value,
              walletToken,
            })
          }

          return {
            ...token,
            balance,
            usd_value,
          }
        })
      : TOKENS.map(
          (token) =>
            ({
              name: token.name,
              symbol: token.symbol,
              icon: token.icon,
              popular: token.popular || false,
              value: token.value || 0,
              status: token.status || 'increase',
              statusAmount: token.statusAmount || 0,
              token_address: '',
              decimals: 18,
              balance: '0',
              usd_value: 0,
              possible_spam: false,
              usd_price: 0,
            } as TOKENS_TYPE)
        )

  console.log('Modal - Display Tokens:', displayTokens)
  console.log('Number of Display Tokens:', displayTokens.length)
  // Log available tokens to check WETH price
  console.log(
    'Available Tokens:',
    availableTokens.filter(
      (t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth'
    )
  )
  console.log(
    'Wallet Tokens:',
    walletTokens.filter((t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth')
  )
  console.log(
    'Display Tokens:',
    displayTokens.filter((t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth')
  )

  // Function to format balance based on decimals
  const formatTokenBalance = (balance: string, decimals: number) => {
    const parsedBalance = parseFloat(balance)
    if (isNaN(parsedBalance)) return '0'

    // For small numbers (less than 0.00001), use scientific notation
    if (parsedBalance > 0 && parsedBalance < 0.00001) {
      return parsedBalance.toExponential(2)
    }

    // For normal numbers, use standard formatting
    return parsedBalance.toLocaleString(undefined, {
      minimumFractionDigits: Math.min(decimals, 5),
      maximumFractionDigits: Math.min(decimals, 5),
    })
  }

  // Function to format USD value
  const formatUsdValue = (value: number) => {
    if (value === 0) return '$0.00'
    if (value < 0.01) return '<$0.01'
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Function to handle token selection
  const handleSelectToken = (token: TOKENS_TYPE) => {
    // Check if this token is already selected in the other field
    if (
      currentInputField === 'from' &&
      selectedTokenTo &&
      token.token_address === selectedTokenTo.token_address
    ) {
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

    // Remove duplicate tokens (keep the one with higher balance)
    filteredTokens = Object.values(
      filteredTokens.reduce(
        (acc: { [key: string]: TOKENS_TYPE }, token: TOKENS_TYPE) => {
          const lowerAddress = token.token_address.toLowerCase()
          if (
            !acc[lowerAddress] ||
            parseFloat(token.balance) > parseFloat(acc[lowerAddress].balance)
          ) {
            acc[lowerAddress] = token
          }
          return acc
        },
        {}
      )
    )

    // Apply search filter if search value exists
    if (debouncedSearchValue) {
      const searchLower = debouncedSearchValue.toLowerCase()
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.name.toLowerCase().includes(searchLower) ||
          token.symbol.toLowerCase().includes(searchLower) ||
          token.token_address.toLowerCase() === searchLower
      )
    }

    // Filter by "My tokens" if selected and wallet is connected
    if (tokenFilter === 'my' && address) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) => parseFloat(token.balance) > 0
      )
    }

    // Don't show the token already selected in the other input
    if (currentInputField === 'from' && selectedTokenTo) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.token_address !== selectedTokenTo.token_address
      )
    } else if (currentInputField === 'to' && selectedTokenFrom) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.token_address !== selectedTokenFrom.token_address
      )
    }

    // Sort tokens by market value (usd_price * balance) and popularity
    return filteredTokens.sort((a: TOKENS_TYPE, b: TOKENS_TYPE) => {
      // First, prioritize user's holdings
      const aValue = parseFloat(a.balance) * (a.usd_price || 0)
      const bValue = parseFloat(b.balance) * (b.usd_price || 0)

      // If user has balance of both tokens, prioritize higher value holdings
      if (aValue > 0 && bValue > 0) {
        return bValue - aValue
      }

      // If one token has balance, prioritize it
      if (aValue > 0) return -1
      if (bValue > 0) return 1

      // For tokens without balance, first check if they're major stablecoins or WBTC
      const isAMajorToken = ['USDT', 'USDC', 'DAI', 'WBTC'].includes(a.symbol)
      const isBMajorToken = ['USDT', 'USDC', 'DAI', 'WBTC'].includes(b.symbol)

      if (isAMajorToken && !isBMajorToken) return -1
      if (!isAMajorToken && isBMajorToken) return 1

      // If both or neither are major tokens, use market cap rank
      const aRank = a.market_cap_rank || 999999
      const bRank = b.market_cap_rank || 999999

      // If market cap ranks are significantly different, use them
      if (Math.abs(aRank - bRank) > 5) {
        return aRank - bRank
      }

      // For similar market cap ranks, factor in price and popularity
      const aMarketScore = (a.usd_price || 0) + (a.popular ? 1000000 : 0)
      const bMarketScore = (b.usd_price || 0) + (b.popular ? 1000000 : 0)

      return bMarketScore - aMarketScore
    })
  }

  // Get popular tokens based on market cap
  const getPopularTokens = () => {
    // First, find WETH in the displayTokens array
    const weth = displayTokens.find(
      (token: TOKENS_TYPE) => token.symbol.toLowerCase() === 'weth'
    )

    // Get other popular tokens
    const otherPopularTokens = displayTokens.filter(
      (token: TOKENS_TYPE) =>
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

  // Get the correct token icon
  const getTokenIcon = (token: TOKENS_TYPE) => {
    if (token.symbol.toLowerCase() === 'usdt') {
      return '/tokens/usdt.png'
    }
    return token.icon
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-0 h-full">
        <div className="flex justify-between gap-2 h-full">
          <div className="text-xl font-medium">Select a Token</div>
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
        {/* <div className="mt-2 mb-4 flex items-center">
          <div className="text-sm text-white px-2 py-1 bg-neutral-800 rounded-full flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
            {chainName}
          </div>
        </div> */}

        {/* searchbar */}
        <div className="my-4 flex gap-2 items-center">
          <SearchbarWithIcon
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
            setValue={(e: any) => setSearchValue(e)}
            placeholder="Search tokens"
          />
          <div className="flex items-center h-[40px] hover:bg-neutral-800 border-[2px] border-primary rounded-[10px] px-2 py-2 transition-colors">
            <Image
              src="/tokens/ether.png"
              alt="Ethereum"
              width={28}
              height={28}
              className="rounded-md"
            />
          </div>
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

        {searchValue && <p className="text-[20px] text-gray">Search Results</p>}
        {debouncedSearchValue.length > 0 ? (
          <>
            <div className="flex flex-col gap-1 my-[13px] h-[55vh] overflow-y-auto scrollbar-hide">
              {isLoading ? (
                <>
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                </>
              ) : getFilteredTokens().length === 0 ? (
                <div className="text-center p-4 text-white">
                  No tokens found matching "{debouncedSearchValue}" on{' '}
                  {chainName}
                </div>
              ) : (
                getFilteredTokens().map((token: TOKENS_TYPE, ind: number) => {
                  const disabled = isTokenDisabled(token)
                  return (
                    <div
                      key={ind}
                      onClick={() => !disabled && handleSelectToken(token)}
                      className={`w-full flex items-center min-h-[62px] ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                          : 'hover:bg-neutral-800 cursor-pointer'
                      } px-[10px] gap-[12px] rounded-[15px] transition-colors`}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={getTokenIcon(token)}
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
                        <div className="flex items-center gap-1">
                          <p className="text-[14px] uppercase text-[#adadad] p-0 leading-tight">
                            {token.symbol}
                          </p>
                          {token.token_address && (
                            <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                              {formatWalletAddress(token.token_address)}
                            </p>
                          )}
                        </div>
                      </div>
                      {address && parseFloat(token.balance) > 0 && (
                        <div className="text-right">
                          <p className="text-[14px] text-white">
                            {formatUsdValue(token.usd_value || 0)}
                          </p>
                          <p className="text-[12px] text-gray">
                            {formatTokenBalance(token.balance, token.decimals)}{' '}
                            {token.symbol}
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
            <div className="h-[55vh] overflow-y-auto scrollbar-hide pb-5">
              <div className="flex gap-1 my-[13px] overflow-x-auto scrollbar-hide">
                {isLoading ? (
                  <>
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                  </>
                ) : (
                  getPopularTokens().map((token: TOKENS_TYPE, ind: number) => {
                    const disabled = isTokenDisabled(token)
                    return (
                      <div
                        key={ind}
                        onClick={() => !disabled && handleSelectToken(token)}
                        className={`min-w-[64px] flex flex-col justify-center items-center w-fit h-[72px] ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                            : 'bg-white005 hover:bg-neutral-900 cursor-pointer'
                        } px-[10px] gap-[6px] border-[2px] border-primary rounded-[15px] transition-colors`}
                      >
                        <div className="relative mt-1">
                          <Image
                            src={getTokenIcon(token)}
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
                  })
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[20px] text-white">Tokens</p>
                {address && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDropdownOpen(!isDropdownOpen)
                      }}
                    >
                      {tokenFilter === 'all' ? 'All tokens' : 'My tokens'}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-32 py-1 bg-neutral-800 rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setTokenFilter('all')
                            setIsDropdownOpen(false)
                          }}
                        >
                          All tokens
                        </button>
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setTokenFilter('my')
                            setIsDropdownOpen(false)
                          }}
                        >
                          My tokens
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 my-[13px]">
                {isLoading ? (
                  <>
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                  </>
                ) : getFilteredTokens().length === 0 ? (
                  <div className="text-center p-4 text-white">
                    No tokens found on {chainName}
                  </div>
                ) : (
                  getFilteredTokens().map((token: TOKENS_TYPE, ind: number) => {
                    const disabled = isTokenDisabled(token)
                    return (
                      <div
                        key={ind}
                        onClick={() => !disabled && handleSelectToken(token)}
                        className={`w-full flex items-center min-h-[62px] ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                            : 'hover:bg-neutral-900 cursor-pointer'
                        } px-[10px] gap-[12px] rounded-[15px] transition-all duration-300`}
                      >
                        <div className="relative h-fit">
                          <Image
                            src={getTokenIcon(token)}
                            alt={token.name}
                            className={`w-[40px] h-[40px] rounded-full ${
                              disabled ? 'grayscale' : ''
                            }`}
                            width={40}
                            height={40}
                            onError={handleImageError}
                          />
                          <Image
                            src="/tokens/ether.png"
                            alt="Ethereum"
                            width={26}
                            height={26}
                            className="absolute -right-1.5 -bottom-1.5 rounded-md w-[1.35rem] h-[1.35rem] border-[2px] border-black"
                          />
                          {disabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                              <span className="text-xs text-white">
                                Selected
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[18px] p-0 leading-tight">
                            {token.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-[14px] uppercase text-[#adadad] p-0 leading-tight">
                              {token.symbol}
                            </p>
                            {token.token_address && (
                              <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                                {formatWalletAddress(token.token_address)}
                              </p>
                            )}
                          </div>
                        </div>
                        {address && parseFloat(token.balance) > 0 && (
                          <div className="text-right">
                            <p className="text-[14px] text-white">
                              {formatUsdValue(token.usd_value || 0)}
                            </p>
                            <p className="text-[12px] text-gray">
                              {formatTokenBalance(
                                token.balance,
                                token.decimals
                              )}{' '}
                              {token.symbol}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default SelectTokenModal
