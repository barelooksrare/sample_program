import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SampleProgram } from "../target/types/sample_program";
import * as Token from "@solana/spl-token";

import PublicKey = anchor.web3.PublicKey;
import Keypair = anchor.web3.Keypair;
import * as utils from "../test_utils/utils";

import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

describe("sample_program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SampleProgram as Program<SampleProgram>;
  const provider = utils.getProvider();

  const myKeypair = provider.wallet.payer as anchor.web3.Keypair;

  let valueAccPubkey: PublicKey;

  before("prepping", async () => {});
  it("Is initialized!", async () => {
    // Add your test here.
    const kp = await utils.createAndFundKeypair(10);
    valueAccPubkey = kp.publicKey;
    const tx = await program.methods
      .initialize(20000)
      .accounts({
        signer: provider.publicKey,
        valueAccount: valueAccPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([myKeypair, kp])
      .rpc();
  });

  it("Reads some number from the NUMBERS account", async () => {
    const someKeypair = Keypair.generate();
    const tx = await program.methods
      .checkValue()
      .accounts({
        signer: provider.publicKey,
        numbersAccount: valueAccPubkey,
      })
      .signers([myKeypair])
      .rpc();
  });

  let signer = Keypair.generate();
  let cheater = Keypair.generate();
  it("transfers and stuff into escrow", async () => {
    const initialAmountSol = 40;
    const depositAmountSol = 11;
    await utils.createAndFundKeypair(initialAmountSol, signer);

    const escrowPda = utils.getOurPda("escrow", signer)[0];
    const signerBalanceBefore = await utils
      .getConnection()
      .getBalance(signer.publicKey);
    const escrowBalanceBefore = await utils
      .getConnection()
      .getBalance(escrowPda);
    assert.equal(
      signerBalanceBefore,
      initialAmountSol * anchor.web3.LAMPORTS_PER_SOL,
      "Signer PRE balance doesn't match"
    );
    assert.equal(escrowBalanceBefore, 0, "Escrow PRE balance doesn't match");
    console.log(
      "signer and escrow balances before",
      signerBalanceBefore,
      escrowBalanceBefore
    );

    const tx = await program.methods
      .deposit(new anchor.BN(depositAmountSol * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({
        signer: signer.publicKey,
        escrow: escrowPda,
      })
      .signers([signer])
      .rpc();

    const signerBalanceAfter = await utils
      .getConnection()
      .getBalance(signer.publicKey);
    const escrowBalanceAfter = await utils
      .getConnection()
      .getBalance(escrowPda);
    console.log(
      "signer and escrow balances",
      signerBalanceAfter,
      escrowBalanceAfter
    );

    assert.equal(
      signerBalanceAfter,
      (initialAmountSol - depositAmountSol) * anchor.web3.LAMPORTS_PER_SOL,
      "Signer POST balance doesn't match"
    );
    assert.equal(
      escrowBalanceAfter,
      depositAmountSol * anchor.web3.LAMPORTS_PER_SOL,
      "Escrow POST balance doesn't match"
    );
  });

  it("withdraws from escrow", async () => {
    const withdrawalAmountSol = 3;
    const escrowPda = utils.getOurPda("escrow", signer)[0];

    const signerBalanceBefore = await utils
      .getConnection()
      .getBalance(signer.publicKey);
    const escrowBalanceBefore = await utils
      .getConnection()
      .getBalance(escrowPda);

    console.log(
      "signer and escrow balances before",
      signerBalanceBefore,
      escrowBalanceBefore
    );

    const tx = await program.methods
      .withdraw(
        new anchor.BN(withdrawalAmountSol * anchor.web3.LAMPORTS_PER_SOL)
      )
      .accounts({
        signer: signer.publicKey,
        escrow: escrowPda,
      })
      .signers([signer])
      .rpc();

    const signerBalanceAfter = await utils
      .getConnection()
      .getBalance(signer.publicKey);
    const escrowBalanceAfter = await utils
      .getConnection()
      .getBalance(escrowPda);
    console.log(
      "signer and escrow balances",
      signerBalanceAfter,
      escrowBalanceAfter
    );

    assert.equal(
      signerBalanceAfter,
      signerBalanceBefore + withdrawalAmountSol * anchor.web3.LAMPORTS_PER_SOL,
      "Signer POST balance doesn't match"
    );
    assert.equal(
      escrowBalanceAfter,
      escrowBalanceBefore - withdrawalAmountSol * anchor.web3.LAMPORTS_PER_SOL,
      "Escrow POST balance doesn't match"
    );
  });

  it("fails if cheater tries to withdraw", async () => {
    const withdrawalAmountSol = 3;
    const escrowPda = utils.getOurPda("escrow", signer)[0];

    await expect(program.methods
      .withdraw(
        new anchor.BN(withdrawalAmountSol * anchor.web3.LAMPORTS_PER_SOL)
      )
      .accounts({
        signer: cheater.publicKey,
        escrow: escrowPda,
      })
      .signers([cheater])
      .rpc()).to.be.rejectedWith("escrow");
  });
});
