from web3 import Web3
from web3.exceptions import SolidityError, ContractLogicError

try:
    result = contract.functions.transfer().transact()
except ValueError as e:
    print(f"Value error: {e}")
except TypeError as e:
    print(f"Type error: {e}")
except AttributeError as e:
    print(f"Attribute error: {e}")
