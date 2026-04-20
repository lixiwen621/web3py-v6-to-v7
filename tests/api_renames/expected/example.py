# Contract ABI encoding
encoded = contract.encode_abi(
    fn_name="transfer",
    args=[recipient, amount]
)

from web3.exceptions import ContractLogicError

try:
    result = contract.functions.badCall().transact()
except ContractLogicError as e:
    print(f"Reverted: {e}")
