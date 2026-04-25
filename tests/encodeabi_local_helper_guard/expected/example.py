from web3 import Web3


def encodeABI(data):
    return data


encoded_local = encodeABI("hello")
encoded_contract = contract.encode_abi(
    fn_name="transfer",
    args=[recipient, amount],
)
