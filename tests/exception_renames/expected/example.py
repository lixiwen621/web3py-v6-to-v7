from web3 import Web3
from web3.exceptions import ContractLogicError, ContractLogicError

# Python builtins — should NOT be renamed (not imported from web3.exceptions)
try:
    result = contract.functions.transfer().transact()
except ValueError as e:
    print(f"Value error: {e}")
except TypeError as e:
    print(f"Type error: {e}")
except AttributeError as e:
    print(f"Attribute error: {e}")

# Web3-specific exceptions — should be renamed
try:
    result = w3.eth.call(tx)
except ContractLogicError as e:
    print(f"Solidity error: {e}")
except ContractLogicError as e:
    print(f"Contract logic error: {e}")
