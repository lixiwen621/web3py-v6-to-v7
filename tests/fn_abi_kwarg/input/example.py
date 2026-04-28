from web3 import Web3

# fn_abi is a keyword argument in encodeABI/encode_abi
encoded = contract.encodeABI(fn_abi=my_abi, args=[1, 2])
