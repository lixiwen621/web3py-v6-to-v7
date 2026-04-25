from web3.middleware import name_to_address_middleware
from web3.middleware import geth_poa_middleware
from web3.middleware import pythonic_middleware
from web3.middleware import attrdict_middleware

w3.middleware_onion.add(name_to_address_middleware)
w3.middleware_onion.add(geth_poa_middleware)
w3.middleware_onion.add(pythonic_middleware)
w3.middleware_onion.add(attrdict_middleware)
