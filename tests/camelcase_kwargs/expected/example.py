from web3 import Web3

w3 = Web3()
logs = w3.eth.get_logs(from_block=1, to_block="latest", block_hash="0xabc")
raw = {"fromBlock": 1, "toBlock": "latest", "blockHash": "0xabc"}
