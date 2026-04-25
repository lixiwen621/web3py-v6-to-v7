from web3.middleware import PythonicMiddleware
from web3.middleware import attrdict_middleware

w3.middleware_onion.add(PythonicMiddleware)
w3.middleware_onion.add(attrdict_middleware)
