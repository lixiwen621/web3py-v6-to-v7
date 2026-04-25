from web3.middleware import pythonic_middleware
from web3.middleware import attrdict_middleware

w3.middleware_onion.add(pythonic_middleware)
w3.middleware_onion.add(attrdict_middleware)
