require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
    if (!CONTRACT_ADDRESS) {
        throw new Error("❌ CONTRACT_ADDRESS not found in .env");
    }

    const artifact = JSON.parse(
        fs.readFileSync("./artifacts/contracts/FundTracking.sol/FundTracking.json", "utf8")
    );

    const [signer] = await hre.ethers.getSigners();
    const contract = new hre.ethers.Contract(CONTRACT_ADDRESS, artifact.abi, signer);

    console.log("✅ Connected to contract at:", CONTRACT_ADDRESS);

    // Example call
    const tx = await contract.createProject(
        "School Renovation",
        signer.address,
        ["Foundation", "Walls", "Roof"],
        [
            hre.ethers.parseEther("1"),
            hre.ethers.parseEther("2"),
            hre.ethers.parseEther("3")
        ],
        [signer.address]
    );

    await tx.wait();
    console.log("✅ Project created successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

