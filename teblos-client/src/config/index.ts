import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'

import { solana, solanaTestnet } from '@reown/appkit/networks'

// 1. Get your Project ID
export const projectId = 'd3b7b18a51fdb5ccf9e774056609b88d'

// 2. Define your networks
export const networks = [solana, solanaTestnet]

 
const solanaAdapter = new SolanaAdapter()
 

// 4. Initialize AppKit
createAppKit({
  adapters: [solanaAdapter],
  networks,
  projectId,
  themeMode: 'dark', 
 
  metadata: {
    name: 'My Web3 App',
    description: 'My App Description',
    url: 'https://mywebsite.com', 
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  }
})