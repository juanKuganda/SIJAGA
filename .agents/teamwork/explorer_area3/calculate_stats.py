import json
import csv
import glob
import math
import statistics

def load_data():
    # 1. Mint
    mint_csv = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-07/summary-mint.csv",
              "/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/summary-mint.csv"]:
        with open(p) as f:
            for row in csv.DictReader(f):
                mint_csv.append(row)

    mint_jsonl = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-07/run-mint.jsonl",
              "/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/run-mint.jsonl"]:
        with open(p) as f:
            for line in f:
                if line.strip():
                    mint_jsonl.append(json.loads(line))

    # 2. Verify
    verify_csv = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-07/summary-verify.csv",
              "/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/summary-verify.csv"]:
        with open(p) as f:
            for row in csv.DictReader(f):
                verify_csv.append(row)

    verify_jsonl = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-07/run-verify.jsonl",
              "/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/run-verify.jsonl"]:
        with open(p) as f:
            for line in f:
                if line.strip():
                    verify_jsonl.append(json.loads(line))

    # 3. Revoke
    revoke_csv = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/summary-revoke.csv"]:
        with open(p) as f:
            for row in csv.DictReader(f):
                revoke_csv.append(row)

    revoke_jsonl = []
    for p in ["/home/junnnnnnnn/Code/sijaga/experiments/2026-11-08/run-revoke.jsonl"]:
        with open(p) as f:
            for line in f:
                if line.strip():
                    revoke_jsonl.append(json.loads(line))

    return mint_csv, mint_jsonl, verify_csv, verify_jsonl, revoke_csv, revoke_jsonl

