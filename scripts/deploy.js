async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const FundTracking = await ethers.getContractFactory("FundTracking");
  const fundTracking = await FundTracking.deploy();
  await fundTracking.waitForDeployment();

  // Ethers v6: address is a property (do not await)
  console.log("FundTracking deployed to:", fundTracking.target);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
