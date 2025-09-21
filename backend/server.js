import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import { execSync } from "child_process";

dotenv.config();
const app = express();
app.use(express.json());

const API_URL = "https://relayer-api.horizenlabs.io/api/v1";

app.post("/verify", async (req, res) => {
  try {
    const { dataHash, timestamp } = req.body;
    if (!dataHash || !timestamp) {
      return res.status(400).json({ error: "Missing dataHash or timestamp" });
    }

    // Generate witness + proof
    fs.writeFileSync("./input.json", JSON.stringify({ dataHash, timestamp }));
    execSync(`node build/streamproof_js/generate_witness.js build/streamproof_js/streamproof.wasm input.json witness.wtns`);
    execSync(`snarkjs groth16 prove build/streamproof_final.zkey witness.wtns data/proof.json data/public.json`);

    // Load files
    const proof = JSON.parse(fs.readFileSync("./data/proof.json"));
    const publicInputs = JSON.parse(fs.readFileSync("./data/public.json"));
    const key = JSON.parse(fs.readFileSync("./data/verification_key.json"));

    // Submit to zkVerify
    const params = {
      proofType: "groth16",
      vkRegistered: false,
      proofOptions: { library: "snarkjs", curve: "bn128" },
      proofData: { proof, publicSignals: publicInputs, vk: key }
    };

    const submit = await axios.post(`${API_URL}/submit-proof/${process.env.API_KEY}`, params);
    const jobId = submit.data.jobId;

    // Poll status
    let status;
    while (true) {
      const resp = await axios.get(`${API_URL}/job-status/${process.env.API_KEY}/${jobId}`);
      status = resp.data;
      if (status.status === "Finalized") break;
      await new Promise((r) => setTimeout(r, 3000));
    }

    res.json({ commitment: publicInputs[0], jobId, receipt: status });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.listen(4000, () => console.log("🚀 zkStream relay running on http://localhost:4000"));