def stats(vals):
    if not vals:
        return {}
    s_vals = sorted(vals)
    n = len(s_vals)
    mean_val = statistics.mean(s_vals)
    median_std = statistics.median(s_vals)
    # upper median (if n even, pick index n//2)
    median_upper = s_vals[n // 2] if n % 2 == 0 else s_vals[n // 2]
    stdev_val = statistics.stdev(s_vals) if n > 1 else 0.0
    min_val = min(s_vals)
    max_val = max(s_vals)
    # p95 nearest rank: rank = ceil(0.95 * n) -> index rank - 1 (1-based)
    rank_p95 = math.ceil(0.95 * n)
    p95_nearest = s_vals[rank_p95 - 1]
    # second highest
    second_highest = s_vals[-2] if n >= 2 else s_vals[-1]
    return {
        "n": n,
        "mean": mean_val,
        "median_std": median_std,
        "median_upper": median_upper,
        "stdev": stdev_val,
        "min": min_val,
        "max": max_val,
        "p95_nearest": p95_nearest,
        "second_highest": second_highest,
        "rank_p95": rank_p95
    }

def analyze():
    mint_csv, mint_jsonl, verify_csv, verify_jsonl, revoke_csv, revoke_jsonl = load_data()

    print("=== MINT ANALYSIS ===")
    print(f"Mint CSV rows count: {len(mint_csv)}")
    print(f"Mint JSONL records count: {len(mint_jsonl)}")

    # Check trials and status in mint CSV
    # Note: 2026-11-07 mint had trialIndex=1 for all 7 rows!
    # Let's count successes and failures in CSV:
    mint_success_rows = [r for r in mint_csv if r.get('status') == 'SUCCESS']
    mint_failed_rows = [r for r in mint_csv if r.get('status') == 'FAILED']
    print(f"Mint CSV: {len(mint_success_rows)} SUCCESS, {len(mint_failed_rows)} FAILED, Total = {len(mint_csv)}")

    # Details of failed rows in mint CSV
    for r in mint_failed_rows:
        print("Failed CSV row:", r)

    # Details of JSONL failed records
    jsonl_failed = [r for r in mint_jsonl if r.get('status') == 'FAILED']
    print(f"Mint JSONL failed records: {len(jsonl_failed)}")
    for r in jsonl_failed:
        print("Failed JSONL record:", {k: r.get(k) for k in ['date', 'wallClockTime', 'trialIndex', 'attempt', 'status', 'errorCode', 'errorMessage', 'txSignature', 'feeLamports']})

    # Mint latencies for successful trials
    mint_totals = [float(r['elapsedSeconds']) for r in mint_success_rows]
    mint_onchain = [float(r['onchainElapsedSeconds']) for r in mint_success_rows if r.get('onchainElapsedSeconds') not in (None, '')]
    mint_ipfs = [float(r['ipfsElapsedSeconds']) for r in mint_success_rows if r.get('ipfsElapsedSeconds') not in (None, '')]

    print("\nMint Stats (SUCCESS trials):")
    print("Total Duration (s):", stats(mint_totals))
    print("Onchain Duration (s):", stats(mint_onchain))
    print("IPFS Duration (s):", stats(mint_ipfs))

    # Fee and Rent in mint
    fees = [r.get('feeLamports') for r in mint_success_rows]
    rents = [r.get('rentDepositLamports') for r in mint_success_rows]
    print(f"Mint feeLamports distribution: {set(fees)}")
    print(f"Mint rentDepositLamports distribution: {set(rents)}")
    null_fee_rows = [r for r in mint_success_rows if r.get('feeLamports') in (None, '')]
    print(f"Mint successful rows with null fee: {len(null_fee_rows)}")
    for r in null_fee_rows:
        print("  Null fee row:", {k: r.get(k) for k in ['trialIndex', 'elapsedSeconds', 'txSignature', 'slot', 'feeLamports', 'rentDepositLamports', 'wallClockTime', 'date']})

    print("\n=== VERIFY ANALYSIS ===")
    print(f"Verify CSV rows count: {len(verify_csv)}")
    print(f"Verify JSONL records count: {len(verify_jsonl)}")
    verify_success_rows = [r for r in verify_csv if r.get('status') == 'SUCCESS']
    verify_failed_rows = [r for r in verify_csv if r.get('status') == 'FAILED']
    print(f"Verify CSV: {len(verify_success_rows)} SUCCESS, {len(verify_failed_rows)} FAILED")

    verify_totals = [float(r['elapsedSeconds']) for r in verify_success_rows]
    verify_rpc = [float(r['onchainElapsedSeconds']) for r in verify_success_rows if r.get('onchainElapsedSeconds') not in (None, '')]
    verify_ipfs = [float(r['ipfsElapsedSeconds']) for r in verify_success_rows if r.get('ipfsElapsedSeconds') not in (None, '')]
    verify_challenge = [float(r['challengeElapsedSeconds']) for r in verify_success_rows if r.get('challengeElapsedSeconds') not in (None, '')]

    print("\nVerify Stats (SUCCESS trials, n=30):")
    print("Total Duration (s):", stats(verify_totals))
    print(f"RPC Duration (s) (n={len(verify_rpc)}):", stats(verify_rpc))
    print(f"IPFS Duration (s) (n={len(verify_ipfs)}):", stats(verify_ipfs))
    print(f"Challenge Duration (s) (n={len(verify_challenge)}):", stats(verify_challenge))

    # Check how many verify trials <= 5s
    under_5s = [v for v in verify_totals if v <= 5.0]
    print(f"Verify trials <= 5.0s: {len(under_5s)} trials -> {under_5s}")

    # Verify outlier
    verify_outliers = [(r['trialIndex'], float(r['elapsedSeconds']), r.get('onchainElapsedSeconds'), r.get('ipfsElapsedSeconds')) for r in verify_success_rows if float(r['elapsedSeconds']) > 15.0]
    print(f"Verify outliers (>15s): {verify_outliers}")

    print("\n=== REVOKE ANALYSIS ===")
    print(f"Revoke CSV rows count: {len(revoke_csv)}")
    print(f"Revoke JSONL records count: {len(revoke_jsonl)}")
    revoke_success_rows = [r for r in revoke_csv if r.get('status') == 'SUCCESS']
    revoke_failed_rows = [r for r in revoke_csv if r.get('status') == 'FAILED']
    print(f"Revoke CSV: {len(revoke_success_rows)} SUCCESS, {len(revoke_failed_rows)} FAILED")

    revoke_totals = [float(r['elapsedSeconds']) for r in revoke_success_rows]
    revoke_onchain = [float(r['onchainElapsedSeconds']) for r in revoke_success_rows if r.get('onchainElapsedSeconds') not in (None, '')]
    revoke_ipfs = [float(r['ipfsElapsedSeconds']) for r in revoke_success_rows if r.get('ipfsElapsedSeconds') not in (None, '')]

    print("\nRevoke Stats (SUCCESS trials, n=30):")
    print("Total Duration (s):", stats(revoke_totals))
    print("Onchain Duration (s):", stats(revoke_onchain))
    print("IPFS Duration (s):", stats(revoke_ipfs))

    # Revoke fees
    revoke_fees = [r.get('feeLamports') for r in revoke_success_rows]
    print(f"Revoke feeLamports distribution: {set(revoke_fees)}")

    # Revoke outlier
    revoke_outliers = [(r['trialIndex'], float(r['elapsedSeconds']), r.get('onchainElapsedSeconds'), r.get('ipfsElapsedSeconds')) for r in revoke_success_rows if float(r['elapsedSeconds']) > 20.0]
    print(f"Revoke outliers (>20s): {revoke_outliers}")

if __name__ == "__main__":
    analyze()
