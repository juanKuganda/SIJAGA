import json
import glob
import os
import csv
import statistics

def inspect_all():
    print("=== CHECKPOINT.json ===")
    with open("/home/junnnnnnnn/Code/sijaga/experiments/CHECKPOINT.json") as f:
        cp = json.load(f)
    print("Project:", cp.get("project"))
    print("Decision gates:", cp.get("decisionGates"))
    print("Last updated:", cp.get("lastUpdated"))
    print("Batch execution plan:", json.dumps(cp.get("environment", {}).get("batchExecutionPlan", {}), indent=2))

    print("\n=== RUN MINT JSONL ===")
    mint_records = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/run-mint.jsonl")):
        with open(p) as f:
            lines = [json.loads(line) for line in f if line.strip()]
        print(f"File: {p} ({len(lines)} records)")
        for idx, r in enumerate(lines):
            mint_records.append((p, idx, r))
            print(f"  {p.split('/')[-2]} [{idx}]: trialIndex={r.get('trialIndex')} op={r.get('operation')} status={r.get('status')} success={r.get('success')} attempt={r.get('attempt')} totalMs={r.get('totalDurationMs')} onchainMs={r.get('onChainDurationMs')} ipfsMs={r.get('ipfsDurationMs')} fee={r.get('feeLamports')} rent={r.get('rentDepositLamports')} errCode={r.get('errorCode')} errMsg={str(r.get('errorMessage'))[:80]}")

    print(f"\nTotal mint records in JSONL: {len(mint_records)}")

    print("\n=== SUMMARY MINT CSV ===")
    mint_csv_rows = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/summary-mint.csv")):
        with open(p) as f:
            reader = list(csv.DictReader(f))
        print(f"File: {p} ({len(reader)} rows)")
        for idx, row in enumerate(reader):
            mint_csv_rows.append((p, idx, row))
            print(f"  {p.split('/')[-2]} [{idx}]: trialIndex={row.get('trialIndex')} status={row.get('status')} success={row.get('success')} totalMs={row.get('totalDurationMs')} onChainMs={row.get('onChainDurationMs')} ipfsMs={row.get('ipfsDurationMs')} fee={row.get('feeLamports')} rent={row.get('rentDepositLamports')} slot={row.get('slot')} err={str(row.get('errorMessage'))[:60]}")

    print("\n=== RUN VERIFY JSONL ===")
    verify_records = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/run-verify.jsonl")):
        with open(p) as f:
            lines = [json.loads(line) for line in f if line.strip()]
        print(f"File: {p} ({len(lines)} records)")
        for idx, r in enumerate(lines):
            verify_records.append((p, idx, r))

    print(f"Total verify records in JSONL: {len(verify_records)}")

    print("\n=== SUMMARY VERIFY CSV ===")
    verify_csv_rows = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/summary-verify.csv")):
        with open(p) as f:
            reader = list(csv.DictReader(f))
        print(f"File: {p} ({len(reader)} rows)")
        for idx, row in enumerate(reader):
            verify_csv_rows.append((p, idx, row))
            if idx < 5 or idx >= len(reader) - 3 or float(row.get('totalDurationMs', 0)) > 15000:
                print(f"  {p.split('/')[-2]} [{idx}]: trialIndex={row.get('trialIndex')} status={row.get('status')} success={row.get('success')} totalMs={row.get('totalDurationMs')} rpcMs={row.get('onChainDurationMs')} ipfsMs={row.get('ipfsDurationMs')} challengeMs={row.get('challengeDurationMs')}")

    print("\n=== RUN REVOKE JSONL ===")
    revoke_records = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/run-revoke.jsonl")):
        with open(p) as f:
            lines = [json.loads(line) for line in f if line.strip()]
        print(f"File: {p} ({len(lines)} records)")
        for idx, r in enumerate(lines):
            revoke_records.append((p, idx, r))

    print(f"Total revoke records in JSONL: {len(revoke_records)}")

    print("\n=== SUMMARY REVOKE CSV ===")
    revoke_csv_rows = []
    for p in sorted(glob.glob("/home/junnnnnnnn/Code/sijaga/experiments/*/summary-revoke.csv")):
        with open(p) as f:
            reader = list(csv.DictReader(f))
        print(f"File: {p} ({len(reader)} rows)")
        for idx, row in enumerate(reader):
            revoke_csv_rows.append((p, idx, row))
            if idx < 5 or idx >= len(reader) - 3 or float(row.get('totalDurationMs', 0)) > 20000:
                print(f"  {p.split('/')[-2]} [{idx}]: trialIndex={row.get('trialIndex')} status={row.get('status')} success={row.get('success')} totalMs={row.get('totalDurationMs')} onchainMs={row.get('onChainDurationMs')} ipfsMs={row.get('ipfsDurationMs')} fee={row.get('feeLamports')} rent={row.get('rentDepositLamports')}")

if __name__ == "__main__":
    inspect_all()
