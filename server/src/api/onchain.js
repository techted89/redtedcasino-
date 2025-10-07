import { Router } from 'express';
import * as ethers from 'ethers';
import { getPlayerAetherProgress, updatePlayerAetherProgress } from '../database/operations.js';
import { config } from '../config.js';
import { checkAuth } from '../middleware/auth.js';

const router = Router();

// This endpoint provides the public Web3 configuration to the client
router.get('/web3-config', (req, res) => {
    res.json({
        erc20ContractAddress: config.web3.erc20ContractAddress,
        treasuryAddress: new ethers.Wallet(config.web3.treasuryWalletPrivateKey).address,
        erc20Abi: config.web3.erc20Abi
    });
});

// All routes below require authentication
router.use(checkAuth());

// This would be a more complex function in a real app
const generateSpinResultOnServer = (aetherLevel) => {
    const symbols = Object.keys(config.games['aetherian-vault'].symbols);
    const result = {
        reels: Array.from({ length: 20 }, () => symbols[Math.floor(Math.random() * symbols.length)]),
        winnings: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : 0,
        aetherShardsFound: Math.floor(Math.random() * 4)
    };
    return result;
};

router.post('/spin-onchain', async (req, res) => {
    const { betAmount } = req.body;
    const { walletAddress } = req.user;

    if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'A valid betAmount is required' });
    }

    try {
        const provider = new ethers.providers.JsonRpcProvider(config.web3.polygonRpcUrl);
        const treasuryWallet = new ethers.Wallet(config.web3.treasuryWalletPrivateKey, provider);
        const erc20Contract = new ethers.Contract(config.web3.erc20ContractAddress, config.web3.erc20Abi, treasuryWallet);

        const betAmountInWei = ethers.utils.parseUnits(betAmount.toString(), 18);

        const transferFromTx = await erc20Contract.transferFrom(walletAddress, treasuryWallet.address, betAmountInWei);
        await transferFromTx.wait();

        const progress = await getPlayerAetherProgress(walletAddress);
        const spinResult = generateSpinResultOnServer(progress.aetherLevel);

        if (spinResult.winnings > 0) {
            const winningsInWei = ethers.utils.parseUnits(spinResult.winnings.toString(), 18);
            const transferTx = await erc20Contract.transfer(walletAddress, winningsInWei);
            await transferTx.wait();
        }

        let newProgress = progress;
        if (spinResult.aetherShardsFound > 0) {
            newProgress = await updatePlayerAetherProgress(walletAddress, spinResult.aetherShardsFound);
        }

        res.json({
            reels: spinResult.reels,
            winnings: spinResult.winnings,
            aetherProgress: newProgress,
            message: 'Spin settled on-chain.'
        });

    } catch (error) {
        console.error('On-chain spin failed:', error);
        if (error.code === 'CALL_EXCEPTION') {
            return res.status(400).json({ message: 'On-chain transaction failed. Check allowance or balance.' });
        }
        res.status(500).json({ message: 'An internal server error occurred during the on-chain spin.' });
    }
});

export default router;