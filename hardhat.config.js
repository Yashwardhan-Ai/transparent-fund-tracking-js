import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const { PRIVATE_KEY, RPC_URL } = process.env;

export default {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};