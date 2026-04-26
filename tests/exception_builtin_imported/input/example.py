from web3 import Web3
from web3.exceptions import ValueError, ContractLogicError

# ValueError IS imported from web3.exceptions, so it should be renamed
try:
    result = w3.eth.call(tx)
except ValueError as e:
    print(f"Value error: {e}")
except ContractLogicError as e:
    print(f"Contract logic error: {e}")
