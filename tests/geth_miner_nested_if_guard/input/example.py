from web3 import Web3


def start_miner_if_needed():
    if w3.geth.miner.start(1):
        print("mining started")

    print("done")
