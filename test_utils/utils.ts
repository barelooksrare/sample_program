import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SampleProgram } from "../target/types/sample_program";
import { assert } from "chai";
import * as Token from "@solana/spl-token";

import PublicKey = anchor.web3.PublicKey;
import Keypair = anchor.web3.Keypair;

// just some helper stuff
export interface ProviderWithWallet extends anchor.Provider {
  wallet: anchor.Wallet;
}

export const getProvider = anchor.getProvider as () => ProviderWithWallet;
export const getConnection = () => getProvider().connection;
export const getMainWallet = () => getProvider().wallet;
export const getProgram = () =>
  anchor.workspace.SampleProgram as Program<SampleProgram>;

const createMint = (decimals: number, authority: Keypair) =>
  Token.createMint(
    getConnection(),
    authority,
    authority.publicKey,
    authority.publicKey,
    decimals,
    authority
  );

const createAndFundATA = async (
  mint: PublicKey,
  owner: Keypair,
  amount: anchor.BN
) => {
  const account = await Token.createAssociatedTokenAccount(
    getConnection(),
    owner,
    mint,
    owner.publicKey
  );
  if (amount.toNumber() > 0) {
    await Token.mintTo(
      getConnection(),
      owner,
      account,
      mint,
      owner.publicKey,
      amount.toNumber()
    );
  }
  return account;
};

const getBufferOrArr = (
  data: Keypair | PublicKey | string | Buffer
): Buffer | Uint8Array => {
  if (data instanceof Buffer) {
    return data;
  }
  if (data instanceof Keypair) {
    data = data.publicKey.toBuffer();
  }
  if (data instanceof PublicKey) {
    return data.toBuffer();
  }
  return Buffer.from(data);
};

export const getOurPda = (
  ...params: (Keypair | PublicKey | Buffer | string)[]
) => {
  const program = getProgram();
  return getPda(program.programId, ...params);
};

export const getPda = (
  program: PublicKey,
  ...params: (Keypair | PublicKey | Buffer | string)[]
) => {
  return PublicKey.findProgramAddressSync(
    params.map((o) => getBufferOrArr(o)),
    program
  );
};

export const createAndFundKeypair = async (
  sol: number,
  predefinedKp: Keypair | undefined = undefined
): Promise<Keypair> => {
  const connection = getConnection();
  const keypair = predefinedKp ?? Keypair.generate();
  if(sol == 0) return keypair;
  const tx = await connection.requestAirdrop(
    keypair.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * sol
  );
  await connection.confirmTransaction(tx);
  return keypair;
};
