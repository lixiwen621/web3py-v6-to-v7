# Contract ABI encoding
encoded = contract.encodeABI(
    fn_name="transfer",
    args=[recipient, amount]
)

from web3.exceptions import SolidityError

try:
    result = contract.functions.badCall().transact()
except SolidityError as e:
    print(f"Reverted: {e}")
