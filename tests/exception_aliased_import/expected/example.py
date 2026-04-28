from web3 import Web3
from web3.exceptions import ContractLogicError as SolErr

try:
    result = w3.eth.call(tx)
except SolErr as e:
    print(f"Reverted: {e}")
