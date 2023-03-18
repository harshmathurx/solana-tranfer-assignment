// import functionalities
import '@/styles/Home.module.css'
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { useEffect, useState } from "react";

// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

export default function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  const [newKeyPair, setNewKeypair] = useState<Keypair | undefined>(undefined);
  const [newWalletBalance, setNewWalletBalance] = useState<number | undefined>(undefined);
  const [newTransactionSignature, setNewTransactionSignature] = useState<string | undefined>(undefined);
  const [connection,setConnection] = useState<Connection | undefined>(undefined);

  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    setConnection(connection);
  }, []);

  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        setWalletKey(response.publicKey.toString());
      } catch (err: any) {
        console.log(err.message);
      }
    }
  };

  const disconnectWallet = async () => {
    if (provider && walletKey) {
      try {
        await provider.disconnect();
        await setWalletKey(undefined);
      } catch (err: any) {
        console.log(err.message);
      }
    }
  }

  const createAccount = async () => {
    if(!connection) return;
    const newPair = new Keypair();
    console.log("Keypair", newPair);
    setNewKeypair(newPair);
    const publicKey = new PublicKey(newPair.publicKey).toString();
    const privateKey = newPair.secretKey;
    let walletBalance = await connection.getBalance(
      new PublicKey(newPair.publicKey)
    );
    setNewWalletBalance(walletBalance / LAMPORTS_PER_SOL);

    console.log("Airdroping SOL...")
    const fromAirDropSignature = await connection.requestAirdrop(
      new PublicKey(newPair.publicKey),
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirDropSignature);
    console.log("Airdrop complete!")
    walletBalance = await connection.getBalance(
      new PublicKey(newPair.publicKey)
    );
    setNewWalletBalance(walletBalance / LAMPORTS_PER_SOL)
  }

  const transferSol = async () => {
    if(!connection) return;
    if (!newKeyPair) return;

    var toWallet = Keypair.generate();

    // Add transfer instruction to transaction
    var transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: newKeyPair.publicKey,
        toPubkey: toWallet.publicKey,
        lamports: LAMPORTS_PER_SOL
      }),
    );

    // Sign transaction, broadcast, and confirm
    var signature = await sendAndConfirmTransaction(connection, transaction, [
      newKeyPair,
    ]);
    console.log('SIGNATURE', signature);
    setNewTransactionSignature(signature)
  }

  // HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h2>Create New Solana Account</h2>
        <button
          style={{
            fontSize: "16px",
            padding: "15px",
            fontWeight: "bold",
            borderRadius: "5px",
          }}
          onClick={createAccount}
        >
          Create Account
        </button>
        {newKeyPair && (<div>
          <p>{`New account: ${newKeyPair.publicKey.toString()}`}</p>
          <p>{`New account balance: ${newWalletBalance}`}</p>
        </div>)
        }
        <h2>Connect to Phantom Wallet</h2>
        {provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
        {provider && walletKey && <p>{`Connected account: ${walletKey}`}</p>}
        {provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={disconnectWallet}
          >
            Disconnect Wallet
          </button>
        )}
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}

        <h2>Transfer SOL</h2>
        <button
          style={{
            fontSize: "16px",
            padding: "15px",
            fontWeight: "bold",
            borderRadius: "5px",
          }}
          onClick={transferSol}
        >
          Transfer Sol
        </button>
        {newKeyPair && newTransactionSignature && (
          <p>Transaction Signature: {newTransactionSignature}</p>
        )}
      </header>
    </div>
  );
}