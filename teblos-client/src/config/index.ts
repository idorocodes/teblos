import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'

import {  solanaDevnet } from '@reown/appkit/networks'

// 1. Get your Project ID
export const projectId = 'd3b7b18a51fdb5ccf9e774056609b88d'

// 2. Define your networks
export const networks = [ solanaDevnet]

 
const solanaAdapter = new SolanaAdapter()
 

// 4. Initialize AppKit
createAppKit({
  adapters: [solanaAdapter],
  networks,
  projectId,
  themeMode: 'dark', 
 
  metadata: {
    name: 'Teblos',
    description: 'Nothing Much',
    url: 'https://teblos.vercel.app', 
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  }
})