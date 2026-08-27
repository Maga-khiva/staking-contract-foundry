import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, TOKEN_ADDRESS, TOKEN_ABI } from './contract'
import './App.css'

type Theme = 'dark' | 'light'

function App() {

  type StakePosition = {
  index: number
  amount: string
  timestamp: number
}

const [positions, setPositions] = useState<StakePosition[]>([])
  const [account, setAccount] = useState<string | null>(null)
  const [stakeAmount, setStakeAmount] = useState('')
  const [status, setStatus] = useState('')
  const [tokenBalance, setTokenBalance] = useState('0')
  const [stakedAmount, setStakedAmount] = useState('0')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
  async function checkConnection() {
    if (!window.ethereum) return

    const provider = new ethers.BrowserProvider(window.ethereum)
    const accounts = await provider.send('eth_accounts', [])

    if (accounts.length > 0) {
      setAccount(accounts[0])
    }
  }

  checkConnection()
}, [])

useEffect(() => {
  if (!window.ethereum) return

  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length > 0) {
      setAccount(accounts[0])
    } else {
      setAccount(null)
    }
  }

  window.ethereum.on('accountsChanged', handleAccountsChanged)

  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
  }
}, [])

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    setTheme(mql.matches ? 'light' : 'dark')

    function handleChange(e: MediaQueryListEvent) {
      setTheme(e.matches ? 'light' : 'dark')
    }

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  async function fetchBalances(currentAccount: string) {
  if (!window.ethereum) return

  const provider = new ethers.BrowserProvider(window.ethereum)
  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider)
  const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

  const balance = await tokenContract.balanceOf(currentAccount)
  setTokenBalance(ethers.formatUnits(balance, 18))

  const found: StakePosition[] = []
  let total = 0n
  let index = 0
  while (true) {
    try {
      const stakeInfo = await stakingContract.stakes(currentAccount, index)
      total += stakeInfo.amount
      found.push({
        index,
        amount: ethers.formatUnits(stakeInfo.amount, 18),
        timestamp: Number(stakeInfo.timestamp),
      })
      index++
    } catch {
      break
    }
  }
  setStakedAmount(ethers.formatUnits(total, 18))
  setPositions(found)
}

  useEffect(() => {
    if (account) {
      fetchBalances(account)
    }
  }, [account])

  async function getContracts() {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer)
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer)
    return { tokenContract, stakingContract }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert('MetaMask topilmadi. Iltimos, ornating.')
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
    } catch (error) {
      console.error('Wallet ulashda xatolik:', error)
    }
  }

  async function handleMint() {
    if (!window.ethereum || !account) return
  if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
    setStatus('Iltimos, 0 dan katta miqdor kiriting.')
    return
  }
  setLoading(true)
    try {
      const { tokenContract } = await getContracts()
      const amountInWei = ethers.parseUnits(stakeAmount || '0', 18)

      setStatus('Mint yuborilmoqda...')
      const mintTx = await tokenContract.mint(account, amountInWei)
      await mintTx.wait()

      setStatus('Mint bajarildi.')
      await fetchBalances(account)
      setStakeAmount('')  
    } catch (error) {
      console.error('Mint xatoligi:', error)
      setStatus('Xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStake() {
    if (!window.ethereum || !account) return
  if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
    setStatus('Iltimos, 0 dan katta miqdor kiriting.')
    return
  }
  setLoading(true)
    try {
      const { tokenContract, stakingContract } = await getContracts()
      const amountInWei = ethers.parseUnits(stakeAmount || '0', 18)

      setStatus('Approve yuborilmoqda...')
      const approveTx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountInWei)
      await approveTx.wait()

      setStatus('Stake yuborilmoqda...')
      const stakeTx = await stakingContract.stake(amountInWei)
      await stakeTx.wait()

      setStatus('Stake bajarildi.')
      await fetchBalances(account)
      setStakeAmount('') 
    } catch (error) {
      console.error('Stake xatoligi:', error)
      setStatus('Xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdraw(index: number) {
  if (!window.ethereum || !account) return
  setLoading(true)
  try {
    const { stakingContract } = await getContracts()

    setStatus('Withdraw yuborilmoqda...')
    const withdrawTx = await stakingContract.withdraw(index)
    await withdrawTx.wait()

    setStatus('Withdraw bajarildi.')
    await fetchBalances(account)
  } catch (error) {
    console.error('Withdraw xatoligi:', error)
    setStatus('Xatolik yuz berdi.')
  } finally {
    setLoading(false)
  }
}

  function shortenAddress(addr: string) {
    return addr.slice(0, 6) + '...' + addr.slice(-4)
  }

  function formatNumber(value: string) {
    const num = parseFloat(value)
    if (Number.isNaN(num)) return '0.00'
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return (
    <div className="page">
      <div className="grid-overlay" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">V</span>
          <span className="brand-name">VAULT</span>
        </div>

        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          {account ? (
            <div className="wallet-pill">
              <span className="dot" />
              {shortenAddress(account)}
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <p className="eyebrow">Sepolia Testnet / Live Contract</p>
          <h1>
            Lock value.
            <br />
            Watch it grow.
          </h1>
          <p className="hero-sub">
            A time-weighted staking vault. Deposit tokens, accrue rewards every
            second they sit, withdraw whenever you choose.
          </p>
        </section>

        {account ? (
          <section className="panel">
            <div className="ledger">
              <div className="ledger-row">
                <span className="ledger-label">Wallet balance</span>
                <span className="ledger-value">{formatNumber(tokenBalance)}</span>
              </div>
              <div className="ledger-divider" />
              <div className="ledger-row">
                <span className="ledger-label">Staked (all positions)</span>
                <span className="ledger-value accent">{formatNumber(stakedAmount)}</span>
              </div>
            </div>

            <div className="action-block">
              <label className="field-label" htmlFor="amount">
                Amount
              </label>
              <input
                id="amount"
                className="amount-input"
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
              />

              <div className="btn-row">
                <button className="btn btn-secondary" onClick={handleMint} disabled={loading}>
                  Mint Test Tokens
                </button>
                <button className="btn btn-primary" onClick={handleStake} disabled={loading}>
                  Stake
                </button>
                
              </div>

              {status ? (
                <p className={loading ? 'status status-pending' : 'status'}>
                  {loading ? <span className="spinner" /> : null}
                  {status}
                </p>
              ) : null}
            </div>
            {positions.length > 0 && (
  <div className="positions">
    <p className="field-label">Open positions</p>
    {positions.map((pos) => (
      <div className="position-row" key={pos.index}>
        <div className="position-info">
          <span className="position-amount">{formatNumber(pos.amount)}</span>
          <span className="position-date">
            since {new Date(pos.timestamp * 1000).toLocaleDateString()}
          </span>
        </div>
        <button
          className="btn btn-outline btn-small"
          onClick={() => handleWithdraw(pos.index)}
          disabled={loading}
        >
          Withdraw
        </button>
      </div>
    ))}
  </div>
)}
          </section>
        ) : (
          <section className="panel panel-empty">
            <p>Connect a wallet to view your balance and open a position.</p>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>StakingContract on Sepolia</span>
        
          <a
            href={'https://sepolia.etherscan.io/address/' + STAKING_CONTRACT_ADDRESS}
            target="_blank"
            rel="noreferrer"
          >
            View on Etherscan
          </a>
      </footer>
    </div>
  )
}

export default App