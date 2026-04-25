from web3 import Web3
from web3.exceptions import ContractLogicError, ContractLogicError

try:
    result = contract.functions.transfer().transact()
except Web3ValueError as e:
    print(f"Value error: {e}")
except Web3TypeError as e:
    print(f"Type error: {e}")
except Web3AttributeError as e:
    print(f"Attribute error: {e}")
