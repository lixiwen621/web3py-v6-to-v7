from web3.middleware import name_to_address_middleware
from web3.middleware import geth_poa_middleware

w3.middleware_onion.inject(name_to_address_middleware, layer=0)
w3.middleware_onion.inject(geth_poa_middleware, layer=1)
