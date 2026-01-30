import { useMemo, useState } from "react";
import { openContractDeploy } from "@stacks/connect";
import type { FinishedTxData } from "@stacks/connect";
import { STACKS_TESTNET } from "@stacks/network";

function escapeClarityString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isValidContractName(value: string): boolean {
  return /^[a-zA-Z0-9._-]{1,40}$/.test(value);
}

const MemeTokenDeploy = ({
  userAddress,
  connectWallet,
}: {
  userAddress: string;
  setUserAddress: (val: string) => void;
  connectWallet: () => void;
}) => {
  const [contractName, setContractName] = useState("meme-token");
  const [tokenName, setTokenName] = useState("MEME TOKEN");
  const [tokenSymbol, setTokenSymbol] = useState("MEME");
  const [decimals, setDecimals] = useState("6");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txId, setTxId] = useState("");

  const network = STACKS_TESTNET;

  const decimalsValue = useMemo(() => {
    const parsed = Number.parseInt(decimals, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [decimals]);

  const codeBody = useMemo(() => {
    const safeName = escapeClarityString(tokenName.trim() || "MEME TOKEN");
    const safeSymbol = escapeClarityString(tokenSymbol.trim() || "MEME");
    const safeDecimals = Number.isFinite(decimalsValue)
      ? Math.max(0, Math.min(18, decimalsValue))
      : 6;

    return `(define-constant ERR-NOT-AUTH u100)

(define-fungible-token meme-token)

(define-data-var token-owner principal tx-sender)
(define-data-var total-supply uint u0)

(define-read-only (get-token-owner)
  (var-get token-owner)
)

(define-read-only (get-name)
  (ok u"${safeName}")
)

(define-read-only (get-symbol)
  (ok u"${safeSymbol}")
)

(define-read-only (get-decimals)
  (ok u${safeDecimals})
)

(define-read-only (get-total-supply)
  (ok (var-get total-supply))
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance meme-token who))
)

(define-private (is-authorized (sender principal))
  (or (is-eq tx-sender sender) (is-eq contract-caller sender))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    memo
    (if (is-authorized sender)
      (match (ft-transfer? meme-token amount sender recipient)
        transferred (ok transferred)
        err (err err))
      (err ERR-NOT-AUTH)
    )
  )
)

(define-public (mint (amount uint) (recipient principal))
  (if (is-eq tx-sender (var-get token-owner))
    (match (ft-mint? meme-token amount recipient)
      minted
        (begin
          (var-set total-supply (+ (var-get total-supply) amount))
          (ok minted)
        )
      err (err err))
    (err ERR-NOT-AUTH)
  )
)

(define-public (burn (amount uint) (sender principal))
  (if (is-authorized sender)
    (match (ft-burn? meme-token amount sender)
      burned
        (begin
          (var-set total-supply (- (var-get total-supply) amount))
          (ok burned)
        )
      err (err err))
    (err ERR-NOT-AUTH)
  )
)`;
  }, [decimalsValue, tokenName, tokenSymbol]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError("");

      await connectWallet();
      setSuccess("Wallet connected successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!userAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!isValidContractName(contractName)) {
      setError("Contract name must be 1-40 chars: letters, numbers, . _ -");
      return;
    }

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      setError("Token name and symbol are required");
      return;
    }

    if (!Number.isFinite(decimalsValue) || decimalsValue < 0 || decimalsValue > 18) {
      setError("Decimals must be between 0 and 18");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setTxId("");

      await openContractDeploy({
        contractName,
        codeBody,
        network,
        onFinish: (data: FinishedTxData) => {
          setSuccess("Deployment submitted! Check your wallet for status.");
          setTxId(data.txId);
        },
        onCancel: () => {
          setError("Transaction cancelled by user");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("Deploy error:", err);
      setError("Failed to deploy contract");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-1">Deploy Meme Token</h1>
              <p className="text-orange-100 text-sm">
                Launch a SIP-010 token in minutes
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!userAddress ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Connect your Stacks wallet to deploy your token
              </p>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 mb-1">Connected Address</p>
                <p className="text-sm font-mono text-gray-900 truncate">
                  {userAddress}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Contract Name
                  </label>
                  <input
                    value={contractName}
                    onChange={(event) => setContractName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="meme-token"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    1-40 chars: letters, numbers, . _ -
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Token Name
                  </label>
                  <input
                    value={tokenName}
                    onChange={(event) => setTokenName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="MEME TOKEN"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Token Symbol
                  </label>
                  <input
                    value={tokenSymbol}
                    onChange={(event) => setTokenSymbol(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="MEME"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">
                    Decimals
                  </label>
                  <input
                    value={decimals}
                    onChange={(event) => setDecimals(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="6"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start">
                  <svg
                    className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-start">
                  <svg
                    className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">
                    {success}
                    {txId ? ` TxID: ${txId}` : ""}
                  </span>
                </div>
              )}

              <button
                onClick={handleDeploy}
                disabled={loading}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                  loading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? "Deploying..." : "Deploy Meme Token"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-2 text-sm">
          What gets deployed:
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• SIP-010 compatible fungible token</li>
          <li>• Owner-only minting with on-chain supply tracking</li>
          <li>• Transfer and burn support</li>
        </ul>
      </div>
    </div>
  );
};

export default MemeTokenDeploy;
