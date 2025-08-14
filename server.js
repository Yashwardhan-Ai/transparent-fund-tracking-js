import express from 'express';
import { ethers, isAddress, parseEther, formatEther } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'templates')));

const contractAddress = process.env.CONTRACT_ADDRESS;

// ---------- Load ABI Safely ----------
let contractABI;
try {
  const abiPath = path.join(
    __dirname,
    'artifacts',
    'contracts',
    'FundTracking.sol',
    'FundTracking.json'
  );
  const abiFile = fs.readFileSync(abiPath, 'utf8');
  const parsed = JSON.parse(abiFile);

  contractABI = parsed.abi;
  if (!Array.isArray(contractABI)) {
    throw new Error(`ABI is not an array. Check file: ${abiPath}`);
  }

  console.log(`✅ ABI loaded successfully (${contractABI.length} items)`);
} catch (err) {
  console.error(`❌ Error loading contract ABI: ${err.message}`);
  process.exit(1);
}

// ---------- Blockchain Connection ----------
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// ---------- Routes ----------

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Create Project
app.post('/api/create_project', async (req, res) => {
  try {
    let { name, owner, milestoneDescriptions, milestoneAmounts, stakeholders } = req.body;

    // Validate owner & stakeholders
    if (!isAddress(owner)) {
      return res.status(400).json({ error: 'Invalid owner address' });
    }
    for (let addr of stakeholders) {
      if (!isAddress(addr)) {
        return res.status(400).json({ error: `Invalid stakeholder address: ${addr}` });
      }
    }

    const milestoneAmountsWei = milestoneAmounts.map(amount => parseEther(amount.toString()));

    const tx = await contract.createProject(
      name,
      owner,
      milestoneDescriptions,
      milestoneAmountsWei,
      stakeholders
    );

    await tx.wait();
    res.status(202).json({ message: 'Project creation transaction sent', txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Donate
app.post('/api/donate', async (req, res) => {
  try {
    const { projectId, amount } = req.body;

    const amountWei = parseEther(amount.toString());
    const tx = await contract.donate(projectId, { value: amountWei });

    await tx.wait();
    res.status(202).json({ message: 'Donation transaction sent', txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vote
app.post('/api/vote', async (req, res) => {
  try {
    const { projectId, milestoneId } = req.body;

    const tx = await contract.voteMilestone(projectId, milestoneId);
    await tx.wait();

    res.status(202).json({ message: 'Vote transaction sent', txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Projects
app.get('/api/projects', async (req, res) => {
  try {
    const projectCount = await contract.getProjectsCount();
    const projects = [];

    for (let i = 0; i < projectCount; i++) {
      const details = await contract.getProjectDetails(i);
      const project = {
        id: i,
        name: details[0],
        owner: details[1],
        stakeholders: details[2],
        totalRaised: formatEther(details[3]),
        releasedFunds: formatEther(details[4]),
        milestones: details[5].map(m => ({
          description: m.description,
          amount: formatEther(m.amount),
          votes: m.votes.toString(),
          approved: m.approved,
          fundsReleased: m.fundsReleased
        }))
      };
      projects.push(project);
    }

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
