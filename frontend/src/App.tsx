import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, TOKEN_ADDRESS, TOKEN_ABI } from './contract'
import './App.css'

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [stakeAmount, setStakeAmount] = useState('')
  const [status, setStatus] = useState('')
  const [tokenBalance, setTokenBalance] = useState('0')
const [stakedAmount, setStakedAmount] = useState('0')

async function fetchBalances(currentAccount: string) {
  if (!window.ethereum) return

  const provider = new ethers.BrowserProvider(window.ethereum)
  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider)
  const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider)

  const balance = await tokenContract.balanceOf(currentAccount)
  setTokenBalance(ethers.formatUnits(balance, 18))

  let total = 0n
  let index = 0
  while (true) {
    try {
      const stakeInfo = await stakingContract.stakes(currentAccount, index)
      total += stakeInfo.amount
      index++
    } catch {
      break
    }
  }
  setStakedAmount(ethers.formatUnits(total, 18))
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
      alert('MetaMask topilmadi. Iltimos, o‘rnating.')
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

  async function handleStake() {
  if (!window.ethereum || !account) return

  try {
    const { tokenContract, stakingContract } = await getContracts()

    const amountInWei = ethers.parseUnits(stakeAmount, 18)

    setStatus('Approve yuborilmoqda...')
    const approveTx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountInWei)
    await approveTx.wait()

    setStatus('Stake yuborilmoqda...')
    const stakeTx = await stakingContract.stake(amountInWei)
    await stakeTx.wait()

    setStatus('Stake muvaffaqiyatli bajarildi!')
    await fetchBalances(account)
  } catch (error) {
    console.error('Stake xatoligi:', error)
    setStatus('Xatolik yuz berdi.')
  }
}

async function handleMint(){
  if (!window.ethereum || !account) return

  try {
        const { tokenContract} = await getContracts()

    const amountInWei = ethers.parseUnits(stakeAmount, 18)


    setStatus('Mint yuborilmoqda...')
    const mintTx = await tokenContract.mint(account, amountInWei)
    await mintTx.wait()

     setStatus('Mint muvaffaqiyatli bajarildi!')
    await fetchBalances(account)   // ← yangi qator
  } catch (error) {
    console.error('Mint xatoligi:', error)
    setStatus('Xatolik yuz berdi.')
  }
}

async function handleWithdraw() {
  if (!window.ethereum || !account) return

  try {
        const { stakingContract } = await getContracts()


    setStatus('Withdraw yuborilmoqda...')
    const withdrawTx = await stakingContract.withdraw(0)
    await withdrawTx.wait()

   setStatus('Withdraw muvaffaqiyatli bajarildi!')
    await fetchBalances(account)   // ← yangi qator
  } catch (error) {
    console.error('Withdraw xatoligi:', error)
    setStatus('Xatolik yuz berdi.')
  }
}
  return (
    <div className="app">
      <h1>Staking DApp</h1>

      {account ? (
  <div>
    <p>Ulangan: {account}</p>
    <p>Token balance: {tokenBalance}</p>
    <p>Stake qilingan: {stakedAmount}</p>
    <input
      type="text"
      placeholder="Miqdorni kiriting"
      value={stakeAmount}
      onChange={(e) => setStakeAmount(e.target.value)}
    />
   <button onClick={handleMint}>Mint Test Tokens</button>
   <button onClick={handleStake}>Stake</button>
   <button onClick={handleWithdraw}>Withdraw</button>
    <p>{status}</p>
  </div>
) : (
  <button onClick={connectWallet}>Connect Wallet</button>
)}
    </div>
  )
}

export default App