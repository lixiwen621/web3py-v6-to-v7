from web3 import Web3
from web3.middleware import pythonic_middleware

w3.middleware_onion.add(pythonic_middleware)
w3.middleware_onion.inject(pythonic_middleware, layer=0)
