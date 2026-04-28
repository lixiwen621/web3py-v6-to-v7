from web3 import Web3

# fn_abi is a keyword argument in encodeABI/encode_abi
encoded = contract.encode_abi(abi_callable=my_abi, args=[1, 2])
