from web3 import Web3
from web3.exceptions import (
    SolidityError,
    ContractLogicError,
    TimeExhausted,
)

try:
    result = w3.eth.call(tx)
except ContractLogicError as e:
    print(f"Reverted: {e}")
except ContractLogicError as e:
    print(f"Contract logic error: {e}")
except TimeExhausted as e:
    print(f"Timed out: {e}")
