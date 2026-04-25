from web3 import Web3


# TODO(v7): geth.miner removed; manual migration required
if w3.geth.miner.start(1):
    print("mining started")

print("done")
