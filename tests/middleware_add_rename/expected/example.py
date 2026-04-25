from web3 import Web3
from web3.middleware import PythonicMiddleware

w3.middleware_onion.add(PythonicMiddleware)
w3.middleware_onion.inject(PythonicMiddleware, layer=0)
